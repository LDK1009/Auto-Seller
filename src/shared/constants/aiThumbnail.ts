//////////////////////////////////////// AI 썸네일 프리셋 ////////////////////////////////////////
// 셀러가 프롬프트를 쓰지 않아도 되게 스타일을 고정 선택지로 제공한다 (입력 최소화).
// prompt 문자열은 서버 buildThumbnailPrompt의 `스타일:` 줄로 그대로 들어간다.

export const THUMBNAIL_STYLE_PRESETS = [
  { id: 'clean', label: '흰 배경', prompt: '깔끔한 흰 배경, 밝고 선명한 조명, 부드러운 그림자' },
  { id: 'lifestyle', label: '생활 연출', prompt: '실제 사용 장면 연출, 자연광이 드는 실내, 소품은 최소한' },
  { id: 'studio', label: '스튜디오', prompt: '어두운 배경에 스포트 조명, 고급스러운 제품 사진 느낌' },
  { id: 'pastel', label: '파스텔', prompt: '연한 파스텔 단색 배경, 밝고 부드러운 분위기' },
] as const;

export type ThumbnailStyleId = (typeof THUMBNAIL_STYLE_PRESETS)[number]['id'];

export const DEFAULT_THUMBNAIL_STYLE_ID: ThumbnailStyleId = 'clean';

// 썸네일 문구는 짧을 때만 읽힌다 — 길면 모델이 줄바꿈·오타를 낸다
export const HEADLINE_MAX_LENGTH = 14;
