"use client";

import React, { useState } from "react";
import { AttendancePeriod, AttendanceSession, CreateSessionInput } from "@/lib/attendance/types";
import { validateCreateSessionInput } from "@/lib/attendance/validation";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { Button } from "@/components/ui/button";
import { Calendar, PlusCircle, Sun, Moon, X, AlertCircle } from "lucide-react";

interface CreateSessionModalProps {
  onClose: () => void;
  onCreated: (session: AttendanceSession) => void;
}

export default function CreateSessionModal({ onClose, onCreated }: CreateSessionModalProps) {
  const [formData, setFormData] = useState<CreateSessionInput>({
    eventId: "evt-01",
    eventName: "Full Stack Web Development Hackathon",
    subEventName: "",
    period: "morning",
    sessionName: "",
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validation = validateCreateSessionInput(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setLoading(true);
      const newSession = await attendanceService.createSession(formData);
      onCreated(newSession);
      onClose();
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Failed to start session."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#111318] shadow-2xl border border-[#292D33] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#292D33] px-6 py-4 bg-[#08090B]/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#FF2A1A]/10 text-[#FF2A1A]">
              <PlusCircle className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F3F1EC]">Start Attendance Session</h2>
              <p className="text-xs text-[#686C74]">Configure event window and period</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#686C74] hover:text-[#9B9EA6] hover:bg-[#171A20] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                {errors.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            </div>
          )}

          {/* Event Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#9B9EA6] mb-1">Target Event</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 size-4 text-[#686C74]" />
              <input
                type="text"
                value={formData.eventName}
                onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                placeholder="e.g. Code Relay 2026"
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#08090B] border border-[#292D33] rounded-lg text-[#F3F1EC] focus:bg-[#111318] focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Sub Event (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-[#9B9EA6] mb-1">
              Sub-Event / Track <span className="text-[#686C74] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.subEventName || ""}
              onChange={(e) => setFormData({ ...formData, subEventName: e.target.value })}
              placeholder="e.g. Round 2: Debugging Contest"
              className="w-full px-3 py-2 text-xs bg-[#08090B] border border-[#292D33] rounded-lg text-[#F3F1EC] focus:bg-[#111318] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Period Selector (Morning / Afternoon) */}
          <div>
            <label className="block text-xs font-semibold text-[#9B9EA6] mb-1">Attendance Period</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, period: "morning" })}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  formData.period === "morning"
                    ? "bg-amber-50 border-amber-300 text-amber-900 shadow-sm"
                    : "bg-[#111318] border-[#292D33] text-[#9B9EA6] hover:bg-[#08090B]"
                }`}
              >
                <Sun className={`size-4 ${formData.period === "morning" ? "text-amber-500" : "text-[#686C74]"}`} />
                Morning
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, period: "afternoon" })}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  formData.period === "afternoon"
                    ? "bg-blue-50 border-blue-300 text-blue-900 shadow-sm"
                    : "bg-[#111318] border-[#292D33] text-[#9B9EA6] hover:bg-[#08090B]"
                }`}
              >
                <Moon className={`size-4 ${formData.period === "afternoon" ? "text-blue-500" : "text-[#686C74]"}`} />
                Afternoon
              </button>
            </div>
          </div>

          {/* Session Name */}
          <div>
            <label className="block text-xs font-semibold text-[#9B9EA6] mb-1">Session Title</label>
            <input
              type="text"
              value={formData.sessionName}
              onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
              placeholder="e.g. Day 1 Morning Attendance"
              className="w-full px-3 py-2 text-xs bg-[#08090B] border border-[#292D33] rounded-lg text-[#F3F1EC] focus:bg-[#111318] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#292D33]">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-[#FF2A1A] hover:bg-[#C51D16] text-white font-semibold"
            >
              {loading ? "Starting..." : "Start Session"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
