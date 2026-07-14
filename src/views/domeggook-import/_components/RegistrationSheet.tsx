'use client';

//////////////////////////////////////// 등록 정보 시트 (등록 준비 패키지) ////////////////////////////////////////
// 스마트스토어 등록 폼에 그대로 붙여넣을 정보를 자동 조합한다 — API 없이 등록 노동의 마지막 구간을 복붙으로.
// 섹션 순서 = 스마트스토어 등록 화면 실측 순서 (2026-07-13 대표 확인):
// 카테고리 → 상품명 → 판매가 → 재고수량 → 옵션 → 상품이미지 → 상세설명 → 주요정보 → 배송 → 반품 → 검색설정 → 판매자 코드
// - 판매가: 도매꾹가 × 구매단위(MOQ) 원가로 역산 (shared/utils/marginCalculation 재사용)
// - MOQ ≥ 2: 묶음(1+1 등) 구성 판매 안내 — 고객 1주문 = 도매꾹 MOQ 구매이므로 원가에 반영

import { useEffect, useRef, useState, type ReactNode } from 'react';
import styled from '@emotion/styled';
import { alpha } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { useSnackbar } from 'notistack';
import { FEE_PRESETS, FEE_DISCLAIMER, TARGET_MARGIN_PRESETS } from '@/shared/constants/marketFees';
import { calculateMargin, calculateReversePrice, PRICE_ROUND_UNIT } from '@/shared/utils/marginCalculation';
import type { DomeggookItem } from '@/shared/types/domeggook';
import { transientOptions } from '@/shared/utils/emotionTransientProps';
import { validateProductName, PROMO_WORDS, type NameCheckLevel } from '../_utils/validateProductName';
import { detectComplianceRisk } from '../_utils/detectComplianceRisk';
import { buildNameTokenPool, composeWithinLength, longestCommonSubstringLength } from '../_utils/buildSuggestedProductName';
import { scoreProductName, type ProductNameGrade } from '../_utils/scoreProductName';
import { fetchKeywordStats, fetchCategorySuggest, fetchKeywordDetail, type CategoryCandidate } from '@/shared/services/keywordStatsService';
import type { KeywordDetail } from '@/shared/types/keywordDetail';
import type { KeywordStat, RelatedKeyword } from '@/shared/types/keywordStats';

const SMARTSTORE_FEE_RATE = FEE_PRESETS[0].rate; // 5.6% (스마트스토어)
// 할인율 표시 프리셋 (%) — 최종 결제가는 유지하고 정가만 역산 (스스 관행: 정가+할인 표기)
const DISCOUNT_DISPLAY_PRESETS = [0, 10, 20, 30];

// 상품명 검사 결과 칩 색
const CHECK_CHIP_COLORS: Record<NameCheckLevel, 'success' | 'warning' | 'error'> = {
  pass: 'success',
  warn: 'warning',
  fail: 'error',
};

// 상품명 점수 등급 표기
const GRADE_COLORS: Record<ProductNameGrade, 'success' | 'warning' | 'error'> = {
  good: 'success',
  ok: 'warning',
  bad: 'error',
};

type RegistrationSheetProps = {
  item: DomeggookItem;
  imageSection?: ReactNode; // ⑥ 상품이미지 — 이미지 선택·누끼/규격 핸드오프 (뷰가 상태 보유)
  detailSection?: ReactNode; // ⑦ 상세설명 — 상세 통이미지 받기
};

const KRW = (value: number) => `${Math.round(value).toLocaleString()}원`;

// 카테고리 복사 형식 — "A > B > C" → "A>B>C" (스마트스토어 검색창 형식)
const compactCategoryPath = (path: string) => path.split('>').map((part) => part.trim()).filter(Boolean).join('>');

// 검색량 축약 표기 (140,300 → 14만 / 38,150 → 3.8만 / 2,470 → 2,470)
const compactCount = (value: number) =>
  value >= 10_000 ? `${(value / 10_000).toFixed(value >= 100_000 ? 0 : 1).replace(/\.0$/, '')}만` : value.toLocaleString();

// 줄바꿈 툴팁 (한 줄 = 한 문장 — 가독성)
const multilineTooltip = (lines: string[]) => (
  <Typography variant="caption" component="div" sx={{ whiteSpace: 'pre-line' }}>
    {lines.join('\n')}
  </Typography>
);


