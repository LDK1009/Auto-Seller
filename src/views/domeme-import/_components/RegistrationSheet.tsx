'use client';

//////////////////////////////////////// 등록 정보 시트 (등록 준비 패키지) ////////////////////////////////////////
// 스마트스토어 등록 폼에 그대로 붙여넣을 정보를 자동 조합한다 — API 없이 등록 노동의 마지막 구간을 복붙으로.
// - 판매가: 도매꾹가 × 구매단위(MOQ) 원가로 역산 (shared/utils/marginCalculation 재사용)
// - MOQ ≥ 2: 묶음(1+1 등) 구성 판매 안내 — 고객 1주문 = 도매꾹 MOQ 구매이므로 원가에 반영
// - A/S 정보: 셀러 고정값 (localStorage — useSellerFixedInfo)

import { useState } from 'react';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useSnackbar } from 'notistack';
import { FEE_PRESETS, FEE_DISCLAIMER, TARGET_MARGIN_PRESETS } from '@/shared/constants/marketFees';
import { calculateReversePrice, PRICE_ROUND_UNIT } from '@/shared/utils/marginCalculation';
import type { DomemeItem } from '@/shared/types/domeme';
import { useSellerFixedInfo } from '../_hooks/useSellerFixedInfo';
import { validateProductName, PROMO_WORDS, type NameCheckLevel } from '../_utils/validateProductName';
import { detectComplianceRisk } from '../_utils/detectComplianceRisk';
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

// 구매/리뷰 혜택 권장 프리셋 (초보 표준 세팅 — 등록 UI ⑧구간의 결정 부담 제거)
const BENEFIT_PRESET_LINES = [
  '텍스트 리뷰 적립: 50원',
  '포토/동영상 리뷰 적립: 150원',
  '한달사용 텍스트 리뷰: 50원 / 포토·동영상: 150원',
  '복수구매할인·무이자할부·사은품: 설정 안 함 (마진 확보 우선)',
  '최소·최대 구매수량: 제한 없음',
];

type RegistrationSheetProps = {
  item: DomemeItem;
};

const KRW = (value: number) => `${Math.round(value).toLocaleString()}원`;

