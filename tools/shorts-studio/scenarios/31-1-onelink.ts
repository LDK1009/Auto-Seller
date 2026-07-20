//////////////////////////////////////// #31-1 원링크 풀 코스 총집편 ////////////////////////////////////////
import { makeOnelink, type Station } from "./_lib/onelink";

const stations: Station[] = [
  { target: "상품 정보" },
  { target: "카테고리" },
  { target: "상품명" },
  { target: "판매가" },
  { target: "검색설정" },
];

export const scenario = makeOnelink("31-1", "빨래바구니", stations, [
  "상품 정보 자동 로드",
  "카테고리·상품명 완성",
  "판매가 마진 계산",
  "태그까지 전 과정",
]);
