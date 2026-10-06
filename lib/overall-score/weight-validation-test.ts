import { validateOverallScoreWeights } from "./calculator";

console.log("Weight Validation Test");

// Valid weights: total = 100%
validateOverallScoreWeights({
  attendance: 25,
  eventPerformance: 40,
  github: 20,
  linkedin: 15,
});

console.log("Valid weights accepted.");

// Invalid weights: total = 95%
try {
  validateOverallScoreWeights({
    attendance: 25,
    eventPerformance: 40,
    github: 20,
    linkedin: 10,
  });

  throw new Error("Invalid weights were accepted.");
} catch (error) {
  if (
    error instanceof Error &&
    error.message === "Invalid weights were accepted."
  ) {
    throw error;
  }

  console.log("Invalid weights correctly rejected.");
}

console.log("Weight validation test passed.");