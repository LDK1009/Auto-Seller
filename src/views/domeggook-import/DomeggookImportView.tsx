'use client';

//////////////////////////////////////// 원링크 화면 (플래그십) ////////////////////////////////////////
// 골: 도매꾹 URL 하나 → 네이버 상품등록까지. 현재 범위는 등록 "준비"(이미지 자동 가공)까지.
// 여정: 링크/상품번호 입력 → 상품 조회 → 공급사 사용 조건 확인 게이트 → 이미지 선택 → 누끼/규격 변환 투입.

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from '@emotion/styled';
import { alpha } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import { useSnackbar } from 'notistack';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import { trackEvent } from '@/shared/utils/analytics';
import { transientOptions } from '@/shared/utils/emotionTransientProps';
import { downloadDomeggookImages } from '@/shared/services/domeggookItemService';
import { useDomeggookItem } from './_hooks/useDomeggookItem';
import { classifyDomeggookInput, parseDomeggookProductNo } from './_utils/parseDomeggookUrl';
import { mergeImagesVertically } from './_utils/mergeImagesVertically';
import { buildZipWithNames, downloadBlob } from '@/shared/utils/zip';
import DomeggookSearchPanel from '@/shared/components/DomeggookSearchPanel';
import LicenseGate from './_components/LicenseGate';
import DetailCropModal from './_components/DetailCropModal';
import RegistrationSheet from './_components/RegistrationSheet';
import SlotImageEditorModal from './_components/SlotImageEditorModal';
import type { DomeggookItemImage } from '@/shared/types/domeggook';
import CropOutlinedIcon from '@mui/icons-material/CropOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';

// 대표/추가 이미지 슬롯 항목 — 원본(도매꾹 이미지) 또는 크롭(상세에서 잘라옴)
type PickedImage = {
  id: string;
  source: 'original' | 'crop';
  previewUrl: string;
  original?: DomeggookItemImage;
  blob?: Blob;
};

const MAX_EXTRA_IMAGES = 9; // 스마트스토어 추가이미지 한도

// 원본 이미지 → 슬롯 항목 (순수 변환 — 컴포넌트 밖)
const pickedFromOriginal = (image: DomeggookItemImage): PickedImage => ({
  id: `org-${image.url}`,
  source: 'original',
  previewUrl: image.proxyUrl,
  original: image,
});

