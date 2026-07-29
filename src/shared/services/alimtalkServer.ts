//////////////////////////////////////// 알림톡 발송 (알리고) ////////////////////////////////////////
// 서버 전용. 키 미설정 시 발송을 건너뛰고 skipped를 반환한다 (기능 강등 — throw 금지).
// 알리고 알림톡 API: https://smartsms.aligo.in/ (kakaoapi/akv10/alimtalk/send)
// ⚠️ 템플릿은 카카오 사전 승인 필수 — TEMPLATE_CODE는 승인 후 발급받은 코드를 env에 넣는다.

const ALIGO_API_BASE = 'https://kakaoapi.aligo.in/akv10';

type AlimtalkConfig = {
  apiKey: string;
  userId: string;
  senderKey: string; // 발신프로필 키 (채널 연동 시 발급)
  sender: string; // 발신자 연락처
  templateCode: string;
};

function getConfig(): AlimtalkConfig | null {
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const senderKey = process.env.ALIGO_SENDER_KEY;
  const sender = process.env.ALIGO_SENDER;
  const templateCode = process.env.ALIGO_TEMPLATE_SOLDOUT;
  if (!apiKey || !userId || !senderKey || !sender || !templateCode) return null;
  return { apiKey, userId, senderKey, sender, templateCode };
}

export const isAlimtalkConfigured = () => getConfig() !== null;

////////// 전화번호 마스킹 (로그 저장용 — 원본 보관 금지)
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '***';
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export type AlimtalkResult = {
  status: 'sent' | 'failed' | 'skipped';
  raw?: unknown;
};

////////// 품절 알림 발송
// 템플릿 예시(승인 필요): "『#{상품명}』 상품이 도매꾹에서 품절됐어요. 스마트스토어 판매 상태를 확인해주세요."
export async function sendSoldOutAlert(params: {
  phone: string;
  productName: string;
}): Promise<AlimtalkResult> {
  const config = getConfig();
  if (!config) return { status: 'skipped' };

  const message = `『${params.productName}』 상품이 도매꾹에서 품절됐어요.\n스마트스토어 판매 상태를 확인해주세요.\n\n오토셀러 www.auto-seller.co.kr`;

  const form = new URLSearchParams({
    apikey: config.apiKey,
    userid: config.userId,
    senderkey: config.senderKey,
    tpl_code: config.templateCode,
    sender: config.sender,
    receiver_1: params.phone.replace(/\D/g, ''),
    subject_1: '품절 알림',
    message_1: message,
  });

  try {
    const response = await fetch(`${ALIGO_API_BASE}/alimtalk/send/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      cache: 'no-store',
    });
    const parsed = await response.json();
    // 알리고는 성공 시 code 0
    const isSent = String(parsed?.code) === '0';
    return { status: isSent ? 'sent' : 'failed', raw: parsed };
  } catch (error) {
    console.error('알림톡 발송 실패:', error);
    return { status: 'failed', raw: { message: error instanceof Error ? error.message : 'unknown' } };
  }
}
