//////////////////////////////////////// 토스페이먼츠 서버 API (빌링) ////////////////////////////////////////
// TOSS_SECRET_KEY 기반 — 서버(app/api)에서만 import 할 것. 클라이언트 번들 포함 금지.
// 키 미설정 시 null 반환 (기능 강등, throw 금지 — supabaseServer 패턴과 동일).

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

////////// 시크릿 키 Basic 인증 헤더 (미설정 시 null)
function getAuthHeader(): string | null {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) return null;
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

export const isTossConfigured = () => getAuthHeader() !== null;

////////// 공통 호출 (토스 에러 body의 message를 살려 던진다)
async function tossRequest<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const authHeader = getAuthHeader();
  if (!authHeader) throw new Error('결제 기능이 아직 준비되지 않았어요. (키 미설정)');

  const response = await fetch(`${TOSS_API_BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const parsed = await response.json();
  if (!response.ok) {
    console.error('토스 API 오류:', path, parsed);
    throw new Error(String(parsed?.message ?? '결제 처리에 실패했어요.'));
  }
  return parsed as T;
}

//////////////////// 빌링키 발급 (카드 등록 성공 후 authKey 교환) ////////////////////
export type TossBillingKeyResult = {
  billingKey: string;
  customerKey: string;
  card?: { number?: string; issuerCode?: string };
};

export function issueBillingKey(authKey: string, customerKey: string): Promise<TossBillingKeyResult> {
  return tossRequest('/billing/authorizations/issue', { authKey, customerKey });
}

//////////////////// 빌링 결제 승인 (정기·첫 결제 공용) ////////////////////
export type TossPaymentResult = {
  paymentKey: string;
  orderId: string;
  status: string; // DONE 등
  approvedAt?: string;
  totalAmount?: number;
};

export function chargeBillingKey(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}): Promise<TossPaymentResult> {
  const { billingKey, ...body } = params;
  return tossRequest(`/billing/${encodeURIComponent(billingKey)}`, body);
}

//////////////////// 결제 단건 조회 (웹훅 검증용 — 수신 내용을 원장으로 재확인) ////////////////////
export function getPayment(paymentKey: string): Promise<TossPaymentResult> {
  return tossRequest(`/payments/${encodeURIComponent(paymentKey)}`);
}
