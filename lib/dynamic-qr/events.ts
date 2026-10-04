import type { PredefinedEvent } from "./types.ts";

/**
 * Predefined club events for quick selection in the UI and server validation
 */
export const PREDEFINED_EVENTS: PredefinedEvent[] = [
  {
    id: "evt-react-bootcamp",
    name: "Full Stack React & Next.js Workshop",
    category: "Technical Workshop",
    sub_events: [
      { id: "track-nextjs-app", name: "App Router & SSR Mastery" },
      { id: "track-tailwind-shadcn", name: "Modern UI Design Systems" },
    ],
    contexts: [
      { id: "session_1", label: "Morning Session (09:30 AM - 12:30 PM)" },
      { id: "session_2", label: "Afternoon Session (01:30 PM - 04:30 PM)" },
      { id: "lab_checkin", label: "Hands-on Lab Verification" },
      { id: "exit", label: "Final Wrap-up & Attendance" },
    ],
  },
  {
    id: "evt-dsa-marathon",
    name: "DSA 48-Hour Coding Marathon",
    category: "Competition",
    sub_events: [
      { id: "round-1-prelims", name: "Round 1 - Algorithmic Prelims" },
      { id: "round-2-finals", name: "Round 2 - Live Problem Solving" },
    ],
    contexts: [
      { id: "entry", label: "Participant Check-in" },
      { id: "checkpoint_mid", label: "Midnight Checkpoint" },
      { id: "exit", label: "Submission & Evaluation Check-in" },
    ],
  },
  {
    id: "evt-weekly-club-sync",
    name: "Weekly Coders Club Sync & Mentorship",
    category: "Internal Meeting",
    sub_events: [],
    contexts: [
      { id: "general", label: "Meeting Attendance" },
      { id: "associate_duty", label: "Associate Duty Verification" },
    ],
  },
];
