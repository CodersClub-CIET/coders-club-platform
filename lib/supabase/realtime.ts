import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "./client";

// Lazy initialization allows public routes/configuration errors to render safely.
export function createRealtimeChannel(channelName: string): RealtimeChannel {
  return createClient().channel(channelName);
}

export async function removeRealtimeChannel(channel: RealtimeChannel): Promise<void> {
  await createClient().removeChannel(channel);
}
