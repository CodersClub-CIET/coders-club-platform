import type { ScoreValidationResult, UpdateScorePayload } from "../types/score";

/**
 * Validates a numeric score against boundary conditions.
 *
 * @param score - The score value to validate
 * @param maxScore - The maximum allowable score (default: 100)
 * @returns ScoreValidationResult with validity status and error messages
 */
export function validateScore(
  score: number,
  maxScore: number = 100
): ScoreValidationResult {
  const errors: string[] = [];

  if (typeof score !== "number" || Number.isNaN(score)) {
    errors.push("Score must be a valid number.");
    return { isValid: false, errors };
  }

  if (score < 0) {
    errors.push("Score cannot be negative.");
  }

  if (score > maxScore) {
    errors.push(`Score cannot exceed maximum allowed score of ${maxScore}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an UpdateScorePayload object.
 *
 * @param payload - The payload to validate
 * @param maxScore - The maximum allowable score for the event (default: 100)
 * @returns ScoreValidationResult with validity status and error messages
 */
export function validateScorePayload(
  payload: UpdateScorePayload,
  maxScore: number = 100
): ScoreValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    errors.push("Payload must be a valid object.");
    return { isValid: false, errors };
  }

  if (!payload.studentId || payload.studentId.trim() === "") {
    errors.push("Student ID is required.");
  }

  if (!payload.eventId || payload.eventId.trim() === "") {
    errors.push("Event ID is required.");
  }

  const scoreResult = validateScore(payload.score, maxScore);
  if (!scoreResult.isValid) {
    errors.push(...scoreResult.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates percentage from score and maxScore, rounded to 2 decimal places.
 *
 * @param score - The score achieved
 * @param maxScore - The maximum score possible
 * @returns Safe percentage rounded to 2 decimal places (0 if maxScore is <= 0 or invalid)
 */
export function calculatePercentage(score: number, maxScore: number): number {
  if (
    typeof score !== "number" ||
    typeof maxScore !== "number" ||
    Number.isNaN(score) ||
    Number.isNaN(maxScore) ||
    maxScore <= 0
  ) {
    return 0;
  }

  const percentage = (score / maxScore) * 100;
  return Math.round(percentage * 100) / 100;
}