export default function DomeggookImportView() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { status, item, errorMessage, lookup, reset } = useDomeggookItem();

  // 순수 UI 상태
  const [mainImage, setMainImage] = useState<PickedImage | null>(null); // 대표 1장
  const [extraImages, setExtraImages] = useState<PickedImage[]>([]); // 추가 최대 9장
  const [cropTarget, setCropTarget] = useState<'main' | 'extra' | null>(null); // 크롭 모달 대상 소섹션
  const cropSequenceRef = useRef(0);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null); // 자세히 보기 (item.images 인덱스 — 0=대표)
  // 슬롯 이미지 미리보기 (1000×1000 기준) — context에 따라 [대표로 사용]/[제거] 제공
  const [slotPreview, setSlotPreview] = useState<{ picked: PickedImage; context: 'main' | 'extra' } | null>(null);

  const detailImages = item ? item.images.filter((image) => image.kind === 'detail') : [];

  ////////// 자세히 보기 열림 동안 페이지 스크롤 차단
  // MUI 기본 scroll lock은 스크롤바 제거로 레이아웃이 밀려서(disableScrollLock 유지) 직접 잠금 —
  // scrollbar-gutter: stable로 스크롤바 자리를 보존해 밀림 없이 잠근다
  const isPreviewOpen = previewIndex !== null;
  useEffect(() => {
    if (!isPreviewOpen) return;
    const root = document.documentElement;
    root.style.scrollbarGutter = 'stable';
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      root.style.scrollbarGutter = '';
      root.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isPreviewOpen]);

  ////////// 자세히 보기 슬라이드 이동 (0=대표, 이후 상세)
  const movePreview = (step: number) => {
    if (!item) return;
    setPreviewIndex((current) => {
      if (current === null) return current;
      const next = current + step;
      return next >= 0 && next < item.images.length ? next : current;
    });
  };

  ////////// 조회 (성공 시 대표이미지 자동 선택, 추가는 비움)
  const handleLookup = async (input: string) => {
    setMainImage(null);
    setExtraImages([]);
    const fetched = await lookup(input);
    trackEvent('domeggook_lookup', { result: fetched ? 'success' : 'fail' });
    if (fetched) {
      const thumb = fetched.images.find((image) => image.kind === 'thumb');
      if (thumb) setMainImage(pickedFromOriginal(thumb));
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

  ////////// 대표/추가 슬롯 조작
  const thumbImage = item?.images.find((image) => image.kind === 'thumb') ?? null;

  const removeExtra = (id: string) => {
    setExtraImages((previous) => previous.filter((entry) => entry.id !== id));
  };

  ////////// 크롭 완료 — 대상 소섹션 슬롯에 투입
  const handleCropDone = (blob: Blob) => {
    cropSequenceRef.current += 1;
    const picked: PickedImage = {
      id: `crop-${cropSequenceRef.current}`,
      source: 'crop',
      previewUrl: URL.createObjectURL(blob),
      blob,
    };
    if (cropTarget === 'main') {
      setMainImage(picked);
    } else {
      setExtraImages((previous) => {
        if (previous.length >= MAX_EXTRA_IMAGES) {
          enqueueSnackbar(`추가이미지는 최대 ${MAX_EXTRA_IMAGES}장입니다.`, { variant: 'info' });
          return previous;
        }
        return [...previous, picked];
      });
    }
  };

  ////////// 편집 적용 — 가공 Blob으로 해당 슬롯 교체 (원본 항목은 대체 — [원본으로]는 모달 안에서)
  const handleEditorApply = (blob: Blob) => {
    if (!slotPreview) return;
    cropSequenceRef.current += 1;
    const edited: PickedImage = {
      id: `edit-${cropSequenceRef.current}`,
      source: 'crop',
      previewUrl: URL.createObjectURL(blob),
      blob,
    };
    if (slotPreview.context === 'main') {
      setMainImage(edited);
    } else {
      setExtraImages((previous) => previous.map((entry) => (entry.id === slotPreview.picked.id ? edited : entry)));
    }
    setSlotPreview(null);
  };

  ////////// 상품이미지 전체 다운로드 — zip 안에 대표이미지/추가이미지/동영상 3폴더
  const handleDownloadAllImages = async () => {
    if (!item) return;
    if (!mainImage && extraImages.length === 0) return;

    try {
      const files: { name: string; blob: Blob }[] = [];

      // 대표이미지 폴더
      if (mainImage) {
        setDownloadProgress('대표이미지 준비 중…');
        if (mainImage.source === 'original' && mainImage.original) {
          const [file] = await downloadDomeggookImages([mainImage.original], item.no);
          files.push({ name: `대표이미지/${file.name}`, blob: file.blob });
        } else if (mainImage.blob) {
          files.push({ name: `대표이미지/대표이미지_크롭.jpg`, blob: mainImage.blob });
        }
      }

      // 추가이미지 폴더
      for (let index = 0; index < extraImages.length; index += 1) {
        const entry = extraImages[index];
        setDownloadProgress(`추가이미지 준비 중… ${index + 1}/${extraImages.length}`);
        const paddedNumber = String(index + 1).padStart(2, '0');
        if (entry.source === 'original' && entry.original) {
          const [file] = await downloadDomeggookImages([entry.original], item.no);
          files.push({ name: `추가이미지/추가이미지_${paddedNumber}_${file.name}`, blob: file.blob });
        } else if (entry.blob) {
          files.push({ name: `추가이미지/추가이미지_${paddedNumber}.jpg`, blob: entry.blob });
        }
      }

      // 동영상 폴더 — 도매꾹 미제공 안내
      files.push({
        name: '동영상/안내.txt',
        blob: new Blob(['도매꾹은 상품 동영상을 제공하지 않습니다. 직접 촬영·제작한 영상을 사용하세요.'], {
          type: 'text/plain;charset=utf-8',
        }),
      });

      setDownloadProgress('압축 중…');
      const zipBlob = await buildZipWithNames(files);
      downloadBlob(zipBlob, `상품이미지_${item.no}.zip`);
      trackEvent('zip_download', { tool: 'image-slots' });
      enqueueSnackbar('상품이미지를 압축해 내려받았습니다.', { variant: 'success' });
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '다운로드에 실패했습니다.', { variant: 'error' });
    } finally {
      setDownloadProgress(null);
    }
  };

  ////////// 상세 통이미지 조립 — 상세 이미지 전체를 세로 병합해 다운로드
  const handleMergeDetail = async () => {
    if (!item) return;
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
            <Typography variant="body2">③ 등록 정보를 스마트스토어에 그대로 붙여넣으세요</Typography>
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
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6">상품 정보</Typography>
                <SummarySplit>
                  {/* 좌 4: 상품 이미지 (클릭 = 자세히 보기, 우측 상단 = 도매꾹 바로가기) */}
                  <SummaryImageBox
                    onClick={() => item.images[0] && setPreviewIndex(0)}
                    $isClickable={Boolean(item.images[0])}
                  >
                    {item.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0].proxyUrl} alt={item.title} />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        이미지 없음
                      </Typography>
                    )}
                    <Tooltip title="도매꾹에서 보기">
                      <ImageCornerButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          window.open(item.itemUrl, '_blank', 'noopener');
                        }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 16 }} />
                      </ImageCornerButton>
                    </Tooltip>
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
                      <Stack spacing={0.25}>
                        <Typography variant="caption" color="text.secondary">
                          배송비
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {item.delivery.baseFee !== null && item.delivery.baseFee > 0 ? (
                            <>
                              {item.delivery.baseFee.toLocaleString()}
                              <Typography component="span" variant="body2" color="text.secondary">
                                원
                              </Typography>
                            </>
                          ) : (
                            item.delivery.feeType ?? '—'
                          )}
                        </Typography>
                      </Stack>
                    </Stack>

                    {/* 속성 뱃지 행 */}
                    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        color={item.license.usable ? 'success' : 'error'}
                        variant="outlined"
                        label={item.license.usable ? '이미지 사용 가능' : '이미지 사용 불가'}
                      />
                    </Stack>

                    {/* 상세이미지 스트립 — 클릭 = 자세히 보기 */}
                    {detailImages.length > 0 && (
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          상세이미지 {detailImages.length}장
                        </Typography>
                        <DetailStrip>
                          {detailImages.map((image) => (
                            <DetailThumb
                              key={image.url}
                              type="button"
                              onClick={() => setPreviewIndex(item.images.findIndex((entry) => entry.url === image.url))}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={image.proxyUrl} alt="" loading="lazy" />
                            </DetailThumb>
                          ))}
                        </DetailStrip>
                      </Stack>
                    )}
                  </Stack>
                </SummarySplit>

                {/* 사용 조건 문구 고지 (비차단 — usable=false만 아래 섹션 차단) */}
                <LicenseGate license={item.license} itemUrl={item.itemUrl} />
              </Stack>
            </Paper>

            {item.license.usable && (
              /* 등록 정보 시트 — 이미지 작업도 스마트스토어 순서상 ⑥·⑦ 섹션으로 주입 */
              <Paper variant="outlined" sx={{ p: 3 }}>
                <RegistrationSheet
                  item={item}
                  imageSection={
                    item.images.length === 0 ? (
                      <Alert severity="info">이 상품에서 가져올 수 있는 이미지를 찾지 못했습니다.</Alert>
                    ) : (
                      <>
                        {/* 대표이미지 — 기본 = 도매꾹 대표, 크롭으로 교체 가능. 클릭 = 1000×1000 미리보기 */}
                        <Stack spacing={0.75}>
                          <Typography variant="subtitle2">대표이미지 · 1장</Typography>
                          <PickStrip>
                            {mainImage ? (
                              <PickThumb
                                key={mainImage.id}
                                $isSelected
                                onClick={() => setSlotPreview({ picked: mainImage, context: 'main' })}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={mainImage.previewUrl} alt="대표이미지" />
                                <ThumbRemoveButton
                                  size="small"
                                  aria-label="대표이미지 삭제"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setMainImage(null);
                                  }}
                                >
                                  <CloseIcon sx={{ fontSize: 14 }} />
                                </ThumbRemoveButton>
                              </PickThumb>
                            ) : (
                              thumbImage && (
                                <RestoreMainTile
                                  type="button"
                                  onClick={() => setMainImage(pickedFromOriginal(thumbImage))}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={thumbImage.proxyUrl} alt="" loading="lazy" />
                                  <Typography variant="caption" sx={{ lineHeight: 1.3, fontWeight: 600 }}>
                                    도매꾹
                                    <br />
                                    대표이미지
                                    <br />
                                    사용하기
                                  </Typography>
                                </RestoreMainTile>
                              )
                            )}
                            <CropAddTile
                              type="button"
                              disabled={detailImages.length === 0}
                              onClick={() => setCropTarget('main')}
                            >
                              <CropOutlinedIcon sx={{ fontSize: 24 }} />
                              <Typography variant="caption" sx={{ lineHeight: 1.3 }}>
                                상세이미지
                                <br />
                                잘라오기
                              </Typography>
                            </CropAddTile>
                          </PickStrip>
                        </Stack>

                        {/* 추가이미지 — 기본 없음, 상세에서 잘라와 채움 (최대 9장). 클릭 = 미리보기 */}
                        <Stack spacing={0.75}>
                          <Typography variant="subtitle2">
                            추가이미지 · {extraImages.length}/{MAX_EXTRA_IMAGES}장
                          </Typography>
                          <PickStrip>
                            {extraImages.map((entry) => (
                              <PickThumb
                                key={entry.id}
                                $isSelected
                                onClick={() => setSlotPreview({ picked: entry, context: 'extra' })}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={entry.previewUrl} alt="크롭 추가" />
                                <ThumbRemoveButton
                                  size="small"
                                  aria-label="추가이미지 삭제"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removeExtra(entry.id);
                                  }}
                                >
                                  <CloseIcon sx={{ fontSize: 14 }} />
                                </ThumbRemoveButton>
                              </PickThumb>
                            ))}
                            <CropAddTile
                              type="button"
                              disabled={detailImages.length === 0}
                              onClick={() => setCropTarget('extra')}
                            >
                              <CropOutlinedIcon sx={{ fontSize: 24 }} />
                              <Typography variant="caption" sx={{ lineHeight: 1.3 }}>
                                상세이미지
                                <br />
                                잘라오기
                              </Typography>
                            </CropAddTile>
                          </PickStrip>
                        </Stack>

                        {/* 동영상 */}
                        <Stack spacing={0.75}>
                          <Typography variant="subtitle2">동영상</Typography>
                          <Typography variant="body2" color="text.secondary">
                            도매꾹은 상품 동영상을 제공하지 않습니다 — 직접 촬영·제작한 영상을 등록 화면에서
                            업로드하세요.
                          </Typography>
                        </Stack>

                        {/* 전체 다운로드 — 대표이미지/추가이미지/동영상 3폴더 zip */}
                        <ActionRow>
                          <Button
                            variant="contained"
                            startIcon={<FileDownloadOutlinedIcon />}
                            disabled={(!mainImage && extraImages.length === 0) || isBusy}
                            onClick={handleDownloadAllImages}
                          >
                            이미지 전체 다운로드
                          </Button>
                          {downloadProgress && (
                            <Typography variant="body2" color="text.secondary">
                              {downloadProgress}
                            </Typography>
                          )}
                        </ActionRow>
                      </>
                    )
                  }
                  detailSection={
                    detailImages.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        이 상품은 상세 이미지가 없습니다 — 에디터에 직접 내용을 작성하세요.
                      </Typography>
                    ) : (
                      <>
                        <ActionRow>
                          <Button
                            variant="outlined"
                            startIcon={<VerticalSplitIcon />}
                            disabled={isBusy}
                            onClick={handleMergeDetail}
                          >
                            상세 통이미지 받기 ({detailImages.length}장)
                          </Button>
                        </ActionRow>
                        <Typography variant="caption" color="text.secondary">
                          상세 이미지 전체를 세로로 이어붙인 통이미지로 내려받아 에디터에 업로드하세요.
                        </Typography>
                      </>
                    )
                  }
                />
              </Paper>
            )}
          </>
        )}
      </Stack>

      {/* 슬롯 이미지 미리보기+편집 — 누끼·배경 합성·워터마크, [적용] 시 슬롯 교체 */}
      {slotPreview && (
        <SlotImageEditorModal
          open
          imageUrl={slotPreview.picked.previewUrl}
          imageBlob={slotPreview.picked.blob}
          context={slotPreview.context}
          isCurrentMain={mainImage?.id === slotPreview.picked.id}
          onClose={() => setSlotPreview(null)}
          onApply={handleEditorApply}
          onSetMain={() => {
            setMainImage(slotPreview.picked);
            setSlotPreview(null);
          }}
          onRemove={() => {
            removeExtra(slotPreview.picked.id);
            setSlotPreview(null);
          }}
        />
      )}

      {/* 상세이미지 잘라오기 — 대표/추가 소섹션 공용 크롭 모달 */}
      <DetailCropModal
        open={cropTarget !== null}
        images={detailImages}
        onClose={() => setCropTarget(null)}
        onCrop={handleCropDone}
      />

      {/* 이미지 자세히 보기 모달 — 1번 대표, 이후 상세 슬라이드. 긴 상세이미지는 세로 스크롤 */}
      {/* disableScrollLock — 스크롤바 제거로 인한 레이아웃 밀림(섹션 깨짐) 방지 */}
      <Dialog
        open={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
        maxWidth={false}
        disableScrollLock
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') movePreview(-1);
          if (event.key === 'ArrowRight') movePreview(1);
        }}
      >
        {previewIndex !== null && item && item.images[previewIndex] && (
          <PreviewShell>
            <PreviewScroll>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.images[previewIndex].proxyUrl} alt={`이미지 ${previewIndex + 1}`} />
            </PreviewScroll>

            {/* 닫기 */}
            <PreviewCloseButton size="small" onClick={() => setPreviewIndex(null)} aria-label="닫기">
              <CloseIcon sx={{ fontSize: 20 }} />
            </PreviewCloseButton>

            {/* 좌우 슬라이드 */}
            <PreviewNavButton
              $side="left"
              onClick={() => movePreview(-1)}
              disabled={previewIndex === 0}
              size="large"
            >
              <ChevronLeftIcon />
            </PreviewNavButton>
            <PreviewNavButton
              $side="right"
              onClick={() => movePreview(1)}
              disabled={previewIndex === item.images.length - 1}
              size="large"
            >
              <ChevronRightIcon />
            </PreviewNavButton>

            {/* 위치 표시 */}
            <PreviewCounter>
              {previewIndex + 1} / {item.images.length}
              {previewIndex === 0 ? ' · 대표' : ' · 상세'}
            </PreviewCounter>
          </PreviewShell>
        )}
      </Dialog>
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

