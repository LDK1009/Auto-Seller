//////////////////////////////////////// 상품명 검사기 ////////////////////////////////////////
// 네이버 스마트스토어 상품명 가이드 기준 규칙 검사 (무비용 — S2 키워드 추천의 예고편).
// 근거: 상품명에 홍보성 문구·특수문자·중복 단어가 있으면 검색 노출에 불이익.

export type NameCheckLevel = 'pass' | 'warn' | 'fail';

export type NameCheckResult = {
  level: NameCheckLevel;
  label: string; // 검사 항목명
  message: string; // 판정 설명
};

// 권장/최대 길이 (스마트스토어 최대 100자, 검색 노출 권장 35자)
export const NAME_MAX_LENGTH = 100;
export const NAME_RECOMMENDED_LENGTH = 35;

// 홍보성 문구 — 네이버 상품명 가이드가 명시적으로 배제하는 유형 (검색 노출 불이익)
// (태그 후보 필터에서도 재사용하므로 export)
export const PROMO_WORDS = [
  '무료배송', '무배', '최저가', '초특가', '특가', '할인', '세일', 'sale', '이벤트', '사은품',
  '증정', '당일발송', '당일배송', '빠른배송', '히트', '인기', '추천', '베스트', 'best', '1위',
  '최고', '최상', '명품급', '핫딜', '공식', '정품보장',
];

// 브랜드 도용 위험 표현 — 지재권 분쟁 소지
const BRAND_RISK_WORDS = ['st', '스타일', '레플', 'a급', '이미테이션', '정품로고'];

// 허용 특수문자 외 감지 (스마트스토어는 대부분의 특수문자를 제한)
const INVALID_CHAR_PATTERN = /[^\w\sㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9()\-+~.,%/&]/g;

export function validateProductName(rawName: string): NameCheckResult[] {
  const name = rawName.trim();
  const results: NameCheckResult[] = [];

  ////////// 1) 길이
  if (name.length === 0) {
    results.push({ level: 'fail', label: '길이', message: '상품명을 입력하세요.' });
  } else if (name.length > NAME_MAX_LENGTH) {
    results.push({
      level: 'fail',
      label: '길이',
      message: `${name.length}자 — 최대 ${NAME_MAX_LENGTH}자를 넘어 등록이 거부됩니다.`,
    });
  } else if (name.length > NAME_RECOMMENDED_LENGTH) {
    results.push({
      level: 'warn',
      label: '길이',
      message: `${name.length}자 — ${NAME_RECOMMENDED_LENGTH}자 이내가 검색 노출에 유리합니다.`,
    });
  } else {
    results.push({ level: 'pass', label: '길이', message: `${name.length}자 — 적정 길이입니다.` });
  }

  ////////// 2) 특수문자
  const invalidChars = Array.from(new Set(name.match(INVALID_CHAR_PATTERN) ?? []));
  if (invalidChars.length > 0) {
    results.push({
      level: 'fail',
      label: '특수문자',
      message: `사용 불가 문자 감지: ${invalidChars.join(' ')} — 제거하세요.`,
    });
  } else {
    results.push({ level: 'pass', label: '특수문자', message: '문제되는 특수문자가 없습니다.' });
  }

  ////////// 3) 홍보성 문구
  const lowerName = name.toLowerCase();
  const foundPromo = PROMO_WORDS.filter((word) => lowerName.includes(word.toLowerCase()));
  if (foundPromo.length > 0) {
    results.push({
      level: 'warn',
      label: '홍보 문구',
      message: `"${foundPromo.join(', ')}" — 상품명 속 홍보 문구는 검색 노출에 불이익입니다. 상세페이지로 옮기세요.`,
    });
  } else {
    results.push({ level: 'pass', label: '홍보 문구', message: '홍보성 문구가 없습니다.' });
  }

  ////////// 4) 브랜드 도용 위험
  const words = lowerName.split(/\s+/);
  const foundRisk = BRAND_RISK_WORDS.filter((word) => words.includes(word));
  if (foundRisk.length > 0) {
    results.push({
      level: 'warn',
      label: '지재권 위험',
      message: `"${foundRisk.join(', ')}" — 브랜드 도용으로 해석될 수 있는 표현입니다. 삭제를 권장합니다.`,
    });
  }

  ////////// 5) 중복 단어
  const wordCounts = new Map<string, number>();
  name
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .forEach((word) => wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1));
  const duplicated = Array.from(wordCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([word]) => word);
  if (duplicated.length > 0) {
    results.push({
      level: 'warn',
      label: '중복 단어',
      message: `"${duplicated.join(', ')}" 반복 — 같은 단어 반복은 노출에 불이익입니다. 한 번만 쓰세요.`,
    });
  } else if (name.length > 0) {
    results.push({ level: 'pass', label: '중복 단어', message: '반복 단어가 없습니다.' });
  }

  ////////// 6) 동의어 나열 (한 토큰이 다른 토큰에 포함 — 모기채·전기모기채·전자모기채식 반복은 스팸 처리 위험)
  const uniqueTokens = Array.from(new Set(name.split(/\s+/).filter((word) => word.length >= 3)));
  const synonymPairs: string[] = [];
  for (const shorter of uniqueTokens) {
    for (const longer of uniqueTokens) {
      if (shorter !== longer && longer.includes(shorter)) {
        synonymPairs.push(`${shorter}⊂${longer}`);
      }
    }
  }
  if (synonymPairs.length > 0) {
    results.push({
      level: 'warn',
      label: '동의어 반복',
      message: `유사 키워드 나열 감지 (${synonymPairs.slice(0, 3).join(', ')}) — 동의어 반복은 스팸으로 분류될 수 있습니다. 하나만 남기세요.`,
    });
  } else if (name.length > 0) {
    results.push({ level: 'pass', label: '동의어 반복', message: '유사 키워드 나열이 없습니다.' });
  }

  return results;
}
