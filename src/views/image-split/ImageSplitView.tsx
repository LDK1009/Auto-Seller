'use client';

//////////////////////////////////////// 상세페이지 이미지 분할 화면 ////////////////////////////////////////
// 긴 상세 이미지를 조각 높이 단위로 잘라 번호 붙은 ZIP으로 제공.

import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import DownloadIcon from '@mui/icons-material/Download';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import ImageDropzone from '@/shared/components/ImageDropzone';
import StatBox from '@/shared/components/StatBox';
import WizardSteps from '@/shared/components/WizardSteps';
import NextActionBubble from '@/shared/components/NextActionBubble';
import {
  HEIGHT_PRESETS,
  MIN_PIECE_HEIGHT,
  MAX_PIECE_HEIGHT,
} from './_constants/imageSplit';
import { useImageSplit } from './_hooks/useImageSplit';
import SplitJobCard from './_components/SplitJobCard';

// 조각 높이 입력 보정
function clampPieceHeight(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return MIN_PIECE_HEIGHT;
  return Math.min(MAX_PIECE_HEIGHT, Math.max(MIN_PIECE_HEIGHT, Math.round(value)));
}

export default function ImageSplitView() {
  const {
    jobs,
    pieceHeight,
    outputMode,
    setOutputMode,
    isProcessing,
    isZipping,
    doneCount,
    totalPieces,
    setPieceHeight,
    addFiles,
    removeJob,
    clearAll,
    processAll,
    downloadAllAsZip,
  } = useImageSplit();

  const hasJobs = jobs.length > 0;

  // 작업 단계: 올리기 전 / 높이 설정 / 분할 중 / 분할 완료
  const phase = !hasJobs ? 'before' : isProcessing ? 'processing' : doneCount > 0 ? 'done' : 'setup';

  return (
    <PageLayout
      title="상세 분할"
      description="긴 상세 이미지가 에디터에서 잘리는 문제, 자동 분할로 끝내요."
      help={
        <HelpPanel storageKey="image-split">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 긴 상세페이지 이미지를 업로드해요 (여러 장 가능)</Typography>
            <Typography variant="body2">② 조각 높이를 정해요. 마켓 에디터의 이미지 높이 제한에 맞추세요</Typography>
            <Typography variant="body2">③ [분할하기] 후 [다운로드]하면 파일명_01, 02… 순서로 ZIP에 담겨요</Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Stack spacing={3}>
        {/* 위저드 스텝 — phase에서 유도 (before=①, setup·processing=②, done=③) */}
        <WizardSteps
          steps={[{ title: '이미지 올리기' }, { title: '조각 높이 설정' }, { title: '결과 받기' }]}
          activeStep={phase === 'before' ? 0 : phase === 'done' ? 2 : 1}
        />

        {/* ① 이미지 올리기 — 업로드존은 이 스텝에서만, 빈 상태엔 다음 행동 말풍선 */}
        {phase === 'before' && (
          <Stack spacing={1.5}>
            <NextActionBubble hint="여러 장이면 각각 나눠서 처리해요">
              분할할 긴 상세 이미지를 올려주세요
            </NextActionBubble>
            <ImageDropzone onFilesAdded={addFiles} disabled={isProcessing} />
          </Stack>
        )}

        {hasJobs && (
          <>
            {/* ② 조각 높이 설정 — 재분할 대비 전 스텝 노출 */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  조각 높이
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                  {HEIGHT_PRESETS.map((preset) => (
                    <Chip
                      key={preset.value}
                      label={preset.label}
                      color={pieceHeight === preset.value ? 'primary' : 'default'}
                      variant={pieceHeight === preset.value ? 'filled' : 'outlined'}
                      disabled={isProcessing}
                      onClick={() => setPieceHeight(preset.value)}
                    />
                  ))}
                  <TextField
                    type="number"
                    label="직접 입력"
                    value={pieceHeight}
                    disabled={isProcessing}
                    onChange={(event) => setPieceHeight(clampPieceHeight(event.target.value))}
                    slotProps={{
                      input: { endAdornment: <InputAdornment position="end">px</InputAdornment> },
                    }}
                    sx={{ width: 160 }}
                  />
                </Stack>

                {/* 출력 포맷 (P-5: JPG 압축 기본) */}
                <Typography variant="subtitle2" color="text.secondary">
                  출력 포맷
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                  <Chip
                    label="JPG 압축 (권장)"
                    color={outputMode === 'jpg' ? 'primary' : 'default'}
                    variant={outputMode === 'jpg' ? 'filled' : 'outlined'}
                    disabled={isProcessing}
                    onClick={() => setOutputMode('jpg')}
                  />
                  <Chip
                    label="원본 포맷 유지"
                    color={outputMode === 'original' ? 'primary' : 'default'}
                    variant={outputMode === 'original' ? 'filled' : 'outlined'}
                    disabled={isProcessing}
                    onClick={() => setOutputMode('original')}
                  />
                  <Typography variant="caption" color="text.secondary">
                    JPG 압축은 업로드 용량 제한 걸림을 줄여줘요 (상세 이미지는 투명도가 필요 없음)
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            {/* ② 분할 실행 */}
            {phase !== 'done' && (
              <Button
                fullWidth
                variant="contained"
                startIcon={<VerticalSplitIcon />}
                onClick={processAll}
                disabled={isProcessing}
              >
                {isProcessing ? '분할 중…' : '분할하기'}
              </Button>
            )}

            {/* ③ 결과 받기 — 다운로드·재분할 */}
            {phase === 'done' && (
              <Stack spacing={1.5}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={downloadAllAsZip}
                  disabled={isZipping}
                >
                  {isZipping ? '다운로드 중…' : `다운로드 (총 ${totalPieces}조각)`}
                </Button>
                <Button fullWidth variant="outlined" startIcon={<VerticalSplitIcon />} onClick={processAll}>
                  다시 분할
                </Button>
              </Stack>
            )}

            {/* 작업 아이템 컨테이너 — 전 스텝 공통 (상태 확인용) */}
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
                    <SplitJobCard key={job.id} job={job} pieceHeight={pieceHeight} onRemove={removeJob} />
                  ))}
                </Grid>
              </Stack>
            </Paper>
          </>
        )}
      </Stack>
    </PageLayout>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const Grid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
  gap: theme.spacing(2),
}));