// 높이 고정 없음 — 좌우 flex stretch로 우측 콘텐츠 높이를 그대로 따라감 (모바일 세로 배치에서만 1:1)
const SummaryImageBox = styled('div', transientOptions)<{ $isClickable: boolean }>(({ theme, $isClickable }) => ({
  position: 'relative',
  flex: 4,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  cursor: $isClickable ? 'zoom-in' : 'default',
  [theme.breakpoints.down('sm')]: {
    aspectRatio: '1 / 1',
  },
  '& img': {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
}));

const ImageCornerButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(0.75),
  right: theme.spacing(0.75),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: theme.palette.background.paper,
  },
}));

const DetailStrip = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  overflowX: 'auto',
  paddingBottom: theme.spacing(0.5),
  scrollbarWidth: 'thin', // Firefox
  '&::-webkit-scrollbar': {
    height: 4,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.divider,
    borderRadius: 2,
  },
}));

const DetailThumb = styled.button(({ theme }) => ({
  width: 64,
  height: 64,
  flexShrink: 0,
  padding: 0,
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  cursor: 'zoom-in',
  '&:hover': {
    borderColor: theme.palette.primary.main,
  },
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
}));

// 슬롯 미리보기 프레임 — 1000×1000 권장 규격 비율(정사각) 흰 배경, 이미지 contain
//////////////////// 대표/추가 이미지 선택 스트립 ////////////////////
const ThumbRemoveButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 4,
  right: 4,
  padding: 2,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[1],
  '&:hover': {
    backgroundColor: theme.palette.background.paper,
  },
}));

