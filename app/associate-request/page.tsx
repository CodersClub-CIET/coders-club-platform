"use client";

import Link from "next/link";
import { useState } from "react";
import { submitAssociateAccessRequest } from "@/lib/associates/access-requests";
import { Terminal, ArrowRight } from "lucide-react";

export default function AssociateRequestPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await submitAssociateAccessRequest({
        fullName: String(form.get("fullName") || ""),
        email: String(form.get("email") || ""),
        phone: String(form.get("phone") || ""),
        department: String(form.get("department") || ""),
        year: Number(form.get("year")) || undefined,
        section: String(form.get("section") || ""),
        reason: String(form.get("reason") || ""),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit your request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#08090B] text-[#F3F1EC] selection:bg-[#FF2A1A] selection:text-white flex flex-col justify-between">
      {/* Top Bar */}
      <header className="border-b border-[#292D33] px-6 py-4 sm:px-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded border border-[#292D33] bg-[#0D0F12] text-[#FF2A1A]">
            <Terminal className="size-3.5" />
          </div>
          <span className="font-mono text-xs font-bold tracking-[0.2em] text-[#F3F1EC]">
            CODERS CLUB CIET
          </span>
        </Link>
        <Link
          href="/login"
          className="font-mono text-xs text-[#9B9EA6] hover:text-[#F3F1EC] transition-colors"
        >
          ← BACK TO LOGIN
        </Link>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-6 py-12 sm:px-10 w-full flex-1 flex flex-col justify-center">
        <div className="space-y-8">
          <div className="space-y-3 border-b border-[#292D33] pb-6">
            <div className="flex items-center gap-2.5">
              <span className="h-[2px] w-6 bg-[#FF2A1A]" />
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-[#FF2A1A]">
                ASSOCIATE ONBOARDING PROTOCOL
              </p>
            </div>
            <h1 className="font-display-title text-[#F3F1EC] tracking-tight">
              Request Associate Access
            </h1>
            <p className="text-sm text-[#9B9EA6] max-w-xl font-normal leading-relaxed">
              Submit your academic details to apply for an operational Associate role. Applications are reviewed and approved directly by club administrators.
            </p>
          </div>

          {submitted ? (
            <div className="border border-[#32C979]/30 bg-[#32C979]/5 p-8 space-y-4">
              <p className="font-display text-2xl font-light text-[#F3F1EC]">
                Application Successfully Queued.
              </p>
              <p className="text-sm text-[#9B9EA6] font-mono leading-relaxed">
                Your Associate access request has been submitted to the admin audit stream. Once approved, you will be issued a one-time activation credential to set your password.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-[#FF2A1A] hover:bg-[#C51D16] text-white px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider rounded transition-colors"
                >
                  <span>RETURN TO LOGIN</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="border border-[#292D33] bg-[#0D0F12] p-8 sm:p-10 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {[
                  ["fullName", "Full name *", "text", "e.g. Mithun Krishna"],
                  ["email", "College Email *", "email", "e.g. associate@ciet.edu.in"],
                  ["phone", "Phone number", "tel", "e.g. +91 98765 43210"],
                  ["department", "Department *", "text", "e.g. Computer Science"],
                  ["year", "Year of Study", "number", "1 to 4"],
                  ["section", "Section", "text", "e.g. B"],
                ].map(([name, label, type, placeholder]) => (
                  <div key={name} className="space-y-1.5">
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9B9EA6]">
                      {label}
                    </label>
                    <input
                      name={name}
                      type={type}
                      placeholder={placeholder}
                      required={name === "fullName" || name === "email" || name === "department"}
                      min={type === "number" ? 1 : undefined}
                      max={type === "number" ? 4 : undefined}
                      className="w-full bg-[#08090B] border border-[#292D33] text-[#F3F1EC] rounded px-4 py-2.5 focus:border-[#FF2A1A]/50 focus:outline-none text-sm placeholder:text-[#686C74] font-mono"
                    />
                  </div>
                ))}

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9B9EA6]">
                    Reason or responsibility statement
                  </label>
                  <textarea
                    name="reason"
                    rows={3}
                    placeholder="Briefly state your intended contributions or coordinator responsibilities..."
                    className="w-full bg-[#08090B] border border-[#292D33] text-[#F3F1EC] rounded px-4 py-2.5 focus:border-[#FF2A1A]/50 focus:outline-none text-sm placeholder:text-[#686C74] font-mono"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="text-[#FF2A1A] text-xs font-mono bg-[#FF2A1A]/5 border border-[#FF2A1A]/20 p-3"
                >
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-[#292D33]">
                <Link
                  href="/login"
                  className="font-mono text-xs text-[#686C74] hover:text-[#F3F1EC] transition-colors"
                >
                  CANCEL
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#FF2A1A] hover:bg-[#C51D16] text-white font-mono text-xs font-bold uppercase tracking-widest px-6 py-3 transition-colors disabled:opacity-50"
                >
                  {saving ? "DISPATCHING REQUEST..." : "SUBMIT ACCESS REQUEST"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="border-t border-[#292D33] px-6 py-4 text-center font-mono text-[10px] text-[#686C74]">
        COIMBATORE INSTITUTE OF ENGINEERING AND TECHNOLOGY // ASSOCIATE PROTOCOL
      </footer>
    </div>
  );
}
