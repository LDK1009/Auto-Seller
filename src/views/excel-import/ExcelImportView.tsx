'use client';

//////////////////////////////////////// 엑셀 대량 가공 화면 (P-2) ////////////////////////////////////////
// 도매꾹/도매매 대량등록 엑셀 업로드 → 상품별 이미지 URL 추출 → 선택 → 누끼 파이프라인 일괄 투입.
// 이미지 수집은 서버 프록시(신뢰 호스트) 경유 — 그 외 호스트 URL은 개수만 표시하고 제외.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useSnackbar } from 'notistack';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import { useImageHandoffStore } from '@/shared/store/imageHandoffStore';
import { trackEvent } from '@/shared/utils/analytics';
import { parseExcelImages, isProxyableImageUrl, type ExcelProductRow } from './_utils/parseExcelImages';

// 한 번에 파이프라인으로 보낼 수 있는 이미지 상한 (imageFileValidation의 전역 제한과 동일 기준)
const MAX_HANDOFF_IMAGES = 100;

export default function ExcelImportView() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  // 순수 UI 상태
  const [rows, setRows] = useState<ExcelProductRow[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  ////////// 엑셀 파싱
  const handleFile = async (file: File) => {
    setProgress('엑셀 분석 중…');
    try {
      const parsed = await parseExcelImages(file);
      setRows(parsed);
      setFileName(file.name);
      setSelectedIndexes(new Set(parsed.map((_, index) => index)));
      if (parsed.length === 0) {
        enqueueSnackbar('엑셀에서 이미지 URL을 찾지 못했습니다. 대량등록 양식이 맞는지 확인하세요.', {
          variant: 'warning',
        });
      }
    } catch (error) {
      console.error(error);
      enqueueSnackbar('엑셀을 읽지 못했습니다. xlsx 형식인지 확인하세요.', { variant: 'error' });
    } finally {
      setProgress(null);
    }
  };

  ////////// 선택 이미지 일괄 수집 → 누끼 자동 시작
  const handleSendToPipeline = async () => {
    const targets = rows.filter((_, index) => selectedIndexes.has(index));
    const urls = targets.flatMap((row) => row.imageUrls.filter(isProxyableImageUrl));
    if (urls.length === 0) return;

    const limited = urls.slice(0, MAX_HANDOFF_IMAGES);
    if (urls.length > MAX_HANDOFF_IMAGES) {
      enqueueSnackbar(`한 번에 ${MAX_HANDOFF_IMAGES}장까지 처리합니다. 초과분 ${urls.length - MAX_HANDOFF_IMAGES}장은 제외했습니다.`, {
        variant: 'info',
      });
    }

    try {
      const files: { name: string; blob: Blob }[] = [];
      for (let index = 0; index < limited.length; index += 1) {
        setProgress(`이미지 내려받는 중… ${index + 1}/${limited.length}`);
        const response = await fetch(`/api/domeggook-image?url=${encodeURIComponent(limited[index])}`);
        if (!response.ok) continue; // 개별 실패는 건너뜀 (전체 중단 방지)
        const blob = await response.blob();
        const urlName = limited[index].split('/').pop()?.split('?')[0] ?? '';
        files.push({ name: urlName || `excel-${index + 1}.jpg`, blob });
      }
      if (files.length === 0) {
        enqueueSnackbar('가져올 수 있는 이미지가 없습니다.', { variant: 'warning' });
        return;
      }
      useImageHandoffStore.getState().setImages(files, true); // 누끼 자동 시작
      trackEvent('handoff', { from: 'excel-import', to: 'background-removal' });
      router.push('/background-removal');
    } catch (error) {
      console.error(error);
      enqueueSnackbar('이미지 수집 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setProgress(null);
    }
  };

  ////////// 파생 값
  const selectedImageCount = rows
    .filter((_, index) => selectedIndexes.has(index))
    .reduce((sum, row) => sum + row.proxyable, 0);
  const unproxyableCount = rows
    .filter((_, index) => selectedIndexes.has(index))
    .reduce((sum, row) => sum + (row.imageUrls.length - row.proxyable), 0);
  const isBusy = progress !== null;

  return (
    <PageLayout
      title="엑셀 대량 가공"
      description="대량등록 엑셀 속 상품 이미지를 한 번에 모아 배경 제거까지 이어드립니다."
      maxWidth="md"
      help={
        <HelpPanel storageKey="excel-import">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 도매꾹 대량등록 엑셀(xlsx)을 업로드하세요</Typography>
            <Typography variant="body2">② 상품별로 발견된 이미지 URL을 확인하고 필요한 행만 선택하세요</Typography>
            <Typography variant="body2">③ [누끼 일괄 시작]을 누르면 이미지를 모아 배경 제거가 자동 시작됩니다</Typography>
            <Typography variant="caption" color="text.secondary">
              한 번에 최대 {MAX_HANDOFF_IMAGES}장까지 보낼 수 있어요.
            </Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Stack spacing={3}>
        {/* 업로드 */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
            <Button
              component="label"
              variant="contained"
              startIcon={isBusy ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
              disabled={isBusy}
            >
              엑셀 업로드
              <HiddenInput
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFile(file);
                  event.target.value = '';
                }}
              />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {fileName ? `${fileName} — 상품 ${rows.length}개` : 'xlsx 파일을 올려주세요'}
            </Typography>
          </Stack>
        </Paper>

        {/* 상품 목록 */}
        {rows.length > 0 && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                  상품 {rows.length}개 · 선택 이미지 {selectedImageCount}장
                </Typography>
                <Button size="small" onClick={() => setSelectedIndexes(new Set(rows.map((_, i) => i)))}>
                  전체 선택
                </Button>
                <Button size="small" onClick={() => setSelectedIndexes(new Set())}>
                  전체 해제
                </Button>
              </Stack>

              <RowList>
                {rows.map((row, index) => (
                  <RowItem key={`${row.name}-${index}`}>
                    <Checkbox
                      size="small"
                      checked={selectedIndexes.has(index)}
                      onChange={() =>
                        setSelectedIndexes((prev) => {
                          const next = new Set(prev);
                          if (next.has(index)) next.delete(index);
                          else next.add(index);
                          return next;
                        })
                      }
                    />
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                      {row.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      이미지 {row.proxyable}장
                      {row.imageUrls.length > row.proxyable && ` (+외부 ${row.imageUrls.length - row.proxyable})`}
                    </Typography>
                  </RowItem>
                ))}
              </RowList>

              {unproxyableCount > 0 && (
                <Alert severity="info">
                  지원하지 않는 호스트의 이미지 {unproxyableCount}장은 제외됩니다 (도매꾹·ESM 호스팅만 수집).
                </Alert>
              )}

              <Button
                variant="contained"
                startIcon={<AutoFixHighIcon />}
                disabled={selectedImageCount === 0 || isBusy}
                onClick={handleSendToPipeline}
              >
                누끼 일괄 시작 ({Math.min(selectedImageCount, MAX_HANDOFF_IMAGES)}장)
              </Button>
              {progress && (
                <Typography variant="body2" color="text.secondary">
                  {progress}
                </Typography>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </PageLayout>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const HiddenInput = styled.input({
  display: 'none',
});

const RowList = styled.div(({ theme }) => ({
  maxHeight: 420,
  overflowY: 'auto',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const RowItem = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1.5),
  '&:not(:last-of-type)': {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));
