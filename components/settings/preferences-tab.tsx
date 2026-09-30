"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/settings/settings-service";
import type { NotificationPreferences } from "@/lib/settings/types";
import { Bell, Save } from "lucide-react";

export function PreferencesTab() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    getNotificationPreferences()
  );
  const [saving, setSaving] = useState(false);

  function handleToggle(key: keyof NotificationPreferences) {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      saveNotificationPreferences(preferences);
      toast.success("Notification preferences saved!");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  const items = [
    {
      key: "clubAnnouncements" as const,
      title: "Club Announcements",
      desc: "Receive important broadcast notices, meeting schedules, and general announcements.",
    },
    {
      key: "eventReminders" as const,
      title: "Event Reminders",
      desc: "Get notified prior to hackathons, coding contests, and technical workshops starting.",
    },
    {
      key: "scoreUpdates" as const,
      title: "Score & Leaderboard Updates",
      desc: "Get alerted when contest results, problem solving scores, or leaderboards are published.",
    },
    {
      key: "emailDigest" as const,
      title: "Weekly Email Digest",
      desc: "Receive a weekly summary email detailing upcoming events and club highlights.",
    },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Notification Preferences</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose which notifications and updates you would like to receive.
        </p>

        <div className="divide-y">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-4"
            >
              <div className="space-y-0.5 pr-4">
                <label
                  htmlFor={item.key}
                  className="text-sm font-medium cursor-pointer"
                >
                  {item.title}
                </label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>

              <input
                id={item.key}
                type="checkbox"
                checked={preferences[item.key]}
                onChange={() => handleToggle(item.key)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </form>
  );
}
