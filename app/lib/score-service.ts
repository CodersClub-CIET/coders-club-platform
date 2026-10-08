import { createClient } from "@/lib/supabase/client";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/supabase/realtime";
import { EventReference, EventScoreRecord } from "@/app/types/score";
import type { RealtimeChannel } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Maps a joined Supabase row from event_scores → event_participations → students
 * to the EventScoreRecord interface used by UI components.
 */
export function mapRowToScoreRecord(row: Record<string, any>): EventScoreRecord {
  // Participation join
  const participation = Array.isArray(row.event_participations)
    ? row.event_participations[0] ?? null
    : (row.event_participations ?? null);

  // Student join (via participation)
  const student = participation
    ? (Array.isArray(participation.students)
        ? participation.students[0] ?? null
        : participation.students ?? null)
    : null;

  // Current enrollment join (via student)
  const enrollments: any[] = student?.student_enrollments ?? [];
  const currentEnrollment = enrollments.find((e: any) => e.is_current) ?? enrollments[0] ?? null;

  // Class section join
  const classSection = currentEnrollment
    ? (Array.isArray(currentEnrollment.class_sections)
        ? currentEnrollment.class_sections[0] ?? null
        : currentEnrollment.class_sections ?? null)
    : null;

  // Program join
  const program = classSection
    ? (Array.isArray(classSection.programs)
        ? classSection.programs[0] ?? null
        : classSection.programs ?? null)
    : null;

  // Event node join (via participation)
  const eventNode = participation
    ? (Array.isArray(participation.event_nodes)
        ? participation.event_nodes[0] ?? null
        : participation.event_nodes ?? null)
    : null;

  // Scorer profile join
  const scorerProfile = Array.isArray(row.scorer_profile)
    ? row.scorer_profile[0] ?? null
    : (row.scorer_profile ?? null);

  return {
    id: row.id ?? "",
    studentId: student?.id ?? participation?.student_id ?? "",
    studentRegNo: student?.register_number ?? "",
    studentName: student?.name ?? "",
    department: program?.name ?? program?.code ?? "",
    year: Number(classSection?.year_of_study) || 0,
    section: classSection?.section ?? "",
    eventId: eventNode?.id ?? participation?.event_node_id ?? "",
    eventName: eventNode?.name ?? "",
    subEventId: undefined,
    subEventName: undefined,
    score: Number(row.score) || 0,
    maxScore: 100,
    enteredBy: row.scored_by ?? "",
    enteredByName: scorerProfile?.display_name ?? scorerProfile?.email ?? "Evaluator",
    createdAt: row.scored_at ?? row.updated_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Fetches score records from Supabase with full relational joins.
 * Optionally filters by a specific event_node_id.
 */
export async function fetchEventScores(eventNodeId?: string): Promise<{
  data: EventScoreRecord[];
  error?: string;
}> {
  try {
    const supabase = createClient();

    const SELECT = `
      id,
      score,
      remarks,
      scored_by,
      scored_at,
      updated_at,
      scorer_profile:user_profiles!event_scores_scored_by_fkey(display_name, email),
      event_participations(
        student_id,
        event_node_id,
        students(
          id,
          register_number,
          name,
          student_enrollments(
            is_current,
            class_sections(
              year_of_study,
              section,
              programs(code, name)
            )
          )
        ),
        event_nodes(id, name)
      )
    `.trim();

    let query = supabase
      .from("event_scores")
      .select(SELECT)
      .order("updated_at", { ascending: false });

    if (eventNodeId) {
      // Filter scores for a specific event by checking participation's event_node_id
      query = query.eq("event_participations.event_node_id", eventNodeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase event_scores fetch failed:", error.message);
      return { data: [], error: error.message };
    }

    return { data: (data ?? []).map(mapRowToScoreRecord) };
  } catch (err: any) {
    const message = err?.message || "Unable to load scores.";
    console.error("Supabase event_scores fetch exception:", message);
    return { data: [], error: message };
  }
}

/**
 * Updates a score record in event_scores. Uses scored_by (FK to user_profiles.id).
 */
export async function updateEventScoreInSupabase(
  recordId: string,
  newScore: number,
  scoredBy?: string
): Promise<{ success: boolean; updatedAt: string; error?: string }> {
  const updatedTimestamp = new Date().toISOString();

  try {
    const supabase = createClient();
    const payload: Record<string, any> = {
      score: newScore,
      updated_at: updatedTimestamp,
    };

    if (scoredBy) {
      payload.scored_by = scoredBy;
    }

    const { error } = await supabase
      .from("event_scores")
      .update(payload)
      .eq("id", recordId);

    if (error) {
      console.warn("Supabase update score error:", error.message);
      return { success: false, updatedAt: updatedTimestamp, error: error.message };
    }

    return { success: true, updatedAt: updatedTimestamp };
  } catch (err: any) {
    console.warn("Supabase update exception:", err?.message || err);
    return {
      success: false,
      updatedAt: updatedTimestamp,
      error: err?.message || "Unable to update score.",
    };
  }
}

/**
 * Fetches top-level event nodes as EventReference items for filter dropdowns.
 */
export async function fetchEventReferences(): Promise<EventReference[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("event_nodes")
    .select("id, name")
    .is("parent_id", null)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Supabase event_nodes fetch failed:", error.message);
    return [];
  }
  return (data ?? []).map((event) => ({ id: event.id, name: event.name, maxScore: 100 }));
}

/**
 * Subscribes to Realtime score updates on 'event_scores'.
 * NOTE: Realtime payload does not include joins, so we refetch the full record.
 */
export function subscribeToRealtimeScores(
  onScoreUpdated: (record: EventScoreRecord) => void
): RealtimeChannel | null {
  try {
    const supabase = createClient();
    const channel = createRealtimeChannel("scores_live_channel");

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_scores",
        },
        async (payload) => {
          if (!payload.new || typeof payload.new !== "object" || !("id" in payload.new)) return;
          // Refetch the full record with joins so all fields are populated
          const { data } = await supabase
            .from("event_scores")
            .select(
              `id, score, remarks, scored_by, scored_at, updated_at,
               scorer_profile:user_profiles!event_scores_scored_by_fkey(display_name, email),
               event_participations(
                 student_id, event_node_id,
                 students(id, register_number, name, student_enrollments(is_current, class_sections(year_of_study, section, programs(code, name)))),
                 event_nodes(id, name)
               )`
            )
            .eq("id", (payload.new as { id: string }).id)
            .maybeSingle();

          if (data) {
            onScoreUpdated(mapRowToScoreRecord(data));
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
