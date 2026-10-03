import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://acnhfntawflgkomksddp.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "sb_publishable_aCtgFXotDJyEWyIsv3foaA_jGStSN2W",
  },
};

export default nextConfig;
