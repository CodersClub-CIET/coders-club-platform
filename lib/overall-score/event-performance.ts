import { calculatePercentage } from "../../app/lib/score-validation";
import type { EventScoreRecord } from "../../app/types/score";

/**
 * Converts an Event Score Management record
 * into a normalized Event Performance score from 0 to 100.
 */
export function calculateEventPerformance(
  record: Pick<EventScoreRecord, "score" | "maxScore">,
): number {
  return calculatePercentage(record.score, record.maxScore);
}