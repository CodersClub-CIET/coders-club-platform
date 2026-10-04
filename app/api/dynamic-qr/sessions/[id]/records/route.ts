import { NextResponse } from "next/server";
import { getSessionAttendanceRecords } from "@/lib/dynamic-qr/server-store";

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

    const records =
      await getSessionAttendanceRecords(id);

    return NextResponse.json(
      {
        records,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to retrieve attendance records";

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