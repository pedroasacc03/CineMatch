"use client";

import { useCallback, useState } from "react";

// Small shared hook for triggering a <Toast> confirmation from any client
// page. `key` changes on every call so a new toast always gets its own fresh
// auto-dismiss timer, even if it replaces one that's still showing.
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, guidance) => {
    setToast({ message, guidance, key: Date.now() });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return [toast, showToast, dismissToast];
}
