//////////////////////////////////////// 대량등록 엑셀 이미지 추출 ////////////////////////////////////////
// 도매꾹/도매매 대량등록 엑셀에서 상품명과 이미지 URL을 뽑아 일괄 가공 파이프라인에 투입한다 (P-2).
// 엑셀 양식이 제각각이라: 헤더에서 상품명 컬럼을 찾고, 셀 값이 이미지 URL 패턴이면 전부 수집한다.

import * as XLSX from 'xlsx';

export type ExcelProductRow = {
  name: string; // 상품명 (없으면 "N행")
  imageUrls: string[]; // 행에서 발견된 이미지 URL 전부
  proxyable: number; // 프록시로 가져올 수 있는 URL 수 (신뢰 호스트)
};

const IMAGE_URL_PATTERN = /^https?:\/\/\S+\.(jpe?g|png|gif|webp|bmp)(\?\S*)?$/i;
const NAME_HEADER_KEYWORDS = ['상품명', '상품 명', '제목', 'title', 'name'];
// 서버 프록시(domeggook-image)가 서명 없이 허용하는 호스트와 동기화할 것
const TRUSTED_HOST_SUFFIXES = ['domeggook.com', 'esmplus.com'];

export function isProxyableImageUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return (
      protocol === 'https:' &&
      TRUSTED_HOST_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))
    );
  } catch {
    return false;
  }
}

export async function parseExcelImages(file: File): Promise<ExcelProductRow[]> {
  const workbook = XLSX.read(await file.arrayBuffer());
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  if (grid.length === 0) return [];

  ////////// 헤더 행·상품명 컬럼 탐지 (상위 5행 안에서)
  let headerRowIndex = 0;
  let nameColumnIndex = -1;
  outer: for (let rowIndex = 0; rowIndex < Math.min(5, grid.length); rowIndex += 1) {
    for (let colIndex = 0; colIndex < (grid[rowIndex]?.length ?? 0); colIndex += 1) {
      const cell = String(grid[rowIndex][colIndex] ?? '').toLowerCase();
      if (NAME_HEADER_KEYWORDS.some((keyword) => cell.includes(keyword))) {
        headerRowIndex = rowIndex;
        nameColumnIndex = colIndex;
        break outer;
      }
    }
  }

  ////////// 데이터 행에서 이미지 URL 수집
  const rows: ExcelProductRow[] = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex < grid.length; rowIndex += 1) {
    const row = grid[rowIndex] ?? [];
    const imageUrls = row
      .map((cell) => String(cell ?? '').trim())
      .filter((cell) => IMAGE_URL_PATTERN.test(cell));
    if (imageUrls.length === 0) continue;

    const name =
      nameColumnIndex >= 0 && String(row[nameColumnIndex] ?? '').trim().length > 0
        ? String(row[nameColumnIndex]).trim()
        : `${rowIndex + 1}행 상품`;

    rows.push({
      name,
      imageUrls: Array.from(new Set(imageUrls)),
      proxyable: imageUrls.filter(isProxyableImageUrl).length,
    });
  }

  return rows;
}