export default function RegistrationSheet({ item }: RegistrationSheetProps) {
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
  const [marketDetail, setMarketDetail] = useState<KeywordDetail | null>(null); // 시장 분석 (⑬)
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);

  const nameChecks = validateProductName(productName);
  const complianceRisks = detectComplianceRisk(item.title, item.categoryPath);

  ////////// 태그 후보: 공급사 키워드(1순위) + 상품명 토큰 — 홍보어·비정상 토큰 제외, 10개
  const nameTokens = productName
    .split(/\s+/)
    .map((token) => token.replace(/[^가-힣a-zA-Z0-9]/g, ''))
    .filter((token) => token.length >= 2);
  const tagCandidates = Array.from(new Set([...item.keywords, ...nameTokens]))
    .filter((tag) => !PROMO_WORDS.some((word) => tag.toLowerCase().includes(word.toLowerCase())))
    .slice(0, 10);

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

  const recommendedPrice = reverseResult.achievable ? reverseResult.recommendedPrice : null;
  const profitAtPrice = reverseResult.achievable ? reverseResult.marginAtPrice.profit : null;

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

  ////////// 시장 분석 (⑬ — 대표 태그 키워드의 가격대·브랜드·시즌을 시트에 이식)
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

  ////////// 복사
  const copyText = async (label: string, value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    enqueueSnackbar(`${label}을(를) 복사했습니다.`, { variant: 'success' });
  };

  const copyAll = async () => {
    const lines = [
      `상품명: ${productName}`,
      recommendedPrice !== null &&
        `판매가: ${recommendedPrice}${bundleUnits > 1 ? ` (${bundleUnits}개 묶음 기준)` : ''}`,
      listPrice !== null && `정가(할인 표시용): ${listPrice} (−${discountRate}% → ${recommendedPrice})`,
      `판매자 상품코드: DG-${item.no}`,
      tagCandidates.length > 0 && `태그 후보: ${tagCandidates.join(',')}`,
      `배송비: ${shippingFee}${item.delivery.feeType ? ` (${item.delivery.feeType})` : ''}`,
      item.returnInfo.fee !== null && `반품비: ${item.returnInfo.fee} / 교환비: ${exchangeFee}`,
      bundleStock !== null && `재고: ${bundleStock}${bundleUnits > 1 ? ` (묶음 기준, 낱개 ${item.inventory})` : ''}`,
      taxLabel && `과세 구분: ${taxLabel}`,
      item.origin && `원산지: ${item.origin}`,
      item.manufacturer && `제조사: ${item.manufacturer}`,
      item.model && `모델명: ${item.model}`,
      infoDutyText && `상품정보제공고시:\n${infoDutyText}`,
      item.categoryPath && `도매꾹 카테고리(참고): ${item.categoryPath}`,
      optionsTsv && `옵션 (옵션명/가산가/재고${bundleUnits > 1 ? ' — 묶음 기준' : ''}):\n${optionsTsv}`,
      fixedInfo.afterServicePhone && `A/S 전화번호: ${fixedInfo.afterServicePhone}`,
      fixedInfo.afterServiceGuide && `A/S 안내: ${fixedInfo.afterServiceGuide}`,
    ]
      .filter(Boolean)
      .join('\n');
    await copyText('등록 정보 시트 전체', lines);
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">등록 정보 시트</Typography>
        <Button variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={copyAll}>
          전체 복사
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        스마트스토어 등록 화면에 항목별로 붙여넣으세요. 남은 건 카테고리 선택과 등록 버튼뿐입니다.
      </Typography>

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

      {/* 상품명 + 검사기 */}
      <Stack spacing={1}>
        <FieldRow>
          <TextField
            fullWidth
            size="small"
            label="상품명 (도매꾹 원본 — 수정해서 쓰세요)"
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
          />
          <CopyButton aria-label="상품명 복사" onClick={() => copyText('상품명', productName)}>
            <ContentCopyIcon fontSize="small" />
          </CopyButton>
        </FieldRow>
        {/* 검사 결과 — 통과 항목은 칩으로 압축, 경고·실패만 줄로 노출 */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
          {nameChecks.map((check) => (
            <Chip
              key={check.label}
              size="small"
              variant={check.level === 'pass' ? 'outlined' : 'filled'}
              color={CHECK_CHIP_COLORS[check.level]}
              label={check.level === 'pass' ? check.label : `${check.label}: ${check.message}`}
            />
          ))}
        </Stack>
      </Stack>

      {/* 태그 후보 — 공급사 키워드 + 상품명 추출 */}
      {tagCandidates.length > 0 && (
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2">태그 후보 {tagCandidates.length}개</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={handleLoadTagStats} disabled={isLoadingStats}>
                {isLoadingStats ? '조회 중…' : '검색량 확인'}
              </Button>
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={() => copyText('태그', tagCandidates.join(','))}
              >
                태그 복사
              </Button>
            </Stack>
          </Stack>
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
            공급사 등록 키워드 + 상품명에서 추출했습니다. [검색량 확인]을 누르면 월간 검색수와
            경쟁강도(상품수÷검색수 — 낮을수록 틈새)가 붙습니다. 제한 태그 여부는 등록 화면에서 최종
            확인됩니다.
          </Typography>
        </Stack>
      )}

      {/* 판매가 — 목표 마진 역산 */}
      <PriceBox>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }} useFlexGap>
            <Typography variant="subtitle2">추천 판매가</Typography>
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

          {recommendedPrice !== null ? (
            <Stack spacing={1}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }} useFlexGap>
                <Typography variant="h5" sx={{ color: 'primary.main' }}>
                  {KRW(recommendedPrice)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  원가 {KRW(costPrice)}
                  {bundleUnits > 1 && ` (${KRW(unitPrice)}×${bundleUnits})`} · 수수료 {SMARTSTORE_FEE_RATE}% ·
                  개당 순이익 {profitAtPrice !== null ? KRW(profitAtPrice) : '—'}
                </Typography>
                <CopyButton
                  aria-label="판매가 복사"
                  onClick={() => copyText('판매가', String(recommendedPrice))}
                >
                  <ContentCopyIcon fontSize="small" />
                </CopyButton>
              </Stack>

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
                    <CopyButton aria-label="정가 복사" onClick={() => copyText('정가', String(listPrice))}>
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
          {/* ⑬ 시장 가격 비교 — 대표 태그 키워드 기준 */}
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
        </Stack>
      </PriceBox>

      <Divider />

      {/* 자동 채움 필드들 */}
      <Stack spacing={1}>
        <SheetRow
          label="배송비"
          value={shippingFee > 0 ? KRW(shippingFee) : item.delivery.feeType ?? '—'}
          caption={[item.delivery.feeType, item.delivery.pay, item.delivery.jejuExtra !== null && `제주 +${KRW(item.delivery.jejuExtra)}`]
            .filter(Boolean)
            .join(' · ')}
          onCopy={() => copyText('배송비', String(shippingFee))}
        />
        <SheetRow
          label="반품 / 교환비"
          value={
            item.returnInfo.fee !== null ? `${KRW(item.returnInfo.fee)} / ${exchangeFee !== null ? KRW(exchangeFee) : '—'}` : '—'
          }
          onCopy={item.returnInfo.fee !== null ? () => copyText('반품비', String(item.returnInfo.fee)) : undefined}
        />
        <SheetRow
          label="재고 수량"
          value={bundleStock !== null ? `${bundleStock.toLocaleString()}개` : '—'}
          caption={bundleUnits > 1 && item.inventory !== null ? `묶음 기준 (낱개 ${item.inventory.toLocaleString()}개)` : undefined}
          onCopy={bundleStock !== null ? () => copyText('재고 수량', String(bundleStock)) : undefined}
        />
        <SheetRow label="과세 구분" value={taxLabel ?? '—'} onCopy={taxLabel ? () => copyText('과세 구분', taxLabel) : undefined} />
        <SheetRow label="원산지" value={item.origin ?? '—'} onCopy={item.origin ? () => copyText('원산지', item.origin as string) : undefined} />
        <SheetRow
          label="제조사 / 모델명"
          value={[item.manufacturer, item.model].filter(Boolean).join(' / ') || '—'}
          onCopy={
            item.manufacturer || item.model
              ? () => copyText('제조사/모델명', [item.manufacturer, item.model].filter(Boolean).join(' / '))
              : undefined
          }
        />
        <SheetRow
          label="상품정보제공고시"
          value={item.infoDuty.type ?? '—'}
          caption={item.infoDuty.items.map((entry) => `${entry.name}: ${entry.desc}`).join(' · ') || undefined}
          onCopy={infoDutyText ? () => copyText('상품정보제공고시', infoDutyText) : undefined}
        />
        <SheetRow
          label="도매꾹 카테고리 (참고)"
          value={item.categoryPath ?? '—'}
          caption="스마트스토어 카테고리는 등록 화면에서 가장 가까운 항목을 선택하세요"
          onCopy={item.categoryPath ? () => copyText('카테고리', item.categoryPath as string) : undefined}
        />

        {/* 스스 카테고리 후보 — 네이버쇼핑 상위 상품들의 카테고리 최빈값 */}
        <Stack spacing={1} sx={{ px: 1.5, py: 0.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 150, flexShrink: 0 }}>
              스스 카테고리 후보
            </Typography>
            <Button size="small" onClick={handleLoadCategorySuggest} disabled={isLoadingCategory}>
              {isLoadingCategory ? '조회 중…' : categoryCandidates === null ? '후보 확인' : '다시 확인'}
            </Button>
          </Stack>
          {categoryCandidates !== null && categoryCandidates.length > 0 && (
            <Stack spacing={0.5} sx={{ pl: '162px' }}>
              {categoryCandidates.map((candidate, index) => (
                <Stack key={candidate.path} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: index === 0 ? 700 : 500 }}>
                    {candidate.path}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (상위 {candidate.sampleSize}개 중 {candidate.count}개)
                  </Typography>
                  <CopyButton
                    aria-label="카테고리 후보 복사"
                    onClick={() => copyText('스스 카테고리', candidate.path)}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </CopyButton>
                </Stack>
              ))}
              <Typography variant="caption" color="text.secondary">
                같은 키워드 상위 상품들이 실제로 등록된 카테고리입니다 — 1순위 후보를 등록 화면에서
                검색해 선택하세요.
              </Typography>
            </Stack>
          )}
        </Stack>
        <SheetRow
          label="판매자 상품코드 (권장)"
          value={`DG-${item.no}`}
          caption="도매꾹 상품번호 — 주문이 들어오면 이 코드로 도매꾹에서 바로 찾아 발주할 수 있습니다"
          onCopy={() => copyText('판매자 상품코드', `DG-${item.no}`)}
        />
      </Stack>

      {/* 옵션 조합 — 스스 옵션 폼에 옮겨 치던 노가다 대체 */}
      {bundledOptions.length > 0 && (
        <>
          <Divider />
          <Stack spacing={1}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2">
                옵션 {bundledOptions.length}개{bundleUnits > 1 && ' (가산가·재고 = 묶음 기준)'}
              </Typography>
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={() => copyText('옵션 표', optionsTsv)}
              >
                옵션 표 복사
              </Button>
            </Stack>
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
          </Stack>
        </>
      )}

      {/* 구매/리뷰 혜택 권장 프리셋 */}
      <Stack spacing={1}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2">구매/리뷰 혜택 — 초보 권장 세팅</Typography>
          <Button
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={() => copyText('혜택 세팅', BENEFIT_PRESET_LINES.join('\n'))}
          >
            복사
          </Button>
        </Stack>
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
      </Stack>

      <Divider />

      {/* A/S 고정값 — 1회 입력 후 브라우저에 저장 */}
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">A/S 정보 (한 번 입력하면 이 브라우저에 저장됩니다)</Typography>
        <FieldRow>
          <TextField
            fullWidth
            size="small"
            label="A/S 전화번호"
            value={fixedInfo.afterServicePhone}
            onChange={(event) => updateFixedInfo({ afterServicePhone: event.target.value })}
          />
          <CopyButton
            aria-label="A/S 전화번호 복사"
            onClick={() => copyText('A/S 전화번호', fixedInfo.afterServicePhone)}
          >
            <ContentCopyIcon fontSize="small" />
          </CopyButton>
        </FieldRow>
        <FieldRow>
          <TextField
            fullWidth
            size="small"
            label="A/S 안내 문구"
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
            onClick={() => copyText('A/S 안내', fixedInfo.afterServiceGuide)}
          >
            <ContentCopyIcon fontSize="small" />
          </CopyButton>
        </FieldRow>
      </Stack>
    </Stack>
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
          <Typography variant="caption" color="text.secondary">
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
const FieldRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(1),
}));

const PriceBox = styled.div(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
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
