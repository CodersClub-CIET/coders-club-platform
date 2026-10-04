"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-2xl font-semibold">
            Something went wrong
          </h1>

          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md border px-4 py-2"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}