export default function RegistrationSheet({ item, imageSection, detailSection }: RegistrationSheetProps) {
  const { enqueueSnackbar } = useSnackbar();

  // 순수 UI 상태
  const [productName, setProductName] = useState(item.title);
  const [targetMarginRate, setTargetMarginRate] = useState(TARGET_MARGIN_PRESETS[2]); // 기본 20%
  const [pricingMode, setPricingMode] = useState<'bundle' | 'single'>('bundle'); // 묶음(1주문=MOQ개) / 낱개(사업자 사입)
  const [includeShipping, setIncludeShipping] = useState(false); // true = 판매가에 배송비 포함 (무료배송 판매)
  const [discountRate, setDiscountRate] = useState(0); // 할인율 (0 = 할인 없음)
  const [tagStats, setTagStats] = useState<Map<string, KeywordStat> | null>(null); // null = 미조회
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [categoryCandidates, setCategoryCandidates] = useState<CategoryCandidate[] | null>(null); // null = 미조회
  const [relatedKeywords, setRelatedKeywords] = useState<RelatedKeyword[]>([]); // 검색광고 연관 키워드 (공급사 키워드 시드)
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [marketDetail, setMarketDetail] = useState<KeywordDetail | null>(null); // 시장 분석
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);

  const nameChecks = validateProductName(productName);
  const issueChecks = nameChecks.filter((check) => check.level !== 'pass');
  const nameScore = scoreProductName(productName, nameChecks, tagStats);
  const complianceRisks = detectComplianceRisk(item.title, item.categoryPath);

  ////////// 태그 후보: 공급사 키워드(1순위) + 상품명 토큰 — 홍보어·비정상 토큰 제외, 10개
  const nameTokens = productName
    .split(/\s+/)
    .map((token) => token.replace(/[^가-힣a-zA-Z0-9]/g, ''))
    .filter((token) => token.length >= 2);
  const tagCandidates = Array.from(new Set([...item.keywords, ...nameTokens]))
    .filter((tag) => !PROMO_WORDS.some((word) => tag.toLowerCase().includes(word.toLowerCase())))
    .slice(0, 10);

  // 키워드 풀 — 도매꾹 공급사 키워드만 (상품명 토큰은 상호·판촉 노이즈가 많아 폐기, 2026-07-14)
  const nameTokenPool = buildNameTokenPool(item.keywords, tagStats);
  // 추천 상품명 — 풀을 권장 길이 안에서 순서대로 조합
  const suggestedName = composeWithinLength(nameTokenPool);

  ////////// 추천 키워드 — 시드 풀 + 연관 키워드 통합, 검색량 내림차순
  // 연관 키워드는 광고 연관이라 무관어(타이틀리스트·수영가방 등)가 섞임 —
  // 대표 키워드(keywords[0])와 공통 부분 문자열 2자 이상인 것만 통과 (양산·우양산류만 잔류)
  const representativeKeyword = item.keywords[0] ?? '';
  const keywordSearches = new Map<string, number>(); // keyword → 월 검색량 (0 = 미확인)
  for (const token of nameTokenPool) {
    keywordSearches.set(token, tagStats?.get(token.replace(/\s+/g, ''))?.monthlySearches ?? 0);
  }
  for (const related of relatedKeywords) {
    if (keywordSearches.has(related.keyword)) continue;
    if (representativeKeyword && longestCommonSubstringLength(representativeKeyword, related.keyword) < 2) continue;
    if (PROMO_WORDS.some((word) => related.keyword.toLowerCase().includes(word.toLowerCase()))) continue;
    keywordSearches.set(related.keyword, related.monthlySearches);
  }
  const recommendedKeywords = Array.from(keywordSearches.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([keyword]) => keyword);

  ////////// ⑪ 태그 자동 선별 — 스스 규칙 반영: 상품명에 이미 포함된 키워드는 태그 효과 없음(중복 무효) → 제외,
  // 검색량 내림차순(미확인은 공급사 등록 순 유지, sort는 stable) 상위 10개 (스스 태그 한도)
  const compactProductName = productName.replace(/\s+/g, '').toLowerCase();
  const recommendedTags = Array.from(keywordSearches.keys())
    .filter((tag) => !compactProductName.includes(tag.replace(/\s+/g, '').toLowerCase()))
    .sort((a, b) => (keywordSearches.get(b) ?? 0) - (keywordSearches.get(a) ?? 0))
    .slice(0, 10);

  ////////// 키워드 칩 토글 — 클릭으로 상품명에 넣고 빼기
  const productNameTokens = productName.split(/\s+/).filter(Boolean);
  const toggleNameToken = (token: string) => {
    if (productNameTokens.includes(token)) {
      setProductName(productNameTokens.filter((part) => part !== token).join(' '));
    } else {
      setProductName([...productNameTokens, token].join(' '));
    }
  };

  ////////// 랜덤 조합 — 추천 키워드에서 부분집합·순서를 무작위로 24회 생성해 채점,
  ////////// 상위 점수군(최고점 −5 이내)에서 무작위 1개 채택 (키워드 구성 자체가 매번 달라짐)
  const shuffleName = () => {
    if (recommendedKeywords.length < 2) return;
    const attempts = new Map<string, number>(); // 조합 → 점수
    for (let trial = 0; trial < 24; trial += 1) {
      const subset = recommendedKeywords.filter(() => Math.random() < 0.55);
      if (subset.length < 2) continue;
      const composed = composeWithinLength([...subset].sort(() => Math.random() - 0.5));
      if (!composed || composed === productName || attempts.has(composed)) continue;
      attempts.set(composed, scoreProductName(composed, validateProductName(composed), tagStats).normalized);
    }
    if (attempts.size === 0) return;
    const bestScore = Math.max(...attempts.values());
    const topGroup = Array.from(attempts.entries())
      .filter(([, score]) => score >= bestScore - 5)
      .map(([name]) => name);
    // eslint-disable-next-line react-hooks/purity -- 클릭 핸들러 내 난수 (렌더 아님)
    setProductName(topGroup[Math.floor(Math.random() * topGroup.length)]);
  };

  ////////// 원가·판매가 계산 (MOQ·판매 방식 반영)
  // 묶음: 고객 1주문 = 도매꾹 MOQ개 구매 / 낱개: 사업자가 미리 사입해 1개씩 발송
  const bundleUnits = pricingMode === 'single' ? 1 : Math.max(item.moq, 1);
  const unitPrice = item.domePrice ?? 0;
  const costPrice = unitPrice * bundleUnits;
  const shippingFee = item.delivery.baseFee ?? 0;
  // 배송비 포함 판매(무료배송)면 고객에게 받는 배송비 0 — 판매가가 배송 원가까지 커버
  const shippingCharge = includeShipping ? 0 : shippingFee;

  const reverseResult = calculateReversePrice({
    costPrice,
    targetMarginRate,
    feeRate: SMARTSTORE_FEE_RATE,
    shippingCharge,
    shippingCost: shippingFee,
    otherCost: 0,
  });

  // 공급사 최소 재판매가 하한 가드 — 역산 추천가가 하한 미만이면 하한으로 올림 (규정 위반 방지)
  const baseRecommended = reverseResult.achievable ? reverseResult.recommendedPrice : null;
  const isFlooredByResale =
    baseRecommended !== null && item.resaleMinimum !== null && baseRecommended < item.resaleMinimum;
  const recommendedPrice = isFlooredByResale ? item.resaleMinimum : baseRecommended;

  // 최종 표시가 기준 순이익·실마진 (하한 올림 반영 — 역산 결과와 다를 수 있음)
  const marginAtFinal =
    recommendedPrice !== null
      ? calculateMargin({
          sellingPrice: recommendedPrice,
          costPrice,
          feeRate: SMARTSTORE_FEE_RATE,
          shippingCharge,
          shippingCost: shippingFee,
          otherCost: 0,
        })
      : null;
  const profitAtPrice = marginAtFinal?.profit ?? null;
  const marginRateAtPrice = marginAtFinal?.marginRate ?? null;

  // 할인가 분해: 최종 결제가(추천가)는 그대로 두고, 표시용 정가를 역산 (정가 × (1−할인율) ≥ 최종가 보장)
  const listPrice =
    recommendedPrice !== null && discountRate > 0
      ? Math.ceil(recommendedPrice / (1 - discountRate / 100) / PRICE_ROUND_UNIT) * PRICE_ROUND_UNIT
      : null;
  // 스탯 표기: 판매가 = 등록 판매가(할인 시 역산 정가), 할인가 = 고객 최종 결제가
  const displaySellingPrice = listPrice ?? recommendedPrice;

  ////////// 파생 값
  // 재고·옵션은 낱개 기준 고정 (2026-07-14 — 판매가 계산만 판매 기준을 따름)
  const bundleStock = item.inventory;
  const exchangeFee =
    item.returnInfo.fee !== null
      ? item.returnInfo.exchangeDouble
        ? item.returnInfo.fee * 2
        : item.returnInfo.fee
      : null;
  const taxLabel = item.taxType?.includes('면세') ? '면세' : item.taxType?.includes('과세') ? '과세' : item.taxType;

  ////////// KC 안전인증 표시 텍스트 (예: "안전확인 · 전기용품 · XU102308-20002B", 면제면 "면제" 표기)
  // ?? [] — 응답이 브라우저 HTTP 캐시(1h)에 구형으로 남아 신규 필드가 없을 수 있어 방어
  const safetyCerts = item.safetyCerts ?? [];
  const safetyCertText =
    safetyCerts.length > 0
      ? safetyCerts
          .map((cert) =>
            [cert.certName, cert.certType, cert.exempt ? '면제' : cert.no].filter(Boolean).join(' · '),
          )
          .join(' / ')
      : null;
  const safetyCertNo = safetyCerts.find((cert) => cert.no !== null)?.no ?? null;

  // 공급사가 "해당없음"이라고 써넣은 모델명은 값 없음 취급
  const modelName = item.model && item.model.replace(/\s/g, '') !== '해당없음' ? item.model : null;

  ////////// 옵션 조합 (묶음 판매 시 가산가·재고도 묶음 단위로 환산)
  const bundledOptions = item.options;
  // 스스 옵션 폼/엑셀에 붙일 TSV (옵션명 ⇥ 가산가 ⇥ 재고)
  const optionsTsv = bundledOptions
    .map((option) => `${option.name}\t${option.priceAdd}\t${option.stock}`)
    .join('\n');

  ////////// 옵션 엑셀 다운로드 — 스마트스토어 옵션 일괄등록 양식 (.xlsx)
  // 1행 = 컬럼 헤더 [옵션명 옵션값 사용여부] — 옵션명은 도매꾹이 그룹명을 안 줘 '옵션' 고정
  const downloadOptionsExcel = async () => {
    if (bundledOptions.length === 0) return;
    const XLSX = await import('xlsx'); // 클릭 시 동적 로드 (번들 비대 방지)
    const headerRow = ['옵션명', '옵션값', '사용여부'];
    const dataRows = bundledOptions.map((option) => ['옵션', option.name.slice(0, 25), 'Y']); // 옵션값 25자 제한 (스마트스토어 규격)
    const sheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    sheet['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 10 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, '옵션');
    XLSX.writeFile(book, `옵션_일괄등록_${item.no}.xlsx`);
    setCopiedSections((previous) => new Set(previous).add(5));
  };

  ////////// 검색량·연관 키워드 조회 — 시드 = 공급사 키워드 상위 5개 (keywordstool 1콜 한도에 맞춤)
  const handleLoadTagStats = async () => {
    const seeds = (nameTokenPool.length > 0 ? nameTokenPool : tagCandidates).slice(0, 5);
    if (seeds.length === 0) return;
    setIsLoadingStats(true);
    try {
      const response = await fetchKeywordStats(seeds);
      if (!response.configured) {
        enqueueSnackbar('검색량 기능이 아직 준비되지 않았습니다. (API 키 미설정)', { variant: 'info' });
        return;
      }
      setTagStats(new Map(response.stats.map((stat) => [stat.keyword, stat])));
      setRelatedKeywords(response.related ?? []); // 연관 키워드 — 네이버 인기 키워드 칩 재료
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '검색량 조회에 실패했습니다.', {
        variant: 'error',
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  ////////// 시장 분석 (대표 태그 키워드의 가격대·브랜드·시즌을 시트에 이식)
  // 시장 비교 시드 — generic 대표어(우산)는 다른 급 상품까지 섞여 밴드가 부정확.
  // 검색량이 확인되고 현재 상품명에 실제 포함된 키워드 중 가장 구체적(긴) 것을 선택,
  // 없으면 시드 풀 1순위 → 태그 후보 1순위로 폴백
  const normalizedProductName = productName.replace(/\s+/g, '').toLowerCase();
  const marketSeed =
    nameTokenPool
      .filter(
        (token) =>
          (tagStats?.get(token.replace(/\s+/g, ''))?.monthlySearches ?? 0) > 0 &&
          normalizedProductName.includes(token.replace(/\s+/g, '').toLowerCase()),
      )
      .sort((a, b) => b.length - a.length)[0] ??
    nameTokenPool[0] ??
    tagCandidates[0];

  const handleLoadMarket = async () => {
    const seedKeyword = marketSeed;
    if (!seedKeyword) return;
    setIsLoadingMarket(true);
    try {
      const detail = await fetchKeywordDetail(seedKeyword);
      if (!detail.configured) {
        enqueueSnackbar('시장 분석 기능이 아직 준비되지 않았습니다. (API 키 미설정)', { variant: 'info' });
        return;
      }
      setMarketDetail(detail);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '시장 분석에 실패했습니다.', { variant: 'error' });
    } finally {
      setIsLoadingMarket(false);
    }
  };

  ////////// 스스 카테고리 후보 조회 (상위 상품 카테고리 최빈값)
  const handleLoadCategorySuggest = async () => {
    setIsLoadingCategory(true);
    try {
      const response = await fetchCategorySuggest(productName);
      if (!response.configured) {
        enqueueSnackbar('카테고리 추천 기능이 아직 준비되지 않았습니다. (API 키 미설정)', { variant: 'info' });
        return;
      }
      setCategoryCandidates(response.candidates);
      if (response.candidates.length === 0) {
        enqueueSnackbar('이 상품명으로는 카테고리 후보를 찾지 못했습니다. 상품명을 다듬어보세요.', {
          variant: 'info',
        });
      }
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '카테고리 후보 조회에 실패했습니다.', {
        variant: 'error',
      });
    } finally {
      setIsLoadingCategory(false);
    }
  };

  ////////// 추천 카테고리 + 검색량·연관 키워드 자동 조회 (마운트 1회 — 버튼 없이 기본 표시)
  const hasAutoSuggestedRef = useRef(false);
  useEffect(() => {
    if (hasAutoSuggestedRef.current) return;
    hasAutoSuggestedRef.current = true;
    handleLoadCategorySuggest();
    handleLoadTagStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  ////////// 복사 — section 번호를 주면 해당 섹션 뱃지가 체크로 바뀜 (진행 추적)
  const [copiedSections, setCopiedSections] = useState<Set<number>>(new Set());
  const copyText = async (label: string, value: string, section?: number) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    enqueueSnackbar(`${label}을(를) 복사했습니다.`, { variant: 'success' });
    if (section !== undefined) {
      setCopiedSections((previous) => new Set(previous).add(section));
    }
  };

  // 전체 복사도 시트(=스마트스토어 폼) 순서 그대로
  const copyAll = async () => {
    const lines = [
      categoryCandidates?.[0] && `카테고리: ${compactCategoryPath(categoryCandidates[0].path)}`,
      `상품명: ${productName}`,
      displaySellingPrice !== null &&
        `판매가: ${displaySellingPrice}${bundleUnits > 1 ? ` (${bundleUnits}개 묶음 기준)` : ''}`,
      listPrice !== null && `할인 ${discountRate}% → 최종 결제가 ${recommendedPrice}`,
      bundleStock !== null && `재고: ${bundleStock}`,
      optionsTsv && `옵션 (옵션명/가산가/재고):\n${optionsTsv}`,
      item.manufacturer && `제조사: ${item.manufacturer}`,
      item.model && `모델명: ${item.model}`,
      item.origin && `원산지: ${item.origin}`,
      taxLabel && `과세 구분: ${taxLabel}`,
      `배송비: ${shippingFee}${item.delivery.feeType ? ` (${item.delivery.feeType})` : ''}`,
      item.returnInfo.fee !== null && `반품비: ${item.returnInfo.fee} / 교환비: ${exchangeFee}`,
      recommendedTags.length > 0 && `태그: ${recommendedTags.join(',')}`,
      `판매자 상품코드: DG-${item.no}`,
    ]
      .filter(Boolean)
      .join('\n');
    await copyText('등록 정보 전체', lines);
    setCopiedSections(new Set(Array.from({ length: 15 }, (_, index) => index + 1)));
  };

  return (
    <Stack spacing={2}>
      {/* 헤더 */}
      <Stack spacing={0.75}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">등록 정보</Typography>
          <Button variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={copyAll}>
            전체 복사
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          스마트스토어 등록 화면과 같은 순서입니다 — 두 화면을 나란히 두고 위에서 아래로 붙여넣으세요.
        </Typography>
      </Stack>

      {/* 인증·인허가 지뢰 경고 */}
      {complianceRisks.map((risk) => (
        <Alert key={risk.type} severity="warning">
          <b>{risk.type} 대상일 수 있습니다</b> (감지: {risk.matched.join(', ')}) — {risk.guide}
        </Alert>
      ))}

      {/* MOQ 안내 — 판매 기준 전환 시에도 알럿을 유지해 레이아웃 시프트(스크롤 점프) 방지 */}
      {item.moq >= 2 &&
        (pricingMode === 'bundle' ? (
          <Alert severity={item.moq > 2 ? 'warning' : 'info'}>
            이 상품의 도매꾹 최소 구매수량은 <b>{item.moq}개</b>입니다. 고객 1주문마다 {item.moq}개를
            구매해야 하므로 <b>{item.moq === 2 ? '1+1' : `${item.moq}개 묶음`} 구성 판매</b>를 권장합니다.
            아래 판매가는 묶음 기준으로 계산했습니다 (재고·옵션은 낱개 기준).
          </Alert>
        ) : (
          <Alert severity="info">
            낱개 사입 기준으로 계산 중입니다. 도매꾹 최소 구매수량이 <b>{item.moq}개</b>이므로 미리
            사입해 두고 1개씩 판매하는 방식입니다 — 아래 판매가는 낱개 기준입니다.
          </Alert>
        ))}

      {/* 1. 카테고리 — 추천 카테고리 자동 조회 (네이버쇼핑 상위 상품 최빈값) */}
      <SectionBlock number={1} done={copiedSections.has(1)} title="카테고리">
        {isLoadingCategory && categoryCandidates === null ? (
          <Typography variant="body2" color="text.secondary">
            추천 카테고리를 찾는 중…
          </Typography>
        ) : categoryCandidates !== null && categoryCandidates.length > 0 ? (
          <Stack spacing={0.5}>
            {categoryCandidates.map((candidate, index) => (
              <Stack key={candidate.path} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: index === 0 ? 700 : 500 }}>
                  {candidate.path}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (상위 {candidate.sampleSize}개 중 {candidate.count}개)
                </Typography>
                <CopyButton
                  aria-label="카테고리 복사"
                  onClick={() => copyText('카테고리', compactCategoryPath(candidate.path), 1)}
                >
                  <ContentCopyIcon fontSize="small" />
                </CopyButton>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            추천 카테고리를 찾지 못했습니다 — 등록 화면에서 상품명 키워드로 직접 검색해 선택하세요.
          </Typography>
        )}
      </SectionBlock>

      {/* 2. 상품명 — 추천 상품명 / 추천 키워드 / 인풋 3행 구성, 채점 링은 헤더 우측 */}
      <SectionBlock
        number={2}
        done={copiedSections.has(2)}
        title="상품명"
        contentSpacing={2.5}
        action={
          <Tooltip
            title={
              <Typography variant="caption" component="div" sx={{ whiteSpace: 'pre-line' }}>
                {[
                  '상품명 점수 계산 (100점)',
                  '',
                  '규칙 검사 70점',
                  '· 길이 20 — 35자 초과 −12, 100자 초과 −20',
                  '· 홍보 문구 15 · 특수문자 10 · 지재권 위험 10',
                  '· 중복 단어 8 · 동의어 반복 7',
                  '',
                  '검색량 30점',
                  '· 검색되는 키워드 포함 비율 20',
                  '· 최다 검색 키워드 앞배치 10',
                  ...(nameScore.hasSearchPart ? [] : ['', '검색량 수집 전 — 지금은 70점 만점을 100점으로 환산']),
                ].join('\n')}
              </Typography>
            }
          >
            <ScoreRing>
              <CircularProgress
                variant="determinate"
                value={100}
                size={44}
                thickness={4}
                sx={{ color: 'action.hover', position: 'absolute' }}
              />
              <CircularProgress
                variant="determinate"
                value={nameScore.normalized}
                size={44}
                thickness={4}
                color={GRADE_COLORS[nameScore.grade]}
              />
              <ScoreRingLabel>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: `${GRADE_COLORS[nameScore.grade]}.main` }}
                >
                  {nameScore.normalized}
                </Typography>
              </ScoreRingLabel>
            </ScoreRing>
          </Tooltip>
        }
      >
        {/* 주인공 = 상품명 인풋 (목적 먼저, 재료는 아래 보조) */}
        <Stack spacing={1}>
          <FieldRow>
            <TextField
              fullWidth
              size="medium"
              label="상품명"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">{productName.length}/100</InputAdornment>,
                },
              }}
            />
            <CopyButton aria-label="상품명 복사" onClick={() => copyText('상품명', productName, 2)}>
              <ContentCopyIcon fontSize="small" />
            </CopyButton>
          </FieldRow>
          {/* 검사 결과 — 문제 항목만 간략 칩, 상세는 툴팁 */}
          {issueChecks.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {issueChecks.map((check) => (
                <Tooltip key={check.label} title={check.message}>
                  <Chip size="small" variant="filled" color={CHECK_CHIP_COLORS[check.level]} label={check.label} />
                </Tooltip>
              ))}
            </Stack>
          )}
        </Stack>

        {/* 추천 상품명 — 시드 풀 조합 (검색량 확인 후엔 검색량순), 적용 후에도 항상 표시 */}
        {suggestedName && (
          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">
              추천 상품명
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
              <Typography variant="body2">{suggestedName}</Typography>
              {/* 버튼 높이 = body2 라인 높이(20px)로 고정 — 텍스트와 수직 중앙 일치 */}
              <Button
                size="small"
                onClick={() => setProductName(suggestedName)}
                disabled={suggestedName === productName}
                sx={{
                  minHeight: 0,
                  minWidth: 0,
                  p: 0,
                  height: '1.43em',
                  fontSize: 'body2.fontSize',
                  lineHeight: 1,
                  borderRadius: '4px', // 테마 라운드(10px)가 작은 높이에서 알약처럼 보임 — 사각으로
                }}
              >
                적용
              </Button>
            </Stack>
          </Stack>
        )}

        {/* 추천 키워드 — 검색량 상위 3개만 강조 + 검색량 병기, 나머지 저채도 (훑기 가능한 위계) */}
        {recommendedKeywords.length > 0 && (
          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">
              추천 키워드
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
              {recommendedKeywords.map((keyword, index) => {
                const isUsed = productNameTokens.includes(keyword);
                const searches = keywordSearches.get(keyword) ?? 0;
                const isTop = index < 3 && searches > 0;
                return (
                  <Tooltip key={keyword} title={searches > 0 ? `월 ${searches.toLocaleString()}회 검색` : ''}>
                    <Chip
                      size="small"
                      label={isTop ? `${keyword} ${compactCount(searches)}` : keyword}
                      color={isUsed ? 'primary' : isTop ? 'primary' : 'default'}
                      variant={isUsed ? 'filled' : 'outlined'}
                      onClick={() => toggleNameToken(keyword)}
                      sx={isUsed || isTop ? { fontWeight: 600 } : { color: 'text.secondary' }}
                    />
                  </Tooltip>
                );
              })}
              <Button size="small" onClick={shuffleName}>
                랜덤 조합
              </Button>
            </Stack>
          </Stack>
        )}
      </SectionBlock>

      {/* 3. 판매가 — 결과(3스탯) → 조작(마진 칩) → 근거(원가 캡션+면책 툴팁) → 보조(할인·시장) */}
      <SectionBlock number={3} done={copiedSections.has(3)} title="판매가" contentSpacing={2}>
        {recommendedPrice !== null ? (
          <>
            {/* 결과 스탯 — 판매가 · 할인가 · 순이익 · 마진 (큰 숫자 + 작은 단위) */}
            <Stack direction="row" spacing={4} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <Stack spacing={0.25}>
                <Typography variant="caption" color="text.secondary">
                  판매가
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700, lineHeight: 1.1 }}>
                    {(displaySellingPrice ?? recommendedPrice).toLocaleString()}
                    <Typography component="span" variant="body2" color="text.secondary">
                      원
                    </Typography>
                  </Typography>
                  <CopyButton
                    aria-label="판매가 복사"
                    onClick={() => copyText('판매가', String(displaySellingPrice ?? recommendedPrice), 3)}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </CopyButton>
                </Stack>
              </Stack>
              {listPrice !== null && (
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="text.secondary">
                    할인가
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {recommendedPrice.toLocaleString()}
                    <Typography component="span" variant="body2" color="text.secondary">
                      원
                    </Typography>
                  </Typography>
                </Stack>
              )}
              <Stack spacing={0.25}>
                <Typography variant="caption" color="text.secondary">
                  개당 순이익
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {profitAtPrice !== null ? (
                    <>
                      {Math.round(profitAtPrice).toLocaleString()}
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
                  마진
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {marginRateAtPrice !== null ? (
                    <>
                      {Math.round(marginRateAtPrice)}
                      <Typography component="span" variant="body2" color="text.secondary">
                        %
                      </Typography>
                    </>
                  ) : (
                    '—'
                  )}
                </Typography>
              </Stack>
            </Stack>

            {/* 소섹션 공통 패턴: 라벨 위 · 컨텐츠 아래 (시선 위→아래) */}
            {/* 목표 마진 */}
            <Stack spacing={0.75}>
              <Typography variant="caption" color="text.secondary">
                목표 마진
              </Typography>
              <RateChips
                presets={TARGET_MARGIN_PRESETS}
                value={targetMarginRate}
                onChange={setTargetMarginRate}
                max={80}
              />
              {/* 계산 수식 — 판매가는 할인 시 할인가(최종 결제가) 기준, 수수료는 스마트스토어 요율 */}
              <Tooltip title={FEE_DISCLAIMER}>
                <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help', alignSelf: 'flex-start' }}>
                  순이익({profitAtPrice !== null ? KRW(profitAtPrice) : '—'}) = 판매가({KRW(recommendedPrice)})
                  − 원가({KRW(costPrice)}
                  {bundleUnits > 1 ? ` = ${KRW(unitPrice)}×${bundleUnits}` : ''}) − 수수료({SMARTSTORE_FEE_RATE}%)
                  {includeShipping && ` − 배송비(${KRW(shippingFee)})`} ⓘ
                </Typography>
              </Tooltip>
            </Stack>

            {/* 판매 기준 — 묶음/낱개(사업자 사입), MOQ 1이면 의미 없어 숨김 */}
            {item.moq > 1 && (
              <Stack spacing={0.75}>
                <Typography variant="caption" color="text.secondary">
                  판매 기준
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                  <Tooltip title={`고객 1주문마다 도매꾹에서 ${Math.max(item.moq, 1)}개를 구매하는 위탁 방식`}>
                    <Chip
                      size="small"
                      label={`묶음 ${Math.max(item.moq, 1)}개`}
                      color={pricingMode === 'bundle' ? 'primary' : 'default'}
                      variant={pricingMode === 'bundle' ? 'filled' : 'outlined'}
                      onClick={() => setPricingMode('bundle')}
                    />
                  </Tooltip>
                  <Tooltip title="도매꾹에서 미리 대량 사입해 1개씩 판매하는 사업자 방식 — 원가 = 낱개 단가">
                    <Chip
                      size="small"
                      label="낱개"
                      color={pricingMode === 'single' ? 'primary' : 'default'}
                      variant={pricingMode === 'single' ? 'filled' : 'outlined'}
                      onClick={() => setPricingMode('single')}
                    />
                  </Tooltip>
                </Stack>
              </Stack>
            )}

            {/* 배송비 */}
            <Stack spacing={0.75}>
              <Typography variant="caption" color="text.secondary">
                배송비
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                <Tooltip title="고객에게 배송비를 별도로 받습니다 — 판매가는 상품값만">
                  <Chip
                    size="small"
                    label="별도"
                    color={!includeShipping ? 'primary' : 'default'}
                    variant={!includeShipping ? 'filled' : 'outlined'}
                    onClick={() => setIncludeShipping(false)}
                  />
                </Tooltip>
                <Tooltip title="무료배송으로 판매 — 배송 원가까지 판매가에 녹여서 계산">
                  <Chip
                    size="small"
                    label="포함 (무료배송)"
                    color={includeShipping ? 'primary' : 'default'}
                    variant={includeShipping ? 'filled' : 'outlined'}
                    onClick={() => setIncludeShipping(true)}
                  />
                </Tooltip>
              </Stack>
            </Stack>
            {isFlooredByResale && item.resaleMinimum !== null && (
              <Alert severity="info">
                공급사 최소 재판매가 <b>{KRW(item.resaleMinimum)}</b> 규정에 맞춰 추천가를 올렸습니다 —
                목표 마진보다 이익이 커집니다.
              </Alert>
            )}

            {/* 할인 — 없음/10/20/30/직접 입력, 정가·결제가 설명은 하단 줄 */}
            <Stack spacing={0.75}>
              <Typography variant="caption" color="text.secondary">
                할인
              </Typography>
              <RateChips
                presets={DISCOUNT_DISPLAY_PRESETS}
                value={discountRate}
                onChange={setDiscountRate}
                max={90}
                zeroLabel="없음"
              />
            </Stack>
          </>
        ) : (
          <Alert severity="warning">
            {reverseResult.achievable === false ? reverseResult.reason : '가격 정보를 불러오지 못했습니다.'}
          </Alert>
        )}
        {/* 시장 가격 비교 — 시드 키워드 기준, 밴드 시각화 */}
        <Stack spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            startIcon={isLoadingMarket ? <CircularProgress size={14} /> : <QueryStatsOutlinedIcon />}
            onClick={handleLoadMarket}
            disabled={isLoadingMarket || tagCandidates.length === 0}
            sx={{ alignSelf: 'flex-start' }}
          >
            {isLoadingMarket ? '분석 중…' : marketDetail === null ? '시장 가격 비교' : '다시 분석'}
          </Button>
          {marketDetail?.priceBand && recommendedPrice !== null && (
            <Stack spacing={0.5}>
              {/* 슬라이드가 첫 시선 — 판정·근거는 아래 강약 배치 */}
              <MarketPriceBand
                min={marketDetail.priceBand.min}
                median={marketDetail.priceBand.median}
                max={marketDetail.priceBand.max}
                myPrice={recommendedPrice}
              />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color:
                    recommendedPrice <= marketDetail.priceBand.median
                      ? 'success.main'
                      : recommendedPrice <= marketDetail.priceBand.max
                        ? 'text.primary'
                        : 'error.main',
                }}
              >
                {recommendedPrice <= marketDetail.priceBand.median
                  ? '내 가격이 시장 중앙 이하 — 가격 경쟁력 있음'
                  : recommendedPrice <= marketDetail.priceBand.max
                    ? '내 가격이 시장 범위 내'
                    : '내 가격이 시장 상단 초과 — 마진율 조정 검토'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                &quot;{marketDetail.keyword}&quot; 네이버쇼핑 상위 40개 상품의 가격비교 최저가 기준
              </Typography>
            </Stack>
          )}
        </Stack>
        {marketDetail && (
          /* 시장 신호 칩 — 전부 아웃라인, 라벨은 짧게(아이콘+핵심), 판정·설명은 줄바꿈 툴팁 */
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {marketDetail.trendDirection === 'up' && (
              <Tooltip
                title={multilineTooltip([
                  '최근 검색량이 상승 추세입니다.',
                  '수요가 커지는 중 — 진입 타이밍이 유리합니다.',
                ])}
              >
                <MarketChip size="small" variant="outlined" color="success" icon={<TrendingUpOutlinedIcon />} label="수요 상승" />
              </Tooltip>
            )}
            {marketDetail.trendDirection === 'down' && (
              <Tooltip
                title={multilineTooltip([
                  '최근 검색량이 하락 추세입니다.',
                  '시즌 종료·수요 감소일 수 있으니 주의하세요.',
                ])}
              >
                <MarketChip size="small" variant="outlined" color="error" icon={<TrendingDownOutlinedIcon />} label="수요 하락" />
              </Tooltip>
            )}
            {marketDetail.seasonality.label && (
              <Tooltip
                title={multilineTooltip([
                  `검색량이 몰리는 시기: ${marketDetail.seasonality.label}`,
                  marketDetail.seasonality.isInSeason
                    ? '지금이 그 시즌입니다 — 시즌 안에 팔고 빠지세요.'
                    : '시즌에 맞춰 등록하세요.',
                ])}
              >
                <MarketChip
                  size="small"
                  variant="outlined"
                  color={marketDetail.seasonality.isInSeason ? 'primary' : 'default'}
                  icon={<EventOutlinedIcon />}
                  label={marketDetail.seasonality.isInSeason ? '지금 시즌' : marketDetail.seasonality.label}
                />
              </Tooltip>
            )}
            {marketDetail.brandShare !== null && (
              <Tooltip
                title={multilineTooltip([
                  `검색 상위 상품 중 ${marketDetail.brandShare}%가 브랜드 상품입니다.`,
                  '높을수록 무명 위탁 상품이 노출되기 어렵습니다.',
                  ...(marketDetail.brandShare >= 60 ? ['60% 이상 — 진입 비추천.'] : []),
                ])}
              >
                <MarketChip
                  size="small"
                  variant="outlined"
                  color={marketDetail.brandShare >= 60 ? 'error' : marketDetail.brandShare >= 30 ? 'warning' : 'success'}
                  icon={<VerifiedOutlinedIcon />}
                  label={`브랜드 ${marketDetail.brandShare}%`}
                />
              </Tooltip>
            )}
            {marketDetail.categorySeason && marketDetail.categoryName && (
              <Tooltip title={multilineTooltip([`"${marketDetail.categoryName}" 카테고리 전체의 계절성입니다.`])}>
                <MarketChip
                  size="small"
                  variant="outlined"
                  icon={<CategoryOutlinedIcon />}
                  label={marketDetail.categorySeason}
                />
              </Tooltip>
            )}
          </Stack>
        )}
      </SectionBlock>

      {/* 4. 재고수량 — 값 옆에 복사 아이콘 밀착, 수직 중앙 */}
      <SectionBlock number={4} done={copiedSections.has(4)} title="재고수량">
        <RowBox style={{ alignItems: 'center' }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {bundleStock !== null ? `${bundleStock.toLocaleString()}개` : '—'}
            </Typography>
            {bundleStock !== null && (
              <CopyButton
                size="small"
                aria-label="재고 수량 복사"
                onClick={() => copyText('재고 수량', String(bundleStock), 4)}
              >
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              </CopyButton>
            )}
          </Stack>
          {bundleStock === 0 && (
            <Typography variant="caption" color="text.secondary">
              재고가 없습니다 — 공급사 재입고 확인 후 등록하세요
            </Typography>
          )}
        </RowBox>
      </SectionBlock>

      {/* 5. 옵션 */}
      <SectionBlock
        number={5}
        done={copiedSections.has(5)}
        title="옵션"
        action={
          bundledOptions.length > 0 ? (
            <Button size="small" startIcon={<FileDownloadOutlinedIcon />} onClick={downloadOptionsExcel}>
              엑셀 다운로드
            </Button>
          ) : undefined
        }
      >
        {bundledOptions.length > 0 ? (
          <>
            <OptionHeader>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>옵션명</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ width: 90, textAlign: 'right' }}>가산가</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ width: 70, textAlign: 'right' }}>재고</Typography>
            </OptionHeader>
            <OptionList>
              {bundledOptions.map((option) => (
                <OptionRow key={option.name}>
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                    {option.name}
                  </Typography>
                  <Typography variant="body2" sx={{ width: 90, textAlign: 'right' }}>
                    {option.priceAdd > 0 ? `+${option.priceAdd.toLocaleString()}` : option.priceAdd.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ width: 70, textAlign: 'right' }}>
                    {option.stock.toLocaleString()}
                  </Typography>
                </OptionRow>
              ))}
            </OptionList>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            옵션 없는 단일 상품입니다 — 등록 화면에서 옵션 &quot;설정 안 함&quot;을 선택하세요.
          </Typography>
        )}
      </SectionBlock>

      {/* 6. 상품이미지/동영상 — 이미지 선택 + 누끼/규격 핸드오프 (뷰에서 주입) */}
      <SectionBlock number={6} done={copiedSections.has(6)} title="상품이미지 / 동영상" contentSpacing={3}>
        {imageSection ?? (
          <Typography variant="body2" color="text.secondary">
            대표이미지 1장 + 추가이미지 최대 9장을 업로드하세요.
          </Typography>
        )}
      </SectionBlock>

      {/* 7. 상세설명 — 상세 HTML/통이미지 (뷰에서 주입) */}
      <SectionBlock number={7} done={copiedSections.has(7)} title="상세설명">
        {detailSection ?? (
          <Typography variant="body2" color="text.secondary">
            상세 이미지를 에디터에 순서대로 업로드하세요.
          </Typography>
        )}
      </SectionBlock>

      {/* 8. 상품 주요정보 — 도매꾹 API로 확정 가능한 6개 필드만 (모델명·품번·제조사·KC인증·원산지·미성년자) */}
      <SectionBlock number={8} done={copiedSections.has(8)} title="상품 주요정보">
        <SheetRow
          label="모델명"
          value={modelName ?? '—'}
          onCopy={modelName ? () => copyText('모델명', modelName, 8) : undefined}
        />
        <SheetRow
          label="품번"
          value={item.itemCustomCode ?? '—'}
          caption={item.itemCustomCode ? '공급사 상품코드 기준' : undefined}
          onCopy={item.itemCustomCode ? () => copyText('품번', item.itemCustomCode as string, 8) : undefined}
        />
        <SheetRow
          label="제조사"
          value={item.manufacturer ?? '—'}
          onCopy={item.manufacturer ? () => copyText('제조사', item.manufacturer as string, 8) : undefined}
        />
        <SheetRow
          label="KC인증"
          value={safetyCertText ?? '—'}
          caption={safetyCertText ? '공급사가 등록한 인증정보 — 등록 전 번호 유효성을 확인하세요' : undefined}
          onCopy={safetyCertNo ? () => copyText('KC 인증번호', safetyCertNo, 8) : undefined}
        />
        <SheetRow label="원산지" value={item.origin ?? '—'} onCopy={item.origin ? () => copyText('원산지', item.origin as string, 8) : undefined} />
        <SheetRow
          label="미성년자 구매"
          value={item.adult ? '불가 (성인용품)' : '가능'}
          caption={item.adult ? '성인 인증 상품 — 등록 시 미성년자 구매 불가로 설정하세요' : undefined}
        />
      </SectionBlock>

      {/* 9. 배송 — 돈 직결 값 3개 (배송비·제주/도서산간 추가·평균 발송일) */}
      <SectionBlock number={9} done={copiedSections.has(9)} title="배송">
        <SheetRow
          label="상품별 배송비"
          value={shippingFee > 0 ? KRW(shippingFee) : item.delivery.feeType ?? '—'}
          caption={[item.delivery.feeType, item.delivery.pay].filter(Boolean).join(' · ')}
          onCopy={() => copyText('배송비', String(shippingFee), 9)}
        />
        <SheetRow
          label="제주/도서산간 추가배송비"
          value={
            item.delivery.jejuExtra !== null || item.delivery.islandsExtra !== null
              ? [
                  item.delivery.jejuExtra !== null && `제주 +${KRW(item.delivery.jejuExtra)}`,
                  item.delivery.islandsExtra !== null && `도서산간 +${KRW(item.delivery.islandsExtra)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : '—'
          }
          caption={
            item.delivery.jejuExtra !== null || item.delivery.islandsExtra !== null
              ? '입력하지 않으면 제주 주문마다 추가 배송비를 떠안게 됩니다'
              : undefined
          }
          onCopy={
            item.delivery.jejuExtra !== null
              ? () => copyText('제주 추가배송비', String(item.delivery.jejuExtra), 9)
              : undefined
          }
        />
        <SheetRow
          label="평균 발송일"
          value={item.delivery.sendAvgDays !== null ? `${item.delivery.sendAvgDays}일` : '—'}
          caption={
            item.delivery.sendAvgDays !== null
              ? '오늘출발 설정 여부 판단 기준 — 길면 배송 지연 CS를 감안하세요'
              : undefined
          }
        />
      </SectionBlock>

      {/* 10. 반품/교환 — 편도/왕복 분리 (스스 폼 입력 칸과 1:1, 공급사 반품비 = 설정 하한선) */}
      <SectionBlock number={10} done={copiedSections.has(10)} title="반품/교환">
        <SheetRow
          label="반품배송비 (편도)"
          value={item.returnInfo.fee !== null ? KRW(item.returnInfo.fee) : '—'}
          caption={item.returnInfo.fee !== null ? '공급사 반품비 — 이보다 낮게 설정하면 반품마다 차액 손해' : undefined}
          onCopy={item.returnInfo.fee !== null ? () => copyText('반품배송비', String(item.returnInfo.fee), 10) : undefined}
        />
        <SheetRow
          label="교환배송비 (왕복)"
          value={exchangeFee !== null ? KRW(exchangeFee) : '—'}
          caption={item.returnInfo.exchangeDouble ? '교환비 = 반품비 × 2 (왕복)' : undefined}
          onCopy={exchangeFee !== null ? () => copyText('교환배송비', String(exchangeFee), 10) : undefined}
        />
      </SectionBlock>

      {/* 11. 검색설정 (태그) */}
      {recommendedTags.length > 0 && (
        <SectionBlock
          number={11}
          done={copiedSections.has(11)}
          title={`검색설정 — 태그 ${recommendedTags.length}개`}
          action={
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={handleLoadTagStats} disabled={isLoadingStats}>
                {isLoadingStats ? '조회 중…' : '검색량 확인'}
              </Button>
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={() => copyText('태그', recommendedTags.join(','), 11)}
              >
                태그 복사
              </Button>
            </Stack>
          }
        >
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {recommendedTags.map((tag) => {
              const stat = tagStats?.get(tag.replace(/\s+/g, ''));
              const label = stat
                ? `#${tag} · ${stat.isLowVolume ? '<10' : (stat.monthlySearches ?? '—').toLocaleString()}회${
                    stat.ratio !== null ? ` · 경쟁 ${stat.ratio}` : ''
                  }`
                : `#${tag}`;
              const color =
                stat && stat.ratio !== null ? (stat.ratio < 1 ? 'success' : stat.ratio <= 5 ? 'warning' : 'error') : 'default';
              return <Chip key={tag} size="small" variant="outlined" color={color} label={label} />;
            })}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            상품명에 이미 들어간 키워드는 태그 효과가 없어 제외했습니다 — [검색량 확인] 후 검색량 순으로
            재정렬됩니다. 경쟁강도(상품수÷검색수)는 낮을수록 틈새 · Page Title/Meta description은 기본값
            유지를 권장합니다.
          </Typography>
        </SectionBlock>
      )}

      {/* 12. 판매자 코드 */}
      <SectionBlock number={12} done={copiedSections.has(12)} title="판매자 코드">
        <SheetRow
          value={`DG-${item.no}`}
          caption="주문이 들어오면 이 번호로 도매꾹에서 바로 찾아 발주하세요"
          onCopy={() => copyText('판매자 상품코드', `DG-${item.no}`, 12)}
        />
      </SectionBlock>
    </Stack>
  );
}

