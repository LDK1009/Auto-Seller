//////////////////////////////////////// #22-2 원링크 캠핑용품 (MOQ 묶음) ////////////////////////////////////////
import { makeOnelink, type Station } from "./_lib/onelink";

const stations: Station[] = [
  { target: /최소 구매수량|묶음 구성 판매/ },
  { target: "카테고리" },
  { target: "판매가", hold: 2.2 },
  { target: "검색설정" },
];

export const scenario = makeOnelink("22-2", "캠핑의자", stations, [
  "MOQ 묶음 안내",
  "카테고리 자동 추천",
  "묶음 기준 판매가",
  "태그 후보까지",
]);
