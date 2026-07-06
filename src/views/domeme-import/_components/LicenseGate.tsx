'use client';

//////////////////////////////////////// 공급사 이미지 사용 조건 게이트 ////////////////////////////////////////
// L-2 조사 결론 반영: 이미지사용권은 상품별이고 공급사 문구(license.msg)가 실질 기준.
// 수집 전에 원문을 그대로 보여주고 사용자가 확인해야 다음 단계로 진행한다.
// "금합니다" 류 문구가 감지되면 경고를 강화한다 (판단 책임은 사용자·공급사 간 — 우리는 도구).

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import type { DomemeLicense } from '@/shared/types/domeme';

// 사용 금지 뉘앙스 감지 패턴
const FORBIDDEN_PATTERNS = ['금합', '금지', '불가', '허용하지 않', '사용할 수 없'];

type LicenseGateProps = {
  license: DomemeLicense;
  itemUrl: string;
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
};

export default function LicenseGate({ license, itemUrl, confirmed, onConfirmedChange }: LicenseGateProps) {
  const looksForbidden =
    license.msg !== null && FORBIDDEN_PATTERNS.some((pattern) => license.msg?.includes(pattern));

  return (
    <Stack spacing={1.5}>
      {license.msg ? (
        <Alert severity={looksForbidden ? 'error' : 'info'}>
          <AlertTitle>공급사 이미지 사용 조건</AlertTitle>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {license.msg}
          </Typography>
          {looksForbidden && (
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
              이 공급사는 이미지 사용을 제한하는 것으로 보입니다. 사용 전 공급사에 직접 확인하세요.
            </Typography>
          )}
        </Alert>
      ) : (
        <Alert severity="warning">
          <AlertTitle>공급사 이미지 사용 조건</AlertTitle>
          <Typography variant="body2">
            공급사가 별도 사용 조건을 밝히지 않았습니다.{' '}
            <Link href={itemUrl} target="_blank" rel="noopener noreferrer">
              상품 페이지
            </Link>
            에서 이미지 사용 가능 여부를 확인하세요.
          </Typography>
        </Alert>
      )}

      <FormControlLabel
        control={
          <Checkbox checked={confirmed} onChange={(event) => onConfirmedChange(event.target.checked)} />
        }
        label={
          <Typography variant="body2">
            공급사의 이미지 사용 조건을 확인했으며, 사용에 대한 책임은 저에게 있습니다
          </Typography>
        }
      />
    </Stack>
  );
}