//////////////////// 섹션 블록 (번호 뱃지 + 제목 + 우측 액션) ////////////////////
type SectionBlockProps = {
  number: number;
  title: string;
  caption?: string;
  action?: ReactNode;
  done?: boolean; // 복사 완료 — 뱃지가 체크로 바뀜 (진행 추적)
  contentSpacing?: number; // 본문 행간 (기본 1.25 — 상품명처럼 밀도 높은 섹션은 넓게)
  children: ReactNode;
};

function SectionBlock({ number, title, caption, action, done = false, contentSpacing = 1.25, children }: SectionBlockProps) {
  return (
    <SectionBox>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
        <NumberBadge $isDone={done}>{done ? <CheckIcon sx={{ fontSize: 14 }} /> : number}</NumberBadge>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        )}
        <Stack sx={{ ml: 'auto' }}>{action}</Stack>
      </Stack>
      <Stack spacing={contentSpacing}>{children}</Stack>
    </SectionBox>
  );
}

//////////////////// 시장 가격 밴드 (읽기 전용 슬라이드 — 최저·중앙·최고 + 내 가격 마커) ////////////////////
type MarketPriceBandProps = {
  min: number;
  median: number;
  max: number;
  myPrice: number;
};

function MarketPriceBand({ min, median, max, myPrice }: MarketPriceBandProps) {
  const range = Math.max(max - min, 1);
  const positionOf = (value: number) => Math.min(100, Math.max(0, ((value - min) / range) * 100));
  const myPosition = positionOf(myPrice);
  const medianPosition = positionOf(median);
  const isOverMax = myPrice > max;

  return (
    <BandWrap>
      {/* 내 가격 말풍선 (트랙 위 — 마커를 꼬리로 가리킴) */}
      <BandMyLabel style={{ left: `${myPosition}%` }}>
        <BandBubble $isOver={isOverMax}>
          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2, opacity: 0.85 }}>
            내 가격
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, lineHeight: 1.3 }}>
            {KRW(myPrice)}
          </Typography>
        </BandBubble>
      </BandMyLabel>
      <BandTrack>
        <BandMedianTick style={{ left: `${medianPosition}%` }} />
        <BandMyMarker style={{ left: `${myPosition}%` }} $isOver={isOverMax} />
      </BandTrack>
      {/* 눈금 라벨 (트랙 아래) — 중앙값은 실제 위치에 */}
      <BandScale>
        <Typography variant="caption" color="text.secondary">
          최저 {KRW(min)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          최고 {KRW(max)}
        </Typography>
        <BandMedianLabel style={{ left: `${medianPosition}%` }}>
          <Typography variant="caption" color="text.secondary">
            중앙 {KRW(median)}
          </Typography>
        </BandMedianLabel>
      </BandScale>
    </BandWrap>
  );
}

