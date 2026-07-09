'use client';

//////////////////////////////////////// 이미지 규정 검사 화면 ////////////////////////////////////////
// 업로드 즉시 대표이미지 규정(포맷·해상도·비율·용량)을 검사하고, 규격 변환으로 연결한다.

import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import ImageDropzone from '@/shared/components/ImageDropzone';
import StatBox from '@/shared/components/StatBox';
import { CHECK_DISCLAIMER } from './_constants/imageCheck';
import { useImageCheck } from './_hooks/useImageCheck';
import CheckResultCard from './_components/CheckResultCard';

export default function ImageCheckView() {
  const { jobs, passCount, warnCount, failCount, addFiles, removeJob, clearAll, sendToResize } =
    useImageCheck();

  const hasJobs = jobs.length > 0;
  const needsFix = warnCount + failCount > 0;

  return (
    <PageLayout
      title="규정 검사"
      description="상품 대표이미지가 마켓 규정에 맞는지 업로드 즉시 검사합니다. 처리는 브라우저에서 진행됩니다."
      help={
        <HelpPanel storageKey="image-check">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 이미지를 업로드하면 즉시 포맷·해상도·비율·용량을 검사합니다</Typography>
            <Typography variant="body2">② 주의/부적합 항목이 있으면 [규격 변환으로 보내기]로 바로 고칠 수 있습니다</Typography>
            <Typography variant="caption" color="text.secondary">
              {CHECK_DISCLAIMER}
            </Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Stack spacing={3}>
        {/* 업로드 (이미지가 없을 때만) */}
        {!hasJobs && <ImageDropzone onFilesAdded={addFiles} />}

        {hasJobs && (
          <>
            {/* 파이프라인 연결 */}
            {needsFix && (
              <Button fullWidth variant="contained" startIcon={<AspectRatioIcon />} onClick={sendToResize}>
                규격 변환으로 보내기
              </Button>
            )}

            {/* 결과 컨테이너 */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stack direction="row" spacing={1}>
                    <StatBox label="적합" value={passCount} />
                    <StatBox label="주의" value={warnCount} />
                    <StatBox label="부적합" value={failCount} />
                  </Stack>
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    startIcon={<RestartAltIcon />}
                    onClick={clearAll}
                  >
                    초기화
                  </Button>
                </Stack>
                <Grid>
                  {jobs.map((job) => (
                    <CheckResultCard key={job.id} job={job} onRemove={removeJob} />
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
