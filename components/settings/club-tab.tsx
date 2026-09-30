"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getClubSettings,
  saveClubSettings,
} from "@/lib/settings/settings-service";
import type { ClubSettings } from "@/lib/settings/types";
import { Building2, Save, ShieldCheck } from "lucide-react";

export function ClubTab() {
  const [settings, setSettings] = useState<ClubSettings>(() =>
    getClubSettings()
  );
  const [saving, setSaving] = useState(false);

  function handleChange(
    field: keyof ClubSettings,
    value: string | boolean
  ) {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!settings.clubName.trim()) {
      toast.error("Club name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      saveClubSettings(settings);
      toast.success("Club configuration saved successfully!");
    } catch {
      toast.error("Failed to save club configuration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4 text-purple-950 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-200">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
        <div className="text-sm">
          <p className="font-semibold">Administrator Only Controls</p>
          <p className="mt-0.5 text-purple-900/80 dark:text-purple-300/80">
            These settings govern club-wide metadata, academic terms, and registration status across the platform.
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Club Information & Terms</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Update the institutional metadata for Coders Club CIET.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="clubName" className="text-sm font-medium">
              Club Name
            </label>
            <input
              id="clubName"
              type="text"
              required
              value={settings.clubName}
              onChange={(e) => handleChange("clubName", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contactEmail" className="text-sm font-medium">
              Official Contact Email
            </label>
            <input
              id="contactEmail"
              type="email"
              required
              value={settings.contactEmail}
              onChange={(e) => handleChange("contactEmail", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="academicYear" className="text-sm font-medium">
              Academic Year
            </label>
            <input
              id="academicYear"
              type="text"
              required
              value={settings.academicYear}
              onChange={(e) => handleChange("academicYear", e.target.value)}
              placeholder="e.g. 2026 - 2027"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="semester" className="text-sm font-medium">
              Current Semester
            </label>
            <input
              id="semester"
              type="text"
              required
              value={settings.semester}
              onChange={(e) => handleChange("semester", e.target.value)}
              placeholder="Odd Semester / Even Semester"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <label htmlFor="announcementBanner" className="text-sm font-medium">
            Active Club Announcement Banner
          </label>
          <textarea
            id="announcementBanner"
            rows={2}
            value={settings.announcementBanner || ""}
            onChange={(e) => handleChange("announcementBanner", e.target.value)}
            placeholder="Banner message displayed to club associates and visitors..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="space-y-0.5">
            <label htmlFor="registrationOpen" className="text-sm font-medium cursor-pointer">
              Associate / Student Registration
            </label>
            <p className="text-xs text-muted-foreground">
              When toggled off, new user registration is temporarily suspended.
            </p>
          </div>
          <input
            id="registrationOpen"
            type="checkbox"
            checked={settings.registrationOpen}
            onChange={(e) => handleChange("registrationOpen", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving Configuration..." : "Save Club Settings"}
        </Button>
      </div>
    </form>
  );
}
