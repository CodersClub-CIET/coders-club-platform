"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  createRealtimeChannel,
  removeRealtimeChannel,
} from "@/lib/supabase/realtime";

const TABLES = ["teams", "team_members", "team_coin_balances"] as const;
const DEBOUNCE_MS = 250;

/**
 * Calls onChange (debounced) when any Team Management table changes.
 * Uses the project's shared realtime helper. postgres_changes events are
 * filtered by the subscriber's RLS, so unauthorised clients receive nothing.
 * Consumers re-fetch through the normal (RLS-protected) service rather than
 * trusting the event payload.
 */
export function useTeamRealtime(onChange: () => void, enabled: boolean): void {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let channel: RealtimeChannel | null = null;

    const notify = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), DEBOUNCE_MS);
    };

    try {
      channel = createRealtimeChannel("team-management");
      for (const table of TABLES) {
        channel = channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          notify
        );
      }
      channel.subscribe();
    } catch {
      // Realtime is an enhancement; the page still works without it.
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (channel) {
        removeRealtimeChannel(channel).catch(() => {});
      }
    };
  }, [enabled]);
}