const PickStrip = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  flexWrap: 'wrap',
}));

const PickThumb = styled('div', transientOptions)<{ $isSelected?: boolean }>(({ theme, $isSelected }) => ({
  position: 'relative',
  width: 108,
  height: 108,
  flexShrink: 0,
  padding: 0,
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  border: $isSelected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  cursor: 'pointer',
  '&:hover': {
    borderColor: theme.palette.primary.main,
  },
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
}));

// 도매꾹 대표이미지 복원 타일 — 썸네일 배경 + 연한 프라이머리 점선 테두리
const RestoreMainTile = styled.button(({ theme }) => ({
  position: 'relative',
  width: 108,
  height: 108,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  border: `1px dashed ${alpha(theme.palette.primary.main, 0.5)}`,
  backgroundColor: 'transparent',
  color: theme.palette.primary.main,
  cursor: 'pointer',
  textAlign: 'center',
  padding: 0,
  '& img': {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 0.3,
  },
  '& .MuiTypography-root': {
    position: 'relative', // 배경 이미지 위로
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'rgba(255, 255, 255, 0.82)', // 반투명 흰 배경 — 이미지 위 가독 확보
    backdropFilter: 'blur(2px)',
  },
  '&:hover': {
    borderColor: theme.palette.primary.main,
    '& img': { opacity: 0.45 },
  },
}));

