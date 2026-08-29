"use client";

// Shared "why not interested?" prompt used on both the Recommendations page
// and the Wishlist page. The reason is optional but genuinely useful signal
// for the AI Preference Analysis Engine (see lib/profile.js) - as valuable as
// the "why" on a regular rating - so we ask for it every time rather than
// silently marking the title not interested.
export default function NotInterestedModal({ titleName, reason, onReasonChange, onConfirm, onCancel, submitting }) {
  if (!titleName) return null;

  return (
    <div className="modal-backdrop" onClick={() => !submitting && onCancel()}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Not interested in &quot;{titleName}&quot;?</h3>
        <p className="muted" style={{ marginBottom: 16 }}>
          Optional: tell us why - and the more specific, the better. &quot;Not for me&quot; doesn&apos;t give the
          AI much to work with, but &quot;too slow-paced&quot; or &quot;already seen something very similar&quot;
          helps it spot a real pattern and avoid recommending more of the same.
        </p>
        <textarea
          rows={2}
          placeholder="e.g. Too slow-paced for me, or too similar to something I already didn't love..."
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          autoFocus
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
          <button className="btn btn-primary" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Saving..." : "Confirm"}
          </button>
          <button className="btn btn-outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
