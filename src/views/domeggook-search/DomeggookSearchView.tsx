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
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import Slider from '@mui/material/Slider';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ButtonBase from '@mui/material/ButtonBase';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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

  // 초기 인기 섹션 (검색 전 빈 화면 — 상품수 상위 대분류의 대표 중분류 6개, 각 인기 6개)
  type PopularSection = { name: string; code: string; parentCode: string; items: DomeggookSearchItem[] };
  const [popularSections, setPopularSections] = useState<PopularSection[]>([]);
  const [isPopularLoading, setIsPopularLoading] = useState(false);

  ////////// 현재 조건 조립 (필터 상태 → 요청 파라미터)
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
        setPriceBounds({ min, max });
        setPriceRange([min, max]);
      } else {
        setPriceBounds(null);
      }
    } catch (error) {
      console.error(error);
      setPriceBounds(null);
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
        .then(async (response) => {
          setCategories(response.categories);
          // 대분류별 최다 중분류 1개 → 상품수 순 상위 6개 섹션 (큐레이션 없이 데이터 기반)
          const candidates = response.categories
            .map((top) => {
              const biggest = [...top.children].sort((a, b) => b.itemCount - a.itemCount)[0];
              return biggest ? { name: biggest.name, code: biggest.code, parentCode: top.code, count: biggest.itemCount } : null;
            })
            .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);
          setIsPopularLoading(true);
          try {
            const sections = await Promise.all(
              candidates.map(async (candidate) => ({
                name: candidate.name,
                code: candidate.code,
                parentCode: candidate.parentCode,
                items: (await fetchDomeggookSearch({ category: candidate.code, sort: 'ha', pageSize: 6 })).items,
              })),
            );
            setPopularSections(sections.filter((section) => section.items.length > 0));
          } catch (error) {
            console.error(error);
          } finally {
            setIsPopularLoading(false);
          }
        })
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

  ////////// 카드 클릭 → 원링크 등록 준비
  const handlePick = (no: number) => {
    trackEvent('domeggook_search_pick', { no });
    router.push(`/domeggook-import?input=${no}`);
  };

  ////////// 인기 섹션 [전체 보기] → 해당 카테고리로 검색 (필터 UI 재사용)
  const handleSectionMore = (section: { code: string; parentCode: string }) => {
    setTopCategory(section.parentCode);
    setSubCategory(section.code);
    setHasSearched(true); // subCategory 이펙트가 재조회 실행
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
            <Typography variant="subtitle2">총 {totalItems.toLocaleString()}개 상품</Typography>
            <CardGrid>
              {items.map((item) => (
                <ProductCardItem key={`${item.no}-${page}`} item={item} onPick={handlePick} />
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

        {/* 빈 상태 — 카테고리별 인기 상품 섹션 (A안) */}
        {!hasSearched && !isLoading && (
          <Stack spacing={3}>
            {isPopularLoading && (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 2 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">인기 상품 불러오는 중…</Typography>
              </Stack>
            )}
            {popularSections.map((section) => (
              <Stack key={section.code} spacing={1.5}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2">{section.name} 인기</Typography>
                  <Button size="small" onClick={() => handleSectionMore(section)}>
                    전체 보기 →
                  </Button>
                </Stack>
                <CardGrid>
                  {section.items.map((item) => (
                    <ProductCardItem key={item.no} item={item} onPick={handlePick} />
                  ))}
                </CardGrid>
              </Stack>
            ))}
            {!isPopularLoading && popularSections.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                검색어를 입력하거나 카테고리를 골라보세요
              </Typography>
            )}
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
  const label = selectedSub ? `${selectedTop?.name} > ${selectedSub.name}` : '분류 전체';
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
              <Typography variant="body2">분류 전체</Typography>
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
            {(active?.children ?? []).map((child) => (
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
                <Typography variant="caption" color="text.secondary">
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

//////////////////// 상품 카드 (메인 그리드·인기 섹션 공용) ////////////////////
type ProductCardItemProps = { item: DomeggookSearchItem; onPick: (no: number) => void };

function ProductCardItem({ item, onPick }: ProductCardItemProps) {
  return (
    <ProductCard onClick={() => onPick(item.no)}>
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
  backgroundColor: $isActive ? theme.palette.action.selected : 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
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
