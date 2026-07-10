'use client';

//////////////////////////////////////// 도매꾹 검색 화면 ////////////////////////////////////////
// 링크 복사 없이 사이트 안에서 소싱: 검색/카테고리 → 정렬·필터 → 카드 클릭 = 원링크 등록 준비.
// URL ?kw= 단일 소스 (키워드 분석과 동일 구조 — 공유·뒤로가기·사이드바 재클릭 대응).

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from '@emotion/styled';
import { alpha } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ButtonBase from '@mui/material/ButtonBase';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckIcon from '@mui/icons-material/Check';
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

export default function DomeggookSearchView() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 검색 조건 (kw만 URL 동기화 — 필터는 세션 상태)
  const [inputValue, setInputValue] = useState('');
  const [sort, setSort] = useState<DomeggookSortKey>('ha');
  const [topCategory, setTopCategory] = useState(''); // 대분류 code
  const [subCategory, setSubCategory] = useState(''); // 중분류 code (실제 ca 파라미터)
  // 가격 슬라이더 — 상·하한은 현 조건의 저가순/고가순 각 1건으로 실측 (헤더에 min/max 없음)
  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number } | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const priceBoundsRef = useRef<{ min: number; max: number } | null>(null);
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
  // 분류는 '전체' 또는 중분류 확정 2가지만 (대분류 단독은 API가 미지원 — 피커에서 입력 자체를 막음)
  // 조건 전무(초기 화면)는 서버가 ev=all 전체 검색으로 처리
  const currentKeywordRef = useRef('');
  const buildParams = (targetPage: number): DomeggookSearchParams => ({
    keyword: currentKeywordRef.current || undefined,
    category: subCategory || undefined,
    sort,
    page: targetPage,
    // 슬라이더가 상·하한에서 좁혀졌을 때만 가격 필터 전송
    minPrice: priceBounds && priceRange[0] > priceBounds.min ? priceRange[0] : undefined,
    maxPrice: priceBounds && priceRange[1] < priceBounds.max ? priceRange[1] : undefined,
    singleUnit,
    freeShipping,
    lowestPriceOnly,
    fastShipping,
    excludeOversea,
  });

  ////////// 검색 실행 (1페이지부터)
  const runSearch = async (keyword: string) => {
    currentKeywordRef.current = keyword;
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
      void loadPriceBounds(keyword);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '검색에 실패했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  ////////// 가격 범위 실측 — 저가순·고가순 각 1건 (가격 필터 제외 동일 조건, 캐시 재사용)
  const loadPriceBounds = async (keyword: string) => {
    try {
      const base = {
        keyword: keyword || undefined,
        category: subCategory || undefined,
        singleUnit,
        freeShipping,
        lowestPriceOnly,
        fastShipping,
        excludeOversea,
        pageSize: 1,
      };
      const [lowest, highest] = await Promise.all([
        fetchDomeggookSearch({ ...base, sort: 'aa' }),
        fetchDomeggookSearch({ ...base, sort: 'ad' }),
      ]);
      const min = lowest.items[0]?.price;
      const max = highest.items[0]?.price;
      if (min !== undefined && max !== undefined && min < max) {
        // 상·하한이 그대로면 유지 — 슬라이더로 좁힌 뒤 재검색 시 범위가 풀리는 것 방지
        if (!priceBoundsRef.current || priceBoundsRef.current.min !== min || priceBoundsRef.current.max !== max) {
          priceBoundsRef.current = { min, max };
          setPriceBounds({ min, max });
          setPriceRange([min, max]);
        }
      } else {
        priceBoundsRef.current = null;
        setPriceBounds(null);
      }
    } catch (error) {
      console.error(error);
      setPriceBounds(null);
    }
  };

  ////////// 더보기 (append) — 스크롤로 버튼이 보이면 자동 실행
  const isLoadingMoreRef = useRef(false);
  const loadMore = async () => {
    if (isLoadingMoreRef.current) return; // 옵저버 중복 발화 가드
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const response = await fetchDomeggookSearch(buildParams(page + 1));
      // 페이지 경계에서 같은 상품이 다시 올 수 있음(순위 변동) — no 기준 중복 제거 (key 충돌 방지)
      setItems((previous) => {
        const seen = new Set(previous.map((item) => item.no));
        return [...previous, ...response.items.filter((item) => !seen.has(item.no))];
      });
      setPage(response.page);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '추가 로드에 실패했습니다.', { variant: 'error' });
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  };

  ////////// 더보기 버튼 가시 감지 → 자동 더보기 (무한 스크롤)
  const loadMoreAnchorRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const anchor = loadMoreAnchorRef.current;
    if (!anchor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }, // 버튼 도달 200px 전 선로드
    );
    observer.observe(anchor);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, page, totalPages]);

  ////////// 검색 트리거 — URL만 변경 (실행은 searchParams 이펙트)
  const navigateToKeyword = (rawKeyword: string) => {
    const keyword = rawKeyword.trim();
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
    runSearch(keyword); // 빈 키워드 = 전체 인기순 (서버 ev=all)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  ////////// 정렬·필터 변경 시 재조회 (검색한 적 있을 때만)
  useEffect(() => {
    if (hasSearched) runSearch(currentKeywordRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, subCategory, singleUnit, freeShipping, lowestPriceOnly, fastShipping, excludeOversea]);

  const canLoadMore = page < totalPages && items.length > 0;

  ////////// 카드 클릭 → 원링크 등록 준비
  const handlePick = (no: number) => {
    trackEvent('domeggook_search_pick', { no });
    router.push(`/domeggook-import?input=${no}`);
  };

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
              <CategoryPicker
                categories={categories}
                topCode={topCategory}
                subCode={subCategory}
                onSelect={(nextTop, nextSub) => {
                  setTopCategory(nextTop);
                  setSubCategory(nextSub);
                }}
              />
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
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                sx={{ flexShrink: 0, px: 3 }}
              >
                검색
              </Button>
            </Stack>

            {/* 가격 범위 슬라이더 (검색 후 실측 상·하한) */}
            {hasSearched && priceBounds && (
              <Stack spacing={0.5} sx={{ px: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  가격 {KRW(priceRange[0])} ~ {KRW(priceRange[1])}
                </Typography>
                <Slider
                  size="small"
                  value={priceRange}
                  min={priceBounds.min}
                  max={priceBounds.max}
                  onChange={(_, next) => setPriceRange(next as [number, number])}
                  onChangeCommitted={() => runSearch(currentKeywordRef.current)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => KRW(value)}
                />
              </Stack>
            )}

            {/* 필터 체크박스 */}
            <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2 }} useFlexGap>
              {(
                [
                  ['낱개 구매', singleUnit, setSingleUnit],
                  ['무료배송', freeShipping, setFreeShipping],
                  ['최저가 인증', lowestPriceOnly, setLowestPriceOnly],
                  ['빠른배송', fastShipping, setFastShipping],
                  ['해외직배송 제외', excludeOversea, setExcludeOversea],
                ] as [string, boolean, (next: boolean) => void][]
              ).map(([label, value, setter]) => (
                <FormControlLabel
                  key={label}
                  control={<Checkbox size="small" checked={value} onChange={() => setter(!value)} />}
                  label={<Typography variant="body2">{label}</Typography>}
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
            {/* 결과 헤더 — 좌 타이틀 · 우 정렬 드롭다운 */}
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2">총 {totalItems.toLocaleString()}개 상품</Typography>
              <SortDropdown sort={sort} onChange={setSort} />
            </Stack>
            <CardGrid>
              {items.map((item) => (
                <ProductCardItem key={item.no} item={item} onPick={handlePick} />
              ))}
            </CardGrid>
            {canLoadMore && (
              <Button
                ref={loadMoreAnchorRef}
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

        {hasSearched && !isLoading && items.length === 0 && isConfigured && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            조건에 맞는 상품이 없어요 — 필터를 풀어보세요
          </Typography>
        )}
      </Stack>
    </PageLayout>
  );
}

//////////////////// 분류 피커 (대분류 호버 → 우측 중분류 캐스케이드) ////////////////////
type CategoryPickerProps = {
  categories: DomeggookCategory[];
  topCode: string;
  subCode: string;
  onSelect: (topCode: string, subCode: string) => void;
};

function CategoryPicker({ categories, topCode, subCode, onSelect }: CategoryPickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [activeTop, setActiveTop] = useState('');

  const selectedTop = categories.find((category) => category.code === topCode);
  const selectedSub = selectedTop?.children.find((child) => child.code === subCode);
  const label = selectedSub ? `${selectedTop?.name} > ${selectedSub.name}` : '전체';
  const active = categories.find((category) => category.code === activeTop);

  const close = () => setAnchor(null);

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        endIcon={<ArrowDropDownIcon />}
        onClick={(event) => {
          setActiveTop(topCode || categories[0]?.code || '');
          setAnchor(event.currentTarget);
        }}
        sx={{ flexShrink: 0, whiteSpace: 'nowrap', color: 'text.primary', borderColor: 'divider' }}
      >
        {label}
      </Button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        disableScrollLock
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <PickerPanel>
          {/* 좌: 대분류 (호버로 우측 갱신) */}
          <PickerColumn>
            <PickerItem
              $isActive={!topCode}
              onClick={() => {
                onSelect('', '');
                close();
              }}
            >
              <Typography variant="body2">전체</Typography>
            </PickerItem>
            {categories.map((category) => (
              <PickerItem
                key={category.code}
                $isActive={activeTop === category.code}
                onMouseEnter={() => setActiveTop(category.code)}
                onClick={() => setActiveTop(category.code)}
              >
                <Typography variant="body2" sx={{ flex: 1, textAlign: 'left' }}>
                  {category.name}
                </Typography>
                <ChevronRightIcon sx={{ fontSize: 16 }} color="disabled" />
              </PickerItem>
            ))}
          </PickerColumn>
          {/* 우: 중분류 (클릭 = 선택) */}
          <PickerColumn>
            {[...(active?.children ?? [])]
              .sort((a, b) => b.itemCount - a.itemCount)
              .map((child) => (
                <PickerItem
                  key={child.code}
                  $isActive={subCode === child.code}
                  onClick={() => {
                    onSelect(active?.code ?? '', child.code);
                    close();
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1, textAlign: 'left' }}>
                    {child.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                    {child.itemCount.toLocaleString()}
                  </Typography>
                </PickerItem>
              ))}
            {!active && (
              <Typography variant="caption" color="text.secondary" sx={{ p: 1.5 }}>
                대분류에 마우스를 올려보세요
              </Typography>
            )}
          </PickerColumn>
        </PickerPanel>
      </Popover>
    </>
  );
}

//////////////////// 정렬 드롭다운 (텍스트 버튼 + 메뉴) ////////////////////
type SortDropdownProps = {
  sort: DomeggookSortKey;
  onChange: (next: DomeggookSortKey) => void;
};

function SortDropdown({ sort, onChange }: SortDropdownProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current = DOMEGGOOK_SORTS.find((entry) => entry.key === sort);

  return (
    <>
      <Button
        size="small"
        color="inherit"
        endIcon={<ArrowDropDownIcon />}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ color: 'text.secondary', fontWeight: 400 }}
      >
        {current?.label}
      </Button>
      <Menu
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        disableScrollLock
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {DOMEGGOOK_SORTS.map((entry) => (
          <MenuItem
            key={entry.key}
            selected={entry.key === sort}
            onClick={() => {
              onChange(entry.key);
              setAnchor(null);
            }}
          >
            <Typography variant="body2">{entry.label}</Typography>
            {entry.key === sort && <CheckIcon sx={{ fontSize: 16, ml: 1 }} color="primary" />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

//////////////////// 상품 카드 (메인 그리드·인기 섹션 공용) ////////////////////
type ProductCardItemProps = { item: DomeggookSearchItem; onPick: (no: number) => void };

function ProductCardItem({ item, onPick }: ProductCardItemProps) {
  return (
    <ProductCard onClick={() => onPick(item.no)}>
      <ThumbBox>
        {/* CDN 원본 노출 — next/image 미사용 (외부 호스트·목록 대량) */}
        {/* referrerPolicy 필수 — 도매꾹 CDN이 일부 상품을 Referer 기준 핫링크 차단 (403 실측) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.thumb} alt={item.title} loading="lazy" referrerPolicy="no-referrer" />
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
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const PickerPanel = styled.div({
  display: 'flex',
  maxHeight: 420,
});

const PickerColumn = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 180,
  overflowY: 'auto',
  padding: theme.spacing(0.75),
  scrollbarWidth: 'thin', // Firefox
  '&::-webkit-scrollbar': {
    width: 4,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.divider,
    borderRadius: 2,
  },
  '&:first-of-type': {
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

const PickerItem = styled(ButtonBase, transientOptions)<{ $isActive: boolean }>(({ theme, $isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  width: '100%',
  padding: theme.spacing(0.75, 1.25),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: $isActive ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
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
