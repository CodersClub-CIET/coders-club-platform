import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Import server store methods
import {
  createSession,
  rotateChallenge,
  endSession,
  verifyAndConsumeAttendance,
  generateSecureOpaqueToken,
  getSessionById,
} from "../lib/dynamic-qr/server-store.ts";
import { QRErrorCode } from "../lib/dynamic-qr/types.ts";

describe("Dynamic QR Module - Core & Security Test Suite", () => {

  it("1. Generates cryptographically unpredictable opaque tokens", () => {
    const token1 = generateSecureOpaqueToken();
    const token2 = generateSecureOpaqueToken();

    assert.equal(typeof token1, "string");
    assert.equal(token1.length, 64); // 32 bytes hex encoded = 64 chars
    assert.notEqual(token1, token2);
    // Ensure no PII or plain text words
    assert.match(token1, /^[0-9a-f]{64}$/);
  });

  it("2. Starts attendance QR session successfully with correct context", async () => {
    const { session, challenge } = await createSession(
      {
        event_id: "test-event-101",
        event_name: "Web Development Bootcamp",
        sub_event_id: "track-nextjs",
        sub_event_name: "Next.js App Router",
        attendance_context: "session_1",
        target_role: "student",
        refresh_interval_seconds: 30,
      },
      { id: "assoc-123", role: "associate" }
    );

    assert.ok(session.id);
    assert.equal(session.event_id, "test-event-101");
    assert.equal(session.attendance_context, "session_1");
    assert.equal(session.target_role, "student");
    assert.equal(session.status, "active");
    assert.ok(session.session_code.startsWith("CC-"));

    assert.ok(challenge.id);
    assert.equal(challenge.session_id, session.id);
    assert.equal(challenge.status, "active");
    assert.equal(challenge.challenge_token.length, 64);
  });

  it("3. Successfully processes and marks valid student attendance", async () => {
    const { session, challenge } = await createSession(
      {
        event_id: "test-event-student",
        event_name: "React Workshop",
        attendance_context: "session_morning",
        target_role: "student",
        refresh_interval_seconds: 30,
      },
      { id: "assoc-1", role: "associate" }
    );

    const result = await verifyAndConsumeAttendance(
      {
        session_id: session.id,
        challenge_token: challenge.challenge_token,
        attendee_type: "student",
        student_reg_number: "71762105001",
        student_name: "Ezhilarasi K",
        student_department: "CSE",
        student_email: "ezhilarasi@college.edu",
        scanner_fingerprint: "fp-test-device-1",
      },
      { ip: "192.168.1.50", userAgent: "Mozilla/5.0 Android" }
    );

    assert.equal(result.success, true);
    assert.ok(result.record);
    assert.equal(result.record.student_reg_number, "71762105001");
    assert.equal(result.record.student_name, "Ezhilarasi K");
    assert.equal(result.record.verified_by_server, true);
    assert.equal(result.record.status, "valid");

    // Verify session attendee count incremented
    const updatedSession = await getSessionById(session.id);
    assert.equal(updatedSession?.attendance_count, 1);
  });

  it("4. Challenge replay prevention: Reused challenge is rejected", async () => {
    const { session, challenge } = await createSession(
      {
        event_id: "test-event-replay",
        event_name: "Cybersecurity Workshop",
        attendance_context: "session_1",
        target_role: "student",
        refresh_interval_seconds: 30,
      },
      { id: "assoc-1", role: "associate" }
    );

    // First scan: successful consumption
    const firstResult = await verifyAndConsumeAttendance({
      session_id: session.id,
      challenge_token: challenge.challenge_token,
      attendee_type: "student",
      student_reg_number: "71762105002",
      student_name: "First Student",
    });
    assert.equal(firstResult.success, true);

    // Second scan with the EXACT same token: must be rejected
    const replayResult = await verifyAndConsumeAttendance({
      session_id: session.id,
      challenge_token: challenge.challenge_token,
      attendee_type: "student",
      student_reg_number: "71762105003",
      student_name: "Second Student",
    });

    assert.equal(replayResult.success, false);
    assert.equal(replayResult.error_code, QRErrorCode.CHALLENGE_ALREADY_CONSUMED);
  });

  it("5. Duplicate attendance prevention: Same student cannot mark attendance twice in same context", async () => {
    const { session, challenge: ch1 } = await createSession(
      {
        event_id: "test-event-dup",
        event_name: "Python Bootcamp",
        attendance_context: "morning_session",
        target_role: "student",
        refresh_interval_seconds: 30,
      },
      { id: "assoc-1", role: "associate" }
    );

    // Student marks attendance with challenge 1
    const res1 = await verifyAndConsumeAttendance({
      session_id: session.id,
      challenge_token: ch1.challenge_token,
      attendee_type: "student",
      student_reg_number: "71762105010",
      student_name: "Priya",
    });
    assert.equal(res1.success, true);

    // Challenge rotates to challenge 2
    const rotateRes = await rotateChallenge(session.id);
    assert.ok(rotateRes);
    const ch2 = rotateRes.challenge;

    // Same student attempts to mark attendance again with the fresh challenge
    const res2 = await verifyAndConsumeAttendance({
      session_id: session.id,
      challenge_token: ch2.challenge_token,
      attendee_type: "student",
      student_reg_number: "71762105010",
      student_name: "Priya",
    });

    assert.equal(res2.success, false);
    assert.equal(res2.error_code, QRErrorCode.DUPLICATE_ATTENDANCE);
  });

  it("6. Expired challenge rejection: Challenges past expiration window are rejected", async () => {
    // Create session with 1-second validity
    const { session, challenge } = await createSession(
      {
        event_id: "test-event-expire",
        event_name: "Fast Expiry Workshop",
        attendance_context: "session_1",
        target_role: "student",
        refresh_interval_seconds: 1,
      },
      { id: "assoc-1", role: "associate" }
    );

    // Force challenge to be expired in the past
    challenge.expires_at = new Date(Date.now() - 5000).toISOString();

    const result = await verifyAndConsumeAttendance({
      session_id: session.id,
      challenge_token: challenge.challenge_token,
      attendee_type: "student",
      student_reg_number: "71762105020",
      student_name: "Late Student",
    });

    assert.equal(result.success, false);
    assert.equal(result.error_code, QRErrorCode.CHALLENGE_EXPIRED);
  });

  it("7. Session-ended QR rejection: Tokens from ended sessions are rejected", async () => {
    const { session, challenge } = await createSession(
      {
        event_id: "test-event-ended",
        event_name: "Closed Workshop",
        attendance_context: "session_1",
        target_role: "student",
        refresh_interval_seconds: 30,
      },
      { id: "assoc-1", role: "associate" }
    );

    // Coordinator ends session
    await endSession(session.id);

    const result = await verifyAndConsumeAttendance({
      session_id: session.id,
      challenge_token: challenge.challenge_token,
      attendee_type: "student",
      student_reg_number: "71762105030",
      student_name: "Post-event Student",
    });

    assert.equal(result.success, false);
    assert.equal(result.error_code, QRErrorCode.SESSION_ENDED);
  });

  it("8. Role mismatch protection: Associate QR cannot be consumed as Student", async () => {
    const { session, challenge } = await createSession(
      {
        event_id: "test-event-assoc-role",
        event_name: "Admin Review Meeting",
        attendance_context: "meeting_1",
        target_role: "associate",
        refresh_interval_seconds: 30,
      },
      { id: "admin-1", role: "admin" }
    );

    const result = await verifyAndConsumeAttendance({
      session_id: session.id,
      challenge_token: challenge.challenge_token,
      attendee_type: "student",
      student_reg_number: "71762105040",
      student_name: "Sneaky Student",
    });

    assert.equal(result.success, false);
    assert.equal(result.error_code, QRErrorCode.ROLE_MISMATCH);
  });

  it("9. Associate attendance flow: Valid associate attendance is accepted", async () => {
    const { session, challenge } = await createSession(
      {
        event_id: "test-event-assoc-duty",
        event_name: "Hackathon Mentorship",
        attendance_context: "mentor_duty",
        target_role: "associate",
        refresh_interval_seconds: 30,
      },
      { id: "admin-1", role: "admin" }
    );

    const result = await verifyAndConsumeAttendance({
      session_id: session.id,
      challenge_token: challenge.challenge_token,
      attendee_type: "associate",
      associate_id: "assoc-uuid-999",
      associate_email: "mentor@codersclub.org",
      student_name: "Mentor Associate",
    });

    assert.equal(result.success, true);
    assert.ok(result.record);
    assert.equal(result.record.attendee_type, "associate");
    assert.equal(result.record.associate_id, "assoc-uuid-999");
  });

  it("10. Security Audit: Verifies no Supabase service role keys in client code", () => {
    const clientFiles = [
      "app/dynamic-qr/page.tsx",
      "app/dynamic-qr/scan/page.tsx",
      "lib/dynamic-qr/client.ts",
      "lib/supabase/client.ts",
      "lib/supabase/realtime.ts",
    ];

    for (const relPath of clientFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        assert.ok(
          !content.includes("service_role"),
          `Forbidden service_role detected in client file: ${relPath}`
        );
        assert.ok(
          !content.includes("SERVICE_ROLE"),
          `Forbidden SERVICE_ROLE detected in client file: ${relPath}`
        );
      }
    }
  });

});
