import { calculateEventPerformance } from "./event-performance";

console.log("Event Performance Test");

const result = calculateEventPerformance({
  score: 42,
  maxScore: 50,
});

console.log("Event Performance:", result);

if (result !== 84) {
  throw new Error(
    `Expected Event Performance 84, got ${result}`,
  );
}

console.log("Event Performance test passed.");