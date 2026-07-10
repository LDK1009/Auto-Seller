//////////////////////////////////////// 도매꾹 링크 파싱 ////////////////////////////////////////
// 사용자가 붙여넣는 형태: 상품 URL 또는 상품번호.
// 예) https://domeggook.com/50659920 (도매매 서브도메인 포함 — *.domeggook.com)
//     50659920

// 상품번호 자릿수 (도매꾹 상품번호는 통상 7~9자리 — 여유 범위로 검증)
const PRODUCT_NO_PATTERN = /^\d{4,12}$/;

export function parseDomeggookProductNo(rawInput: string): string | null {
  const input = rawInput.trim();
  if (input.length === 0) return null;

  // 1) 숫자만 입력한 경우
  if (PRODUCT_NO_PATTERN.test(input)) return input;

  // 2) URL인 경우 — 도매꾹 계열 도메인만 허용
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }
  if (!parsed.hostname.endsWith('domeggook.com')) {
    return null;
  }

  // 경로·쿼리에서 상품번호 후보 추출 (/s/50659920, /50659920, ?no=50659920)
  const noParam = parsed.searchParams.get('no');
  if (noParam && PRODUCT_NO_PATTERN.test(noParam)) return noParam;

  const pathMatch = parsed.pathname.match(/\d{4,12}/);
  if (pathMatch) return pathMatch[0];

  return null;
}
