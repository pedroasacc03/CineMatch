// Looks up movie/TV metadata (genres, streaming availability, RT/IMDb
// scores, etc.) and caches it locally.
//
// Per the planning doc's "AI web search instead of public APIs" decision,
// we don't call TMDB/JustWatch/OMDb. Instead, the AI Engine itself searches
// the web the first time a title is needed and we save the result in the
// Title table. Later lookups for the same title reuse the cached row until
// it goes stale (CACHE_TTL_DAYS), so we're not re-searching the web on
// every page load.

import { prisma } from "@/lib/prisma";
import { askClaudeWithWebSearchForJSON } from "@/lib/anthropic";
import { TITLE_TYPES } from "@/lib/questions";

const CACHE_TTL_DAYS = 30;

// Prisma/SQLite stores JSON as plain strings (see prisma/schema.prisma).
// This turns a Title row from the database into a "nice" JS object with
// real arrays, for use everywhere else in the app.
function deserializeTitle(row) {
  if (!row) return null;
  return {
    ...row,
    genres: JSON.parse(row.genres || "[]"),
    streamingAvailability: JSON.parse(row.streamingAvailability || "[]"),
    cast: JSON.parse(row.cast || "[]"),
  };
}

// SQLite's unique constraints treat every NULL as distinct from every other
// NULL, so two titles with an unknown year wouldn't be recognized as
// duplicates. We sidestep that by using 0 to mean "unknown year" internally.
function normalizeYear(year) {
  return typeof year === "number" && Number.isFinite(year) ? year : 0;
}

/**
 * Find a title by name (optionally narrowed by year/type/region), looking it
 * up on the web via Claude if we don't already have a fresh cached copy.
 *
 * `options.region` (e.g. "Brazil", "United States") only affects a fresh web
 * lookup's streamingAvailability - Title rows are a single global cache keyed
 * on name+year (not per-region), so a title reused from cache keeps whatever
 * region's availability it was last looked up with (recorded in
 * `streamingRegion`, null if no region was known at lookup time) until the
 * 30-day TTL forces a refresh. Whoever renders streamingAvailability is
 * responsible for comparing `streamingRegion` against the CURRENT viewer's
 * own region and warning them if it doesn't match - see components/StreamingInfo.js.
 * See lib/recommendations.js and app/api/titles/search/route.js for where
 * `options.region` is passed in.
 *
 * Returns a deserialized Title object, or null if no such title could be found.
 */
