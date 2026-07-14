'use client';

//////////////////////////////////////// 등록 정보 시트 (등록 준비 패키지) ////////////////////////////////////////
// 스마트스토어 등록 폼에 그대로 붙여넣을 정보를 자동 조합한다 — API 없이 등록 노동의 마지막 구간을 복붙으로.
// 섹션 순서 = 스마트스토어 등록 화면 실측 순서 (2026-07-13 대표 확인):
// 카테고리 → 상품명 → 판매가 → 재고수량 → 옵션 → 상품이미지 → 상세설명 → 주요정보 → 고시 → 배송 → 반품 → A/S → 혜택 → 검색설정 → 판매자 코드
// - 판매가: 도매꾹가 × 구매단위(MOQ) 원가로 역산 (shared/utils/marginCalculation 재사용)
// - MOQ ≥ 2: 묶음(1+1 등) 구성 판매 안내 — 고객 1주문 = 도매꾹 MOQ 구매이므로 원가에 반영
// - A/S 정보: 셀러 고정값 (localStorage — useSellerFixedInfo)

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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useSnackbar } from 'notistack';
import { FEE_PRESETS, FEE_DISCLAIMER, TARGET_MARGIN_PRESETS } from '@/shared/constants/marketFees';
import { calculateMargin, calculateReversePrice, PRICE_ROUND_UNIT } from '@/shared/utils/marginCalculation';
import type { DomeggookItem } from '@/shared/types/domeggook';
import { transientOptions } from '@/shared/utils/emotionTransientProps';
import { useSellerFixedInfo } from '../_hooks/useSellerFixedInfo';
import { validateProductName, PROMO_WORDS, type NameCheckLevel } from '../_utils/validateProductName';
import { detectComplianceRisk } from '../_utils/detectComplianceRisk';
import { buildSuggestedProductName } from '../_utils/buildSuggestedProductName';
import { scoreProductName, type ProductNameGrade } from '../_utils/scoreProductName';
import { fetchKeywordStats, fetchCategorySuggest, fetchKeywordDetail, type CategoryCandidate } from '@/shared/services/keywordStatsService';
import type { KeywordDetail } from '@/shared/types/keywordDetail';
import type { KeywordStat } from '@/shared/types/keywordStats';

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
const GRADE_LABELS: Record<ProductNameGrade, string> = {
  good: '좋음',
  ok: '보통',
  bad: '수정 필요',
};

// 구매/리뷰 혜택 권장 프리셋 (초보 표준 세팅 — 등록 UI 혜택 구간의 결정 부담 제거)
const BENEFIT_PRESET_LINES = [
  '텍스트 리뷰 적립: 50원',
  '포토/동영상 리뷰 적립: 150원',
  '한달사용 텍스트 리뷰: 50원 / 포토·동영상: 150원',
  '복수구매할인·무이자할부·사은품: 설정 안 함 (마진 확보 우선)',
  '최소·최대 구매수량: 제한 없음',
];

type RegistrationSheetProps = {
  item: DomeggookItem;
  imageSection?: ReactNode; // ⑥ 상품이미지 — 이미지 선택·누끼/규격 핸드오프 (뷰가 상태 보유)
  detailSection?: ReactNode; // ⑦ 상세설명 — 상세 통이미지 받기
};

const KRW = (value: number) => `${Math.round(value).toLocaleString()}원`;

// 카테고리 복사 형식 — "A > B > C" → "A>B>C" (스마트스토어 검색창 형식)
const compactCategoryPath = (path: string) => path.split('>').map((part) => part.trim()).filter(Boolean).join('>');


