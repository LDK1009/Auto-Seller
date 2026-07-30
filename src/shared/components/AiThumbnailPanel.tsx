'use client';

//////////////////////////////////////// AI 썸네일 생성 패널 (공통) ////////////////////////////////////////
// 두 곳에서 같은 입력을 쓴다: ⑥ 이미지 섹션의 [AI 썸네일 만들기] 모달 · 슬롯 이미지 편집 모달.
// 입력 최소화 원칙 — 프롬프트를 쓰게 하지 않고 스타일 4종 + 짧은 문구만 받는다.
// 크레딧 차감·환불은 서버(/api/ai/thumbnail)가 하고, 여기서는 잔액 표시와 결과 전달만 한다.

import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { useSnackbar } from 'notistack';
import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { fetchCredits } from '@/shared/services/creditService';
import { blobToReferencePayload, base64ToBlob, generateThumbnail } from '@/shared/services/aiImageService';
import { CREDIT_COST } from '@/shared/constants/billing';
import {
  THUMBNAIL_STYLE_PRESETS,
  DEFAULT_THUMBNAIL_STYLE_ID,
  HEADLINE_MAX_LENGTH,
  type ThumbnailStyleId,
} from '@/shared/constants/aiThumbnail';
import LoginRequiredDialog from '@/shared/components/LoginRequiredDialog';
import { trackEvent } from '@/shared/utils/analytics';

const BUSY_LABEL = 'AI가 썸네일 만드는 중… 20초쯤 걸려요';

type AiThumbnailPanelProps = {
  productName?: string;
  source: 'image_section' | 'slot_editor'; // 계측용 — 어느 진입점이 결제로 이어지는지
  getReferenceBlob: () => Promise<Blob>; // 참조로 보낼 현재 이미지
  onGenerated: (blob: Blob) => void; // 생성 결과 전달 (부모가 미리보기·슬롯 반영)
  onBusyChange?: (label: string | null) => void; // 부모 오버레이와 연동
  disabled?: boolean;
  hasResult?: boolean; // true면 버튼 문구가 [다시 만들기]
};

export default function AiThumbnailPanel({
  productName,
  source,
  getReferenceBlob,
  onGenerated,
  onBusyChange,
  disabled = false,
  hasResult = false,
}: AiThumbnailPanelProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { session } = useAuthSession();

  const [styleId, setStyleId] = useState<ThumbnailStyleId>(DEFAULT_THUMBNAIL_STYLE_ID);
  const [headline, setHeadline] = useState('');
  const [creditBalance, setCreditBalance] = useState<number | null>(null); // null = 아직 모름
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  ////////// 크레딧 잔액 — 패널이 실제로 열렸을 때만 조회 (마운트 시점 = 사용자가 AI를 연 시점)
  useEffect(() => {
    const accessToken = session?.access_token;
    if (!accessToken) return;
    let cancelled = false;
    fetchCredits(accessToken)
      .then((summary) => {
        if (!cancelled) setCreditBalance(summary.balance);
      })
      .catch((error) => console.error(error));
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const isCreditShort = creditBalance !== null && creditBalance < CREDIT_COST.thumbnail;

  ////////// 생성 — 참조 이미지 축소 → 서버 → 결과 Blob을 부모로
  const generate = async () => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setIsLoginDialogOpen(true);
      return;
    }
    setIsGenerating(true);
    onBusyChange?.(BUSY_LABEL);
    try {
      const reference = await blobToReferencePayload(await getReferenceBlob());
      const preset = THUMBNAIL_STYLE_PRESETS.find((entry) => entry.id === styleId) ?? THUMBNAIL_STYLE_PRESETS[0];
      const result = await generateThumbnail({
        accessToken,
        productName: productName?.trim() || '상품',
        style: preset.prompt,
        headline: headline.trim() || undefined,
        image: reference,
      });
      onGenerated(base64ToBlob(result.image));
      setCreditBalance((previous) => (previous === null ? previous : Math.max(0, previous - result.creditsSpent)));
      trackEvent('ai_thumbnail_generate', {
        result: 'success',
        style: styleId,
        source,
        hasHeadline: headline.trim() !== '',
      });
    } catch (error) {
      console.error(error);
      const needsCredits = (error as { needsCredits?: boolean }).needsCredits === true;
      if (needsCredits) setCreditBalance(0);
      enqueueSnackbar(error instanceof Error ? error.message : 'AI 썸네일 생성에 실패했어요.', {
        variant: needsCredits ? 'warning' : 'error',
      });
      trackEvent('ai_thumbnail_generate', { result: needsCredits ? 'no_credits' : 'fail', style: styleId, source });
    } finally {
      setIsGenerating(false);
      onBusyChange?.(null);
    }
  };

  const isLocked = disabled || isGenerating;

  return (
    <Stack spacing={1.5}>
      {/* 스타일 — 프롬프트를 쓰지 않게 고정 선택지 */}
      <Stack spacing={0.75}>
        <Typography variant="caption" color="text.secondary">
          스타일
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
          {THUMBNAIL_STYLE_PRESETS.map((preset) => (
            <Chip
              key={preset.id}
              size="small"
              label={preset.label}
              disabled={isLocked}
              color={styleId === preset.id ? 'primary' : 'default'}
              variant={styleId === preset.id ? 'filled' : 'outlined'}
              onClick={() => setStyleId(preset.id)}
            />
          ))}
        </Stack>
      </Stack>

      <TextField
        size="small"
        label="문구 (선택)"
        placeholder="예) 하루만에 도착"
        value={headline}
        disabled={isLocked}
        onChange={(event) => setHeadline(event.target.value.slice(0, HEADLINE_MAX_LENGTH))}
        helperText={`이미지 위에 넣을 짧은 문구예요. ${headline.length}/${HEADLINE_MAX_LENGTH}자`}
      />

      <Button
        variant="contained"
        size="small"
        startIcon={<AutoAwesomeOutlinedIcon />}
        onClick={generate}
        disabled={isLocked || isCreditShort}
        sx={{ alignSelf: 'flex-start' }}
      >
        {hasResult ? '다시 만들기' : '썸네일 만들기'}
      </Button>

      {/* 크레딧 상태 — 부족하면 충전 경로를 바로 연다 */}
      {isCreditShort ? (
        <Typography variant="caption" color="warning.main">
          크레딧이 부족해요.{' '}
          <Link href="/pricing" target="_blank" rel="noopener" underline="always">
            충전하기
          </Link>
        </Typography>
      ) : (
        <Typography variant="caption" color="text.secondary">
          {creditBalance === null
            ? `지금 이미지를 참고해서 새 썸네일을 만들어요. 만들 때마다 크레딧 ${CREDIT_COST.thumbnail}개를 써요.`
            : `남은 크레딧 ${creditBalance}개 · 만들 때마다 ${CREDIT_COST.thumbnail}개 써요.`}
        </Typography>
      )}

      {/* AI 생성만 계정이 필요 — 누끼·워터마크는 로그인 없이 그대로 */}
      <LoginRequiredDialog
        open={isLoginDialogOpen}
        description="AI 썸네일은 크레딧을 쓰기 때문에 로그인이 필요해요. 배경 제거·워터마크는 로그인 없이 계속 쓸 수 있어요."
        onClose={() => setIsLoginDialogOpen(false)}
      />
    </Stack>
  );
}
