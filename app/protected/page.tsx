"use client";

import { toast } from "sonner";

export default function ProtectedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <button
        type="button"
        onClick={() => toast.success("Toast system is working!")}
        className="rounded-md border px-4 py-2"
      >
        Test Toast
      </button>
    </main>
  );
}