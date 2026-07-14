'use client';

//////////////////////////////////////// 슬롯 이미지 편집 모달 ////////////////////////////////////////
// ⑥ 대표/추가 이미지 클릭 시 열리는 미리보기 + 편집 (누끼·배경 합성·워터마크 — 기존 도구 코어 재사용).
// - 미리보기: 1000×1000 권장 규격 비율 프레임 (투명 확인용 체커보드)
// - 누끼: removeImageBackground(@imgly) → 투명 PNG 캐시 → applyBackground로 배경 옵션 재합성
// - 워터마크: 워터마크 도구와 동일 설정(WatermarkSettingsPanel) → applyWatermark 합성
// - [적용] 시 가공 Blob을 부모로 반환 → 슬롯 교체 (원본은 [원본으로]로 복귀)

import { useState } from 'react';
import styled from '@emotion/styled';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Collapse from '@mui/material/Collapse';
import CloseIcon from '@mui/icons-material/Close';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import BrandingWatermarkOutlinedIcon from '@mui/icons-material/BrandingWatermarkOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSnackbar } from 'notistack';
import { removeImageBackground } from '@/shared/utils/removeImageBackground';
import { applyBackground } from '@/shared/utils/applyBackground';
import { applyWatermark } from '@/shared/utils/applyWatermark';
import type { BackgroundOption, PatternKind } from '@/shared/constants/backgroundRemoval';
import { PATTERN_OPTIONS } from '@/shared/constants/backgroundRemoval';
import { DEFAULT_WATERMARK_SETTINGS, type WatermarkSettings } from '@/shared/constants/watermark';
import WatermarkSettingsPanel from '@/shared/components/WatermarkSettingsPanel';
import { transientOptions } from '@/shared/utils/emotionTransientProps';

// 배경 색 스와치 (커스텀은 네이티브 컬러 인풋)
const BACKGROUND_SWATCHES = ['#ffffff', '#f5f5f5', '#000000'];

type SlotImageEditorModalProps = {
  open: boolean;
  imageUrl: string; // 미리보기/원본 URL (프록시 또는 objectURL — 같은 출처라 fetch 가능)
  imageBlob?: Blob; // 크롭본이면 Blob 직접 보유
  context: 'main' | 'extra';
  isCurrentMain: boolean; // 대표 컨텍스트에서 이미 대표인지
  onClose: () => void;
  onApply: (blob: Blob) => void; // 가공 결과로 슬롯 교체
  onSetMain?: () => void; // 대표 컨텍스트 — 이 이미지를 대표로
  onRemove?: () => void; // 추가 컨텍스트 — 슬롯에서 제거
};

