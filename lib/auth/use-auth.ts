"use client";

import { useSyncExternalStore } from "react";
import { authStore } from "./auth";

export function useAuth() {
  return useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getServerSnapshot
  );
}
