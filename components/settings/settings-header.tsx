import type { UserProfile } from "@/lib/settings/types";

interface SettingsHeaderProps {
  profile: UserProfile;
}

export function SettingsHeader({ profile }: SettingsHeaderProps) {
  const isAdmin = profile.role === "admin";

  return (
    <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account preferences, profile details, and club settings.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isAdmin
              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
          }`}
        >
          {isAdmin ? "Admin" : "Associate"}
        </span>

        {isAdmin ? (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Full Access
          </span>
        ) : profile.approved ? (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Approved
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Pending Approval
          </span>
        )}
      </div>
    </div>
  );
}
