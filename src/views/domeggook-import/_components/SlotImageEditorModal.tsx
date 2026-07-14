'use client';

//////////////////////////////////////// 슬롯 이미지 편집 모달 ////////////////////////////////////////
// ⑥ 대표/추가 이미지 클릭 시 열리는 미리보기 + 편집. 기존 도구 UI 그대로 이식:
// - 배경: [배경 제거]/[배경 색상] 툴버튼 — 색상 클릭 시 ColorPickerPopover(팔레트·추천 색상·패턴·그라데이션 방향)
// - 워터마크: 스위치 켜면 WatermarkSettingsPanel — 속성 변경 시 디바운스 자동 합성 ([합성] 버튼 없음)
// - 레이어 구조: 원본 → processed(누끼+배경) → final(워터마크) 순서로 항상 재합성 (중복 합성 없음)
// - [적용] 시 최종 Blob을 부모로 반환 → 슬롯 교체, [원본으로 되돌리기]로 초기화

import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import CloseIcon from '@mui/icons-material/Close';
import FormatColorResetIcon from '@mui/icons-material/FormatColorReset';
import PaletteIcon from '@mui/icons-material/Palette';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import { useSnackbar } from 'notistack';
import { removeImageBackground } from '@/shared/utils/removeImageBackground';
import { applyBackground } from '@/shared/utils/applyBackground';
import { applyWatermark } from '@/shared/utils/applyWatermark';
import {
  DEFAULT_CUSTOM_COLOR,
  type BackgroundOption,
} from '@/shared/constants/backgroundRemoval';
import { DEFAULT_WATERMARK_SETTINGS, type WatermarkSettings } from '@/shared/constants/watermark';
import WatermarkSettingsPanel from '@/shared/components/WatermarkSettingsPanel';
import ColorPickerPopover, { getPatternPreviewCss } from '@/shared/components/ColorPickerPopover';
import { transientOptions } from '@/shared/utils/emotionTransientProps';

const WATERMARK_APPLY_DEBOUNCE_MS = 400; // 텍스트 타이핑·슬라이더 드래그 연속 변경 흡수

