import { calculateLinkedInScore } from "./linkedin";

console.log("LinkedIn Score Test");

const result = calculateLinkedInScore(72);

console.log("LinkedIn Score:", result);

if (result !== 72) {
  throw new Error(
    `Expected LinkedIn Score 72, got ${result}`,
  );
}

console.log("LinkedIn Score test passed.");