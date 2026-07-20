//////////////////////////////////////// #21-3 원링크 육아용품 (KC 경고) ////////////////////////////////////////
import { makeOnelink, type Station } from "./_lib/onelink";

const stations: Station[] = [
  { target: /KC .*인증 대상/ },
  { target: "카테고리" },
  { target: "판매가", hold: 2.2 },
  { target: "검색설정" },
];

export const scenario = makeOnelink("21-3", "아기식판", stations, [
  "KC 대상 자동 경고",
  "카테고리 자동 추천",
  "판매가 마진 계산",
  "태그 후보까지",
]);
