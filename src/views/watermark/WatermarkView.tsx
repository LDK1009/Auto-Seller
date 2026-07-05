'use client';

//////////////////////////////////////// 워터마크 일괄 삽입 화면 ////////////////////////////////////////
// 업로드 → 워터마크 설정(텍스트/로고·위치·투명도·크기) → 일괄 합성 → ZIP.

import { useState } from 'react';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import DownloadIcon from '@mui/icons-material/Download';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ImagePreviewModal, { type PreviewImage } from '@/shared/components/ImagePreviewModal';
import { useTransformedPreview } from '@/shared/hooks/useTransformedPreview';
import { applyWatermark } from './_utils/applyWatermark';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import ImageDropzone from '@/shared/components/ImageDropzone';
import StatBox from '@/shared/components/StatBox';
import AnimatedProgressBar from '@/shared/components/AnimatedProgressBar';
import { useWatermark } from './_hooks/useWatermark';
import WatermarkSettingsPanel from './_components/WatermarkSettingsPanel';
import WatermarkJobCard from './_components/WatermarkJobCard';

export default function WatermarkView() {
  const {
    jobs,
    settings,
    isProcessing,
    isZipping,
    processedCount,
    doneCount,
    updateSettings,
    setLogo,
    addFiles,
    removeJob,
    clearAll,
    processAll,
    downloadAllAsZip,
  } = useWatermark();

  const hasJobs = jobs.length > 0;
  const overallProgress = hasJobs ? processedCount / jobs.length : 0;

  // 미리보기 모달 (순수 UI 상태) — 현재 설정으로 즉석 합성한 "예상 결과"를 보여준다
  const [previewIndex, setPreviewIndex] = useState(-1);
  const {
    previewUrl,
    isGenerating,
    hasError: previewError,
  } = useTransformedPreview({
    activeIndex: previewIndex,
    sources: jobs.map((job) => ({ id: job.id, blob: job.file })),
    settings,
    // logoBlob은 직렬화 불가 → logoName으로 변경 감지
    settingsKey: JSON.stringify({ ...settings, logoBlob: settings.logoBlob ? settings.logoName : null }),
    transform: applyWatermark,
  });
  const previewImages: PreviewImage[] = jobs.map((job, jobIndex) => ({
    id: job.id,
    name: job.file.name,
    // 현재 슬라이드만 즉석 생성 (생성 중엔 null → 스피너, 실패 시 원본 폴백 — 예: 로고 미설정)
    url:
      jobIndex === previewIndex
        ? previewError
          ? job.originalUrl
          : isGenerating
            ? null
            : previewUrl
        : null,
    badge: previewError
      ? { label: '원본 (로고 미설정 등 합성 실패)', color: 'error' }
      : { label: '예상 결과', color: 'info' },
    showCheckerboard: job.file.type === 'image/png',
  }));

  return (
    <PageLayout
      title="워터마크 일괄 삽입"
      description="여러 상품 이미지에 텍스트/로고 워터마크를 한 번에 넣습니다. 처리는 브라우저에서 진행됩니다."
      help={
        <HelpPanel storageKey="watermark">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 이미지를 업로드하고 워터마크 종류(텍스트/로고)를 정합니다</Typography>
            <Typography variant="body2">② 위치(3×3)·투명도·크기를 조절합니다 — 로고는 투명 배경 PNG 권장</Typography>
            <Typography variant="body2">③ [워터마크 적용]으로 일괄 합성하고, 설정을 바꿔 다시 적용할 수도 있습니다</Typography>
            <Typography variant="body2">④ [다운로드]로 전체 결과를 ZIP으로 저장합니다 (원본 포맷 유지)</Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Stack spacing={3}>
        {!hasJobs && <ImageDropzone onFilesAdded={addFiles} disabled={isProcessing} />}

        {hasJobs && (
          <>
            {/* 설정 */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <WatermarkSettingsPanel
                settings={settings}
                onChange={updateSettings}
                onLogoSelect={setLogo}
                disabled={isProcessing}
              />
            </Paper>

            {/* 액션 */}
            <Stack spacing={1.5}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<BrandingWatermarkIcon />}
                onClick={processAll}
                disabled={isProcessing}
              >
                {isProcessing ? '적용 중…' : doneCount > 0 ? '다시 적용' : '워터마크 적용'}
              </Button>
              {doneCount > 0 && !isProcessing && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={downloadAllAsZip}
                  disabled={isZipping}
                >
                  {isZipping ? '다운로드 중…' : '다운로드'}
                </Button>
              )}
            </Stack>

            {/* 진행률 */}
            {isProcessing && (
              <Stack spacing={0.5}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    적용 진행률
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(overallProgress * 100)}%
                  </Typography>
                </Stack>
                <AnimatedProgressBar value={overallProgress} durationMs={150} />
              </Stack>
            )}

            {/* 작업 아이템 컨테이너 */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stack direction="row" spacing={1}>
                    <StatBox label="전체" value={jobs.length} />
                    <StatBox label="완료" value={doneCount} />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setPreviewIndex(0)}
                      disabled={isProcessing}
                    >
                      미리보기
                    </Button>
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="small"
                      startIcon={<RestartAltIcon />}
                      onClick={clearAll}
                      disabled={isProcessing}
                    >
                      초기화
                    </Button>
                  </Stack>
                </Stack>
                <Grid>
                  {jobs.map((job) => (
                    <WatermarkJobCard key={job.id} job={job} onRemove={removeJob} />
                  ))}
                </Grid>
              </Stack>
            </Paper>
          </>
        )}
      </Stack>

      {/* 미리보기 모달 */}
      <ImagePreviewModal
        images={previewImages}
        index={previewIndex}
        onClose={() => setPreviewIndex(-1)}
        onNavigate={setPreviewIndex}
      />
    </PageLayout>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const Grid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
  gap: theme.spacing(2),
}));
