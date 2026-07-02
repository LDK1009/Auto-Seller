//////////////////////////////////////// Supabase 클라이언트 ////////////////////////////////////////
// 모든 DB/외부 API 호출은 shared/services 레이어에서만 수행한다.
// 컴포넌트·훅에서 supabase 클라이언트를 직접 import 하지 말 것 (service 함수 경유).

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase 환경변수가 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 지정하세요.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