//////////////////// 비율 칩 행 (프리셋 + 직접 입력) ////////////////////
type RateChipsProps = {
  presets: number[];
  value: number;
  onChange: (next: number) => void;
  max: number; // 직접 입력 상한 (%)
  zeroLabel?: string; // 0 프리셋 표기 (예: '없음')
};

function RateChips({ presets, value, onChange, max, zeroLabel }: RateChipsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputText, setInputText] = useState('');
  const isCustomValue = value > 0 && !presets.includes(value);

  const applyInput = () => {
    const parsed = Number(inputText.trim());
    if (Number.isFinite(parsed) && parsed >= 1) {
      onChange(Math.min(max, Math.round(parsed)));
    }
    setIsEditing(false);
  };

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
      {presets.map((rate) => (
        <Chip
          key={rate}
          size="small"
          label={rate === 0 && zeroLabel ? zeroLabel : `${rate}%`}
          color={value === rate ? 'primary' : 'default'}
          variant={value === rate ? 'filled' : 'outlined'}
          onClick={() => {
            setIsEditing(false);
            onChange(rate);
          }}
        />
      ))}
      {isEditing ? (
        <TextField
          autoFocus
          size="small"
          value={inputText}
          onChange={(event) => setInputText(event.target.value.replace(/[^\d]/g, ''))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') applyInput();
            if (event.key === 'Escape') setIsEditing(false);
          }}
          onBlur={applyInput}
          slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
          sx={{ width: 88, '& .MuiInputBase-input': { py: 0.5 } }}
        />
      ) : (
        <Chip
          size="small"
          label={isCustomValue ? `${value}%` : '직접 입력'}
          color={isCustomValue ? 'primary' : 'default'}
          variant={isCustomValue ? 'filled' : 'outlined'}
          onClick={() => {
            setInputText(isCustomValue ? String(value) : '');
            setIsEditing(true);
          }}
        />
      )}
    </Stack>
  );
}

