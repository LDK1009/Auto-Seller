//////////////////////////////////////// 도매매 상품 타입 (API 라우트 ↔ 클라이언트 공유) ////////////////////////////////////////

export type DomemeItemImage = {
  url: string; // 원본 URL (공급사 호스팅)
  proxyUrl: string; // 서버 중계 URL (CORS 해소 + 서명 포함)
  kind: 'thumb' | 'detail'; // 대표이미지 / 상세설명 이미지
};

export type DomemeLicense = {
  usable: boolean; // API의 desc.license.usable — 단독 신뢰 불가 (L-2 조사)
  msg: string | null; // 공급사가 직접 쓴 이미지 사용 조건 원문 — 실질 기준
};

export type DomemeItem = {
  no: string; // 상품번호
  title: string;
  supplyPrice: number | null; // 도매매 공급가
  itemUrl: string; // 도매매 상품 페이지
  license: DomemeLicense;
  images: DomemeItemImage[];
};
