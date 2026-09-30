import { createClient } from "@/lib/supabase/client";
import { ApiError } from "@/lib/api/errors";
import type { UserRole } from "@/lib/auth/types";
import type {
  UserProfile,
  UpdateProfileInput,
  ChangePasswordInput,
  NotificationPreferences,
  ClubSettings,
} from "./types";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  clubAnnouncements: true,
  eventReminders: true,
  emailDigest: false,
  scoreUpdates: true,
};

const DEFAULT_CLUB_SETTINGS: ClubSettings = {
  clubName: "CIET Coders Club",
  academicYear: "2026 - 2027",
  semester: "Odd Semester",
  contactEmail: "codersclub@ciet.ac.in",
  registrationOpen: true,
  announcementBanner: "Welcome to CIET Coders Club. Check events for upcoming hackathons!",
};

const PREFERENCES_STORAGE_KEY = "coders_club_user_preferences";
const CLUB_SETTINGS_STORAGE_KEY = "coders_club_admin_settings";

/**
 * Retrieves the profile of the currently authenticated user.
 * Combines Supabase Auth user record and user_metadata.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};

  const role: UserRole =
    appMetadata.role === "admin" || metadata.role === "admin"
      ? "admin"
      : "associate";

  const approved: boolean =
    appMetadata.approved ?? metadata.approved ?? (role === "admin");

  return {
    id: user.id,
    email: user.email || "",
    fullName:
      metadata.full_name ||
      metadata.name ||
      (user.email ? user.email.split("@")[0] : "Member"),
    avatarUrl: metadata.avatar_url || "",
    bio: metadata.bio || "",
    githubUsername: metadata.github_username || "",
    linkedinUrl: metadata.linkedin_url || "",
    role,
    approved,
    createdAt: user.created_at,
  };
}

/**
 * Updates editable profile information using Supabase user_metadata.
 */
export async function updateUserProfile(
  input: UpdateProfileInput
): Promise<UserProfile> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: input.fullName.trim(),
      bio: input.bio?.trim() || "",
      github_username: input.githubUsername?.trim() || "",
      linkedin_url: input.linkedinUrl?.trim() || "",
      avatar_url: input.avatarUrl?.trim() || "",
    },
  });

  if (error || !data.user) {
    throw new ApiError(
      error?.message || "Failed to update profile",
      error?.status || 400,
      "PROFILE_UPDATE_FAILED"
    );
  }

  const profile = await getUserProfile();
  if (!profile) {
    throw new ApiError("Failed to reload updated profile", 500);
  }

  return profile;
}

/**
 * Updates the user's password via Supabase Auth.
 */
export async function changeUserPassword(
  input: ChangePasswordInput
): Promise<void> {
  if (!input.newPassword || input.newPassword.length < 6) {
    throw new ApiError(
      "Password must be at least 6 characters long",
      400,
      "INVALID_PASSWORD"
    );
  }

  if (input.newPassword !== input.confirmPassword) {
    throw new ApiError(
      "Passwords do not match",
      400,
      "PASSWORD_MISMATCH"
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  });

  if (error) {
    throw new ApiError(
      error.message || "Failed to update password",
      error.status || 400,
      "PASSWORD_UPDATE_FAILED"
    );
  }
}

/**
 * Fetches user notification preferences.
 */
export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Saves user notification preferences.
 */
export function saveNotificationPreferences(
  preferences: NotificationPreferences
): NotificationPreferences {
  if (typeof window !== "undefined") {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences)
    );
  }
  return preferences;
}

/**
 * Fetches club configuration (Admin only).
 */
export function getClubSettings(): ClubSettings {
  if (typeof window === "undefined") {
    return DEFAULT_CLUB_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(CLUB_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_CLUB_SETTINGS;
    return { ...DEFAULT_CLUB_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CLUB_SETTINGS;
  }
}

/**
 * Saves club configuration (Admin only).
 */
export function saveClubSettings(settings: ClubSettings): ClubSettings {
  if (typeof window !== "undefined") {
    localStorage.setItem(CLUB_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
  return settings;
}
