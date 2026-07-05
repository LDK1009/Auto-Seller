//////////////////////////////////////// ZIP 생성·다운로드 유틸 (공통) ////////////////////////////////////////
// 이미지 도구들의 결과 Blob을 ZIP으로 묶는다. 파일명은 `원본명{suffix}.{extension}` 형식,
// 중복 시 인덱스(_1, _2…)를 붙인다.

import JSZip from 'jszip';

export type ZipEntry = {
  fileName: string; // 원본 파일명 (확장자 포함)
  blob: Blob;
};

export type ZipNamingOptions = {
  suffix: string; // 결과 파일명 접미사 (예: '_누끼', '_규격')
  extension: string; // 결과 확장자 (예: 'png', 'jpg')
};

////////////////////// 원본명 → 결과 파일명 (중복 시 인덱스 부여) //////////////////////
function toResultFileName(
  originalName: string,
  usedNames: Set<string>,
  { suffix, extension }: ZipNamingOptions,
): string {
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;

  let candidate = `${baseName}${suffix}.${extension}`;
  let counter = 1;
  while (usedNames.has(candidate)) {
    candidate = `${baseName}${suffix}_${counter}.${extension}`;
    counter += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

////////////////////// 결과 Blob들을 ZIP Blob으로 //////////////////////
export async function buildZip(entries: ZipEntry[], naming: ZipNamingOptions): Promise<Blob> {
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const entry of entries) {
    const fileName = toResultFileName(entry.fileName, usedNames, naming);
    zip.file(fileName, entry.blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
}

////////////////////// 이미 완성된 이름의 항목들을 ZIP으로 (분할 등 다건 출력용) //////////////////////
export async function buildZipWithNames(entries: { name: string; blob: Blob }[]): Promise<Blob> {
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.name, entry.blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
}

////////////////////// Blob 브라우저 다운로드 //////////////////////
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
