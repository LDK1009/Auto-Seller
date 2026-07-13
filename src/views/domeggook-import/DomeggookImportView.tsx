'use client';

//////////////////////////////////////// 원링크 화면 (플래그십) ////////////////////////////////////////
// 골: 도매꾹 URL 하나 → 네이버 상품등록까지. 현재 범위는 등록 "준비"(이미지 자동 가공)까지.
// 여정: 링크/상품번호 입력 → 상품 조회 → 공급사 사용 조건 확인 게이트 → 이미지 선택 → 누끼/규격 변환 투입.

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import { useSnackbar } from 'notistack';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import { useImageHandoffStore } from '@/shared/store/imageHandoffStore';
import { trackEvent } from '@/shared/utils/analytics';
import { downloadDomeggookImages } from '@/shared/services/domeggookItemService';
import { useDomeggookItem } from './_hooks/useDomeggookItem';
import { classifyDomeggookInput, parseDomeggookProductNo } from './_utils/parseDomeggookUrl';
import { mergeImagesVertically } from './_utils/mergeImagesVertically';
import { buildZipWithNames, downloadBlob } from '@/shared/utils/zip';
import DomeggookSearchPanel from '@/shared/components/DomeggookSearchPanel';
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

export default function DomeggookImportView() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { status, item, errorMessage, lookup, reset } = useDomeggookItem();

  // 순수 UI 상태
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);

  ////////// 조회 (성공 시 기본 선택 = 대표이미지만)
  const handleLookup = async (input: string) => {
    setSelectedUrls(new Set());
    const fetched = await lookup(input);
    trackEvent('domeggook_lookup', { result: fetched ? 'success' : 'fail' });
    if (fetched) {
      const thumbUrls = fetched.images.filter((image) => image.kind === 'thumb').map((image) => image.url);
      setSelectedUrls(new Set(thumbUrls));
    }
  };

  ////////// URL ?input= 단일 소스 — 상품 선택 = URL 변경 (공유·뒤로가기·새로고침 유지)
  const searchParams = useSearchParams();
  const lastLookedUpRef = useRef<string | null>(null);
  useEffect(() => {
    const inputParam = searchParams.get('input');
    if (inputParam) {
      if (lastLookedUpRef.current === inputParam) return; // 동일 상품 재조회 방지
      lastLookedUpRef.current = inputParam;
      handleLookup(inputParam);
    } else if (lastLookedUpRef.current !== null) {
      // 뒤로가기 등으로 파라미터 제거 → 검색 화면 복귀
      lastLookedUpRef.current = null;
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  ////////// 상품 선택 트리거 — URL만 변경 (실행은 searchParams 이펙트)
  const navigateToProduct = (no: string) => {
    if ((searchParams.get('input') ?? '') === no) return;
    router.push(`?input=${no}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      const files = await downloadDomeggookImages(selectedImages, item.no, (done, total) =>
        setDownloadProgress(`이미지 내려받는 중… ${done}/${total}`),
      );
      useImageHandoffStore.getState().setImages(files, autoStart);
      trackEvent('handoff', { from: 'domeggook-import', to: path.replace('/', '') });
      router.push(path);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '이미지를 불러오지 못했습니다.', {
        variant: 'error',
      });
      setDownloadProgress(null);
    }
  };

  ////////// 상세 통이미지 조립 — 선택한 상세 이미지를 세로 병합해 다운로드
  const handleMergeDetail = async () => {
    if (!item) return;
    const detailImages = item.images.filter(
      (image) => image.kind === 'detail' && selectedUrls.has(image.url),
    );
    if (detailImages.length === 0) return;

    try {
      const files = await downloadDomeggookImages(detailImages, item.no, (done, total) =>
        setDownloadProgress(`상세 이미지 내려받는 중… ${done}/${total}`),
      );
      setDownloadProgress('통이미지 조립 중…');
      const parts = await mergeImagesVertically(files.map((file) => file.blob));

      if (parts.length === 1) {
        downloadBlob(parts[0], `상세통이미지_${item.no}.jpg`);
      } else {
        const zipBlob = await buildZipWithNames(
          parts.map((blob, index) => ({
            name: `상세통이미지_${item.no}_${String(index + 1).padStart(2, '0')}.jpg`,
            blob,
          })),
        );
        downloadBlob(zipBlob, `상세통이미지_${item.no}.zip`);
        trackEvent('zip_download', { tool: 'detail-merge' });
      }
      enqueueSnackbar(
        parts.length === 1
          ? '상세 통이미지가 완성되었습니다. 에디터에 1장만 업로드하세요.'
          : `높이 제한으로 ${parts.length}개 파트로 나눠 완성되었습니다.`,
        { variant: 'success' },
      );
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '통이미지 조립에 실패했습니다.', {
        variant: 'error',
      });
    } finally {
      setDownloadProgress(null);
    }
  };

  const selectedDetailCount = item
    ? item.images.filter((image) => image.kind === 'detail' && selectedUrls.has(image.url)).length
    : 0;

  const isBusy = status === 'loading' || downloadProgress !== null;

  return (
    <PageLayout
      title="원링크"
      description="도매꾹 링크 하나로 — 이미지 완성까지 자동으로 준비합니다."
      maxWidth="md"
      help={
        <HelpPanel storageKey="domeggook-import">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 도매꾹 링크를 붙여넣거나, 검색으로 상품을 고르세요</Typography>
            <Typography variant="body2">② 필요한 이미지를 골라 누끼·규격 변환으로 보내세요</Typography>
            <Typography variant="body2">③ 등록 정보 시트를 스마트스토어에 그대로 붙여넣으세요</Typography>
            <Typography variant="caption" color="text.secondary">
              상품 이미지는 공급사 소유입니다. 사용 조건은 상품마다 다르니 반드시 확인하세요.
            </Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Stack spacing={3}>
        {/* 조회 중 */}
        {status === 'loading' && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">상품 정보를 불러오는 중…</Typography>
          </Stack>
        )}

        {/* 오류 */}
        {status === 'error' && errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        {/* 상품 미조회 상태 — 검색 섹션(분류|스마트 인풋|버튼) + 그리드 (검색 → 선택 → 등록 시트) */}
        {(status === 'idle' || status === 'error') && (
          <DomeggookSearchPanel
            inputLabel="도매꾹 링크·상품번호 또는 검색어"
            inputPlaceholder="https://domeggook.com/12345678 또는 캠핑랜턴"
            classifyInput={classifyDomeggookInput}
            onLookup={(raw) => {
              const productNo = parseDomeggookProductNo(raw);
              if (productNo) navigateToProduct(productNo);
            }}
            onPick={(no) => navigateToProduct(String(no))}
          />
        )}

        {/* 조회 결과 — 요약 / 이미지 / 시트 3카드 (정보 위계 분리) */}
        {status === 'loaded' && item && (
          <>
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('?')}
              sx={{ alignSelf: 'flex-start', color: 'text.secondary', mb: -1.5 }}
            >
              다른 상품 찾기
            </Button>

            {/* 상품 요약 카드 — 좌(4) 상품 이미지 / 우(6) 상품명·가격·조건 */}
            <Paper variant="outlined" sx={{ p: 3, position: 'relative' }}>
              {/* 우측 상단 도매꾹 바로가기 (텍스트 링크 대신 아이콘 — 이탈 최소화) */}
              <Tooltip title="도매꾹에서 보기">
                <IconButton
                  size="small"
                  onClick={() => window.open(item.itemUrl, '_blank', 'noopener')}
                  sx={{ position: 'absolute', top: 12, right: 12, color: 'text.secondary' }}
                >
                  <OpenInNewIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Stack spacing={2}>
                <SummarySplit>
                  {/* 좌 4: 상품 이미지 */}
                  <SummaryImageBox>
                    {item.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0].proxyUrl} alt={item.title} />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        이미지 없음
                      </Typography>
                    )}
                  </SummaryImageBox>

                  {/* 우 6: 상품명 → [가격·최소구매] → [이미지·사용 허용 여부] */}
                  <Stack spacing={2} sx={{ flex: 6, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
                      {item.title}
                    </Typography>

                    <Stack direction="row" spacing={4} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      <Stack spacing={0.25}>
                        <Typography variant="caption" color="text.secondary">
                          도매꾹가
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {item.domePrice !== null ? (
                            <>
                              {item.domePrice.toLocaleString()}
                              <Typography component="span" variant="body2" color="text.secondary">
                                원
                              </Typography>
                            </>
                          ) : (
                            '—'
                          )}
                        </Typography>
                      </Stack>
                      <Stack spacing={0.25}>
                        <Typography variant="caption" color="text.secondary">
                          최소구매
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {Math.max(item.moq, 1)}
                          <Typography component="span" variant="body2" color="text.secondary">
                            개
                          </Typography>
                        </Typography>
                      </Stack>
                    </Stack>

                    <Stack direction="row" spacing={4} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      <Stack spacing={0.25}>
                        <Typography variant="caption" color="text.secondary">
                          이미지
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {item.images.length}장
                        </Typography>
                      </Stack>
                      <Stack spacing={0.25}>
                        <Typography variant="caption" color="text.secondary">
                          공급사 이미지 사용
                        </Typography>
                        <Chip
                          size="small"
                          color={item.license.usable ? 'success' : 'error'}
                          variant="outlined"
                          label={item.license.usable ? '허용' : '사용 불가'}
                          sx={{ alignSelf: 'flex-start' }}
                        />
                      </Stack>
                    </Stack>

                  </Stack>
                </SummarySplit>

                {/* 사용 조건 문구 고지 (비차단 — usable=false만 아래 섹션 차단) */}
                <LicenseGate license={item.license} itemUrl={item.itemUrl} />
              </Stack>
            </Paper>

            {item.license.usable && (
              <>
                {/* 이미지 준비 카드 */}
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Typography variant="h6">이미지 준비</Typography>
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
                          <Button
                            variant="outlined"
                            startIcon={<VerticalSplitIcon />}
                            disabled={selectedDetailCount === 0 || isBusy}
                            onClick={handleMergeDetail}
                          >
                            상세 통이미지 받기{selectedDetailCount > 0 && ` (${selectedDetailCount}장)`}
                          </Button>
                          {downloadProgress && (
                            <Typography variant="body2" color="text.secondary">
                              {downloadProgress}
                            </Typography>
                          )}
                        </ActionRow>
                      </>
                    )}
                  </Stack>
                </Paper>

                {/* 등록 정보 시트 카드 */}
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <RegistrationSheet item={item} />
                </Paper>
              </>
            )}
          </>
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

const SummarySplit = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
}));

const SummaryImageBox = styled.div(({ theme }) => ({
  flex: 4,
  minWidth: 0,
  alignSelf: 'flex-start',
  aspectRatio: '1 / 1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
}));
