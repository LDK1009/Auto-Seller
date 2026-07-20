//////////////////////////////////////// #25-1 원링크 상품명 중심 ////////////////////////////////////////
import { makeOnelink, type Station } from "./_lib/onelink";

const stations: Station[] = [
  { target: "상품명", hold: 2.2 },
  { target: "추천 키워드" },
  { target: "검색설정" },
];

export const scenario = makeOnelink("25-1", "데스크정리함", stations, [
  "상품명 자동 제안",
  "금지어·글자수 검사",
  "추천 키워드까지",
]);
