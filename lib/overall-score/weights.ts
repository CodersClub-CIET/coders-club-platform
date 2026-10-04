import type { OverallScoreWeights } from "./calculator";

export const DEFAULT_OVERALL_SCORE_WEIGHTS: OverallScoreWeights = {
  attendance: 25,
  eventPerformance: 40,
  github: 20,
  linkedin: 15,
};

export function validateOverallScoreWeights(
  weights: OverallScoreWeights
): void {
  const values = [
    weights.attendance,
    weights.eventPerformance,
    weights.github,
    weights.linkedin,
  ];

  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("All overall score weights must be finite numbers.");
  }

  if (values.some((value) => value < 0 || value > 100)) {
    throw new Error("Each overall score weight must be between 0 and 100.");
  }

  const total =
    weights.attendance +
    weights.eventPerformance +
    weights.github +
    weights.linkedin;

  if (total !== 100) {
    throw new Error(
      `Overall score weights must total 100. Current total: ${total}.`
    );
  }
}