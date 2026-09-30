"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateUserProfile } from "@/lib/settings/settings-service";
import type { UserProfile } from "@/lib/settings/types";
import { AlertCircle, Save } from "lucide-react";

interface ProfileTabProps {
  profile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
}

export function ProfileTab({ profile, onProfileUpdated }: ProfileTabProps) {
  const [fullName, setFullName] = useState(profile.fullName || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [githubUsername, setGithubUsername] = useState(profile.githubUsername || "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateUserProfile({
        fullName,
        bio,
        githubUsername,
        linkedinUrl,
      });
      onProfileUpdated(updated);
      toast.success("Profile updated successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {!profile.approved && profile.role !== "admin" && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <p className="font-semibold">Associate Account Pending Approval</p>
            <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/80">
              Your associate account is awaiting verification by a Club Administrator. Protected associate actions will be activated once approved.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Personal Information</h2>
          <p className="text-sm text-muted-foreground">
            Update your public profile and contact preferences for Coders Club.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                disabled
                value={profile.email}
                className="w-full cursor-not-allowed rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Managed by Supabase Authentication. Contact an administrator to change your email.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other club members about yourself, technical interests, or domain expertise..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Social & Coding Profiles</h2>
          <p className="text-sm text-muted-foreground">
            Link your GitHub and LinkedIn to showcase projects and collaborate.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="githubUsername" className="text-sm font-medium">
                GitHub Username
              </label>
              <div className="flex rounded-md border shadow-xs focus-within:ring-2 focus-within:ring-ring">
                <span className="inline-flex items-center rounded-l-md border-r bg-muted px-3 text-xs text-muted-foreground">
                  github.com/
                </span>
                <input
                  id="githubUsername"
                  type="text"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="username"
                  className="w-full rounded-r-md bg-background px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="linkedinUrl" className="text-sm font-medium">
                LinkedIn Profile URL
              </label>
              <input
                id="linkedinUrl"
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving Changes..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
