'use client';

//////////////////////////////////////// 원링크 화면 (플래그십) ////////////////////////////////////////
// 골: 도매매 URL 하나 → 네이버 상품등록까지. 현재 범위는 등록 "준비"(이미지 자동 가공)까지.
// 여정: 링크/상품번호 입력 → 상품 조회 → 공급사 사용 조건 확인 게이트 → 이미지 선택 → 누끼/규격 변환 투입.

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import SearchIcon from '@mui/icons-material/Search';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import { useSnackbar } from 'notistack';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import { useImageHandoffStore } from '@/shared/store/imageHandoffStore';
import { trackEvent } from '@/shared/utils/analytics';
import { downloadDomemeImages } from '@/shared/services/domemeItemService';
import { useDomemeItem } from './_hooks/useDomemeItem';
import LicenseGate from './_components/LicenseGate';
import ImageSelectGrid from './_components/ImageSelectGrid';
import RegistrationSheet from './_components/RegistrationSheet';

// 핸드오프 대상 도구 — autoStart: 도착 즉시 작업 자동 시작 (원클릭 이어달리기)
const HANDOFF_TARGETS = [
  {
    key: 'background-removal',
    label: '누끼 바로 시작',
    path: '/background-removal',
    icon: <AutoFixHighIcon />,
    autoStart: true,
  },
  {
    key: 'image-resize',
    label: '규격 변환으로 보내기',
    path: '/image-resize',
    icon: <AspectRatioIcon />,
    autoStart: false, // 규격 변환은 프리셋 선택이 먼저라 자동 시작하지 않음
  },
];

export default function DomemeImportView() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { status, item, errorMessage, lookup } = useDomemeItem();

  // 순수 UI 상태
  const [rawInput, setRawInput] = useState('');
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);

  ////////// 조회 (성공 시 기본 선택 = 대표이미지만)
  const handleLookup = async (input: string) => {
    setLicenseConfirmed(false);
    setSelectedUrls(new Set());
    const fetched = await lookup(input);
    trackEvent('domeme_lookup', { result: fetched ? 'success' : 'fail' });
    if (fetched) {
      const thumbUrls = fetched.images.filter((image) => image.kind === 'thumb').map((image) => image.url);
      setSelectedUrls(new Set(thumbUrls));
    }
  };

  ////////// 메인 히어로에서 링크 들고 진입 시 자동 조회 (?input=)
  const searchParams = useSearchParams();
  const hasAutoLookedUp = useRef(false);
  useEffect(() => {
    if (hasAutoLookedUp.current) return;
    const initialInput = searchParams.get('input');
    if (!initialInput) return;
    hasAutoLookedUp.current = true;
    setRawInput(initialInput);
    handleLookup(initialInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  ////////// 이미지 선택 조작
  const toggleUrl = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  ////////// 선택 이미지 → 도구 핸드오프
  const handleSendTo = async (path: string, autoStart: boolean) => {
    if (!item) return;
    const selectedImages = item.images.filter((image) => selectedUrls.has(image.url));
    if (selectedImages.length === 0) return;

    try {
      const files = await downloadDomemeImages(selectedImages, item.no, (done, total) =>
        setDownloadProgress(`이미지 내려받는 중… ${done}/${total}`),
      );
      useImageHandoffStore.getState().setImages(files, autoStart);
      trackEvent('handoff', { from: 'domeme-import', to: path.replace('/', '') });
      router.push(path);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '이미지를 불러오지 못했습니다.', {
        variant: 'error',
      });
      setDownloadProgress(null);
    }
  };

  const isBusy = status === 'loading' || downloadProgress !== null;

  return (
    <PageLayout
      title="원링크"
      description="도매매 링크 하나로 — 이미지 완성까지 자동으로 준비합니다."
      maxWidth="md"
      help={
        <HelpPanel storageKey="domeme-import">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 도매매 상품 링크(또는 상품번호)를 붙여넣고 조회하세요</Typography>
            <Typography variant="body2">② 공급사의 이미지 사용 조건을 확인하고 체크합니다</Typography>
            <Typography variant="body2">③ 필요한 이미지를 골라 누끼·규격 변환으로 보내세요</Typography>
            <Typography variant="caption" color="text.secondary">
              상품 이미지는 공급사 소유입니다. 사용 조건은 상품마다 다르니 반드시 확인하세요. 가져온 이미지는
              전달용으로만 서버를 거치며 저장되지 않습니다.
            </Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Stack spacing={3}>
        {/* 링크 입력 */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack direction="row" spacing={1.5}>
            <TextField
              fullWidth
              size="small"
              label="도매매 상품 링크 또는 상품번호"
              placeholder="https://domeme.domeggook.com/s/12345678"
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isBusy) handleLookup(rawInput);
              }}
            />
            <Button
              variant="contained"
              onClick={() => handleLookup(rawInput)}
              disabled={isBusy || rawInput.trim().length === 0}
              startIcon={status === 'loading' ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              sx={{ flexShrink: 0 }}
            >
              조회
            </Button>
          </Stack>
        </Paper>

        {/* 오류 */}
        {status === 'error' && errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        {/* 조회 결과 */}
        {status === 'loaded' && item && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              {/* 상품 요약 */}
              <Stack spacing={0.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.domePrice !== null && `도매꾹가 ${item.domePrice.toLocaleString()}원 · `}
                  {item.moq > 1 && `최소구매 ${item.moq}개 · `}
                  이미지 {item.images.length}장 ·{' '}
                  <Link href={item.itemUrl} target="_blank" rel="noopener noreferrer">
                    상품 페이지 열기
                  </Link>
                </Typography>
              </Stack>

              <Divider />

              {/* 사용 조건 게이트 */}
              <LicenseGate
                license={item.license}
                itemUrl={item.itemUrl}
                confirmed={licenseConfirmed}
                onConfirmedChange={setLicenseConfirmed}
              />

              {/* 이미지 선택 — 게이트 확인 후 노출 */}
              {licenseConfirmed && (
                <>
                  <Divider />
                  {item.images.length === 0 ? (
                    <Alert severity="info">이 상품에서 가져올 수 있는 이미지를 찾지 못했습니다.</Alert>
                  ) : (
                    <>
                      <ImageSelectGrid
                        images={item.images}
                        selectedUrls={selectedUrls}
                        onToggle={toggleUrl}
                        onSelectAll={() => setSelectedUrls(new Set(item.images.map((image) => image.url)))}
                        onClearAll={() => setSelectedUrls(new Set())}
                      />

                      {/* 핸드오프 버튼 */}
                      <ActionRow>
                        {HANDOFF_TARGETS.map((target) => (
                          <Button
                            key={target.key}
                            variant="contained"
                            startIcon={target.icon}
                            disabled={selectedUrls.size === 0 || isBusy}
                            onClick={() => handleSendTo(target.path, target.autoStart)}
                          >
                            {target.label}
                          </Button>
                        ))}
                        {downloadProgress && (
                          <Typography variant="body2" color="text.secondary">
                            {downloadProgress}
                          </Typography>
                        )}
                      </ActionRow>
                    </>
                  )}

                  {/* 등록 정보 시트 (등록 준비 패키지) */}
                  <Divider />
                  <RegistrationSheet item={item} />
                </>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </PageLayout>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const ActionRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  flexWrap: 'wrap',
}));
