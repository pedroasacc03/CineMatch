# CineMatch

CineMatch is a movie & TV show recommendation platform. Users rate what they've
watched, an AI engine turns that into a structured taste profile, and the app
recommends new titles they haven't seen — with a plain-English reason for
each pick. This repo is the **Phase 1 MVP**: a working, runnable version of
the full core loop, built to be extended.

> **If you're an AI assistant (e.g. Claude Code) picking this up**: read this
> whole file before changing anything. It explains the product concept, the
> architecture, and — importantly — what's intentionally simplified for the
> MVP vs. what's an actual bug. There's no other design doc in this repo to
> fall back on, so treat this README as the source of truth for *why* the
> code looks the way it does.

---

## 1. The idea, in plain language

A user rates movies/TV shows they've watched (and can say *why* they liked or
disliked them). An AI reads all of that and builds a **preference profile**:
favorite genres, recurring themes, storytelling preferences, streaming
services, taste nuances ("likes horror only when it's psychological, not
gory"), favorite directors/creators/actors, viewing-habit patterns
(runtime/length comfort, quality-bar leaning, era preference, content-rating
comfort, ongoing-vs-ended show preference), etc. That profile powers two things:

1. A **Recommendations page** — a queue of brand-new AI picks the user
   hasn't decided on yet, each with streaming availability, Rotten
   Tomatoes/IMDb scores, and a personalized "why you'll like it," plus a
   one-off "Surprise Me" pick that deliberately steps outside the user's
   usual taste while still being grounded in a real connecting thread.
2. A **Chatbot** — talk to the AI to log an opinion ("I just watched Andor
   and loved it"), or ask for a recommendation on the spot ("something sad
   for tonight").

The user can also open **My Preferences**, a page that shows the AI's entire
profile of them in an editable form (chips, lists, a confidence dot per
genre) — inspired by Instagram's "Your Algorithm" page. Editing something
there is treated exactly like submitting a new rating: it reshapes future
recommendations immediately.

Marking a title "Not Interested" — on the Recommendations or Wishlist page —
prompts for an optional reason first. That's treated as just as strong a
signal as a 1-star rating: a deliberate rejection, not just silence.

This is the **core loop**: rate → AI analyzes → recommend → watch → rate
again. Every page in this app exists to feed or read from that loop.

## 2. The seven pages

| Page | Route | What it does |
|---|---|---|
| Home | `/home` | Entry point. A "welcome back" hero with progress toward a solid taste profile (rated titles vs. a goal of 10), quick-action links to every other page, and a preview of the user's **Wishlist** (titles they've actually decided they want to watch — a truer "coming up for you" than an undecided AI suggestion). |
| Ratings | `/ratings` | For titles the user has **already watched, in real life**: search (backed by AI web search, with an opt-in "show other possible matches" step for ambiguous titles) + a 1-5 star rating + optional "why." A small, dismissible reminder banner surfaces a few of the 10 guided questions from `lib/questions.js` (e.g. "What are your favorite movies?") as search inspiration — it's just a hint, not a form; there's no separate onboarding Q&A flow anymore. |
| Watched | `/watched` | Every title the user has rated as watched, editable in place (change the stars or the "why" and it re-saves). |
| Wishlist | `/wishlist` | Titles the user wants to watch but hasn't yet — searchable/addable directly here, or added via "Add to Wishlist" from a Recommendations card. Each entry can be marked Watched or Not Interested. |
| Recommendations | `/recommendations` | The queue of pending AI picks awaiting a decision: "Generate more picks" (a batch of 4 new suggestions - 2 movies + 2 TV shows) and "Surprise Me" (exactly one deliberate stretch pick). Mark Watched / Add to Wishlist / Not Interested triages a card and closes the loop back into Ratings/Wishlist. Asks for the user's region on first use, since streaming availability is country-specific. |
| My Preferences | `/preferences` | The AI's profile of the user, fully readable and editable, including favorite genres, themes, storytelling notes, favorite creators/actors, and viewing-habit patterns. |
| Chatbot | `/chat` | Conversational interface. Can log ratings and add recommendations via tool use (see `lib/chat.js`), not just talk about doing so. |

Ratings, Watched, and Wishlist used to be one combined page in an earlier
version of this MVP; they're now split so "log something I watched,"
"review what I've rated," and "manage what I want to watch" each have a
focused, uncluttered page.

## 3. Why the tech choices are what they are

This stack was chosen specifically to make `npm install && npm run dev` work
immediately, with no external services to configure, while staying easy for
an AI coding assistant to extend later.

- **Next.js 14 (App Router), plain JavaScript, no TypeScript.** One project,
  one dev server, for both frontend and backend (API routes live in
  `app/api/**/route.js`). No separate backend process to run. Plain JS (not
  TS) keeps every file readable top-to-bottom without type-annotation noise —
  feel free to introduce TypeScript later if you want stronger guarantees,
  but it wasn't necessary for an MVP this size.
- **SQLite via Prisma, not PostgreSQL.** Zero setup — the whole database is
  one file (`prisma/dev.db`). The original planning doc called for
  PostgreSQL for a real deployment; switching is a one-line change to
  `prisma/schema.prisma`'s `provider` plus a real `DATABASE_URL` (see
  Prisma's docs) since the schema itself doesn't use any SQLite-only
  features. **Caveat:** SQLite has no native array/JSON/enum column types, so
  several fields are stored as JSON-encoded strings instead (documented with
  comments in `schema.prisma` and handled by serialize/deserialize helpers in
  `lib/profile.js` and `lib/titles.js`). If you migrate to Postgres, you
  could convert those to real `Json`/array columns and simplify those helpers.
- **Hand-rolled auth (`lib/auth.js`), not NextAuth.js.** Password hashing
  (Node's built-in `crypto.scrypt`) and signed session cookies, with zero
  extra dependencies and every step visible in ~80 lines. This was a
  deliberate MVP simplification — **the plan doc calls for email/password +
  optional Google/Apple sign-in**, and Google/Apple weren't included yet
  specifically so the MVP needs zero external OAuth credentials to run. If
  you add OAuth, swapping this out for NextAuth.js (Auth.js) is the
  recommended path — see "What's not built yet" below.
- **No TMDB/JustWatch/OMDb integration.** Per an explicit product decision
  (see the planning doc), the AI Engine itself uses Claude's web search tool
  to look up a title's metadata, streaming availability, and RT/IMDb scores,
  caching the result in the `Title` table (`lib/titles.js`). This means the
  whole app only needs **one** external API key (Anthropic), not four.
  Trade-off: first-time lookups are slower and slightly less structured than
  a dedicated movie database API, and results depend on what Claude's web
  search turns up. Streaming availability is looked up per the user's
  region (`User.location`) when known, since it varies by country.
- **Two-tier title search, opt-in disambiguation.** A search always resolves
  to Claude's single best guess (`findOrLookupTitle`, cached in `Title`).
  If that's the wrong title, the user can click "Show other possible
  matches" (`SearchRefineHint` component) to trigger a second, separate AI
  call (`findTitleCandidates`) that returns up to 4 real candidates to
  choose from instead. This is deliberately a second call the user has to
  ask for, not something that runs by default, to keep the common case
  (search resolves correctly on the first try) cheap.
- **Two Claude models, split by task.** `CLAUDE_MODEL` (defaults to
  `claude-haiku-4-5`) handles title lookup, recommendations, and chat — cheap,
  fast, structured-extraction-style work. `CLAUDE_PROFILE_MODEL` (defaults to
  `claude-sonnet-5`) is used only for preference-profile synthesis
  (`lib/profile.js`), which has to cross-reference and resolve titles across
  ratings and free-text answers — a harder instruction-following task that a
  cheaper model doesn't reliably get right. The profile-synthesis system
  prompt also uses Anthropic prompt caching (`cacheSystemPrompt` in
  `lib/anthropic.js`) since it's fully static and runs after every rating.

## 4. Project structure

```
cinematch/
  app/
    lp/[variant]/                              - marketing landing page (3 pitch variants, see below)
    login/, register/                          - auth pages
    home/, ratings/, watched/, wishlist/,
    recommendations/, preferences/, chat/       - the 7 main pages
    api/                                        - backend route handlers (one folder per resource)
    layout.js, page.js, globals.css             - page.js is "/" itself - renders the landing page (see below)
  components/
    NavBar.js                        - top nav across all 7 pages
    LandingPage.js                   - the marketing landing page's markup, shared by "/" and /lp/<variant>
    RatingsPageClient.js, WatchedPageClient.js, WishlistPageClient.js,
    RecommendationsPageClient.js, PreferencesPageClient.js, ChatPageClient.js
                                      - client-side logic for each page
    SearchRefineHint.js              - "show other possible matches" disambiguation UI
    NotInterestedModal.js            - shared "why not interested?" prompt (Recommendations + Wishlist)
    Toast.js                         - shared save/action confirmation toast
    StarRating.js, TitleMeta.js, TitlePoster.js   - shared title-display building blocks
  lib/
    prisma.js                        - shared Prisma Client instance
    auth.js, session.js              - password hashing, session tokens, "who's logged in"
    anthropic.js                     - thin Claude API wrapper (model selection, web search tool, JSON parsing, prompt caching)
    titles.js                        - look up / cache movie & TV metadata via AI web search, plus disambiguation candidates
    profile.js                       - the AI Preference Analysis Engine
    recommendations.js               - turns a profile into batch picks or a single "Surprise Me" pick
    chat.js                          - the chatbot's tool-use loop
    questions.js                     - the 10 guided questions + shared "enum" value lists
    landingVariants.js               - the 3 landing-page pitches + DEFAULT_LANDING_VARIANT (see below)
    useTitleSearch.js                - shared search/disambiguation hook (Ratings + Wishlist pages)
    useToast.js                      - shared toast-notification hook
  prisma/
    schema.prisma                    - database schema (see comments for SQLite-specific notes)
```

Every `lib/*.js` file has a comment at the top explaining its role — start
there if you're trying to understand how a feature works end to end.

## 5. Running it locally

**Prerequisites:** Node.js 18.18+ (Next.js 14's minimum) and an
[Anthropic API key](https://console.anthropic.com/settings/keys).

```bash
cd cinematch
npm install

cp .env.example .env
# then edit .env:
#   - set ANTHROPIC_API_KEY to a real key
#   - set AUTH_SECRET to a random string, e.g. output of:
#     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npx prisma generate
npx prisma db push   # creates prisma/dev.db with the schema above

npm run dev
```

Open http://localhost:3000 — you'll see the marketing landing page (the
site's front door, testing one of 3 one-line pitches - see "Landing page &
pitch testing" below). Click "Get started free" to register, then try:

1. Go to Ratings and search for 2-3 titles you know well, rating each with
   a "why" (the reminder banner's sample questions are just inspiration if
   you're stuck on what to search).
2. Check `/preferences` — the AI should have populated at least genres and a
   summary based on what you just entered.
3. Go to `/recommendations` and click "Generate more picks" (or "Surprise
   Me" for one deliberate stretch pick) — you'll be asked for your region
   the first time, so streaming availability is accurate for your country.
4. Try `/chat` — tell it about a show you watched, or ask for a mood-based pick.
5. On any of the search-driven pages, try a deliberately ambiguous or
   misremembered title, then click "Show other possible matches" to see the
   disambiguation flow.

### Landing page & pitch testing

`/` shows a marketing landing page instead of going straight to login/
register - the idea being to catch a new visitor's attention with a pitch
first, the way most marketing sites do, rather than opening on a bare login
form. There are 3 one-line pitches to test against each other:

- **"AI picks your next watch."** (`/lp/ai-picks`) - capability-led
- **"Your taste, finally explained."** (`/lp/taste-explained`) - insight-led
- **"Stop wasting 5 days a year deciding what to watch."** (`/lp/decision-fatigue`) - pain-led

All 3 share one template (`components/LandingPage.js`) and stay live at their
own URL regardless of which one is the default, so you can point a specific
ad/campaign link at one exact pitch. Every "Get started" click carries which
pitch it came from through to the signup event (`landingVariant` in its
metadata - see `lib/events.js` and `app/api/register/route.js`), so
`/admin/metrics` can show views → signups → conversion per pitch, not just
which one got the most traffic.

**To change which pitch is the default** (the one shown at `/`): open
`lib/landingVariants.js` and change the `DEFAULT_LANDING_VARIANT` constant to
any key from `LANDING_VARIANTS` above it - nothing else needs to change,
anywhere. To add a 4th pitch: add a new entry to `LANDING_VARIANTS` (its own
headline/subhead), optionally point `DEFAULT_LANDING_VARIANT` at it - every
other file (the page template, the signup-attribution check, the metrics
page) reads from `LANDING_VARIANTS` directly, so a new key just works.

### A transparency note on testing

This project was scaffolded by an AI agent (Claude, via Cowork) in a sandboxed
environment **without access to the npm registry** — `npm install` could not
be run there, so `npm run dev` / `next build` were never actually executed
against this code. Every file was instead verified by other means: `node
--check` on all plain JS files, an `esbuild` JSX/syntax pass on every
component and page, and a manual cross-check that every import path, API
route the frontend calls, and Prisma field/relation name referenced in code
actually matches what's declared elsewhere (schema, file names, etc.). That
catches syntax errors and most "typo'd a field name" bugs, but it is **not**
the same as a real end-to-end run. Please treat your first `npm run dev` as
the real first test, and expect that you (or Claude Code) may need to fix a
small runtime issue or two — most likely candidates are listed below.

**If something breaks**, the most likely spots are:

- The Claude web search tool's exact type string (`web_search_20250305` in
  `lib/anthropic.js`) — Anthropic occasionally revs this; check
  [the web search tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
  if title lookups error out.
- The default model strings (`claude-haiku-4-5` and `claude-sonnet-5` in
  `.env.example` / `CLAUDE_MODEL` / `CLAUDE_PROFILE_MODEL`) — swap them for
  whatever current Claude models you have access to if either is rejected.
- Anthropic SDK version drift — `package.json` pins `@anthropic-ai/sdk` to
  `"latest"` on purpose (this is a fast-moving package and the web search
  tool is relatively new), so double check the installed version's API still
  matches how `lib/anthropic.js` and `lib/chat.js` call `client.messages.create(...)`.

## 6. What's already working (Phase 1 scope)

- Email/password auth (register, login, logout)
- Home page: progress toward a solid taste profile, quick-action links, and
  a Wishlist preview
- Ratings page: search (AI web search, cached, with opt-in disambiguation),
  rate a watched title, recently-rated summary, dismissible guided-questions
  reminder banner (10 sample prompts from `lib/questions.js`, for
  inspiration only — not a Q&A form)
- Watched page: every watched title, editable in place
- Wishlist page: search-and-add, or add from a Recommendations card; mark
  Watched or Not Interested from here too
- Recommendations page: batch "Generate more picks" + one-off "Surprise Me"
  stretch pick, region prompt for accurate streaming availability, Mark
  Watched / Add to Wishlist / Not Interested triage
- Shared "Not Interested" reason prompt (Recommendations + Wishlist) —
  captured as a strong negative signal, on par with a 1-star rating
- AI Preference Analysis Engine: builds/updates a profile from ratings
  (including favorite creators/actors and viewing-habit patterns pulled from
  runtime, quality scores, content rating, and director/cast data), treats
  the existing profile as a starting point rather than overwriting it
  wholesale, runs after every rating, recommendation triage, manual
  re-analyze request, or meaningful chat exchange
- My Preferences page: full read + edit of the profile, "Ask AI to
  re-analyze" button
- Chatbot: logs ratings and adds recommendations via tool use, grounded in
  the user's current profile
- Cost/quality-tuned model selection (cheap model for search/recs/chat, a
  stronger model just for profile synthesis) with prompt caching on the
  profile system prompt
- Big, clear confirmation toasts (`Toast.js` / `useToast.js`) after every
  save-worthy action (rating saved, preferences updated, recommendation
  triaged, etc.), each with a short line of guidance on where to find the
  result (e.g. "You can see it on the Watched page.")

## 7. What's not built yet (intentionally — see the planning doc's roadmap)

These are Phase 2/3 items from the original plan, not oversights:

- **Google/Apple sign-in.** Only email/password exists right now (see
  Section 3 above for why, and the suggested NextAuth.js migration path).
- **Background cache-refresh job.** `lib/titles.js` re-searches the web for a
  title after 30 days (`CACHE_TTL_DAYS`), but only lazily, on next lookup —
  there's no scheduled job proactively refreshing stale streaming
  availability.
- **Recommendation diversity guardrails / de-duplication tuning.** The
  prompt in `lib/recommendations.js` asks Claude to avoid repeats and
  diversify, but there's no additional code-level enforcement.
- **Visual design pass.** Styling (`app/globals.css`) is intentionally plain
  and functional, matching the wireframe layouts from the planning doc, not
  a finished visual design.
- **Notifications/nudges**, e.g. "a new episode of a show you love is out."
- **Demographics-aware recommending** — the field exists (My Preferences page,
  `User.location`, `PreferenceProfile.demographicsConsider`) and is included
  in the prompt context, but there's no dedicated logic weighting a title's
  country of origin against it yet.

## 8. A note on data & privacy

Everything lives in your local SQLite file (`prisma/dev.db`, git-ignored).
The only external calls this app makes are to the Anthropic API. There's no
analytics, tracking, or third-party service beyond that.
