"use client";

import StarRating from "@/components/StarRating";

// Shown the moment a title is marked "Watched" from the Wishlist or
// Recommendations pages, so rating happens in the same action instead of
// depending on a later trip back to the Watched page - a rating given right
// away, while it's fresh, is the single most useful signal for the AI.
// Skippable: this is a nudge, not a requirement, so the one-click "mark
// watched" flow still works for anyone in a hurry.
export default function RateModal({ titleName, stars, onStarsChange, why, onWhyChange, onConfirm, onSkip, submitting }) {
  if (!titleName) return null;

  return (
    <div className="modal-backdrop" onClick={() => !submitting && onSkip()}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>How was &quot;{titleName}&quot;?</h3>
        <p className="muted" style={{ marginBottom: 16 }}>
          Rate it now while it&apos;s fresh - the more detail in &quot;why&quot;, the better.
        </p>
        <div style={{ marginBottom: 14 }}>
          <StarRating value={stars} onChange={onStarsChange} />
        </div>
        <textarea
          rows={2}
          placeholder="Why? (optional)"
          value={why}
          onChange={(e) => onWhyChange(e.target.value)}
          autoFocus
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          <button className="btn btn-primary" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Saving..." : "Save Rating"}
          </button>
          <button className="btn btn-outline" onClick={onSkip} disabled={submitting}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
