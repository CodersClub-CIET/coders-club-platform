"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (mountedRef.current) router.replace("/");
    } catch (err: unknown) {
      if (mountedRef.current) {
        setError(err instanceof Error && err.name === "SupabaseConfigurationError"
          ? err.message
          : err instanceof Error && /fetch|network/i.test(err.message)
          ? "Cannot connect to Supabase. Check your connection and project configuration, then try again."
          : "Sign in failed. Check your credentials and try again.");
      }
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-6 rounded-xl border p-6"
      >
        <div>
          <h1 className="text-2xl font-semibold">Coders Club</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md border px-4 py-2"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="pt-2 border-t text-center text-xs text-muted-foreground">
          <p>Testing Attendance Management?</p>
          <a
            href="/attendance"
            className="text-indigo-600 hover:underline font-medium inline-block mt-1"
          >
            Go to Standalone Attendance Portal &rarr;
          </a>
        </div>
      </form>
    </main>
  );
}