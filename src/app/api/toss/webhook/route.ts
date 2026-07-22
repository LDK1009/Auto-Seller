//////////////////////////////////////// 토스페이먼츠 웹훅 ////////////////////////////////////////
// 결제 상태 변경 수신 → 토스 원장(getPayment)으로 재확인 후 payments 상태 동기화.
// 수신 payload를 신뢰하지 않는다 — paymentKey만 취해 서버 간 조회로 검증 (서명 대체).

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/shared/services/supabaseServer';
import { getPayment, isTossConfigured } from '@/shared/services/tossServer';

////////// 토스 status → payments.status 매핑
function toPaymentStatus(tossStatus: string): 'done' | 'canceled' | 'failed' | 'ready' {
  if (tossStatus === 'DONE') return 'done';
  if (tossStatus === 'CANCELED' || tossStatus === 'PARTIAL_CANCELED') return 'canceled';
  if (tossStatus === 'ABORTED' || tossStatus === 'EXPIRED') return 'failed';
  return 'ready';
}

export async function POST(request: Request) {
  const serverClient = getSupabaseServerClient();
  if (!serverClient || !isTossConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { data?: { paymentKey?: string } } | null;
  const paymentKey = body?.data?.paymentKey;
  if (!paymentKey) return NextResponse.json({ ok: true }); // 관심 없는 이벤트 — 200으로 재전송 방지

  try {
    const payment = await getPayment(paymentKey); // 원장 재확인
    await serverClient
      .from('payments')
      .update({
        status: toPaymentStatus(payment.status),
        approved_at: payment.approvedAt ?? null,
        raw: payment,
      })
      .eq('order_id', payment.orderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('웹훅 처리 실패:', error);
    return NextResponse.json({ ok: false }, { status: 500 }); // 500 → 토스가 재전송
  }
}