//////////////////// 시트 행 (라벨 + 값 + 복사) ////////////////////
type SheetRowProps = {
  label?: string; // 섹션 제목과 겹치는 단일 값 행은 생략 (라벨 중복 제거)
  value: string;
  caption?: string;
  onCopy?: () => void;
};

function SheetRow({ label, value, caption, onCopy }: SheetRowProps) {
  return (
    <RowBox>
      {label && (
        <Typography variant="body2" color="text.secondary" sx={{ width: 150, flexShrink: 0 }}>
          {label}
        </Typography>
      )}
      <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
          {value}
        </Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
            {caption}
          </Typography>
        )}
      </Stack>
      {onCopy && (
        <CopyButton aria-label={`${label ?? '값'} 복사`} onClick={onCopy}>
          <ContentCopyIcon fontSize="small" />
        </CopyButton>
      )}
    </RowBox>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const SectionBox = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  padding: theme.spacing(2, 2.5),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

// 상품명 점수 원형 프로그레스 (배경 트랙 + 점수 링 + 중앙 숫자)
const ScoreRing = styled.div({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const ScoreRingLabel = styled.div({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const NumberBadge = styled('span', transientOptions)<{ $isDone?: boolean }>(({ theme, $isDone }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  flexShrink: 0,
  borderRadius: '50%',
  backgroundColor: $isDone ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.primary.main, 0.1),
  color: $isDone ? theme.palette.success.main : theme.palette.primary.main,
  fontSize: 12,
  fontWeight: 700,
}));

const FieldRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const OptionHeader = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  padding: theme.spacing(0, 1.5),
}));

