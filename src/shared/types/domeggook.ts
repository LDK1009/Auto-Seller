//////////////////////////////////////// 도매꾹 상품 타입 (API 라우트 ↔ 클라이언트 공유) ////////////////////////////////////////

export type DomeggookItemImage = {
  url: string; // 원본 URL (공급사 호스팅)
  proxyUrl: string; // 서버 중계 URL (CORS 해소 + 서명 포함)
  kind: 'thumb' | 'detail'; // 대표이미지 / 상세설명 이미지
};

export type DomeggookLicense = {
  usable: boolean; // 이미지 사용허용 공식 필드 (도매꾹 공식 회신 2026-07-07) — false면 사용 불가
  msg: string | null; // 공급사가 쓴 사용 조건 원문 — 편집·가공 허용 범위는 이 문구가 기준
};

////////// 배송비 (deli.dome — 등록 준비 패키지용)
export type DomeggookDelivery = {
  method: string | null; // 배송 방법 (택배 등)
  pay: string | null; // 선결제/착불
  feeType: string | null; // 요금 방식 원문 (무료/고정/수량별비례 등)
  baseFee: number | null; // 기본 배송비 (테이블 첫 구간에서 추출)
  feeRaw: string | null; // 요금 테이블 원문 (예: "80+3000|80+3000") — 파싱 불확실 대비 원문 보존
  jejuExtra: number | null; // 제주 추가 배송비
  islandsExtra: number | null; // 도서산간 추가 배송비
  sendAvgDays: number | null; // 평균 발송일
};

////////// 반품·교환 (return)
export type DomeggookReturnInfo = {
  fee: number | null; // 반품 배송비 (편도)
  exchangeDouble: boolean; // true면 교환비 = 반품비 × 2
};

////////// 상품정보제공고시 (detail.infoDuty)
export type DomeggookInfoDuty = {
  type: string | null; // 품목 유형 (예: "기타 재화")
  items: { name: string; desc: string }[]; // 항목별 고시 내용
};

////////// 옵션 조합 (selectOpt — 스스 옵션 폼 이식용)
export type DomeggookOption = {
  name: string; // 조합 옵션명 (예: "블랙/L")
  priceAdd: number; // 가산가 (도매꾹 단가 기준, 원)
  stock: number; // 옵션별 재고 (낱개)
};

export type DomeggookItem = {
  no: string; // 상품번호
  title: string;
  itemUrl: string; // 도매꾹 상품 페이지
  license: DomeggookLicense;
  images: DomeggookItemImage[];

  //////////////////// 등록 준비 패키지 필드 ////////////////////
  domePrice: number | null; // 도매꾹가 (원가 계산 기준)
  supplyPrice: number | null; // 도매매(전문셀러몰) 공급가 — 참고용, 원가 기준은 domePrice
  moq: number; // 도매꾹 최소 구매 수량 (qty.domeMoq — 1이면 낱개 가능)
  inventory: number | null; // 재고 수량
  taxType: string | null; // 과세 구분 원문 (과세상품/면세상품)
  origin: string | null; // 원산지 (detail.country)
  manufacturer: string | null; // 제조사
  model: string | null; // 모델명
  infoDuty: DomeggookInfoDuty; // 상품정보제공고시
  delivery: DomeggookDelivery;
  returnInfo: DomeggookReturnInfo;
  categoryPath: string | null; // 도매꾹 카테고리 경로 (참고용 — 스스 카테고리는 사용자 선택)
  supplierName: string | null; // 공급사 상호
  options: DomeggookOption[]; // 옵션 조합 (없거나 단일 기본옵션이면 빈 배열)
  keywords: string[]; // 공급사 등록 키워드 (basis.keywords.kw — 태그 후보 1차 재료)
};