type EditLayer = { blob: Blob; url: string };

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

  //////////////////// 편집 레이어 상태 ////////////////////
  // processed = 누끼+배경 결과 / final = 워터마크까지 합성한 최종 (표시 우선순위: final > processed > 원본)
  const [processed, setProcessed] = useState<EditLayer | null>(null);
  const [final, setFinal] = useState<EditLayer | null>(null);
  const [isBackgroundOn, setIsBackgroundOn] = useState(false);
  const [bgOption, setBgOption] = useState<BackgroundOption | null>(null); // null = 배경 미편집(원본)
  const [customColor, setCustomColor] = useState(DEFAULT_CUSTOM_COLOR);
  const [colorAnchorEl, setColorAnchorEl] = useState<HTMLElement | null>(null); // 색상 팝오버 앵커
  const [isWatermarkOn, setIsWatermarkOn] = useState(false);
  const [watermark, setWatermark] = useState<WatermarkSettings>(DEFAULT_WATERMARK_SETTINGS);
  const [busyLabel, setBusyLabel] = useState<string | null>(null); // 누끼·배경 합성 오버레이
  const [isWatermarkComposing, setIsWatermarkComposing] = useState(false);

  const sourceBlobRef = useRef<Blob | null>(null); // 원본 Blob 캐시
  const transparentBlobRef = useRef<Blob | null>(null); // 누끼 결과 캐시 (배경 옵션 변경마다 재사용)
  // 초기화 이펙트 없음 — 부모가 열 때마다 조건부 마운트(fresh mount)라 항상 초기값으로 시작

  ////////// 원본 Blob 확보 (크롭본 = 보유 Blob, 원본 = 프록시 fetch — 1회 캐시)
  const getSourceBlob = async (): Promise<Blob> => {
    if (sourceBlobRef.current) return sourceBlobRef.current;
    if (imageBlob) {
      sourceBlobRef.current = imageBlob;
      return imageBlob;
    }
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('이미지를 불러오지 못했습니다.');
    const blob = await response.blob();
    sourceBlobRef.current = blob;
    return blob;
  };

  ////////// 누끼 확보 (최초 1회만 모델 실행, 이후 캐시)
  const ensureTransparentBlob = async (): Promise<Blob> => {
    if (transparentBlobRef.current) return transparentBlobRef.current;
    const source = await getSourceBlob();
    const file = new File([source], 'image.png', { type: source.type || 'image/png' });
    const transparent = await removeImageBackground(file, (info) => {
      setBusyLabel(info.phase === 'download' ? '모델 내려받는 중… (최초 1회)' : `${info.step}…`);
    });
    transparentBlobRef.current = transparent;
    return transparent;
  };

  ////////// 배경 옵션 변경 — 누끼 → 배경 합성 (기존 도구의 changeBackgroundOption과 동일 흐름)
  const changeBackground = async (option: BackgroundOption) => {
    setBgOption(option); // 툴버튼·스와치 선택 표시는 즉시
    setBusyLabel('배경 처리 중…');
    try {
      const transparent = await ensureTransparentBlob();
      const result = option.kind === 'transparent' ? transparent : await applyBackground(transparent, option);
      setProcessed((previous) => {
        if (previous) URL.revokeObjectURL(previous.url);
        return { blob: result, url: URL.createObjectURL(result) };
      });
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '배경 처리에 실패했습니다.', { variant: 'error' });
    } finally {
      setBusyLabel(null);
    }
  };

  ////////// 워터마크 자동 합성 — 스위치·속성·배경 결과가 바뀔 때마다 디바운스 재합성
  useEffect(() => {
    const isValid =
      isWatermarkOn &&
      (watermark.type === 'text' ? watermark.text.trim().length > 0 : watermark.logoBlob !== null);
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        // 꺼짐/입력 미완성 → 워터마크 레이어 제거 (배경 단계 결과로 복귀)
        if (!isValid) {
          setFinal((previous) => {
            if (previous) URL.revokeObjectURL(previous.url);
            return null;
          });
          return;
        }
        setIsWatermarkComposing(true);
        try {
          const base = processed?.blob ?? (await getSourceBlob());
          const result = await applyWatermark(base, watermark);
          if (cancelled) return;
          setFinal((previous) => {
            if (previous) URL.revokeObjectURL(previous.url);
            return { blob: result, url: URL.createObjectURL(result) };
          });
        } catch (error) {
          console.error(error);
          if (!cancelled) enqueueSnackbar('워터마크 합성에 실패했습니다.', { variant: 'error' });
        } finally {
          if (!cancelled) setIsWatermarkComposing(false);
        }
      },
      isValid ? WATERMARK_APPLY_DEBOUNCE_MS : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWatermarkOn, watermark, processed]);

  ////////// 배경 토글 — 켜면 즉시 모델 로드(누끼) 후 투명 배경, 끄면 배경 레이어 제거
  const handleBackgroundToggle = (checked: boolean) => {
    setIsBackgroundOn(checked);
    if (checked) {
      changeBackground({ kind: 'transparent' });
    } else {
      setColorAnchorEl(null);
      setBgOption(null);
      setProcessed((previous) => {
        if (previous) URL.revokeObjectURL(previous.url);
        return null;
      });
    }
  };

  ////////// 원본 복귀
  const resetEdits = () => {
    setIsBackgroundOn(false);
    setProcessed((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });
    setBgOption(null);
    setIsWatermarkOn(false); // final은 이펙트가 정리
  };

  const isBusy = busyLabel !== null;
  const hasEdits = processed !== null || final !== null;
  const displayUrl = final?.url ?? processed?.url ?? imageUrl;
  const showCheckerboard = bgOption?.kind === 'transparent';

  const handleApply = () => {
    const blob = final?.blob ?? processed?.blob;
    if (blob) onApply(blob);
  };

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
          <PreviewFrame $showCheckerboard={showCheckerboard}>
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

          <Stack spacing={2.5} sx={{ flex: 1, minWidth: 260, overflowY: 'auto' }}>
            {/* 배경 — 토글 on 시 즉시 누끼(모델 로드), 툴버튼은 기존 누끼 도구와 동일 구성 */}
            <Stack spacing={1}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">배경</Typography>
                <Switch
                  size="small"
                  checked={isBackgroundOn}
                  disabled={isBusy}
                  onChange={(_event, checked) => handleBackgroundToggle(checked)}
                  slotProps={{ input: { 'aria-label': '배경 편집 사용' } }}
                />
              </Stack>
              <Collapse in={isBackgroundOn}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Tooltip title="배경 제거 (투명)">
                    <ToolButton
                      $isActive={bgOption?.kind === 'transparent'}
                      onClick={() => changeBackground({ kind: 'transparent' })}
                      disabled={isBusy}
                      aria-label="배경 제거"
                    >
                      <FormatColorResetIcon />
                    </ToolButton>
                  </Tooltip>
                  <Tooltip title="배경 색상">
                    <ToolButton
                      $isActive={bgOption?.kind === 'color'}
                      onClick={(event) => setColorAnchorEl(event.currentTarget)}
                      disabled={isBusy}
                      aria-label="배경 색상"
                    >
                      <PaletteIcon />
                    </ToolButton>
                  </Tooltip>
                  {/* 현재 색상/패턴 표시 */}
                  {bgOption?.kind === 'color' && (
                    <ColorSwatch
                      style={{
                        background: getPatternPreviewCss(bgOption.hex, bgOption.pattern ?? 'solid', bgOption.gradientDirection),
                      }}
                    />
                  )}
                </Stack>
              </Collapse>
            </Stack>

            {/* 워터마크 — 스위치 켜면 설정 패널, 속성 변경마다 자동 합성 */}
            <Stack spacing={1}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">워터마크</Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  {isWatermarkComposing && <CircularProgress size={14} />}
                  <Switch
                    size="small"
                    checked={isWatermarkOn}
                    disabled={isBusy}
                    onChange={(_event, checked) => setIsWatermarkOn(checked)}
                    slotProps={{ input: { 'aria-label': '워터마크 사용' } }}
                  />
                </Stack>
              </Stack>
              <Collapse in={isWatermarkOn}>
                <Stack spacing={1}>
                  <WatermarkSettingsPanel
                    settings={watermark}
                    disabled={isBusy}
                    onChange={(patch) => setWatermark((previous) => ({ ...previous, ...patch }))}
                    onLogoSelect={(file) =>
                      setWatermark((previous) => ({ ...previous, logoBlob: file, logoName: file.name }))
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    설정을 바꾸면 미리보기에 자동 반영됩니다.
                  </Typography>
                </Stack>
              </Collapse>
            </Stack>

            {hasEdits && (
              <Button
                size="small"
                color="inherit"
                startIcon={<RestartAltOutlinedIcon />}
                onClick={resetEdits}
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
            <Button variant="contained" onClick={handleApply} disabled={!hasEdits || isBusy || isWatermarkComposing}>
              적용
            </Button>
          </Stack>
        </Stack>
      </Stack>

      {/* 색상 선택 팝오버 (팔레트·추천 색상·패턴·그라데이션 방향) — 기존 도구 공용 컴포넌트 */}
      <ColorPickerPopover
        anchorEl={colorAnchorEl}
        value={bgOption ?? { kind: 'transparent' }}
        customColor={customColor}
        onChange={changeBackground}
        onCustomColorChange={setCustomColor}
        onClose={() => setColorAnchorEl(null)}
      />
    </Dialog>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
// 투명 배경 확인용 격자무늬 (기존 도구와 동일)
const CHECKERBOARD = 'repeating-conic-gradient(#e9e9e9 0% 25%, #ffffff 0% 50%) 50% / 16px 16px';

const EditorSplit = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2.5),
  minHeight: 0,
  [theme.breakpoints.down('md')]: {
    flexDirection: 'column',
  },
}));

// 1000×1000 비율 프레임 — 투명(누끼) 선택 시에만 체커보드
const PreviewFrame = styled('div', transientOptions)<{ $showCheckerboard: boolean }>(
  ({ theme, $showCheckerboard }) => ({
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
    background: $showCheckerboard ? CHECKERBOARD : '#ffffff',
    [theme.breakpoints.down('md')]: {
      width: '100%',
    },
    '& img': {
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain',
    },
  }),
);

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

// 기존 누끼 도구와 동일한 툴버튼
const ToolButton = styled(IconButton, transientOptions)<{ $isActive: boolean }>(({ theme, $isActive }) => ({
  border: `1px solid ${$isActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: 8,
  color: $isActive ? theme.palette.primary.main : theme.palette.text.secondary,
  backgroundColor: $isActive ? theme.palette.action.selected : 'transparent',
}));

const ColorSwatch = styled.span(({ theme }) => ({
  width: 24,
  height: 24,
  borderRadius: 6,
  border: `1px solid ${theme.palette.divider}`,
  display: 'inline-block',
}));
