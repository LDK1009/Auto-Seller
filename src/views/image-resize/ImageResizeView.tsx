'use client';

//////////////////////////////////////// 이미지 규격 변환 화면 ////////////////////////////////////////
// 업로드(또는 누끼에서 이어받기) → 규격 설정 → 일괄 변환 → ZIP 다운로드.

import { useState } from 'react';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import DownloadIcon from '@mui/icons-material/Download';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ImagePreviewModal, { type PreviewImage } from '@/shared/components/ImagePreviewModal';
import { useTransformedPreview } from '@/shared/hooks/useTransformedPreview';
import { resizeImage } from './_utils/resizeImage';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import ImageDropzone from '@/shared/components/ImageDropzone';
import StatBox from '@/shared/components/StatBox';
import AnimatedProgressBar from '@/shared/components/AnimatedProgressBar';
import { useImageResize } from './_hooks/useImageResize';
import ResizeSettingsPanel from './_components/ResizeSettingsPanel';
import ResizeJobCard from './_components/ResizeJobCard';

export default function ImageResizeView() {
  const {
    jobs,
    settings,
    isProcessing,
    isZipping,
    processedCount,
    doneCount,
    updateSettings,
    addFiles,
    removeJob,
    clearAll,
    processAll,
    downloadAllAsZip,
  } = useImageResize();

  const hasJobs = jobs.length > 0;
  const overallProgress = hasJobs ? processedCount / jobs.length : 0;

  // 미리보기 모달 (순수 UI 상태) — 현재 설정으로 즉석 변환한 "예상 결과"를 보여준다
  const [previewIndex, setPreviewIndex] = useState(-1);
  const {
    previewUrl,
    isGenerating,
    hasError: previewError,
  } = useTransformedPreview({
    activeIndex: previewIndex,
    sources: jobs.map((job) => ({ id: job.id, blob: job.file })),
    settings,
    settingsKey: JSON.stringify(settings),
    transform: resizeImage,
  });
  const previewImages: PreviewImage[] = jobs.map((job, jobIndex) => ({
    id: job.id,
    name: job.file.name,
    // 현재 슬라이드만 즉석 생성 (생성 중엔 null → 스피너, 실패 시 원본 폴백)
    url:
      jobIndex === previewIndex
        ? previewError
          ? job.originalUrl
          : isGenerating
            ? null
            : previewUrl
        : null,
    badge: previewError
      ? { label: '원본 (변환 실패)', color: 'error' }
      : { label: `예상 결과 ${settings.width}×${settings.height}`, color: 'info' },
  }));

  return (
    <PageLayout
      title="규격 맞추기"
      description="마켓별 대표이미지 규격에 맞춰 여러 이미지를 한 번에 변환해요. 처리는 브라우저에서 진행되어 이미지가 서버로 전송되지 않아요."
      help={
        <HelpPanel storageKey="image-resize">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 이미지를 업로드하거나, 누끼 페이지에서 [규격 변환으로 보내기]로 이어받아요</Typography>
            <Typography variant="body2">② 목표 크기(프리셋/직접 입력)와 맞춤 방식(여백/크롭), 출력 포맷을 정해요</Typography>
            <Typography variant="body2">③ [규격 변환]을 누르면 전체가 일괄 변환돼요 — 설정을 바꾸고 다시 변환할 수도 있어요</Typography>
            <Typography variant="body2">④ [다운로드]로 전체 결과를 ZIP으로 저장해요</Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Stack spacing={3}>
        {/* 업로드 (이미지가 없을 때만) */}
        {!hasJobs && <ImageDropzone onFilesAdded={addFiles} disabled={isProcessing} />}

        {hasJobs && (
          <>
            {/* 규격 설정 */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <ResizeSettingsPanel settings={settings} onChange={updateSettings} disabled={isProcessing} />
            </Paper>

            {/* 액션 — 설정 → 미리보기 → 변환 흐름 */}
            <Stack spacing={1.5}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<VisibilityIcon />}
                onClick={() => setPreviewIndex(0)}
                disabled={isProcessing}
              >
                미리보기 (현재 설정 예상 결과)
              </Button>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AspectRatioIcon />}
                onClick={processAll}
                disabled={isProcessing}
              >
                {isProcessing ? '변환 중…' : doneCount > 0 ? '다시 변환' : '규격 변환'}
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

            {/* 진행률 (변환 중에만) */}
            {isProcessing && (
              <Stack spacing={0.5}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    변환 진행률
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
                <Grid>
                  {jobs.map((job) => (
                    <ResizeJobCard key={job.id} job={job} settings={settings} onRemove={removeJob} />
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
