import { calculateStudentOverallScore } from "./overall-score";

console.log("Overall Score Integration Test");

const result = calculateStudentOverallScore(
  {
    attendance: {
      attendanceRate: 85,
    },

    eventPerformance: {
      score: 42,
      maxScore: 50,
    },

    github: 78,

    linkedin: 72,
  },
  {
    attendance: 25,
    eventPerformance: 40,
    github: 20,
    linkedin: 15,
  },
);

console.log("Components:");
console.log(result.components);

console.log("Breakdown:");
console.log(result);

console.log("Overall Score:", result.overall);

/*
  Attendance:
  85 × 25% = 21.25

  Event Performance:
  42 / 50 × 100 = 84
  84 × 40% = 33.60

  GitHub:
  78 × 20% = 15.60

  LinkedIn:
  72 × 15% = 10.80

  Overall:
  21.25 + 33.60 + 15.60 + 10.80 = 81.25
*/

if (result.components.attendance !== 85) {
  throw new Error(
    `Expected attendance 85, got ${result.components.attendance}`,
  );
}

if (result.components.eventPerformance !== 84) {
  throw new Error(
    `Expected event performance 84, got ${result.components.eventPerformance}`,
  );
}

if (result.components.github !== 78) {
  throw new Error(
    `Expected GitHub 78, got ${result.components.github}`,
  );
}

if (result.components.linkedin !== 72) {
  throw new Error(
    `Expected LinkedIn 72, got ${result.components.linkedin}`,
  );
}

if (result.overall !== 81.25) {
  throw new Error(
    `Expected overall score 81.25, got ${result.overall}`,
  );
}

console.log("Overall Score integration test passed.");