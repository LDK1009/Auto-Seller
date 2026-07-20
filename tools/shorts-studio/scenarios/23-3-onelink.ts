//////////////////////////////////////// #23-3 원링크 리빙용품 (손익 중심) ////////////////////////////////////////
import { makeOnelink, type Station } from "./_lib/onelink";

const stations: Station[] = [
  { target: "상품 정보" },
  { target: "판매가", hold: 2.2 },
  { target: "개당 순이익" },
  { target: "검색설정" },
];

export const scenario = makeOnelink("23-3", "수납정리함", stations, [
  "도매가 자동 로드",
  "판매가 역산",
  "개당 순이익 표시",
  "태그 후보까지",
]);
