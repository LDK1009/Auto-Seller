'use client';

//////////////////////////////////////// 대량 이미지 누끼 화면 ////////////////////////////////////////
// 업로드 → 배경옵션 → 일괄 처리 → ZIP 다운로드를 조립하는 컨테이너.

import { useState } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DownloadIcon from '@mui/icons-material/Download';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PaletteIcon from '@mui/icons-material/Palette';
import AnimatedProgressBar from '@/shared/components/AnimatedProgressBar';
import { useBackgroundRemoval } from './_hooks/useBackgroundRemoval';
import ImageDropzone from './_components/ImageDropzone';
import BackgroundOptionModal from './_components/BackgroundOptionModal';
import ImageJobGrid from './_components/ImageJobGrid';
import StatBox from './_components/StatBox';
import ImageDetailModal from './_components/ImageDetailModal';

export default function BackgroundRemovalView() {
  const {
    jobs,
    isProcessing,
    isCancelling,
    isModelLoading,
    modelProgress,
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

  // 배경 선택 모달 열림 (순수 UI 상태)
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);

  // 초기화 버튼 (작업 전·완료 공통)
  const resetButton = (
    <Button fullWidth variant="outlined" color="inherit" startIcon={<RestartAltIcon />} onClick={clearAll}>
      초기화
    </Button>
  );

  return (
    <Container maxWidth="lg">
      <Stack spacing={3} sx={{ py: 5 }}>
        {/* 헤더 */}
        <Stack spacing={0.5}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            대량 이미지 누끼
          </Typography>
          <Typography variant="body2" color="text.secondary">
            여러 상품 이미지의 배경을 한 번에 제거합니다. 처리는 브라우저에서 진행되어 이미지가 서버로 전송되지 않습니다.
          </Typography>
        </Stack>

        {/* 업로드 */}
        <ImageDropzone onFilesAdded={addFiles} disabled={isProcessing} />

        {hasJobs && (
          <>
            <Divider />

            {/* 액션 바 — 단계별 버튼 (풀너비) */}
            <Stack spacing={1.5}>
              {/* 작업 전: 배경 제거 · 초기화 */}
              {phase === 'before' && (
                <>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AutoFixHighIcon />}
                    onClick={start}
                    disabled={pendingCount === 0}
                  >
                    배경 제거
                  </Button>
                  {resetButton}
                </>
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
              {/* 작업 완료: 배경 선택 · 다운로드 · 초기화 */}
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
                  {resetButton}
                </>
              )}
            </Stack>

            {/* 전체 진행률 (작업 전·중에만, 모델 로딩 중엔 모델 다운로드 표시) */}
            {phase !== 'done' && (
            <Stack spacing={0.5}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {isModelLoading ? 'AI 모델 실행 중 (최초 1회)' : '전체 진행률'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isModelLoading ? Math.round(modelProgress * 100) : overallProgress}%
                </Typography>
              </Stack>
              <AnimatedProgressBar
                value={isModelLoading ? modelProgress : overallProgress / 100}
                indeterminate={isModelLoading && modelProgress === 0}
              />
            </Stack>
            )}

            {/* 작업 아이템 컨테이너 (상단: 전체·완료 / 하단: 그리드) */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'transparent' }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1}>
                  <StatBox label="전체" value={jobs.length} />
                  <StatBox label="완료" value={doneCount} />
                </Stack>
                <ImageJobGrid jobs={jobs} onRemove={removeJob} onOpen={setSelectedId} />
              </Stack>
            </Paper>
          </>
        )}
      </Stack>

      {/* 상세보기 모달 */}
      <ImageDetailModal
        jobs={jobs}
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
    </Container>
  );
}
