//////////////////////////////////////// ZIP 생성·다운로드 유틸 ////////////////////////////////////////

import JSZip from 'jszip';
import { OUTPUT_EXTENSION, RESULT_SUFFIX } from '../_constants/backgroundRemoval';

type ZipEntry = {
  fileName: string; // 원본 파일명 (확장자 포함)
  blob: Blob;
};

////////////////////// 원본명 → 결과 파일명 (중복 시 인덱스 부여) //////////////////////
function toResultFileName(originalName: string, usedNames: Set<string>): string {
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;

  let candidate = `${baseName}${RESULT_SUFFIX}.${OUTPUT_EXTENSION}`;
  let counter = 1;
  while (usedNames.has(candidate)) {
    candidate = `${baseName}${RESULT_SUFFIX}_${counter}.${OUTPUT_EXTENSION}`;
    counter += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

////////////////////// 결과 Blob들을 ZIP Blob으로 //////////////////////
export async function buildZip(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const entry of entries) {
    const fileName = toResultFileName(entry.fileName, usedNames);
    zip.file(fileName, entry.blob);
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