const OptionList = styled.div(({ theme }) => ({
  maxHeight: 280,
  overflowY: 'auto',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const OptionRow = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1, 1.5),
  '&:not(:last-of-type)': {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

const RowBox = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.25, 1.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
}));

const CopyButton = styled(IconButton)({
  flexShrink: 0,
});

// 시장 신호 칩 — 아이콘 포함 시 기본 여백이 좁아 내부 여백 확장
const MarketChip = styled(Chip)(({ theme }) => ({
  height: 28,
  paddingLeft: theme.spacing(0.5),
  '& .MuiChip-icon': {
    fontSize: 16,
    marginLeft: theme.spacing(0.75),
  },
  '& .MuiChip-label': {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1.25),
  },
}));

//////////////////// 시장 가격 밴드 스타일 ////////////////////
const BandWrap = styled.div(({ theme }) => ({
  position: 'relative',
  maxWidth: 560,
  width: '100%',
  paddingTop: theme.spacing(7), // 내 가격 말풍선 공간
  paddingBottom: theme.spacing(3.5), // 눈금 라벨 공간
}));

// 내 가격 말풍선 — 아래 꼬리가 마커를 가리킴
const BandBubble = styled('div', transientOptions)<{ $isOver: boolean }>(({ theme, $isOver }) => {
  const background = $isOver ? theme.palette.error.main : theme.palette.primary.main;
  return {
    position: 'relative',
    padding: theme.spacing(0.5, 1.25),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: background,
    color: theme.palette.common.white,
    textAlign: 'center',
    boxShadow: theme.shadows[2],
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      border: '5px solid transparent',
      borderTopColor: background,
    },
  };
});

