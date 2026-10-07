"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "./types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function initAuth() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (active) {
          setUser(data?.user ?? null);
          setLoading(false);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (active) {
            setUser(session?.user ?? null);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch {
        if (active) {
          setLoading(false);
        }
      }
    }

    const cleanupPromise = initAuth();

    return () => {
      active = false;
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, []);

  const role: UserRole =
    (user?.user_metadata?.role as UserRole) ||
    (user?.email?.includes("admin") ? "admin" : "associate");

  return {
    user,
    loading,
    isAuthenticated: !!user,
    role,
  };
}