const CropAddTile = styled.button(({ theme }) => ({
  width: 108,
  height: 108,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(0.75),
  borderRadius: theme.shape.borderRadius,
  border: `1px dashed ${theme.palette.divider}`,
  backgroundColor: 'transparent',
  color: theme.palette.text.secondary,
  cursor: 'pointer',
  textAlign: 'center',
  lineHeight: 1.2,
  '&:hover:not(:disabled)': {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
  },
  '&:disabled': {
    opacity: 0.4,
    cursor: 'default',
  },
}));

const PreviewShell = styled.div({
  position: 'relative',
});

// 긴 상세이미지 대응 — 최대 높이 고정 + 내부 세로 스크롤 (원본 폭 유지)
const PreviewScroll = styled.div(({ theme }) => ({
  width: 'min(90vw, 860px)',
  maxHeight: '85vh',
  overflowY: 'auto',
  scrollbarWidth: 'thin', // Firefox
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.divider,
    borderRadius: 3,
  },
  '& img': {
    display: 'block',
    width: '100%',
    height: 'auto',
  },
}));

const PreviewNavButton = styled(IconButton, transientOptions)<{ $side: 'left' | 'right' }>(
  ({ theme, $side }) => ({
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    [$side]: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[2],
    '&:hover': {
      backgroundColor: theme.palette.background.paper,
    },
    '&.Mui-disabled': {
      opacity: 0.35,
      backgroundColor: theme.palette.background.paper,
    },
  }),
);

const PreviewCloseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[2],
  '&:hover': {
    backgroundColor: theme.palette.background.paper,
  },
}));

const PreviewCounter = styled.div(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(1.5),
  left: '50%',
  transform: 'translateX(-50%)',
  padding: theme.spacing(0.5, 1.5),
  borderRadius: 999,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  color: theme.palette.common.white,
  fontSize: 12,
  fontWeight: 600,
}));
