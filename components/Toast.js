"use client";

import { useEffect } from "react";

// A prominent, auto-dismissing confirmation banner for "your action worked"
// moments - bigger and harder to miss than a small inline "Saved!" line, but
// non-blocking so it doesn't interrupt a user making several edits in a row.
// See lib/useToast.js for the state hook that drives this.
export default function Toast({ message, guidance, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="toast" role="status">
      <span className="toast-icon">✓</span>
      <div className="toast-text">
        <div className="toast-message">{message}</div>
        {guidance && <div className="toast-guidance">{guidance}</div>}
      </div>
      <button className="toast-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
