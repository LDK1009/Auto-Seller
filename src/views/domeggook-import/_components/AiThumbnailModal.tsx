'use client';

//////////////////////////////////////// AI 썸네일 모달 (⑥ 이미지 섹션 진입) ////////////////////////////////////////
// 편집 모달을 열지 않아도 이미지 섹션에서 바로 진입하는 독립 경로.
// 흐름: 참조 이미지(대표) → 스타일·문구 → 생성 → [대표이미지로] / [추가이미지로] / [다운로드]
// 생성 결과는 부모의 슬롯 상태로 넘겨 파이프라인(누끼·워터마크·시트)에 그대로 이어붙인다.

import { useState } from 'react';
import styled from '@emotion/styled';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import AiThumbnailPanel from '@/shared/components/AiThumbnailPanel';
import { downloadBlob } from '@/shared/utils/zip';

type AiThumbnailModalProps = {
  open: boolean;
  referenceUrl: string; // 참조로 쓸 현재 대표이미지 (프록시 또는 objectURL)
  referenceBlob?: Blob; // 크롭·편집본이면 Blob 보유
  productName?: string;
  productNo?: string; // 다운로드 파일명
  canAddExtra: boolean; // 추가이미지 슬롯 여유 (9장 상한)
  onClose: () => void;
  onUseAsMain: (blob: Blob) => void;
  onAddAsExtra: (blob: Blob) => void;
};

export default function AiThumbnailModal({
  open,
  referenceUrl,
  referenceBlob,
  productName,
  productNo,
  canAddExtra,
  onClose,
  onUseAsMain,
  onAddAsExtra,
}: AiThumbnailModalProps) {
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  const getReferenceBlob = async (): Promise<Blob> => {
    if (referenceBlob) return referenceBlob;
    const response = await fetch(referenceUrl);
    if (!response.ok) throw new Error('이미지를 불러오지 못했어요.');
    return response.blob();
  };

  const handleGenerated = (blob: Blob) => {
    setResult((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return { blob, url: URL.createObjectURL(blob) };
    });
  };

  const isBusy = busyLabel !== null;

  return (
    <Dialog open={open} onClose={isBusy ? undefined : onClose} maxWidth={false} disableScrollLock>
      <Stack spacing={1.5} sx={{ p: 2.5, width: 'min(92vw, 860px)', maxHeight: 'calc(100vh - 64px)' }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            AI 썸네일 만들기
          </Typography>
          <IconButton size="small" onClick={onClose} disabled={isBusy} aria-label="닫기">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>

        <ModalSplit>
          {/* 좌: 참조 이미지 → 결과 (생성 전에는 지금 대표이미지가 보인다) */}
          <Stack spacing={0.75} sx={{ flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {result ? '만든 썸네일' : '지금 대표이미지'}
            </Typography>
            <PreviewFrame>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result?.url ?? referenceUrl} alt="AI 썸네일 미리보기" />
              {isBusy && (
                <BusyOverlay>
                  <CircularProgress size={28} />
                  <Typography variant="caption" sx={{ color: 'common.white' }}>
                    {busyLabel}
                  </Typography>
                </BusyOverlay>
              )}
            </PreviewFrame>
          </Stack>

          <Stack spacing={2} sx={{ flex: 1, minWidth: 260, overflowY: 'auto' }}>
            <Typography variant="body2" color="text.secondary">
              지금 대표이미지를 참고해서 스마트스토어에 올릴 썸네일을 새로 만들어요. 상품 형태·색상은 그대로
              두고 배경과 분위기만 바꿔요.
            </Typography>

            <AiThumbnailPanel
              productName={productName}
              source="image_section"
              hasResult={result !== null}
              disabled={isBusy}
              getReferenceBlob={getReferenceBlob}
              onGenerated={handleGenerated}
              onBusyChange={setBusyLabel}
            />
          </Stack>
        </ModalSplit>

        {/* 결과 활용 — 슬롯 반영이 기본, 다운로드는 보조 */}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', flexWrap: 'wrap', rowGap: 1 }}>
          <Button
            color="inherit"
            startIcon={<FileDownloadOutlinedIcon />}
            disabled={!result || isBusy}
            onClick={() => result && downloadBlob(result.blob, `AI썸네일_${productNo ?? '상품'}.png`)}
            sx={{ color: 'text.secondary' }}
          >
            다운로드
          </Button>
          <Button
            variant="outlined"
            disabled={!result || isBusy || !canAddExtra}
            onClick={() => {
              if (!result) return;
              onAddAsExtra(result.blob);
              onClose();
            }}
          >
            추가이미지로 담기
          </Button>
          <Button
            variant="contained"
            disabled={!result || isBusy}
            onClick={() => {
              if (!result) return;
              onUseAsMain(result.blob);
              onClose();
            }}
          >
            대표이미지로 사용
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const ModalSplit = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2.5),
  minHeight: 0,
  [theme.breakpoints.down('md')]: {
    flexDirection: 'column',
  },
}));

const PreviewFrame = styled.div(({ theme }) => ({
  position: 'relative',
  width: 'min(44vw, 380px)',
  aspectRatio: '1 / 1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  background: '#ffffff',
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
  textAlign: 'center',
  padding: theme.spacing(2),
  backgroundColor: 'rgba(0, 0, 0, 0.45)',
}));
