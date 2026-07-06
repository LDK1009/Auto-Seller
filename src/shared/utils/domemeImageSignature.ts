//////////////////////////////////////// 도매매 이미지 프록시 서명 (서버 전용) ////////////////////////////////////////
// 이미지 프록시(domeme-image)가 임의 URL 중계에 악용되지 않도록,
// 상품 조회(domeme-item)가 발급한 URL만 통과시키는 HMAC 서명을 만든다.

import { createHmac } from 'crypto';

export function signDomemeImageUrl(url: string, secret: string): string {
  return createHmac('sha256', secret).update(url).digest('hex').slice(0, 32);
}
