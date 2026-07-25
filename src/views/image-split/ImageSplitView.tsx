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

  return (
    <PageLayout
      title="상세 분할"
      description="세로로 긴 상세페이지 이미지를 지정 높이로 잘라 순서대로 저장해요. 처리는 브라우저에서 진행돼요."
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
        {!hasJobs && <ImageDropzone onFilesAdded={addFiles} disabled={isProcessing} />}

        {hasJobs && (
          <>
            {/* 조각 높이 설정 */}
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
                    size="small"
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

            {/* 액션 */}
            <Stack spacing={1.5}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<VerticalSplitIcon />}
                onClick={processAll}
                disabled={isProcessing}
              >
                {isProcessing ? '분할 중…' : doneCount > 0 ? '다시 분할' : '분할하기'}
              </Button>
              {doneCount > 0 && !isProcessing && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={downloadAllAsZip}
                  disabled={isZipping}
                >
                  {isZipping ? '다운로드 중…' : `다운로드 (총 ${totalPieces}조각)`}
                </Button>
              )}
            </Stack>

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
