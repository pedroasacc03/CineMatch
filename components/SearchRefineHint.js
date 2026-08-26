"use client";

// Shown under a found search result on the Ratings/Wishlist pages. Styled as
// a clearly-visible callout (not small muted text) since it's easy to miss
// otherwise, sitting right after a poster/title/genres block. The hint
// itself is always free to show (just re-using the normal search box);
// "show other matches" is the opt-in second AI call - see lib/useTitleSearch.js.
export default function SearchRefineHint({ candidates, loadingCandidates, onShowOtherMatches, onSelectCandidate }) {
  return (
    <>
      <div className="onboarding-banner" style={{ padding: "14px 16px", marginTop: 16 }}>
        <strong style={{ color: "var(--color-accent-800)", fontSize: 15, display: "block", marginBottom: 6 }}>
          Not the right title?
        </strong>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--color-accent-800)" }}>
          Try searching again with more detail — release year, an actor, &quot;the 2019 movie not the show.&quot;
        </p>
        <button className="btn btn-primary" onClick={onShowOtherMatches} disabled={loadingCandidates}>
          {loadingCandidates ? "Looking..." : "Show other possible matches"}
        </button>
      </div>

      {candidates &&
        (candidates.length === 0 ? (
          <p className="muted" style={{ marginTop: 10 }}>
            No other likely matches found - try refining your search instead.
          </p>
        ) : (
          <div className="card" style={{ background: "var(--color-neutral-100)", marginTop: 10 }}>
            {candidates.map((c, i) => (
              <div
                key={`${c.name}-${c.year}-${i}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: i < candidates.length - 1 ? "1px solid var(--color-divider)" : "none",
                }}
              >
                <div>
                  <strong>
                    {c.name} {c.year ? `(${c.year})` : ""}
                  </strong>
                  {c.detail && <div className="muted">{c.detail}</div>}
                </div>
                <button
                  className="btn btn-outline"
                  style={{ flexShrink: 0 }}
                  onClick={() => onSelectCandidate(c)}
                  disabled={loadingCandidates}
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        ))}
    </>
  );
}
