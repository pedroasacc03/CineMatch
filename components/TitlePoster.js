"use client";

import { useState } from "react";

// Shows a title's poster image if we have one and it loads successfully,
// otherwise falls back to a simple placeholder box with the title's name.
// The AI-supplied posterUrl (found via web search) isn't always reliable,
// so we treat it as best-effort rather than assuming it always works.
export default function TitlePoster({ title }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!title) {
    return <div className="title-poster-placeholder">Poster</div>;
  }

  if (title.posterUrl && !imageFailed) {
    return (
      <div className="title-poster-placeholder">
        <img src={title.posterUrl} alt={title.name} onError={() => setImageFailed(true)} />
      </div>
    );
  }

  return (
    <div className="title-poster-placeholder">
      <span style={{ padding: 6, textAlign: "center" }}>{title.name}</span>
    </div>
  );
}
