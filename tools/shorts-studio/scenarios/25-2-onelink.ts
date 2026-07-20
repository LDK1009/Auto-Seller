//////////////////////////////////////// #25-2 원링크 카테고리 중심 ////////////////////////////////////////
import { makeOnelink, type Station } from "./_lib/onelink";

const stations: Station[] = [
  { target: "카테고리", hold: 2.4 },
  { target: /상위 \d+개/ },
  { target: "검색설정" },
];

export const scenario = makeOnelink("25-2", "샤워기헤드", stations, [
  "카테고리 자동 추천",
  "상위 상품 근거 수치",
  "태그 후보까지",
]);
