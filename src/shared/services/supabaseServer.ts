//////////////////////////////////////// Supabase 서버 전용 클라이언트 ////////////////////////////////////////
// SECRET_KEY 기반 — RLS를 우회하므로 서버(app/api)에서만 import 할 것. 클라이언트 번들 포함 금지.
// 키 미설정 시 null (기능은 준비 중으로 강등, import 시점 throw 금지).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) return null;
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}
