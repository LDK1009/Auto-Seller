'use client';

//////////////////////////////////////// 대량 이미지 누끼 화면 ////////////////////////////////////////
// 업로드 → 배경옵션 → 일괄 처리 → ZIP 다운로드를 조립하는 컨테이너.

import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DownloadIcon from '@mui/icons-material/Download';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import AnimatedProgressBar from '@/shared/components/AnimatedProgressBar';
import { useBackgroundRemoval } from './_hooks/useBackgroundRemoval';
import ImageDropzone from './_components/ImageDropzone';
import BackgroundOptionSelector from './_components/BackgroundOptionSelector';
import ImageJobGrid from './_components/ImageJobGrid';

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

        {/* 배경 옵션 */}
        <BackgroundOptionSelector
          value={backgroundOption}
          customColor={customColor}
          onChange={changeBackgroundOption}
          onCustomColorChange={setCustomColor}
          disabled={isProcessing}
        />

        {hasJobs && (
          <>
            <Divider />

            {/* 액션 바 */}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<AutoFixHighIcon />}
                onClick={start}
                disabled={isProcessing || pendingCount === 0}
              >
                {isProcessing ? '처리 중…' : `누끼 처리 (${pendingCount})`}
              </Button>
              {isProcessing && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<StopCircleIcon />}
                  onClick={requestCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? '중지 중…' : '취소'}
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={downloadAllAsZip}
                disabled={isProcessing || isZipping || doneCount === 0}
              >
                {isZipping ? 'ZIP 생성 중…' : `ZIP 다운로드 (${doneCount})`}
              </Button>
              <Button color="inherit" onClick={clearAll} disabled={isProcessing}>
                전체 초기화
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                완료 {doneCount} / 전체 {jobs.length}
              </Typography>
            </Stack>

            {/* 전체 진행률 (모델 로딩 중엔 모델 다운로드 표시) */}
            <Stack spacing={0.5}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {isModelLoading ? '모델 로딩 중 (최초 1회)' : '전체 진행률'}
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

            {/* 이미지 그리드 */}
            <ImageJobGrid jobs={jobs} onRemove={removeJob} />
          </>
        )}
      </Stack>
    </Container>
  );
}
