'use client';

//////////////////////////////////////// 공급사 이미지 사용 조건 고지 (비차단) ////////////////////////////////////////
// 도매꾹 공식 회신(2026-07-07) 반영:
// - 이미지 사용허용 공식 필드 = license.usable → false면 진행 차단 (유일한 차단 케이스)
// - usable=true는 확인 체크 없이 바로 진행 — 조건 문구는 캡션 한 줄로만 고지 (2026-07-13 사용감 개선)
// - msg에 금지 뉘앙스가 있으면 경고 알럿으로 승격 (usable과 msg가 상충하는 상품 실재)

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import type { DomeggookLicense } from '@/shared/types/domeggook';

// 사용 금지 뉘앙스 감지 패턴
const FORBIDDEN_PATTERNS = ['금합', '금지', '불가', '허용하지 않', '사용할 수 없'];

type LicenseGateProps = {
  license: DomeggookLicense;
  itemUrl: string;
};

export default function LicenseGate({ license, itemUrl }: LicenseGateProps) {
  ////////// usable=false: 공급사가 이미지 사용을 허용하지 않음 — 진행 차단 (공식 필드 기준)
  if (!license.usable) {
    return (
      <Alert severity="error">
        <AlertTitle>이미지 사용이 허용되지 않은 상품이에요</AlertTitle>
        <Typography variant="body2">
          공급사가 이 상품의 이미지 사용을 허용하지 않았어요. 이미지를 가져올 수 없어요. 다른 상품을
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

  ////////// msg가 사용 제한 뉘앙스 — 경고만 표시 (진행은 허용)
  if (looksForbidden) {
    return (
      <Alert severity="warning">
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {license.msg}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
          이 공급사는 이미지 사용을 제한하는 것으로 보여요. 사용 전 공급사에 직접 확인하세요.
        </Typography>
      </Alert>
    );
  }

  ////////// 일반 케이스 — 표시 없음 (요약 카드의 [허용] 칩이 상태 전달, 2026-07-13 이탈 감소)
  return null;
}
