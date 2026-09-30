"use client";

import Link from "next/link";
import { toast } from "sonner";

export default function ProtectedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => toast.success("Toast system is working!")}
        className="rounded-md border px-4 py-2"
      >
        Test Toast
      </button>

      <Link
        href="/protected/settings"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go to Settings
      </Link>
    </main>
  );
}
