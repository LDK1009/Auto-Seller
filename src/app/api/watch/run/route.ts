//////////////////////////////////////// 품절 감시 크론 (1일 1회) ////////////////////////////////////////
// pg_cron이 호출한다 (starter-keywords/warm 패턴). 보호: x-watch-token = WATCH_CRON_TOKEN.
// 원칙:
// - 실시간 감시 안 함 = 1일 1회 (비용 예측 가능, 가격정책 §4-5)
// - 알림은 "상태 전환 시에만" (재고 있음 → 품절). 같은 상태 반복 알림 금지 = 알림톡 원가 방어
// - 구독 만료 사용자는 조회 자체를 건너뛴다

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/shared/services/supabaseServer';
import { sendSoldOutAlert, maskPhone, isAlimtalkConfigured } from '@/shared/services/alimtalkServer';
import type { DomeggookItem } from '@/shared/types/domeggook';

const CHECK_CONCURRENCY = 4; // 도매꾹 API 동시 호출 상한

type WatchRow = {
  id: string;
  user_id: string;
  product_no: string;
  title: string;
  last_status: string | null;
};

////////// 도매꾹 조회 → 상태 판정
async function fetchStatus(origin: string, productNo: string): Promise<'in_stock' | 'sold_out' | 'unavailable'> {
  try {
    const response = await fetch(`${origin}/api/domeggook-item?no=${encodeURIComponent(productNo)}`, {
      cache: 'no-store',
    });
    if (!response.ok) return 'unavailable'; // 404 = 상품 내려감
    const item = (await response.json()) as DomeggookItem;
    if (item.inventory === 0) return 'sold_out';
    if (item.saleStatus && item.saleStatus !== '판매중') return 'unavailable';
    return 'in_stock';
  } catch (error) {
    console.error('감시 조회 실패:', productNo, error);
    return 'unavailable';
  }
}

export async function POST(request: Request) {
  const cronToken = process.env.WATCH_CRON_TOKEN;
  if (!cronToken || request.headers.get('x-watch-token') !== cronToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const serverClient = getSupabaseServerClient();
  if (!serverClient) {
    return NextResponse.json({ error: '준비되지 않았어요.' }, { status: 503 });
  }
  const origin = new URL(request.url).origin;

  ////////// 1) 유효 구독자 집합 (해지했어도 기간 남으면 포함)
  const { data: subscriptions } = await serverClient
    .from('subscriptions')
    .select('user_id, status, current_period_end, alert_phone')
    .in('status', ['active', 'canceled']);

  const activeUsers = new Map<string, string | null>(); // userId → alertPhone
  for (const subscription of subscriptions ?? []) {
    const periodValid = subscription.current_period_end
      ? new Date(subscription.current_period_end) > new Date()
      : false;
    if (subscription.status === 'active' || periodValid) {
      activeUsers.set(subscription.user_id, subscription.alert_phone);
    }
  }
  if (activeUsers.size === 0) {
    return NextResponse.json({ ok: true, checked: 0, alerted: 0, note: 'no_active_subscriber' });
  }

  ////////// 2) 감시 대상 조회 (구독자 것만)
  const { data: watchList, error } = await serverClient
    .from('watch_products')
    .select('id, user_id, product_no, title, last_status')
    .in('user_id', Array.from(activeUsers.keys()));
  if (error) {
    console.error(error);
    return NextResponse.json({ error: '감시 목록 조회 실패' }, { status: 500 });
  }

  const rows = (watchList ?? []) as WatchRow[];
  let checked = 0;
  let alerted = 0;

  ////////// 3) 배치 조회 + 상태 전환 시에만 알림
  for (let index = 0; index < rows.length; index += CHECK_CONCURRENCY) {
    const batch = rows.slice(index, index + CHECK_CONCURRENCY);
    await Promise.all(
      batch.map(async (row) => {
        const status = await fetchStatus(origin, row.product_no);
        checked += 1;

        const becameUnavailable = status !== 'in_stock';
        const wasAvailable = row.last_status === null || row.last_status === 'in_stock';
        const shouldNotify = becameUnavailable && wasAvailable; // 전환 순간에만

        let notifiedAt: string | null = null;
        if (shouldNotify) {
          const phone = activeUsers.get(row.user_id);
          if (phone && isAlimtalkConfigured()) {
            const result = await sendSoldOutAlert({ phone, productName: row.title });
            await serverClient.from('alimtalk_logs').insert({
              user_id: row.user_id,
              product_no: row.product_no,
              template_code: process.env.ALIGO_TEMPLATE_SOLDOUT ?? 'unknown',
              phone_masked: maskPhone(phone),
              status: result.status,
              provider_response: result.raw ?? null,
            });
            if (result.status === 'sent') {
              notifiedAt = new Date().toISOString();
              alerted += 1;
            }
          }
        }

        await serverClient
          .from('watch_products')
          .update({
            last_status: status,
            last_checked_at: new Date().toISOString(),
            ...(notifiedAt ? { notified_at: notifiedAt } : {}),
          })
          .eq('id', row.id);
      }),
    );
  }

  return NextResponse.json({ ok: true, checked, alerted, alimtalk: isAlimtalkConfigured() });
}