export async function findOrLookupTitle(query, options = {}) {
  const normalizedQuery = (query || "").trim();
  if (!normalizedQuery) throw new Error("Title query cannot be empty");

  // 1. Look for a cached match. SQLite's LIKE (which Prisma's `contains`
  // uses) is case-insensitive for ASCII text, so this catches most casing
  // differences without needing Postgres-only features like `mode: "insensitive"`.
  const candidates = await prisma.title.findMany({
    where: { name: { contains: normalizedQuery } },
    orderBy: { lastRefreshed: "desc" },
    take: 5,
  });

  const exactMatch = candidates.find((c) => {
    const nameMatches = c.name.toLowerCase() === normalizedQuery.toLowerCase();
    const yearMatches = !options.year || c.year === options.year;
    return nameMatches && yearMatches;
  });

  if (exactMatch) {
    const ageDays = (Date.now() - new Date(exactMatch.lastRefreshed).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < CACHE_TTL_DAYS) {
      return deserializeTitle(exactMatch);
    }
    // else: fall through and refresh it via a fresh web search below
  }

  // 2. Not cached (or stale) - ask Claude to look it up on the web.
  const system = `You are a precise movie/TV database lookup assistant.
Use web search to find accurate, current information about the specific title the user asks about.
The query may use a localized, dubbed, or translated release name (e.g. a Portuguese title for an American movie) -
resolve it to the correct title, but always report "name" as the title's official release title in its ORIGINAL
production language: an American/British/etc. (English-original) production stays in English even if the query
used a foreign-market or translated name, while a non-English-original production (e.g. a Brazilian, French, or
Japanese film) keeps its own original-language title rather than being translated into English.${
    options.region
      ? `\nThe person asking is located in ${options.region}. Report "streamingAvailability" specifically for what's
available to a viewer in that country/region - not a generic or US-default list, unless that is in fact their region.`
      : ""
  }
Respond with ONLY a single JSON object - no prose, no markdown code fences - matching exactly this shape:
{
  "name": string,
  "year": number or null,
  "type": "movie" or "tv",
  "genres": string[],
  "overview": string,
  "runtimeMinutes": number or null (MOVIES ONLY - total runtime in minutes; leave null for a TV show),
  "seasons": number or null (TV SHOWS ONLY - total number of seasons; leave null for a movie),
  "avgEpisodesPerSeason": number or null (TV SHOWS ONLY - average episode count per season, rounded; leave null for a movie),
  "avgEpisodeRuntimeMinutes": number or null (TV SHOWS ONLY - typical single-episode runtime in minutes; leave null for a movie),
  "releaseDate": string or null (full release date as "YYYY-MM-DD" - the earliest air date for a TV show),
  "countryOfOrigin": string or null,
  "language": string or null,
  "contentRating": string or null (e.g. "PG-13", "R", "TV-MA", "TV-14"),
  "director": string or null (MOVIES ONLY - the primary director; leave null for a TV show),
  "creator": string or null (TV SHOWS ONLY - the showrunner/creator; leave null for a movie),
  "cast": string[] (up to 5 top-billed/lead actors),
  "showStatus": "ongoing" or "ended" or null (TV SHOWS ONLY - whether it's still airing new seasons; leave null for a movie),
  "streamingAvailability": string[] (only services you're confident are currently correct${
    options.region ? `, specific to ${options.region}` : ""
  }),
  "rtScore": number or null (Rotten Tomatoes score, 0-100),
  "imdbScore": number or null (IMDb score, 0-10)
}
If you cannot confidently identify one specific, real title matching the query, respond with exactly {"error": "not_found"} instead of guessing.`;

  const prompt = `Look up this movie or TV show: "${normalizedQuery}"${
    options.year ? ` (release year: ${options.year})` : ""
  }${options.type ? ` (type: ${options.type})` : ""}`;

  const result = await askClaudeWithWebSearchForJSON({ system, prompt, maxTokens: 1500, maxUses: 4 });

  if (!result || result.error === "not_found" || !result.name) {
    return null;
  }

  const type = TITLE_TYPES.includes(result.type) ? result.type : "movie";
  const year = normalizeYear(result.year);

  const data = {
    name: result.name,
    year,
    type,
    genres: JSON.stringify(Array.isArray(result.genres) ? result.genres : []),
    overview: result.overview || null,
    // Deliberately always null - see components/TitlePoster.js for why we
    // stopped trying to source a poster image at all (never worked
    // reliably), and explicitly clear it here so a stale value from before
    // that decision doesn't linger on a refreshed title.
    posterUrl: null,
    runtimeMinutes: typeof result.runtimeMinutes === "number" ? result.runtimeMinutes : null,
    seasons: typeof result.seasons === "number" ? result.seasons : null,
    avgEpisodesPerSeason: typeof result.avgEpisodesPerSeason === "number" ? result.avgEpisodesPerSeason : null,
    avgEpisodeRuntimeMinutes:
      typeof result.avgEpisodeRuntimeMinutes === "number" ? result.avgEpisodeRuntimeMinutes : null,
    releaseDate: typeof result.releaseDate === "string" ? result.releaseDate : null,
    countryOfOrigin: result.countryOfOrigin || null,
    language: result.language || null,
    contentRating: result.contentRating || null,
    director: result.director || null,
    creator: result.creator || null,
    cast: JSON.stringify(Array.isArray(result.cast) ? result.cast : []),
    showStatus: ["ongoing", "ended"].includes(result.showStatus) ? result.showStatus : null,
    streamingAvailability: JSON.stringify(
      Array.isArray(result.streamingAvailability) ? result.streamingAvailability : []
    ),
    streamingRegion: options.region || null,
    rtScore: typeof result.rtScore === "number" ? result.rtScore : null,
    imdbScore: typeof result.imdbScore === "number" ? result.imdbScore : null,
    lastRefreshed: new Date(),
  };

  const saved = await prisma.title.upsert({
    where: { name_year: { name: data.name, year: data.year } },
    update: data,
    create: data,
  });

  return deserializeTitle(saved);
}

/**
 * Lightweight, OPT-IN disambiguation: returns up to 4 plausible candidate
 * titles (name/year/type/one distinguishing phrase only - no overview,
 * poster, streaming, scores, etc.) for when findOrLookupTitle's single best
 * guess wasn't the right one. Deliberately cheap and separate from
 * findOrLookupTitle: most searches already resolve correctly on the first
 * try, so this only runs when a user explicitly asks "show other matches" -
 * it doesn't cache anything, since most candidates will never be picked.
 * Once the user picks one, call findOrLookupTitle(name, {year, type}) to do
 * the real (cached) lookup for that specific title.
 */
export async function findTitleCandidates(query) {
  const normalizedQuery = (query || "").trim();
  if (!normalizedQuery) throw new Error("Title query cannot be empty");

  const system = `You are a precise movie/TV database lookup assistant. The user's search may be ambiguous - it
could match multiple distinct REAL titles (different adaptations, remakes, similarly-named titles, or a
partially-remembered one). Use web search to find up to 4 distinct real candidates that could plausibly match,
most likely match first. Each "detail" should be just enough to tell that candidate apart from the others.
Your entire reply must be ONLY the JSON array below - the very first character must be "[". No preamble, no
explanation of your search process, no markdown code fences, nothing after the closing "]".
[{ "name": string, "year": number or null, "type": "movie" or "tv", "detail": string (short phrase, e.g. "1990
romantic fantasy film" or "2019 Netflix comedy") }]
If you find no real matches, respond with exactly [].`;

  const prompt = `Find candidate movies/TV shows matching: "${normalizedQuery}"`;

  const result = await askClaudeWithWebSearchForJSON({ system, prompt, maxTokens: 600, maxUses: 3 });
  return Array.isArray(result) ? result.slice(0, 4) : [];
}

// Fetch a title we already have by id (no web search) - used when we just
// need to display something we already saved, e.g. on the Recommendations page.
export async function getTitleById(titleId) {
  const row = await prisma.title.findUnique({ where: { id: titleId } });
  return deserializeTitle(row);
}

export { deserializeTitle };
