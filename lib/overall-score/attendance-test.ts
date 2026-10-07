import { calculateAttendanceScore } from "./attendance";

console.log("Attendance Score Test");

const result = calculateAttendanceScore({
  attendanceRate: 85,
});

console.log("Attendance Score:", result);

if (result !== 85) {
  throw new Error(
    `Expected Attendance Score 85, got ${result}`,
  );
}

console.log("Attendance Score test passed.");