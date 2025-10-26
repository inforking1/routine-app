// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  // eslint-disable-next-line no-var
  var __supabase__: SupabaseClient | undefined;
}

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase =
  globalThis.__supabase__ ??
  createClient(url, anon, {
    auth: {
      storageKey: "sb-csnjdinpdtcumsjhotrj-auth-token",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

if (!globalThis.__supabase__) globalThis.__supabase__ = supabase;

// 👇 전역 any 래퍼 “sb”를 같이 export (핫픽스 핵심)
export const sb = supabase as any;

if (typeof window !== "undefined" && import.meta.env.DEV) (window as any).supabase = supabase;
