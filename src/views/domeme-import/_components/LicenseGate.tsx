'use client';

//////////////////////////////////////// 공급사 이미지 사용 조건 게이트 ////////////////////////////////////////
// 도매꾹 공식 회신(2026-07-07) 반영:
// - 이미지 사용허용 공식 필드 = license.usable → false면 진행 차단
// - usable=true여도 "임의 편집·가공은 msg 허용 범위 내, 명시 없으면 원본 사용 권장" → 고지 필수
// - msg에 금지 뉘앙스가 있으면 경고 강화 (usable과 msg가 상충하는 상품 실재)

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
  ////////// usable=false: 공급사가 이미지 사용을 허용하지 않음 — 진행 차단 (공식 필드 기준)
  if (!license.usable) {
    return (
      <Alert severity="error">
        <AlertTitle>이미지 사용이 허용되지 않은 상품입니다</AlertTitle>
        <Typography variant="body2">
          공급사가 이 상품의 이미지 사용을 허용하지 않았습니다. 이미지를 가져올 수 없습니다. 다른 상품을
          찾아보시거나,{' '}
          <Link href={itemUrl} target="_blank" rel="noopener noreferrer">
            상품 페이지
          </Link>
          에서 공급사에 직접 문의하세요.
        </Typography>
      </Alert>
    );
  }

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

      {/* 편집·가공 범위 고지 (도매꾹 공식 안내 기반) */}
      <Typography variant="caption" color="text.secondary">
        이미지 편집·가공(배경 제거 등)은 공급사가 허용한 범위에서만 가능합니다. 위 조건에 편집 허용 언급이
        없다면 원본 그대로 사용하는 것이 안전합니다.
      </Typography>

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
