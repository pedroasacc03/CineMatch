// A title's "at a glance" info: movie vs TV show, runtime (movies) or
// season/episode breakdown (TV shows), release date, and RT/IMDb scores.
// Shared across every page that shows a title card (Recommendations,
// Watched, Ratings, Wishlist, Home) so the format - and which facts show up
// - stays consistent everywhere a title appears, not just on some pages.
// No hooks/state, so it's safe to render from either a Server or Client
// Component.

function formatRuntime(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatReleaseDate(releaseDate, year) {
  if (releaseDate) {
    const parsed = new Date(releaseDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    }
  }
  return year ? String(year) : null;
}

export default function TitleMeta({ title }) {
  if (!title) return null;

  const isTv = title.type === "tv";
  const releaseLabel = formatReleaseDate(title.releaseDate, title.year);
  const parts = [isTv ? "TV Show" : "Movie"];

  if (isTv) {
    if (title.seasons) parts.push(`${title.seasons} season${title.seasons === 1 ? "" : "s"}`);
    if (title.avgEpisodesPerSeason) parts.push(`~${title.avgEpisodesPerSeason} episodes/season`);
    if (title.avgEpisodeRuntimeMinutes) {
      parts.push(`~${formatRuntime(title.avgEpisodeRuntimeMinutes)}/episode`);
    }
  } else if (title.runtimeMinutes) {
    parts.push(formatRuntime(title.runtimeMinutes));
  }

  if (releaseLabel) parts.push(`Released ${releaseLabel}`);

  const scoreParts = [];
  if (title.rtScore) scoreParts.push(`RT ${title.rtScore}%`);
  if (title.imdbScore) scoreParts.push(`IMDb ${title.imdbScore}`);

  return (
    <>
      <p className="muted" style={{ margin: "0 0 4px" }}>{parts.join(" · ")}</p>
      {scoreParts.length > 0 && (
        <p className="muted" style={{ margin: "0 0 8px" }}>{scoreParts.join(" · ")}</p>
      )}
    </>
  );
}
