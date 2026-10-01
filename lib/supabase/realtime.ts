import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "./client";

const supabase = createClient();

export function createRealtimeChannel(
  channelName: string
): RealtimeChannel {
  return supabase.channel(channelName);
}

export async function removeRealtimeChannel(
  channel: RealtimeChannel
): Promise<void> {
  await supabase.removeChannel(channel);
}