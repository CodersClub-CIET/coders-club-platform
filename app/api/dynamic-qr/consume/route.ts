import { NextResponse } from "next/server";
import {
  verifyAndConsumeAttendance,
} from "@/lib/dynamic-qr/server-store";
import {
  type ConsumeChallengeRequest,
  QRErrorCode,
} from "@/lib/dynamic-qr/types";

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as ConsumeChallengeRequest;

    // Validate required QR attendance fields
    if (
      !body.session_id ||
      !body.challenge_token ||
      !body.attendee_type
    ) {
      return NextResponse.json(
        {
          success: false,
          error_code:
            QRErrorCode.INVALID_ATTENDEE_DATA,
          message:
            "Missing required fields: session_id, challenge_token, and attendee_type are required.",
        },
        { status: 400 }
      );
    }

    // Validate attendee role
    if (
      body.attendee_type !== "student" &&
      body.attendee_type !== "associate"
    ) {
      return NextResponse.json(
        {
          success: false,
          error_code:
            QRErrorCode.INVALID_ATTENDEE_DATA,
          message:
            "attendee_type must be either student or associate.",
        },
        { status: 400 }
      );
    }

    // Validate attendee-specific information
    if (
      body.attendee_type === "student" &&
      !body.student_reg_number?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error_code:
            QRErrorCode.INVALID_ATTENDEE_DATA,
          message:
            "Student Register / Roll Number is required.",
        },
        { status: 400 }
      );
    }

    if (
      body.attendee_type === "associate" &&
      !body.associate_id?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error_code:
            QRErrorCode.INVALID_ATTENDEE_DATA,
          message:
            "Associate ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Server-side request information.
     * These values are not placed inside the QR token.
     */
    const headers = request.headers;

    const ip =
      headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        .trim() ||
      headers.get("x-real-ip") ||
      "127.0.0.1";

    const userAgent =
      headers.get("user-agent") ||
      "Unknown Device";

    const result =
      await verifyAndConsumeAttendance(
        body,
        {
          ip,
          userAgent,
        }
      );

    if (!result.success) {
      let status = 400;

      switch (result.error_code) {
        case QRErrorCode.DUPLICATE_ATTENDANCE:
          status = 409;
          break;

        case QRErrorCode.CHALLENGE_EXPIRED:
        case QRErrorCode.CHALLENGE_ALREADY_CONSUMED:
        case QRErrorCode.SCANNER_REPLAY_DETECTED:
          status = 410;
          break;

        case QRErrorCode.SESSION_NOT_FOUND:
        case QRErrorCode.CHALLENGE_NOT_FOUND:
          status = 404;
          break;

        case QRErrorCode.UNAUTHORIZED:
          status = 401;
          break;

        case QRErrorCode.ROLE_MISMATCH:
          status = 403;
          break;
      }

      return NextResponse.json(
        result,
        { status }
      );
    }

    return NextResponse.json(
      result,
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Internal server error during attendance verification";

    return NextResponse.json(
      {
        success: false,
        error_code:
          QRErrorCode.SERVER_ERROR,
        message,
      },
      { status: 500 }
    );
  }
}