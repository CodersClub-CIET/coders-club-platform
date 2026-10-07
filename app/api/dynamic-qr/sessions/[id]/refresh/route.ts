import { NextResponse } from "next/server";
import { rotateChallenge } from "@/lib/dynamic-qr/server-store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Challenge validity is controlled by the server/store.
    // Do not accept a client-provided validity period.
    const result = await rotateChallenge(id);

    if (!result) {
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
      challenge: result.challenge,
      remaining_seconds: result.remainingSeconds,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to refresh challenge";

    return NextResponse.json(
      {
        error: {
          message,
        },
      },
      { status: 400 }
    );
  }
}