const BandTrack = styled.div(({ theme }) => ({
  position: 'relative',
  height: 6,
  borderRadius: 3,
  backgroundColor: alpha(theme.palette.primary.main, 0.12),
}));

const BandMedianTick = styled.div(({ theme }) => ({
  position: 'absolute',
  top: -3,
  width: 2,
  height: 12,
  transform: 'translateX(-50%)',
  backgroundColor: theme.palette.text.secondary,
  borderRadius: 1,
}));

const BandMyMarker = styled('div', transientOptions)<{ $isOver: boolean }>(({ theme, $isOver }) => ({
  position: 'absolute',
  top: '50%',
  width: 14,
  height: 14,
  transform: 'translate(-50%, -50%)',
  borderRadius: '50%',
  backgroundColor: $isOver ? theme.palette.error.main : theme.palette.primary.main,
  border: `2px solid ${theme.palette.background.paper}`,
  boxShadow: theme.shadows[1],
}));

const BandMyLabel = styled.div(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(0.5),
  transform: 'translateX(-50%)',
  whiteSpace: 'nowrap',
}));

const BandScale = styled.div({
  position: 'relative',
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: 6,
});

const BandMedianLabel = styled.div({
  position: 'absolute',
  top: 0,
  transform: 'translateX(-50%)',
  whiteSpace: 'nowrap',
});
