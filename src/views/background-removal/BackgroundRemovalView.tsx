'use client';

//////////////////////////////////////// 대량 이미지 누끼 화면 ////////////////////////////////////////
// 업로드 → 배경옵션 → 일괄 처리 → ZIP 다운로드를 조립하는 컨테이너.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DownloadIcon from '@mui/icons-material/Download';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PaletteIcon from '@mui/icons-material/Palette';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import { useImageHandoffStore } from '@/shared/store/imageHandoffStore';
import { trackEvent } from '@/shared/utils/analytics';
import AnimatedProgressBar from '@/shared/components/AnimatedProgressBar';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import { IMAGE_LIMIT_HELPER_TEXT } from '@/shared/constants/imageLimits';
import { useBackgroundRemoval } from './_hooks/useBackgroundRemoval';
import ImageDropzone from '@/shared/components/ImageDropzone';
import BackgroundOptionModal from './_components/BackgroundOptionModal';
import ImageJobGrid from './_components/ImageJobGrid';
import StatBox from '@/shared/components/StatBox';
import ImagePreviewModal, { type PreviewImage } from '@/shared/components/ImagePreviewModal';
import { STATUS_META } from './_components/ImageJobCard';

export default function BackgroundRemovalView() {
  const {
    jobs,
    isProcessing,
    isCancelling,
    isModelLoading,
    isZipping,
    backgroundOption,
    customColor,
    setCustomColor,
    doneCount,
    pendingCount,
    addFiles,
    removeJob,
    clearAll,
    start,
    requestCancel,
    changeBackgroundOption,
    downloadAllAsZip,
  } = useBackgroundRemoval();

  const hasJobs = jobs.length > 0;
  const overallProgress = hasJobs ? Math.round((doneCount / jobs.length) * 100) : 0;

  // 작업 단계: 처리 중 / 작업 전(대기·오류 남음) / 작업 완료(전부 처리됨)
  const phase = isProcessing ? 'processing' : pendingCount > 0 ? 'before' : 'done';

  // 상세 모달 선택 상태 (순수 UI 상태) — id로 보관해 삭제 시 안전
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = jobs.findIndex((job) => job.id === selectedId);

  // 미리보기 모달용 이미지 목록 (완료면 결과+격자, 아니면 원본)
  const previewImages: PreviewImage[] = jobs.map((job) => ({
    id: job.id,
    name: job.file.name,
    url: job.status === 'done' && job.resultUrl ? job.resultUrl : job.originalUrl,
    badge: { label: STATUS_META[job.status].label, color: STATUS_META[job.status].color },
    showCheckerboard: job.status === 'done',
  }));

  // 배경 선택 모달 열림 (순수 UI 상태)
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);

  // 파이프라인 연결: 완료 결과를 규격 변환으로 넘기기
  const router = useRouter();
  const handleSendToResize = () => {
    const doneJobs = jobs.filter((job) => job.status === 'done' && job.resultBlob);
    if (doneJobs.length === 0) return;
    useImageHandoffStore.getState().setImages(
      doneJobs.map((job) => ({
        name: `${job.file.name.replace(/\.[^.]+$/, '')}_누끼.png`,
        blob: job.resultBlob as Blob,
      })),
    );
    trackEvent('handoff', { from: 'background-removal', to: 'image-resize' });
    router.push('/image-resize');
  };

  return (
    <PageLayout
      title="누끼"
      description="여러 상품 이미지의 배경을 한 번에 제거합니다. 처리는 브라우저에서 진행되어 이미지가 서버로 전송되지 않습니다."
      help={
        <HelpPanel storageKey="background-removal">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 이미지를 드래그하거나 클릭해서 업로드합니다 (여러 장 가능)</Typography>
            <Typography variant="body2">② [배경 제거]를 누르세요 — 첫 실행은 준비 시간이 조금 걸릴 수 있어요</Typography>
            <Typography variant="body2">
              ③ 완료 후 [배경 선택]에서 투명·색상·패턴·검색 이미지 배경으로 바꿀 수 있습니다
            </Typography>
            <Typography variant="body2">④ [다운로드]를 누르면 전체 결과가 ZIP으로 저장됩니다</Typography>
            <Typography variant="caption" color="text.secondary">
              {IMAGE_LIMIT_HELPER_TEXT}
            </Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Stack spacing={3}>
        {/* 업로드 (이미지가 없을 때만 노출) */}
        {!hasJobs && <ImageDropzone onFilesAdded={addFiles} disabled={isProcessing} />}

        {hasJobs && (
          <>

            {/* 액션 바 — 단계별 버튼 (풀너비) */}
            <Stack spacing={1.5}>
              {/* 작업 전: 배경 제거 */}
              {phase === 'before' && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AutoFixHighIcon />}
                  onClick={start}
                  disabled={pendingCount === 0}
                >
                  배경 제거
                </Button>
              )}
              {/* 작업 중: 작업 취소 */}
              {phase === 'processing' && (
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<StopCircleIcon />}
                  onClick={requestCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? '중지 중…' : '작업 취소'}
                </Button>
              )}
              {/* 작업 완료: 배경 선택 · 다운로드 */}
              {phase === 'done' && (
                <>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PaletteIcon />}
                    onClick={() => setIsBackgroundModalOpen(true)}
                  >
                    배경 선택
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={downloadAllAsZip}
                    disabled={isZipping || doneCount === 0}
                  >
                    {isZipping ? '다운로드 중…' : '다운로드'}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AspectRatioIcon />}
                    onClick={handleSendToResize}
                    disabled={doneCount === 0}
                  >
                    규격 변환으로 보내기
                  </Button>
                </>
              )}
            </Stack>

            {/* 전체 진행률 (작업 중에만) — 모델 로딩은 서클 스피너 + 텍스트로 별도 표시 */}
            {phase === 'processing' &&
              (isModelLoading ? (
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    AI 모델 실행 중 (최초 1회)…
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={0.5}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      전체 진행률
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {overallProgress}%
                    </Typography>
                  </Stack>
                  <AnimatedProgressBar value={overallProgress / 100} />
                </Stack>
              ))}

            {/* 작업 아이템 컨테이너 (상단: 전체·완료·초기화 / 하단: 그리드) */}
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
                <ImageJobGrid jobs={jobs} onRemove={removeJob} onOpen={setSelectedId} />
              </Stack>
            </Paper>
          </>
        )}
      </Stack>

      {/* 상세보기(미리보기) 모달 */}
      <ImagePreviewModal
        images={previewImages}
        index={selectedIndex}
        onClose={() => setSelectedId(null)}
        onNavigate={(nextIndex) => setSelectedId(jobs[nextIndex].id)}
      />

      {/* 배경 선택 모달 (완료 이미지 미리보기 포함) */}
      <BackgroundOptionModal
        open={isBackgroundModalOpen}
        jobs={jobs.filter((job) => job.status === 'done')}
        value={backgroundOption}
        customColor={customColor}
        onChange={changeBackgroundOption}
        onCustomColorChange={setCustomColor}
        onClose={() => setIsBackgroundModalOpen(false)}
      />
    </PageLayout>
  );
}
