'use client';

//////////////////////////////////////// 랜딩 베스트 상품 섹션 ////////////////////////////////////////
// 후킹 섹션: 도매꾹 베스트(낱개 구매 가능)를 그리드로 보여주고, 클릭 = 원링크 자동 조회.
// "링크 하나로 등록 준비"를 말 대신 클릭 한 번으로 시연한다.
// 자동 롤링 캐러셀은 배너 실명(banner blindness)으로 배제 — 정적 그리드 + [다른 상품 보기] 로테이션.

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { trackEvent } from '@/shared/utils/analytics';
import { useBestProducts, BEST_DISPLAY_COUNT } from '../_hooks/useBestProducts';

const KRW = (value: number) => `${value.toLocaleString()}원`;

export default function BestProductsSection() {
  const router = useRouter();
  const { products, isLoading, rotate, canRotate } = useBestProducts();

  // API 미설정·조회 실패 — 랜딩 보조 섹션이라 통째로 숨김
  if (!isLoading && products.length === 0) return null;

  const openProduct = (no: number) => {
    trackEvent('best_click_from_landing');
    router.push(`/domeggook-import?input=${no}`);
  };

  return (
    <Stack spacing={3} sx={{ alignItems: 'center' }}>
      <Stack spacing={1} sx={{ textAlign: 'center' }}>
        <Typography variant="h5">지금 뜨는 도매꾹 베스트</Typography>
        <Typography variant="body2" color="text.secondary">
          상품을 클릭하면 스마트스토어 등록 정보가 바로 준비돼요
        </Typography>
      </Stack>

      <ProductGrid>
        {isLoading
          ? Array.from({ length: BEST_DISPLAY_COUNT }, (_, index) => (
              <Stack key={index} spacing={1}>
                <Skeleton variant="rounded" sx={{ aspectRatio: '1 / 1', height: 'auto' }} />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="40%" />
              </Stack>
            ))
          : products.map((product) => (
              <ProductCard key={product.no} type="button" onClick={() => openProduct(product.no)}>
                <ThumbBox>
                  {/* referrerPolicy 필수 — 도매꾹 CDN 핫링크 차단 (403 실측) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.thumb} alt={product.title} loading="lazy" referrerPolicy="no-referrer" />
                </ThumbBox>
                <Stack spacing={0.25} sx={{ px: 0.5, pb: 1, textAlign: 'left' }}>
                  <ProductTitle variant="body2">{product.title}</ProductTitle>
                  <Typography variant="subtitle2">{KRW(product.price)}</Typography>
                </Stack>
              </ProductCard>
            ))}
      </ProductGrid>

      <Stack direction="row" spacing={1.5}>
        {canRotate && (
          <Button size="small" color="inherit" startIcon={<RefreshIcon />} onClick={rotate} sx={{ color: 'text.secondary' }}>
            다른 상품 보기
          </Button>
        )}
        <Button
          component={Link}
          href="/domeggook-search"
          size="small"
          endIcon={<ChevronRightIcon />}
          onClick={() => trackEvent('best_more_from_landing')}
        >
          검색으로 더 찾기
        </Button>
      </Stack>
    </Stack>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const ProductGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: theme.spacing(2),
  width: '100%',
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
}));

const ProductCard = styled.button(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  padding: 0,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  cursor: 'pointer',
  overflow: 'hidden',
  textAlign: 'left',
  transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow: theme.shadows[3],
    transform: 'translateY(-2px)',
  },
}));

const ThumbBox = styled.div(({ theme }) => ({
  width: '100%',
  aspectRatio: '1 / 1',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
}));

// 상품명 2줄 말줄임
const ProductTitle = styled(Typography)({
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  minHeight: '2.6em',
});
