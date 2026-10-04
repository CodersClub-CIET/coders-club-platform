import { NextResponse } from "next/server";
import {
  createSession,
  listActiveSessions,
} from "@/lib/dynamic-qr/server-store";
import { type CreateSessionRequest } from "@/lib/dynamic-qr/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetRoleParam = searchParams.get("target_role");

    let targetRole: "student" | "associate" | undefined;

    if (targetRoleParam === "student") {
      targetRole = "student";
    } else if (targetRoleParam === "associate") {
      targetRole = "associate";
    }

    const sessions = await listActiveSessions(targetRole);

    return NextResponse.json({ sessions });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to list sessions";

    return NextResponse.json(
      {
        error: {
          message,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as CreateSessionRequest;

    // Validate required fields
    if (
      !body.event_id ||
      !body.event_name ||
      !body.attendance_context ||
      !body.target_role
    ) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Missing required fields: event_id, event_name, attendance_context, and target_role are required.",
          },
        },
        { status: 400 }
      );
    }

    // Validate attendee role
    if (
      body.target_role !== "student" &&
      body.target_role !== "associate"
    ) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_TARGET_ROLE",
            message:
              "target_role must be either student or associate.",
          },
        },
        { status: 400 }
      );
    }

    // Validate refresh interval when provided
    if (
      body.refresh_interval_seconds !== undefined &&
      (!Number.isInteger(body.refresh_interval_seconds) ||
        body.refresh_interval_seconds <= 0)
    ) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REFRESH_INTERVAL",
            message:
              "refresh_interval_seconds must be a positive integer.",
          },
        },
        { status: 400 }
      );
    }

    /*
     * Attendance flow:
     * Admin -> Associate attendance QR
     * Associate -> Student attendance QR
     */
    const creatorRole =
      body.target_role === "associate"
        ? "admin"
        : "associate";

    /*
     * The actual authenticated creator identity will be
     * connected through the existing project authentication
     * foundation in the later security/API changes.
     *
     * For this change, keep the existing store contract intact.
     */
    const creator = {
      id: "system-creator",
      role: creatorRole as "admin" | "associate",
    };

    const { session, challenge } =
      await createSession(body, creator);

    return NextResponse.json(
      {
        session,
        challenge,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create attendance session";

    return NextResponse.json(
      {
        error: {
          message,
        },
      },
      { status: 500 }
    );
  }
}