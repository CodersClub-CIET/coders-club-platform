import { NextResponse } from "next/server";
import { getSessionById } from "@/lib/dynamic-qr/server-store";

export async function GET(
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

    const session = await getSessionById(id);

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

    return NextResponse.json(
      {
        session,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to retrieve session";

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