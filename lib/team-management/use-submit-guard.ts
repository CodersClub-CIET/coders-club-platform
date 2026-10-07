"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Prevents double submission. The ref blocks a second call synchronously
 * (state updates are async, so a fast double-click could otherwise slip through);
 * `saving` drives the disabled/"Saving..." UI.
 */
export function useSubmitGuard() {
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);

  const run = useCallback(async (task: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await task();
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }, []);

  return { saving, run };
}
