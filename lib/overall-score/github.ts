/**
 * Converts an externally supplied GitHub activity score
 * into the normalized 0–100 score used by Overall Score.
 *
 * The GitHub integration method is intentionally not fixed.
 * The score may eventually come from:
 * - Report upload
 * - Direct API connection
 * - Internal GitHub module
 */
export function calculateGitHubScore(score: number): number {
  if (!Number.isFinite(score)) {
    throw new Error("GitHub score must be a finite number");
  }

  if (score < 0 || score > 100) {
    throw new Error("GitHub score must be between 0 and 100");
  }

  return Number(score.toFixed(2));
}