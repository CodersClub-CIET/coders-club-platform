import { NextResponse } from "next/server";
import { endSession } from "@/lib/dynamic-qr/server-store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_SESSION_ID",
            message: "Session ID is required.",
          },
        },
        { status: 400 }
      );
    }

    const session = await endSession(id);

    if (!session) {
      return NextResponse.json(
        {
          error: {
            code: "SESSION_NOT_FOUND",
            message: "Session not found",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      session_id: id,
      status: "ended",
      ended_at: session.ended_at,
      final_attendance_count:
        session.attendance_count,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to end session";

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