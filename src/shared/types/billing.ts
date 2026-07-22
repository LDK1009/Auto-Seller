//////////////////////////////////////// 구독·결제 타입 (DB 스키마 그대로 — snake_case) ////////////////////////////////////////
// 스키마 실측: 2026-07-22 Supabase MCP (subscriptions·payments)

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due';

// billing_key는 컬럼 권한으로 클라이언트에 내려오지 않는다 (서버 전용)
export type Subscription = {
  id: string;
  user_id: string;
  plan: string;
  status: SubscriptionStatus;
  customer_key: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentStatus = 'ready' | 'done' | 'failed' | 'canceled';

export type Payment = {
  id: string;
  user_id: string;
  subscription_id: string | null;
  order_id: string;
  payment_key: string | null;
  amount: number;
  status: PaymentStatus;
  approved_at: string | null;
  created_at: string;
};
