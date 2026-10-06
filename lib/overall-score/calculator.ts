export interface OverallScoreComponents {
  attendance: number;
  eventPerformance: number;
  github: number;
  linkedin: number;
}

export interface OverallScoreWeights {
  attendance: number;
  eventPerformance: number;
  github: number;
  linkedin: number;
}

export interface OverallScoreBreakdown {
  attendance: number;
  eventPerformance: number;
  github: number;
  linkedin: number;
  overall: number;
}

function validateScore(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }

  if (value < 0 || value > 100) {
    throw new Error(`${name} must be between 0 and 100`);
  }
}

function validateWeight(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} weight must be a finite number`);
  }

  if (value < 0 || value > 100) {
    throw new Error(`${name} weight must be between 0 and 100`);
  }
}

/**
 * Validates that all Overall Score weights are valid
 * and that their total is exactly 100%.
 */
export function validateOverallScoreWeights(
  weights: OverallScoreWeights,
): void {
  validateWeight("Attendance", weights.attendance);
  validateWeight(
    "Event Performance",
    weights.eventPerformance,
  );
  validateWeight("GitHub", weights.github);
  validateWeight("LinkedIn", weights.linkedin);

  const total =
    weights.attendance +
    weights.eventPerformance +
    weights.github +
    weights.linkedin;

  if (Math.abs(total - 100) > 0.000001) {
    throw new Error(
      `Overall Score weights must total 100%. Current total: ${total}%`,
    );
  }
}

export function calculateOverallScore(
  components: OverallScoreComponents,
  weights: OverallScoreWeights,
): OverallScoreBreakdown {
  validateScore("Attendance", components.attendance);
  validateScore(
    "Event Performance",
    components.eventPerformance,
  );
  validateScore("GitHub", components.github);
  validateScore("LinkedIn", components.linkedin);

  validateOverallScoreWeights(weights);

  const attendanceContribution =
    components.attendance * (weights.attendance / 100);

  const eventPerformanceContribution =
    components.eventPerformance *
    (weights.eventPerformance / 100);

  const githubContribution =
    components.github * (weights.github / 100);

  const linkedinContribution =
    components.linkedin * (weights.linkedin / 100);

  const overall =
    attendanceContribution +
    eventPerformanceContribution +
    githubContribution +
    linkedinContribution;

  return {
    attendance: Number(
      attendanceContribution.toFixed(2),
    ),
    eventPerformance: Number(
      eventPerformanceContribution.toFixed(2),
    ),
    github: Number(githubContribution.toFixed(2)),
    linkedin: Number(linkedinContribution.toFixed(2)),
    overall: Number(overall.toFixed(2)),
  };
}