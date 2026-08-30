// Shows a title's name in a matted placeholder box - no poster image. We
// used to try showing an AI-supplied posterUrl (found via web search), but
// that turned out to be fundamentally unreliable: checked against real
// data, only 1 of 66 cached titles ever had a poster that actually loaded,
// and even after tightening the lookup prompt to require a direct image
// link, the AI just fabricated plausible-looking-but-fake URLs (verified:
// real TMDB-shaped links that 404). Not worth the web-search cost for a
// near-zero hit rate, so this is deliberately name-only now, for every
// title, no exceptions - see lib/titles.js, which no longer even asks the
// AI for a poster. No hooks/state needed anymore, so this has no "use
// client" and is safe to render from a Server Component directly.
export default function TitlePoster({ title }) {
  return (
    <div className="title-poster-placeholder">
      <span style={{ padding: 6, textAlign: "center" }}>{title?.name || "Poster"}</span>
    </div>
  );
}
