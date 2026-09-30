"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/auth";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-md border px-4 py-2"
    >
      Sign out
    </button>
  );
}