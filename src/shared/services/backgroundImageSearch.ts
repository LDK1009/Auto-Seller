//////////////////////////////////////// 배경 이미지 검색 서비스 ////////////////////////////////////////
// 우리 API 라우트(Pixabay 프록시) 호출 전담. 컴포넌트에서 직접 호출 금지 — 훅 경유.

export type BackgroundImageItem = {
  id: number;
  thumbUrl: string; // 검색 결과 썸네일 (150px)
  imageUrl: string; // 합성용 원본 (1280px)
};

export type BackgroundImageSearchResult = {
  items: BackgroundImageItem[];
  totalHits: number; // 접근 가능한 총 결과 수
};

////////// 배경 이미지 검색 (10개/페이지)
export async function searchBackgroundImages(
  query: string,
  page: number,
): Promise<BackgroundImageSearchResult> {
  const params = new URLSearchParams({ query, page: String(page) });
  const response = await fetch(`/api/background-search?${params}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    console.error('배경 이미지 검색 실패:', response.status, body);
    throw new Error(body?.error ?? '이미지 검색에 실패했어요.');
  }
  const result = (await response.json()) as BackgroundImageSearchResult;
  return result;
}

////////// 합성용 배경 이미지 Blob 로드 (프록시 경유 — CORS 안전)
export async function fetchBackgroundImage(url: string): Promise<Blob> {
  const params = new URLSearchParams({ url });
  const response = await fetch(`/api/background-image?${params}`);
  if (!response.ok) {
    console.error('배경 이미지 로드 실패:', response.status);
    throw new Error('배경 이미지를 불러오지 못했어요.');
  }
  const blob = await response.blob();
  return blob;
}
