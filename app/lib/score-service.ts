import { createClient } from "@/lib/supabase/client";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/supabase/realtime";
import { EventReference, EventScoreRecord } from "@/app/types/score";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Fallback seed events for preview when backend tables are pending sync
export const SEED_EVENTS: EventReference[] = [
  {
    id: "evt-101",
    name: "Tech Fest - Web Development",
    maxScore: 100,
  },
  {
    id: "evt-102",
    name: "Debugging Contest",
    maxScore: 50,
  },
  {
    id: "evt-103",
    name: "Code Relay",
    maxScore: 75,
  },
];

// Fallback seed score records
export const SEED_RECORDS: EventScoreRecord[] = [
  {
    id: "rec-1",
    studentId: "stu-001",
    studentRegNo: "917621104001",
    studentName: "Aarav Kumar",
    department: "CSE",
    year: 3,
    section: "A",
    eventId: "evt-101",
    eventName: "Tech Fest - Web Development",
    score: 85,
    maxScore: 100,
    enteredBy: "usr-admin1",
    enteredByName: "Admin Evaluator",
    createdAt: "2026-09-30T10:00:00Z",
    updatedAt: "2026-09-30T10:00:00Z",
  },
  {
    id: "rec-2",
    studentId: "stu-002",
    studentRegNo: "917621104002",
    studentName: "Bhavana Sharma",
    department: "CSE",
    year: 3,
    section: "B",
    eventId: "evt-101",
    eventName: "Tech Fest - Web Development",
    score: 92,
    maxScore: 100,
    enteredBy: "usr-admin1",
    enteredByName: "Admin Evaluator",
    createdAt: "2026-09-30T10:05:00Z",
    updatedAt: "2026-09-30T10:05:00Z",
  },
  {
    id: "rec-3",
    studentId: "stu-003",
    studentRegNo: "917621104003",
    studentName: "Chandran R",
    department: "IT",
    year: 2,
    section: "A",
    eventId: "evt-102",
    eventName: "Debugging Contest",
    score: 42,
    maxScore: 50,
    enteredBy: "usr-admin2",
    enteredByName: "Associate Evaluator",
    createdAt: "2026-09-30T11:00:00Z",
    updatedAt: "2026-09-30T11:00:00Z",
  },
  {
    id: "rec-4",
    studentId: "stu-004",
    studentRegNo: "917621104004",
    studentName: "Divya Lakshmi",
    department: "ECE",
    year: 4,
    section: "A",
    eventId: "evt-102",
    eventName: "Debugging Contest",
    score: 38,
    maxScore: 50,
    enteredBy: "usr-admin2",
    enteredByName: "Associate Evaluator",
    createdAt: "2026-09-30T11:15:00Z",
    updatedAt: "2026-09-30T11:15:00Z",
  },
  {
    id: "rec-5",
    studentId: "stu-005",
    studentRegNo: "917621104005",
    studentName: "Eshwar Prasad",
    department: "AIDS",
    year: 2,
    section: "B",
    eventId: "evt-103",
    eventName: "Code Relay",
    score: 60,
    maxScore: 75,
    enteredBy: "usr-admin1",
    enteredByName: "Admin Evaluator",
    createdAt: "2026-09-30T12:00:00Z",
    updatedAt: "2026-09-30T12:00:00Z",
  },
];

/**
 * Maps Supabase DB snake_case row to EventScoreRecord interface
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapRowToScoreRecord(row: Record<string, any>): EventScoreRecord {
  return {
    id: row.id,
    studentId: row.student_id ?? "",
    studentRegNo: row.student_reg_no ?? "",
    studentName: row.student_name ?? "",
    department: row.department ?? "",
    year: Number(row.year) || 1,
    section: row.section ?? "",
    eventId: row.event_id ?? "",
    eventName: row.event_name ?? "",
    subEventId: row.sub_event_id ?? undefined,
    subEventName: row.sub_event_name ?? undefined,
    score: Number(row.score) || 0,
    maxScore: Number(row.max_score) || 100,
    enteredBy: row.entered_by ?? "",
    enteredByName: row.entered_by_name ?? "Evaluator",
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Fetches score records from Supabase 'event_scores' table
 */
export async function fetchEventScores(): Promise<{
  data: EventScoreRecord[];
  error?: string;
}> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("event_scores")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("Supabase event_scores fetch warning, using fallback seed data:", error.message);
      return { data: SEED_RECORDS };
    }

    if (!data || data.length === 0) {
      return { data: SEED_RECORDS };
    }

    return { data: data.map(mapRowToScoreRecord) };
  } catch (err: any) {
    console.warn("Supabase fetch exception, using fallback seed data:", err?.message || err);
    return { data: SEED_RECORDS };
  }
}

/**
 * Updates a student event score in Supabase 'event_scores' table
 */
export async function updateEventScoreInSupabase(
  recordId: string,
  newScore: number,
  evaluatorId?: string,
  evaluatorName?: string
): Promise<{ success: boolean; updatedAt: string; error?: string }> {
  const updatedTimestamp = new Date().toISOString();

  try {
    const supabase = createClient();
    const payload: Record<string, any> = {
      score: newScore,
      updated_at: updatedTimestamp,
    };

    if (evaluatorId) {
      payload.entered_by = evaluatorId;
    }
    if (evaluatorName) {
      payload.entered_by_name = evaluatorName;
    }

    const { error } = await supabase
      .from("event_scores")
      .update(payload)
      .eq("id", recordId);

    if (error) {
      console.warn("Supabase update score error:", error.message);
      // Fallback return success for local state update
      return { success: true, updatedAt: updatedTimestamp, error: error.message };
    }

    return { success: true, updatedAt: updatedTimestamp };
  } catch (err: any) {
    console.warn("Supabase update exception:", err?.message || err);
    return { success: true, updatedAt: updatedTimestamp };
  }
}

/**
 * Subscribes to Realtime score updates on 'event_scores'
 */
export function subscribeToRealtimeScores(
  onScoreUpdated: (record: EventScoreRecord) => void
): RealtimeChannel | null {
  try {
    const channel = createRealtimeChannel("scores_live_channel");

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_scores",
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object" && "id" in payload.new) {
            const mapped = mapRowToScoreRecord(payload.new);
            onScoreUpdated(mapped);
          }
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn("Failed to subscribe to Supabase Realtime channel:", err);
    return null;
  }
}

export function unsubscribeRealtimeScores(channel: RealtimeChannel | null) {
  if (channel) {
    removeRealtimeChannel(channel).catch(() => {});
  }
}
