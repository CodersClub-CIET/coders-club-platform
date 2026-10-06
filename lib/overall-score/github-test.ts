import { calculateGitHubScore } from "./github";

console.log("GitHub Score Test");

const result = calculateGitHubScore(78);

console.log("GitHub Score:", result);

if (result !== 78) {
  throw new Error(
    `Expected GitHub Score 78, got ${result}`,
  );
}

console.log("GitHub Score test passed.");