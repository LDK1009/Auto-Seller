//////////////////////////////////////// 도매꾹 검색 타입 (API 라우트 ↔ 클라이언트 공유) ////////////////////////////////////////

// 정렬 (getItemList so 파라미터 중 노출 4종)
export type DomeggookSortKey = 'ha' | 'rd' | 'aa' | 'da';

export const DOMEGGOOK_SORTS: { key: DomeggookSortKey; label: string }[] = [
  { key: 'ha', label: '인기순' },
  { key: 'rd', label: '도매꾹랭킹' },
  { key: 'aa', label: '낮은 가격' },
  { key: 'da', label: '최신' },
];

// 검색 요청 (서비스 → 프록시)
export type DomeggookSearchParams = {
  keyword?: string; // kw
  category?: string; // ca (중분류 이상 코드 00_00_00_00_00)
  sort?: DomeggookSortKey; // so (기본 ha)
  page?: number; // pg
  minPrice?: number; // mnp
  maxPrice?: number; // mxp
  singleUnit?: boolean; // mxq=1 (낱개 구매 가능만)
  freeShipping?: boolean; // who=S
  lowestPriceOnly?: boolean; // lwp=true
  fastShipping?: boolean; // fdl=true
  excludeOversea?: boolean; // dfos=false
  pageSize?: number; // sz (기본 40 — 인기 섹션은 6)
};

// 상품 카드 1개
export type DomeggookSearchItem = {
  no: number; // 상품번호 → /domeggook-import?input=no
  title: string;
  price: number;
  thumb: string; // 330px CDN
  unitQty: number; // 최소구매수량 (>1이면 "N개 단위" 캡션)
  isLowestPrice: boolean; // lwp — 최저가 인증 뱃지
  isBusinessOnly: boolean; // comOnly — 사업자 전용 뱃지
  url: string; // 도매꾹 원본 링크
  shipping: { isFree: boolean; fee: number | null }; // deli.who === 'S' / deli.fee
};

export type DomeggookSearchResponse = {
  configured: boolean;
  totalItems: number; // header.numberOfItems
  totalPages: number; // header.numberOfPages
  page: number; // header.currentPage
  items: DomeggookSearchItem[];
};

// 카테고리 트리 (getCat 가공 — 대분류 > 중분류)
export type DomeggookCategory = {
  code: string; // 00_00_00_00_00
  name: string;
  itemCount: number;
  children: { code: string; name: string; itemCount: number }[];
};

export type DomeggookCategoriesResponse = {
  configured: boolean;
  categories: DomeggookCategory[];
};
