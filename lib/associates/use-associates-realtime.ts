"use client";

import { useEffect, useRef } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/supabase/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AssociateRow } from "./types";

interface UseAssociatesRealtimeOptions {
  onInsert?: (row: AssociateRow) => void;
  onUpdate?: (row: AssociateRow) => void;
  onAnyChange?: () => void;
  enabled?: boolean;
}

/**
 * Subscribes to realtime Postgres changes on public.associates.
 * Reuses the existing lib/supabase/realtime infrastructure.
 */
export function useAssociatesRealtime({
  onInsert,
  onUpdate,
  onAnyChange,
  enabled = true,
}: UseAssociatesRealtimeOptions = {}): void {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    try {
      const channelName = `realtime-associates-${Date.now()}`;
      const channel = createRealtimeChannel(channelName);
      channelRef.current = channel;

      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "associates",
          },
          (payload) => {
            if (payload.eventType === "INSERT" && onInsert) {
              onInsert(payload.new as AssociateRow);
            } else if (payload.eventType === "UPDATE" && onUpdate) {
              onUpdate(payload.new as AssociateRow);
            }
            if (onAnyChange) {
              onAnyChange();
            }
          }
        )
        .subscribe();

      return () => {
        if (channelRef.current) {
          removeRealtimeChannel(channelRef.current).catch(() => {});
          channelRef.current = null;
        }
      };
    } catch {
      // Graceful fallback if realtime is unavailable
    }
  }, [enabled, onInsert, onUpdate, onAnyChange]);
}
