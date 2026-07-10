'use client';

//////////////////////////////////////// 도매꾹 검색 화면 ////////////////////////////////////////
// 링크 복사 없이 사이트 안에서 소싱: 검색/카테고리 → 정렬·필터 → 카드 클릭 = 원링크 등록 준비.
// URL ?kw= 단일 소스 (키워드 분석과 동일 구조 — 공유·뒤로가기·사이드바 재클릭 대응).

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useSnackbar } from 'notistack';
import PageLayout from '@/shared/components/PageLayout';
import HelpPanel from '@/shared/components/HelpPanel';
import { fetchDomeggookSearch, fetchDomeggookCategories } from '@/shared/services/domeggookSearchService';
import {
  DOMEGGOOK_SORTS,
  type DomeggookCategory,
  type DomeggookSearchItem,
  type DomeggookSearchParams,
  type DomeggookSortKey,
} from '@/shared/types/domeggookSearch';
import { trackEvent } from '@/shared/utils/analytics';
import { transientOptions } from '@/shared/utils/emotionTransientProps';

const KRW = (value: number) => `${value.toLocaleString()}원`;

// 숫자 입력 파싱 (빈 값·비정상 입력은 0)
function parseAmount(raw: string): number {
  const value = Number(raw.replaceAll(',', ''));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export default function DomeggookSearchView() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 검색 조건 (kw만 URL 동기화 — 필터는 세션 상태)
  const [inputValue, setInputValue] = useState('');
  const [sort, setSort] = useState<DomeggookSortKey>('ha');
  const [topCategory, setTopCategory] = useState(''); // 대분류 code
  const [subCategory, setSubCategory] = useState(''); // 중분류 code (실제 ca 파라미터)
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [singleUnit, setSingleUnit] = useState(false);
  const [freeShipping, setFreeShipping] = useState(false);
  const [lowestPriceOnly, setLowestPriceOnly] = useState(false);
  const [fastShipping, setFastShipping] = useState(false);
  const [excludeOversea, setExcludeOversea] = useState(false);

  // 결과
  const [items, setItems] = useState<DomeggookSearchItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  // 카테고리 트리
  const [categories, setCategories] = useState<DomeggookCategory[]>([]);

  ////////// 현재 조건 조립 (필터 상태 → 요청 파라미터)
  const currentKeywordRef = useRef('');
  const buildParams = (targetPage: number): DomeggookSearchParams => ({
    keyword: currentKeywordRef.current || undefined,
    category: subCategory || undefined,
    sort,
    page: targetPage,
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    singleUnit,
    freeShipping,
    lowestPriceOnly,
    fastShipping,
    excludeOversea,
  });

  ////////// 검색 실행 (1페이지부터)
  const runSearch = async (keyword: string) => {
    currentKeywordRef.current = keyword;
    if (!keyword && !subCategory) return; // 검색조건 없음
    setIsLoading(true);
    setHasSearched(true);
    setItems([]);
    try {
      const response = await fetchDomeggookSearch(buildParams(1));
      setIsConfigured(response.configured);
      setItems(response.items);
      setTotalItems(response.totalItems);
      setTotalPages(response.totalPages);
      setPage(1);
      trackEvent('domeggook_search', { keyword, category: subCategory || '' });
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '검색에 실패했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  ////////// 더보기 (append)
  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const response = await fetchDomeggookSearch(buildParams(page + 1));
      setItems((previous) => [...previous, ...response.items]);
      setPage(response.page);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '추가 로드에 실패했습니다.', { variant: 'error' });
    } finally {
      setIsLoadingMore(false);
    }
  };

  ////////// 검색 트리거 — URL만 변경 (실행은 searchParams 이펙트)
  const navigateToKeyword = (rawKeyword: string) => {
    const keyword = rawKeyword.trim();
    if (keyword.length === 0 && !subCategory) return;
    if ((searchParams.get('kw') ?? '') === keyword) runSearch(keyword);
    else router.push(keyword ? `?kw=${encodeURIComponent(keyword)}` : '?');
  };

  ////////// URL → 화면 동기화 + 카테고리 로드(1회)
  const hasLoadedCategoriesRef = useRef(false);
  useEffect(() => {
    if (!hasLoadedCategoriesRef.current) {
      hasLoadedCategoriesRef.current = true;
      fetchDomeggookCategories()
        .then((response) => setCategories(response.categories))
        .catch((error) => console.error(error));
    }
    const keyword = (searchParams.get('kw') ?? '').trim();
    setInputValue(keyword);
    if (keyword.length > 0) runSearch(keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  ////////// 정렬·필터 변경 시 재조회 (검색한 적 있을 때만)
  useEffect(() => {
    if (hasSearched && (currentKeywordRef.current || subCategory)) runSearch(currentKeywordRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, subCategory, singleUnit, freeShipping, lowestPriceOnly, fastShipping, excludeOversea]);

  const selectedTop = categories.find((category) => category.code === topCategory);
  const canLoadMore = page < totalPages && items.length > 0;

  return (
    <PageLayout
      title="도매꾹 검색"
      description="링크 없이, 검색으로 소싱을 시작합니다."
      help={
        <HelpPanel storageKey="domeggook-search">
          <Stack spacing={0.75}>
            <Typography variant="body2">① 검색하거나 카테고리를 고르세요</Typography>
            <Typography variant="body2">② 정렬과 필터로 후보를 추리세요</Typography>
            <Typography variant="body2">③ 상품을 클릭하면 등록 준비가 시작됩니다</Typography>
          </Stack>
        </HelpPanel>
      }
    >
      <Stack spacing={3}>
        {/* 검색·필터 */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                size="medium"
                label="검색어"
                placeholder="캠핑랜턴"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') navigateToKeyword(inputValue);
                }}
              />
              <Button
                variant="contained"
                onClick={() => navigateToKeyword(inputValue)}
                disabled={isLoading || (inputValue.trim().length === 0 && !subCategory)}
                startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                sx={{ flexShrink: 0, px: 3 }}
              >
                검색
              </Button>
            </Stack>

            {/* 정렬 칩 */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {DOMEGGOOK_SORTS.map((entry) => (
                <Chip
                  key={entry.key}
                  label={entry.label}
                  color={sort === entry.key ? 'primary' : 'default'}
                  variant={sort === entry.key ? 'filled' : 'outlined'}
                  onClick={() => setSort(entry.key)}
                />
              ))}
            </Stack>

            {/* 카테고리 2단 + 가격 */}
            <FilterRow>
              <TextField
                select
                size="small"
                label="대분류"
                value={topCategory}
                onChange={(event) => {
                  setTopCategory(event.target.value);
                  setSubCategory('');
                }}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">전체</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.code} value={category.code}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="중분류"
                value={subCategory}
                onChange={(event) => setSubCategory(event.target.value)}
                disabled={!selectedTop}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">전체</MenuItem>
                {(selectedTop?.children ?? []).map((child) => (
                  <MenuItem key={child.code} value={child.code}>
                    {child.name} ({child.itemCount.toLocaleString()})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                type="number"
                label="최소 가격"
                value={minPrice === 0 ? '' : minPrice}
                placeholder="0"
                onChange={(event) => setMinPrice(parseAmount(event.target.value))}
                onBlur={() => hasSearched && runSearch(currentKeywordRef.current)}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">원</InputAdornment> } }}
                sx={{ width: 140 }}
              />
              <TextField
                size="small"
                type="number"
                label="최대 가격"
                value={maxPrice === 0 ? '' : maxPrice}
                placeholder="0"
                onChange={(event) => setMaxPrice(parseAmount(event.target.value))}
                onBlur={() => hasSearched && runSearch(currentKeywordRef.current)}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">원</InputAdornment> } }}
                sx={{ width: 140 }}
              />
            </FilterRow>

            {/* 필터 토글 칩 */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {(
                [
                  ['낱개 구매', singleUnit, setSingleUnit],
                  ['무료배송', freeShipping, setFreeShipping],
                  ['최저가 인증', lowestPriceOnly, setLowestPriceOnly],
                  ['빠른배송', fastShipping, setFastShipping],
                  ['해외직배송 제외', excludeOversea, setExcludeOversea],
                ] as [string, boolean, (next: boolean) => void][]
              ).map(([label, value, setter]) => (
                <Chip
                  key={label}
                  label={label}
                  color={value ? 'primary' : 'default'}
                  variant={value ? 'filled' : 'outlined'}
                  onClick={() => setter(!value)}
                />
              ))}
            </Stack>
          </Stack>
        </Paper>

        {/* 키 미설정 */}
        {!isConfigured && <Alert severity="info">아직 준비 중인 기능입니다. (운영자: 도매꾹 API 키 설정 필요)</Alert>}

        {/* 결과 */}
        {hasSearched && !isLoading && items.length > 0 && (
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">총 {totalItems.toLocaleString()}개 상품</Typography>
            <CardGrid>
              {items.map((item) => (
                <ProductCard
                  key={`${item.no}-${page}`}
                  onClick={() => {
                    trackEvent('domeggook_search_pick', { no: item.no });
                    router.push(`/domeggook-import?input=${item.no}`);
                  }}
                >
                  <ThumbBox>
                    {/* CDN 원본 노출 — next/image 미사용 (외부 호스트·목록 대량) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.thumb} alt={item.title} loading="lazy" />
                    <Tooltip title="도매꾹에서 보기">
                      <ExternalButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          window.open(item.url, '_blank', 'noopener');
                        }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </ExternalButton>
                    </Tooltip>
                  </ThumbBox>
                  <Stack spacing={0.5} sx={{ p: 1.5, flex: 1 }}>
                    <TitleText variant="body2">{item.title}</TitleText>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {KRW(item.price)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.shipping.isFree ? '무료배송' : item.shipping.fee !== null ? `배송비 ${KRW(item.shipping.fee)}` : '배송비 별도'}
                      {item.unitQty > 1 && ` · ${item.unitQty}개 단위`}
                    </Typography>
                    {(item.isLowestPrice || item.isBusinessOnly) && (
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                        {item.isLowestPrice && <Chip size="small" color="success" variant="outlined" label="최저가" />}
                        {item.isBusinessOnly && <Chip size="small" variant="outlined" label="사업자 전용" />}
                      </Stack>
                    )}
                  </Stack>
                </ProductCard>
              ))}
            </CardGrid>
            {canLoadMore && (
              <Button
                variant="outlined"
                onClick={loadMore}
                disabled={isLoadingMore}
                startIcon={isLoadingMore ? <CircularProgress size={14} /> : undefined}
                sx={{ alignSelf: 'center', px: 4 }}
              >
                더보기
              </Button>
            )}
          </Stack>
        )}

        {/* 로딩 */}
        {isLoading && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">검색 중…</Typography>
          </Stack>
        )}

        {/* 빈 상태 */}
        {!hasSearched && !isLoading && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            검색어를 입력하거나 카테고리를 골라보세요
          </Typography>
        )}
        {hasSearched && !isLoading && items.length === 0 && isConfigured && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            조건에 맞는 상품이 없어요 — 필터를 풀어보세요
          </Typography>
        )}
      </Stack>
    </PageLayout>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const FilterRow = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1.5),
  alignItems: 'center',
}));

const CardGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: theme.spacing(2),
}));

const ProductCard = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow: theme.shadows[3],
  },
}));

const ThumbBox = styled.div(({ theme }) => ({
  position: 'relative',
  aspectRatio: '1 / 1',
  backgroundColor: theme.palette.background.default,
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
}));

const ExternalButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(0.75),
  right: theme.spacing(0.75),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: theme.palette.background.paper,
  },
}));

const TitleText = styled(Typography)({
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  minHeight: '2.6em',
});
