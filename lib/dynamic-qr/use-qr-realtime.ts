"use client";

import { useEffect, useRef } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/supabase/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { QRChallenge } from "./types";

interface UseQRRealtimeOptions {
  sessionId?: string;
  onChallengeRotated?: (challenge: QRChallenge, remainingSeconds: number) => void;
  onSessionEnded?: () => void;
  onAttendanceMarked?: (data: { count?: number; attendeeName?: string }) => void;
}

export function useQRRealtime({
  sessionId,
  onChallengeRotated,
  onSessionEnded,
  onAttendanceMarked,
}: UseQRRealtimeOptions): void {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    try {
      const channelName = `dynamic-qr-${sessionId}`;
      const channel = createRealtimeChannel(channelName);
      channelRef.current = channel;

      channel
        .on("broadcast", { event: "challenge-rotated" }, (payload) => {
          if (payload?.payload?.challenge && onChallengeRotated) {
            onChallengeRotated(
              payload.payload.challenge,
              payload.payload.remaining_seconds || 30
            );
          }
        })
        .on("broadcast", { event: "session-ended" }, () => {
          if (onSessionEnded) {
            onSessionEnded();
          }
        })
        .on("broadcast", { event: "attendance-marked" }, (payload) => {
          if (onAttendanceMarked) {
            onAttendanceMarked(payload?.payload || {});
          }
        })
        .subscribe();

      return () => {
        if (channelRef.current) {
          removeRealtimeChannel(channelRef.current).catch(() => {});
          channelRef.current = null;
        }
      };
    } catch {
      // Graceful fallback if Supabase client is not fully configured
    }
  }, [sessionId, onChallengeRotated, onSessionEnded, onAttendanceMarked]);
}
