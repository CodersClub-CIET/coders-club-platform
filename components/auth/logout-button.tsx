"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/auth";

export function LogoutButton() {
  const router = useRouter();
  const submitting = useRef(false);
  const mounted = useRef(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function handleLogout() {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError(null);
    try {
      await signOut();
      if (mounted.current) {
        router.replace("/login");
        router.refresh();
      }
    } catch {
      if (mounted.current) setError("Unable to sign out. Please check your connection and try again.");
    } finally {
      submitting.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleLogout} disabled={loading} className="rounded-md border px-4 py-2">
        {loading ? "Signing out..." : "Sign out"}
      </button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </>
  );
}
