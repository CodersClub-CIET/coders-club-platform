"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/auth";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const submitting = useRef(false);
  const mounted = useRef(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
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
      if (mounted.current)
        setError("Unable to sign out. Please check your connection and try again.");
    } finally {
      submitting.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#292D33] bg-[#171A20] px-3 py-2 text-xs font-mono font-semibold text-[#9B9EA6] hover:border-[#FF2A1A]/50 hover:bg-[#FF2A1A]/10 hover:text-[#FF2A1A] transition-all duration-150 disabled:opacity-50"
      >
        <LogOut className="size-3.5" />
        <span>{loading ? "DISCONNECTING..." : "DISCONNECT SESSION"}</span>
      </button>
      {error && (
        <p role="alert" className="text-[11px] font-mono text-[#FF2A1A] mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
