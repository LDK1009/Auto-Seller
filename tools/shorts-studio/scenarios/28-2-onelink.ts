//////////////////////////////////////// #28-2 원링크 태그 중심 (검색설정) ////////////////////////////////////////
import { makeOnelink, type Station } from "./_lib/onelink";

const stations: Station[] = [
  { target: "검색설정", hold: 2.4 },
  { target: "태그 복사" },
  { target: "판매자 코드" },
];

export const scenario = makeOnelink("28-2", "차량용거치대", stations, [
  "검색량 붙은 태그 후보",
  "태그 일괄 복사",
  "붙여넣으면 끝",
]);
