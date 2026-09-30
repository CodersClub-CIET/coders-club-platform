"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { changeUserPassword } from "@/lib/settings/settings-service";
import type { UserProfile } from "@/lib/settings/types";
import { KeyRound, ShieldAlert, CheckCircle2 } from "lucide-react";

interface SecurityTabProps {
  profile: UserProfile;
}

export function SecurityTab({ profile }: SecurityTabProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      await changeUserPassword({ newPassword, confirmPassword });
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully!");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update password";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Change Password Card */}
      <form onSubmit={handlePasswordChange} className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Change Password</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Ensure your account stays secure with a strong password of at least 6 characters.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Updating Password..." : "Update Password"}
          </Button>
        </div>
      </form>

      {/* Account Authentication & Session Card */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Session & Account State</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Details about your current Supabase Auth identity and access token session.
        </p>

        <div className="rounded-md bg-muted/40 p-4 space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between py-1 border-b border-muted">
            <span className="text-muted-foreground">User ID</span>
            <span className="font-mono text-foreground break-all">{profile.id}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-muted">
            <span className="text-muted-foreground">Registered Email</span>
            <span className="font-medium text-foreground">{profile.email}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-muted">
            <span className="text-muted-foreground">Auth Role</span>
            <span className="font-medium capitalize text-foreground">{profile.role}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Account Status</span>
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Active Session
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Sign out of your account on this device.
          </p>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
