"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/use-auth";
import { Loading } from "@/components/ui/loading";
import { getUserProfile } from "@/lib/settings/settings-service";
import type { SettingsTab, UserProfile } from "@/lib/settings/types";
import { SettingsHeader } from "@/components/settings/settings-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ProfileTab } from "@/components/settings/profile-tab";
import { SecurityTab } from "@/components/settings/security-tab";
import { PreferencesTab } from "@/components/settings/preferences-tab";
import { ClubTab } from "@/components/settings/club-tab";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      return;
    }

    getUserProfile()
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => {
        console.error("Failed to load user profile:", err);
      })
      .finally(() => {
        setLoadingProfile(false);
      });
  }, [user, authLoading]);

  if (authLoading || loadingProfile) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loading label="Loading settings..." />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground">
          Unable to load user profile. Please ensure you are logged in.
        </p>
      </main>
    );
  }

  const isAdmin = profile.role === "admin";

  return (
    <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href="/protected"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <SettingsHeader profile={profile} />
      </div>

      <SettingsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdmin}
      />

      <div className="pt-2">
        {activeTab === "profile" && (
          <ProfileTab profile={profile} onProfileUpdated={setProfile} />
        )}
        {activeTab === "security" && <SecurityTab profile={profile} />}
        {activeTab === "preferences" && <PreferencesTab />}
        {activeTab === "club" && isAdmin && <ClubTab />}
      </div>
    </main>
  );
}
