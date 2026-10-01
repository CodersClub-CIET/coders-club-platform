"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");


    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
      setError(
        "Supabase credentials are not configured in .env.local (currently using placeholder values). Please set your actual NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
      );

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);

      setLoading(false);
      return;
    }


    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Failed to fetch")) {
          setError(
            "Cannot connect to Supabase backend: Failed to fetch. Please verify that your NEXT_PUBLIC_SUPABASE_URL in .env.local is valid and reachable."
          );
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during sign in."
      );
      setLoading(false);
    }

    window.location.href = "/";

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
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">
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

        <button
          type="button"
          onClick={() => toast.success("Toast system is working!")}
          className="w-full rounded-md border px-4 py-2"
        >
          Test Toast
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