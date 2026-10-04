import {
  calculateOverallScore,
  type OverallScoreComponents,
  type OverallScoreWeights,
  type OverallScoreBreakdown,
} from "./calculator";

import { calculateAttendanceScore } from "./attendance";
import { calculateEventPerformance } from "./event-performance";
import { calculateGitHubScore } from "./github";
import { calculateLinkedInScore } from "./linkedin";

import type { StudentAttendanceSummary } from "../../lib/attendance/types";
import type { EventScoreRecord } from "../../app/types/score";

export interface OverallScoreInput {
  attendance: Pick<StudentAttendanceSummary, "attendanceRate">;
  eventPerformance: Pick<EventScoreRecord, "score" | "maxScore">;
  github: number;
  linkedin: number;
}

export interface OverallScoreResult extends OverallScoreBreakdown {
  components: OverallScoreComponents;
  weights: OverallScoreWeights;
}

/**
 * Calculates the complete Overall Score for one student.
 *
 * Each component is first normalized to a 0–100 score.
 * The existing calculator then applies the configured weights.
 */
export function calculateStudentOverallScore(
  input: OverallScoreInput,
  weights: OverallScoreWeights,
): OverallScoreResult {
  const components: OverallScoreComponents = {
    attendance: calculateAttendanceScore(input.attendance),

    eventPerformance: calculateEventPerformance(
      input.eventPerformance,
    ),

    github: calculateGitHubScore(input.github),

    linkedin: calculateLinkedInScore(input.linkedin),
  };

  const breakdown = calculateOverallScore(
    components,
    weights,
  );

  return {
    ...breakdown,
    components,
    weights,
  };
}