export default function RegistrationSheet({ item, imageSection, detailSection }: RegistrationSheetProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { fixedInfo, updateFixedInfo } = useSellerFixedInfo();

  // 순수 UI 상태
  const [productName, setProductName] = useState(item.title);
  const [targetMarginRate, setTargetMarginRate] = useState(TARGET_MARGIN_PRESETS[2]); // 기본 20%
  const [discountRate, setDiscountRate] = useState(0); // 할인율 표시 (0 = 표시 안 함)
  const [tagStats, setTagStats] = useState<Map<string, KeywordStat> | null>(null); // null = 미조회
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [categoryCandidates, setCategoryCandidates] = useState<CategoryCandidate[] | null>(null); // null = 미조회
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

  // 추천 상품명 — 교차 검증된 공급사 키워드 + 상품명 토큰 조합 (검색량 조회 후엔 검색량순)
  const suggestedName = buildSuggestedProductName(item.title, item.keywords, nameTokens, tagStats);

  ////////// 원가·판매가 계산 (MOQ 반영)
  const bundleUnits = Math.max(item.moq, 1); // 고객 1주문당 도매꾹에서 사야 하는 수량
  const unitPrice = item.domePrice ?? 0;
  const costPrice = unitPrice * bundleUnits;
  const shippingFee = item.delivery.baseFee ?? 0;

  const reverseResult = calculateReversePrice({
    costPrice,
    targetMarginRate,
    feeRate: SMARTSTORE_FEE_RATE,
    shippingCharge: shippingFee, // 고객에게 받는 배송비 = 도매꾹 배송비 그대로 (기본값)
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
          shippingCharge: shippingFee,
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

  ////////// 파생 값
  const bundleStock = item.inventory !== null ? Math.floor(item.inventory / bundleUnits) : null;
  const exchangeFee =
    item.returnInfo.fee !== null
      ? item.returnInfo.exchangeDouble
        ? item.returnInfo.fee * 2
        : item.returnInfo.fee
      : null;
  const taxLabel = item.taxType?.includes('면세') ? '면세' : item.taxType?.includes('과세') ? '과세' : item.taxType;
  const infoDutyText = [
    item.infoDuty.type ? `유형: ${item.infoDuty.type}` : null,
    ...item.infoDuty.items.map((entry) => `${entry.name}: ${entry.desc}`),
  ]
    .filter(Boolean)
    .join('\n');
  // 고시 항목 표시 — 전 항목 값이 동일하면 한 줄 요약 ("전 9개 항목: 상세정보 별도표기"), 다르면 줄바꿈 목록
  const infoDutyDescSet = new Set(item.infoDuty.items.map((entry) => entry.desc));
  const infoDutyCaption =
    item.infoDuty.items.length === 0
      ? undefined
      : infoDutyDescSet.size === 1
        ? `전 ${item.infoDuty.items.length}개 항목: ${[...infoDutyDescSet][0]}`
        : item.infoDuty.items.map((entry) => `${entry.name}: ${entry.desc}`).join('\n');

  ////////// 옵션 조합 (묶음 판매 시 가산가·재고도 묶음 단위로 환산)
  const bundledOptions = item.options.map((option) => ({
    name: option.name,
    priceAdd: option.priceAdd * bundleUnits,
    stock: Math.floor(option.stock / bundleUnits),
  }));
  // 스스 옵션 폼/엑셀에 붙일 TSV (옵션명 ⇥ 가산가 ⇥ 재고)
  const optionsTsv = bundledOptions
    .map((option) => `${option.name}\t${option.priceAdd}\t${option.stock}`)
    .join('\n');

  ////////// 태그 검색량 조회 (버튼 트리거 — 호출량 절약)
  const handleLoadTagStats = async () => {
    if (tagCandidates.length === 0) return;
    setIsLoadingStats(true);
    try {
      const response = await fetchKeywordStats(tagCandidates);
      if (!response.configured) {
        enqueueSnackbar('검색량 기능이 아직 준비되지 않았습니다. (API 키 미설정)', { variant: 'info' });
        return;
      }
      setTagStats(new Map(response.stats.map((stat) => [stat.keyword, stat])));
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
  const handleLoadMarket = async () => {
    const seedKeyword = tagCandidates[0];
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

  ////////// 추천 카테고리 자동 조회 (마운트 1회 — 버튼 없이 기본 표시)
  const hasAutoSuggestedRef = useRef(false);
  useEffect(() => {
    if (hasAutoSuggestedRef.current) return;
    hasAutoSuggestedRef.current = true;
    handleLoadCategorySuggest();
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
      recommendedPrice !== null &&
        `판매가: ${recommendedPrice}${bundleUnits > 1 ? ` (${bundleUnits}개 묶음 기준)` : ''}`,
      listPrice !== null && `정가(할인 표시용): ${listPrice} (−${discountRate}% → ${recommendedPrice})`,
      bundleStock !== null && `재고: ${bundleStock}${bundleUnits > 1 ? ` (묶음 기준, 낱개 ${item.inventory})` : ''}`,
      optionsTsv && `옵션 (옵션명/가산가/재고${bundleUnits > 1 ? ' — 묶음 기준' : ''}):\n${optionsTsv}`,
      item.manufacturer && `제조사: ${item.manufacturer}`,
      item.model && `모델명: ${item.model}`,
      item.origin && `원산지: ${item.origin}`,
      taxLabel && `과세 구분: ${taxLabel}`,
      infoDutyText && `상품정보제공고시:\n${infoDutyText}`,
      `배송비: ${shippingFee}${item.delivery.feeType ? ` (${item.delivery.feeType})` : ''}`,
      item.returnInfo.fee !== null && `반품비: ${item.returnInfo.fee} / 교환비: ${exchangeFee}`,
      fixedInfo.afterServicePhone && `A/S 전화번호: ${fixedInfo.afterServicePhone}`,
      fixedInfo.afterServiceGuide && `A/S 안내: ${fixedInfo.afterServiceGuide}`,
      tagCandidates.length > 0 && `태그 후보: ${tagCandidates.join(',')}`,
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

      {/* MOQ 묶음 안내 */}
      {bundleUnits >= 2 && (
        <Alert severity={bundleUnits > 2 ? 'warning' : 'info'}>
          이 상품의 도매꾹 최소 구매수량은 <b>{bundleUnits}개</b>입니다. 고객 1주문마다 {bundleUnits}개를
          구매해야 하므로 <b>{bundleUnits === 2 ? '1+1' : `${bundleUnits}개 묶음`} 구성 판매</b>를 권장합니다.
          아래 판매가·재고는 묶음 기준으로 계산했습니다.
        </Alert>
      )}

      {/* 1. 카테고리 — 추천 카테고리 자동 조회 (네이버쇼핑 상위 상품 최빈값) */}
      <SectionBlock number={1} done={copiedSections.has(1)} title="추천 카테고리">
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
            <Typography variant="caption" color="text.secondary">
              등록 화면 카테고리 검색창에 붙여넣어 선택하세요.
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            추천 카테고리를 찾지 못했습니다 — 등록 화면에서 상품명 키워드로 직접 검색해 선택하세요.
          </Typography>
        )}
      </SectionBlock>

      {/* 2. 상품명 — 채점: 기본 검사 70 + 검색량 30 */}
      <SectionBlock
        number={2}
        done={copiedSections.has(2)}
        title="상품명"
        action={
          <Tooltip
            title={
              nameScore.hasSearchPart
                ? '기본 검사 70점 + 검색량 키워드 30점 기준'
                : '기본 검사 기준 — [검색량 확인]을 누르면 키워드 점수(30점)까지 반영됩니다'
            }
          >
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: `${GRADE_COLORS[nameScore.grade]}.main` }}>
                {nameScore.normalized}점
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                color={GRADE_COLORS[nameScore.grade]}
                label={GRADE_LABELS[nameScore.grade]}
              />
            </Stack>
          </Tooltip>
        }
      >
        {/* 추천 상품명 — 교차 검증·동의어 정리된 조합 (검색량 확인 후엔 검색량순) */}
        {suggestedName && suggestedName !== productName && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
            <Chip size="small" variant="outlined" color="primary" label="추천" />
            <Typography variant="body2">{suggestedName}</Typography>
            <Button size="small" onClick={() => setProductName(suggestedName)}>
              적용
            </Button>
          </Stack>
        )}
        <FieldRow>
          <TextField
            fullWidth
            size="small"
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
      </SectionBlock>

      {/* 3. 판매가 */}
      <SectionBlock
        number={3}
        done={copiedSections.has(3)}
        title="판매가"
        action={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {TARGET_MARGIN_PRESETS.map((rate) => (
              <Chip
                key={rate}
                size="small"
                label={`마진 ${rate}%`}
                color={targetMarginRate === rate ? 'primary' : 'default'}
                variant={targetMarginRate === rate ? 'filled' : 'outlined'}
                onClick={() => setTargetMarginRate(rate)}
              />
            ))}
          </Stack>
        }
      >
        {recommendedPrice !== null ? (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }} useFlexGap>
              <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 700 }}>
                {KRW(recommendedPrice)}
              </Typography>
              {/* 순이익 = 셀러의 최종 관심사 — 캡션이 아닌 본문 강조 */}
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                개당 순이익 {profitAtPrice !== null ? KRW(profitAtPrice) : '—'}
                {marginRateAtPrice !== null && ` (실마진 ${Math.round(marginRateAtPrice)}%)`}
              </Typography>
              <CopyButton
                aria-label="판매가 복사"
                onClick={() => copyText('판매가', String(recommendedPrice), 3)}
              >
                <ContentCopyIcon fontSize="small" />
              </CopyButton>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              원가 {KRW(costPrice)}
              {bundleUnits > 1 && ` (${KRW(unitPrice)}×${bundleUnits})`} · 수수료 {SMARTSTORE_FEE_RATE}%
            </Typography>
            {isFlooredByResale && item.resaleMinimum !== null && (
              <Alert severity="info">
                공급사 최소 재판매가 <b>{KRW(item.resaleMinimum)}</b> 규정에 맞춰 추천가를 올렸습니다 —
                목표 마진보다 이익이 커집니다.
              </Alert>
            )}

            {/* 할인율 표시 분해 — 최종 결제가는 유지, 정가만 역산 */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }} useFlexGap>
              <Typography variant="caption" color="text.secondary">
                할인 표시
              </Typography>
              {DISCOUNT_DISPLAY_PRESETS.map((rate) => (
                <Chip
                  key={rate}
                  size="small"
                  label={rate === 0 ? '없음' : `${rate}%`}
                  color={discountRate === rate ? 'primary' : 'default'}
                  variant={discountRate === rate ? 'filled' : 'outlined'}
                  onClick={() => setDiscountRate(rate)}
                />
              ))}
              {listPrice !== null && (
                <>
                  <Typography variant="body2">
                    정가 <b>{KRW(listPrice)}</b> − {discountRate}% 할인 → 최종 {KRW(recommendedPrice)}
                  </Typography>
                  <CopyButton aria-label="정가 복사" onClick={() => copyText('정가', String(listPrice), 3)}>
                    <ContentCopyIcon fontSize="small" />
                  </CopyButton>
                </>
              )}
            </Stack>
          </Stack>
        ) : (
          <Alert severity="warning">
            {reverseResult.achievable === false ? reverseResult.reason : '가격 정보를 불러오지 못했습니다.'}
          </Alert>
        )}
        {/* 시장 가격 비교 — 대표 태그 키워드 기준 */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          <Button size="small" onClick={handleLoadMarket} disabled={isLoadingMarket || tagCandidates.length === 0}>
            {isLoadingMarket ? '분석 중…' : marketDetail === null ? '시장 가격 비교' : '다시 분석'}
          </Button>
          {marketDetail?.priceBand && recommendedPrice !== null && (
            <Typography variant="body2">
              시장가 {KRW(marketDetail.priceBand.min)}~{KRW(marketDetail.priceBand.max)} · 중앙{' '}
              {KRW(marketDetail.priceBand.median)} —{' '}
              <b>
                {recommendedPrice <= marketDetail.priceBand.median
                  ? '추천가가 시장 중앙 이하 (가격 경쟁력 있음)'
                  : recommendedPrice <= marketDetail.priceBand.max
                    ? '추천가가 시장 범위 내'
                    : '추천가가 시장 상단 초과 — 마진율 조정 검토'}
              </b>
            </Typography>
          )}
        </Stack>
        {marketDetail && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {marketDetail.trendDirection === 'up' && <Chip size="small" color="success" label="검색 수요 상승 중" />}
            {marketDetail.trendDirection === 'down' && <Chip size="small" color="error" label="검색 수요 하락 중" />}
            {marketDetail.seasonality.label && (
              <Chip size="small" variant="outlined" label={`${marketDetail.seasonality.label}${marketDetail.seasonality.isInSeason ? ' — 지금 시즌' : ''}`} />
            )}
            {marketDetail.brandShare !== null && (
              <Chip
                size="small"
                variant="outlined"
                color={marketDetail.brandShare >= 60 ? 'error' : marketDetail.brandShare >= 30 ? 'warning' : 'success'}
                label={`브랜드 장악 ${marketDetail.brandShare}%${marketDetail.brandShare >= 60 ? ' — 진입 비추천' : ''}`}
              />
            )}
            {marketDetail.categorySeason && marketDetail.categoryName && (
              <Chip size="small" variant="outlined" label={`${marketDetail.categoryName} ${marketDetail.categorySeason}`} />
            )}
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary">
          {FEE_DISCLAIMER}
        </Typography>
      </SectionBlock>

      {/* 4. 재고수량 */}
      <SectionBlock number={4} done={copiedSections.has(4)} title="재고수량">
        <SheetRow
          label="재고 수량"
          value={bundleStock !== null ? `${bundleStock.toLocaleString()}개` : '—'}
          caption={
            bundleStock === 0
              ? '재고가 없습니다 — 공급사 재입고 확인 후 등록하세요'
              : bundleUnits > 1 && item.inventory !== null
                ? `묶음 기준 (낱개 ${item.inventory.toLocaleString()}개)`
                : undefined
          }
          onCopy={bundleStock !== null ? () => copyText('재고 수량', String(bundleStock), 4) : undefined}
        />
      </SectionBlock>

      {/* 5. 옵션 */}
      <SectionBlock
        number={5}
        done={copiedSections.has(5)}
        title={`옵션${bundledOptions.length > 0 ? ` ${bundledOptions.length}개` : ''}${bundledOptions.length > 0 && bundleUnits > 1 ? ' (묶음 기준)' : ''}`}
        action={
          bundledOptions.length > 0 ? (
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => copyText('옵션 표', optionsTsv, 5)}
            >
              옵션 표 복사
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
            <Typography variant="caption" color="text.secondary">
              복사하면 탭 구분 텍스트로 들어가 엑셀·일괄등록 양식에 그대로 붙습니다.
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            옵션 없는 단일 상품입니다 — 등록 화면에서 옵션 &quot;설정 안 함&quot;을 선택하세요.
          </Typography>
        )}
      </SectionBlock>

      {/* 6. 상품이미지/동영상 — 이미지 선택 + 누끼/규격 핸드오프 (뷰에서 주입) */}
      <SectionBlock number={6} done={copiedSections.has(6)} title="상품이미지 / 동영상">
        {imageSection ?? (
          <Typography variant="body2" color="text.secondary">
            대표이미지 1장 + 추가이미지 최대 9장을 업로드하세요.
          </Typography>
        )}
      </SectionBlock>

      {/* 7. 상세설명 — 상세 통이미지 (뷰에서 주입) */}
      <SectionBlock number={7} done={copiedSections.has(7)} title="상세설명 (상세이미지)">
        {detailSection ?? (
          <Typography variant="body2" color="text.secondary">
            상세 이미지를 에디터에 순서대로 업로드하세요.
          </Typography>
        )}
      </SectionBlock>

      {/* 8. 상품 주요정보 */}
      <SectionBlock number={8} done={copiedSections.has(8)} title="상품 주요정보">
        <SheetRow
          label="제조사 / 모델명"
          value={[item.manufacturer, item.model].filter(Boolean).join(' / ') || '—'}
          onCopy={
            item.manufacturer || item.model
              ? () => copyText('제조사/모델명', [item.manufacturer, item.model].filter(Boolean).join(' / '), 8)
              : undefined
          }
        />
        <SheetRow label="원산지" value={item.origin ?? '—'} onCopy={item.origin ? () => copyText('원산지', item.origin as string, 8) : undefined} />
        <SheetRow label="과세 구분" value={taxLabel ?? '—'} onCopy={taxLabel ? () => copyText('과세 구분', taxLabel, 8) : undefined} />
      </SectionBlock>

      {/* 9. 상품정보제공고시 — 전 항목 값이 같으면 한 줄로 압축, 다르면 줄바꿈 목록 */}
      <SectionBlock number={9} done={copiedSections.has(9)} title="상품정보제공고시">
        <SheetRow
          label="고시 유형"
          value={item.infoDuty.type ?? '—'}
          caption={infoDutyCaption}
          onCopy={infoDutyText ? () => copyText('상품정보제공고시', infoDutyText, 9) : undefined}
        />
      </SectionBlock>

      {/* 10. 배송 */}
      <SectionBlock number={10} done={copiedSections.has(10)} title="배송">
        <SheetRow
          label="배송비"
          value={shippingFee > 0 ? KRW(shippingFee) : item.delivery.feeType ?? '—'}
          caption={[item.delivery.feeType, item.delivery.pay, item.delivery.jejuExtra !== null && `제주 +${KRW(item.delivery.jejuExtra)}`]
            .filter(Boolean)
            .join(' · ')}
          onCopy={() => copyText('배송비', String(shippingFee), 10)}
        />
      </SectionBlock>

      {/* 11. 반품/교환 */}
      <SectionBlock number={11} done={copiedSections.has(11)} title="반품/교환">
        <SheetRow
          label="반품 / 교환비"
          value={
            item.returnInfo.fee !== null
              ? `반품 ${KRW(item.returnInfo.fee)} · 교환 ${exchangeFee !== null ? KRW(exchangeFee) : '—'}`
              : '—'
          }
          caption={item.returnInfo.exchangeDouble ? '교환비 = 반품비 × 2 (왕복)' : undefined}
          onCopy={item.returnInfo.fee !== null ? () => copyText('반품비', String(item.returnInfo.fee), 11) : undefined}
        />
      </SectionBlock>

      {/* 12. A/S */}
      <SectionBlock number={12} done={copiedSections.has(12)} title="A/S 정보" caption="한 번 입력하면 이 브라우저에 저장됩니다">
        <FieldRow>
          <TextField
            fullWidth
            size="small"
            label="A/S 전화번호"
            placeholder="010-0000-0000 (내 연락처 — 위탁판매는 셀러가 CS 창구입니다)"
            value={fixedInfo.afterServicePhone}
            onChange={(event) => updateFixedInfo({ afterServicePhone: event.target.value })}
          />
          <CopyButton
            aria-label="A/S 전화번호 복사"
            onClick={() => copyText('A/S 전화번호', fixedInfo.afterServicePhone, 12)}
          >
            <ContentCopyIcon fontSize="small" />
          </CopyButton>
        </FieldRow>
        <FieldRow>
          <TextField
            fullWidth
            size="small"
            label="A/S 안내 문구"
            placeholder="예) 상품 문의는 스토어 톡톡 또는 위 번호로 연락 주세요"
            value={fixedInfo.afterServiceGuide}
            onChange={(event) => updateFixedInfo({ afterServiceGuide: event.target.value })}
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">{fixedInfo.afterServiceGuide.length}자</InputAdornment>,
              },
            }}
          />
          <CopyButton
            aria-label="A/S 안내 복사"
            onClick={() => copyText('A/S 안내', fixedInfo.afterServiceGuide, 12)}
          >
            <ContentCopyIcon fontSize="small" />
          </CopyButton>
        </FieldRow>
      </SectionBlock>

      {/* 13. 구매/리뷰 혜택 */}
      <SectionBlock
        number={13}
        done={copiedSections.has(13)}
        title="구매/리뷰 혜택"
        caption="초보 권장 세팅"
        action={
          <Button
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={() => copyText('혜택 세팅', BENEFIT_PRESET_LINES.join('\n'), 13)}
          >
            복사
          </Button>
        }
      >
        <PresetBox>
          {BENEFIT_PRESET_LINES.map((line) => (
            <Typography key={line} variant="body2">
              · {line}
            </Typography>
          ))}
        </PresetBox>
        <Typography variant="caption" color="text.secondary">
          리뷰 적립은 초기 리뷰 확보 비용 중 가장 싼 투자입니다. 리뷰가 쌓이기 전까지는 다른 혜택은 켜지
          않는 것을 권장합니다.
        </Typography>
      </SectionBlock>

      {/* 14. 검색설정 (태그) */}
      {tagCandidates.length > 0 && (
        <SectionBlock
          number={14}
          done={copiedSections.has(14)}
          title={`검색설정 — 태그 후보 ${tagCandidates.length}개`}
          action={
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={handleLoadTagStats} disabled={isLoadingStats}>
                {isLoadingStats ? '조회 중…' : '검색량 확인'}
              </Button>
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={() => copyText('태그', tagCandidates.join(','), 14)}
              >
                태그 복사
              </Button>
            </Stack>
          }
        >
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {tagCandidates.map((tag) => {
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
            공급사 키워드 + 상품명에서 추출 — 경쟁강도(상품수÷검색수)는 낮을수록 틈새입니다. 페이지
            타이틀·메타 디스크립션은 기본값 유지를 권장합니다.
          </Typography>
        </SectionBlock>
      )}

      {/* 15. 판매자 코드 */}
      <SectionBlock number={15} done={copiedSections.has(15)} title="판매자 코드">
        <SheetRow
          label="판매자 상품코드 (권장)"
          value={`DG-${item.no}`}
          caption="도매꾹 상품번호 — 주문이 들어오면 이 코드로 도매꾹에서 바로 찾아 발주할 수 있습니다"
          onCopy={() => copyText('판매자 상품코드', `DG-${item.no}`, 15)}
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
  children: ReactNode;
};

function SectionBlock({ number, title, caption, action, done = false, children }: SectionBlockProps) {
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
      <Stack spacing={1.25}>{children}</Stack>
    </SectionBox>
  );
}

//////////////////// 시트 행 (라벨 + 값 + 복사) ////////////////////
type SheetRowProps = {
  label: string;
  value: string;
  caption?: string;
  onCopy?: () => void;
};

function SheetRow({ label, value, caption, onCopy }: SheetRowProps) {
  return (
    <RowBox>
      <Typography variant="body2" color="text.secondary" sx={{ width: 150, flexShrink: 0 }}>
        {label}
      </Typography>
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
        <CopyButton aria-label={`${label} 복사`} onClick={onCopy}>
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
  alignItems: 'flex-start',
  gap: theme.spacing(1),
}));

const PresetBox = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
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