export default function SlotImageEditorModal({
  open,
  imageUrl,
  imageBlob,
  context,
  isCurrentMain,
  onClose,
  onApply,
  onSetMain,
  onRemove,
}: SlotImageEditorModalProps) {
  const { enqueueSnackbar } = useSnackbar();

  // 편집 상태 — working = 현재 가공본 (null이면 원본 표시)
  const [working, setWorking] = useState<{ blob: Blob; url: string } | null>(null);
  const [transparentBlob, setTransparentBlob] = useState<Blob | null>(null); // 누끼 결과 캐시
  const [backgroundHex, setBackgroundHex] = useState('#ffffff');
  const [pattern, setPattern] = useState<PatternKind>('solid');
  const [isTransparentBg, setIsTransparentBg] = useState(true);
  const [isWatermarkOpen, setIsWatermarkOpen] = useState(false);
  const [watermark, setWatermark] = useState<WatermarkSettings>(DEFAULT_WATERMARK_SETTINGS);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  // 초기화 이펙트 없음 — 부모가 열 때마다 조건부 마운트(fresh mount)라 항상 초기값으로 시작

  ////////// 소스 Blob 확보 (크롭본 = 보유 Blob, 원본 = 프록시 fetch)
  const getBaseBlob = async (): Promise<Blob> => {
    if (working) return working.blob;
    if (imageBlob) return imageBlob;
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('이미지를 불러오지 못했습니다.');
    return response.blob();
  };

  const setWorkingBlob = (blob: Blob) => {
    setWorking((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return { blob, url: URL.createObjectURL(blob) };
    });
  };

  ////////// 누끼 — 배경 제거 후 현재 배경 옵션으로 합성
  const runRemoveBackground = async () => {
    setBusyLabel('배경 제거 준비 중…');
    try {
      const base = await getBaseBlob();
      const file = new File([base], 'image.png', { type: base.type || 'image/png' });
      const transparent = await removeImageBackground(file, (info) => {
        setBusyLabel(info.phase === 'download' ? `모델 내려받는 중… (최초 1회)` : info.step);
      });
      setTransparentBlob(transparent);
      setIsTransparentBg(true);
      setWorkingBlob(transparent);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '배경 제거에 실패했습니다.', { variant: 'error' });
    } finally {
      setBusyLabel(null);
    }
  };

  ////////// 배경 옵션 변경 — 누끼 캐시에 재합성
  const applyBackgroundOption = async (option: BackgroundOption) => {
    if (!transparentBlob) return;
    setBusyLabel('배경 합성 중…');
    try {
      const result = await applyBackground(transparentBlob, option);
      setWorkingBlob(result);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('배경 합성에 실패했습니다.', { variant: 'error' });
    } finally {
      setBusyLabel(null);
    }
  };

  const selectTransparent = () => {
    setIsTransparentBg(true);
    applyBackgroundOption({ kind: 'transparent' });
  };

  const selectColor = (hex: string, nextPattern: PatternKind = pattern) => {
    setIsTransparentBg(false);
    setBackgroundHex(hex);
    setPattern(nextPattern);
    applyBackgroundOption({ kind: 'color', hex, pattern: nextPattern });
  };

  ////////// 워터마크 합성 (현재 가공본 위에)
  const runWatermark = async () => {
    if (watermark.type === 'text' && watermark.text.trim().length === 0) {
      enqueueSnackbar('워터마크 문구를 입력하세요.', { variant: 'info' });
      return;
    }
    if (watermark.type === 'logo' && !watermark.logoBlob) {
      enqueueSnackbar('로고 이미지를 업로드하세요.', { variant: 'info' });
      return;
    }
    setBusyLabel('워터마크 합성 중…');
    try {
      const base = await getBaseBlob();
      const result = await applyWatermark(base, watermark);
      setWorkingBlob(result);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '워터마크 합성에 실패했습니다.', {
        variant: 'error',
      });
    } finally {
      setBusyLabel(null);
    }
  };

  ////////// 원본 복귀
  const resetWorking = () => {
    setWorking((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });
    setTransparentBlob(null);
    setIsTransparentBg(true);
  };

  const isBusy = busyLabel !== null;
  const displayUrl = working?.url ?? imageUrl;

  return (
    <Dialog open={open} onClose={isBusy ? undefined : onClose} maxWidth={false} disableScrollLock>
      <Stack spacing={1.5} sx={{ p: 2.5, width: 'min(92vw, 920px)', maxHeight: 'calc(100vh - 64px)' }}>
        {/* 헤더 */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {context === 'main' ? '대표이미지' : '추가이미지'} 편집
          </Typography>
          <IconButton size="small" onClick={onClose} disabled={isBusy} aria-label="닫기">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>

        {/* 좌 미리보기 / 우 편집 도구 */}
        <EditorSplit>
          <PreviewFrame>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayUrl} alt="편집 미리보기" />
            {isBusy && (
              <BusyOverlay>
                <CircularProgress size={28} />
                <Typography variant="caption" sx={{ color: 'common.white' }}>
                  {busyLabel}
                </Typography>
              </BusyOverlay>
            )}
          </PreviewFrame>

          <Stack spacing={2} sx={{ flex: 1, minWidth: 260, overflowY: 'auto' }}>
            {/* 누끼 */}
            <Stack spacing={1}>
              <Typography variant="subtitle2">배경</Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AutoFixHighOutlinedIcon />}
                onClick={runRemoveBackground}
                disabled={isBusy}
                sx={{ alignSelf: 'flex-start' }}
              >
                배경 제거 (누끼)
              </Button>
              {transparentBlob && (
                <>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                    <SwatchButton
                      type="button"
                      $isSelected={isTransparentBg}
                      onClick={selectTransparent}
                      disabled={isBusy}
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%), linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%)',
                        backgroundSize: '10px 10px',
                        backgroundPosition: '0 0, 5px 5px',
                      }}
                      aria-label="투명 배경"
                    />
                    {BACKGROUND_SWATCHES.map((hex) => (
                      <SwatchButton
                        key={hex}
                        type="button"
                        $isSelected={!isTransparentBg && backgroundHex === hex}
                        onClick={() => selectColor(hex)}
                        disabled={isBusy}
                        style={{ backgroundColor: hex }}
                        aria-label={`배경 ${hex}`}
                      />
                    ))}
                    <CustomColorInput
                      type="color"
                      value={backgroundHex}
                      disabled={isBusy}
                      onChange={(event) => selectColor(event.target.value)}
                      aria-label="배경 색 직접 선택"
                    />
                  </Stack>
                  {!isTransparentBg && (
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={pattern}
                      disabled={isBusy}
                      onChange={(_event, value: PatternKind | null) => {
                        if (value) selectColor(backgroundHex, value);
                      }}
                    >
                      {PATTERN_OPTIONS.map((entry) => (
                        <ToggleButton key={entry.pattern} value={entry.pattern} sx={{ px: 1.25 }}>
                          {entry.label}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  )}
                </>
              )}
            </Stack>

            {/* 워터마크 */}
            <Stack spacing={1}>
              <Stack
                direction="row"
                sx={{ alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setIsWatermarkOpen((previous) => !previous)}
              >
                <BrandingWatermarkOutlinedIcon sx={{ fontSize: 18, mr: 0.75 }} color="primary" />
                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                  워터마크
                </Typography>
                <ExpandMoreIcon
                  sx={{
                    fontSize: 18,
                    transform: isWatermarkOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </Stack>
              <Collapse in={isWatermarkOpen}>
                <Stack spacing={1.5}>
                  <WatermarkSettingsPanel
                    settings={watermark}
                    disabled={isBusy}
                    onChange={(patch) => setWatermark((previous) => ({ ...previous, ...patch }))}
                    onLogoSelect={(file) =>
                      setWatermark((previous) => ({ ...previous, logoBlob: file, logoName: file.name }))
                    }
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={runWatermark}
                    disabled={isBusy}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    워터마크 합성
                  </Button>
                </Stack>
              </Collapse>
            </Stack>

            {working && (
              <Button
                size="small"
                color="inherit"
                startIcon={<RestartAltOutlinedIcon />}
                onClick={resetWorking}
                disabled={isBusy}
                sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
              >
                원본으로 되돌리기
              </Button>
            )}
          </Stack>
        </EditorSplit>

        {/* 푸터 — 좌: 슬롯 액션 / 우: 적용 */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              권장 규격 1000×1000 기준 미리보기
            </Typography>
            {context === 'main' &&
              (isCurrentMain ? (
                <Chip size="small" color="primary" variant="outlined" label="현재 대표이미지" />
              ) : (
                <Button size="small" variant="outlined" onClick={onSetMain} disabled={isBusy}>
                  대표로 사용
                </Button>
              ))}
            {context === 'extra' && (
              <Button size="small" color="error" onClick={onRemove} disabled={isBusy}>
                제거
              </Button>
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose} disabled={isBusy}>
              취소
            </Button>
            <Button
              variant="contained"
              onClick={() => working && onApply(working.blob)}
              disabled={!working || isBusy}
            >
              적용
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Dialog>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const EditorSplit = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2.5),
  minHeight: 0,
  [theme.breakpoints.down('md')]: {
    flexDirection: 'column',
  },
}));

// 1000×1000 비율 프레임 — 투명 확인용 체커보드
const PreviewFrame = styled.div(({ theme }) => ({
  position: 'relative',
  width: 'min(48vw, 480px)',
  aspectRatio: '1 / 1',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundImage:
    'linear-gradient(45deg, #eeeeee 25%, transparent 25%, transparent 75%, #eeeeee 75%), linear-gradient(45deg, #eeeeee 25%, transparent 25%, transparent 75%, #eeeeee 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 8px 8px',
  backgroundColor: '#ffffff',
  [theme.breakpoints.down('md')]: {
    width: '100%',
  },
  '& img': {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
}));

const BusyOverlay = styled.div(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  backgroundColor: 'rgba(0, 0, 0, 0.45)',
}));

const SwatchButton = styled('button', transientOptions)<{ $isSelected: boolean }>(({ theme, $isSelected }) => ({
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: $isSelected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  padding: 0,
  '&:disabled': { opacity: 0.5, cursor: 'default' },
}));

const CustomColorInput = styled.input({
  width: 28,
  height: 28,
  padding: 0,
  border: 'none',
  borderRadius: '50%',
  overflow: 'hidden',
  cursor: 'pointer',
  backgroundColor: 'transparent',
});
