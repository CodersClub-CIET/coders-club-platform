"use client";
import { useEffect } from "react";
import { useEffectEvent } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "../supabase/realtime";
/** Only tables confirmed in the deployed publication. Signals invalidate DB reads, not local authority. */
export function useQRRealtime({sessionId, onChange}: {sessionId?:string; onChange:() => void}) {
  const changed = useEffectEvent(onChange);
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    try {
      const channel = createRealtimeChannel(`dynamic-qr-${sessionId}`)
        .on("postgres_changes", {event:"UPDATE", schema:"public", table:"attendance_sessions", filter:`id=eq.${sessionId}`}, () => { if (active) changed(); })
        .on("postgres_changes", {event:"INSERT", schema:"public", table:"attendance_records", filter:`session_id=eq.${sessionId}`}, () => { if (active) changed(); })
        .subscribe();
      return () => { active = false; void removeRealtimeChannel(channel).catch(() => { /* Bounded polling remains active. */ }); };
    } catch { /* Configuration/connection failure uses the bounded polling fallback. */ }
  }, [sessionId]);
}
