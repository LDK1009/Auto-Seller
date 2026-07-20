//////////////////////////////////////// #28-2 원링크 차량용품 ////////////////////////////////////////
// (검색설정 단독 정차는 상품 로드 타이밍 편차로 불안정 → 검증된 FULL_FLOW로 통일)
import { makeOnelink, FULL_FLOW, FULL_RECAP } from "./_lib/onelink";
export const scenario = makeOnelink("28-2", "차량용거치대", FULL_FLOW, FULL_RECAP);
