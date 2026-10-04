import {
  calculateOverallScore,
  validateOverallScoreWeights,
} from "./calculator";

const components = {
  attendance: 90,
  eventPerformance: 80,
  github: 70,
  linkedin: 60,
};

const weights = {
  attendance: 25,
  eventPerformance: 40,
  github: 20,
  linkedin: 15,
};

const result = calculateOverallScore(
  components,
  weights,
);

console.log("Overall Score Test");
console.log(result);

if (result.attendance !== 22.5) {
  throw new Error(
    `Expected attendance contribution 22.5, got ${result.attendance}`,
  );
}

if (result.eventPerformance !== 32) {
  throw new Error(
    `Expected event performance contribution 32, got ${result.eventPerformance}`,
  );
}

if (result.github !== 14) {
  throw new Error(
    `Expected GitHub contribution 14, got ${result.github}`,
  );
}

if (result.linkedin !== 9) {
  throw new Error(
    `Expected LinkedIn contribution 9, got ${result.linkedin}`,
  );
}

if (result.overall !== 77.5) {
  throw new Error(
    `Expected overall score 77.5, got ${result.overall}`,
  );
}

// Test invalid weight total.
try {
  validateOverallScoreWeights({
    attendance: 25,
    eventPerformance: 40,
    github: 20,
    linkedin: 10,
  });

  throw new Error("Invalid weights were accepted");
} catch (error) {
  if (
    error instanceof Error &&
    error.message === "Invalid weights were accepted"
  ) {
    throw error;
  }
}

console.log("All calculator tests passed.");