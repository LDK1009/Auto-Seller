//////////////////////////////////////// Supabase 클라이언트 ////////////////////////////////////////
// 모든 DB/외부 API 호출은 shared/services 레이어에서만 수행한다.
// 컴포넌트·훅에서 supabase 클라이언트를 직접 import 하지 말 것 (service 함수 경유).
// 키 미설정 시 null 반환 — import 시점 throw 금지 (빌드 프리렌더가 죽고, 기능은 "준비 중"으로 강등돼야 함).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return cachedClient;
}
