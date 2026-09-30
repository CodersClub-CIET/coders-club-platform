import type { UserRole } from "@/lib/auth/types";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  role: UserRole;
  approved: boolean;
  createdAt?: string;
}

export interface UpdateProfileInput {
  fullName: string;
  bio?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  avatarUrl?: string;
}

export interface ChangePasswordInput {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}

export interface NotificationPreferences {
  clubAnnouncements: boolean;
  eventReminders: boolean;
  emailDigest: boolean;
  scoreUpdates: boolean;
}

export interface ClubSettings {
  clubName: string;
  academicYear: string;
  semester: string;
  contactEmail: string;
  registrationOpen: boolean;
  announcementBanner?: string;
}

export type SettingsTab = "profile" | "security" | "preferences" | "club";
