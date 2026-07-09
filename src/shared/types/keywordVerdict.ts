//////////////////////////////////////// AI 판단 타입 (API 라우트 ↔ 클라이언트 공유) ////////////////////////////////////////

export type AiVerdictLevel = '추천' | '보류' | '비추천';

export type AiVerdict = {
  verdict: AiVerdictLevel; // 종합 판정
  summary: string; // 2~3문장 종합 판단
  reasons: string[]; // 근거 목록 (지표 인용)
  remaining: number; // 오늘 남은 무료 횟수
};

export type AiVerdictResponse = {
  configured: boolean; // ANTHROPIC_API_KEY 미설정 시 false
  verdict?: AiVerdict;
  error?: string;
};

export const AI_VERDICT_DAILY_LIMIT = 5; // 로그인 사용자 일일 무료 횟수
