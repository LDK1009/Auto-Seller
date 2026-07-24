'use client';

//////////////////////////////////////// 내 상품 목록 (/my-products) ////////////////////////////////////////
// 품절 감시 라인 2·3 — 원링크에서 저장한 상품 목록 + [일괄 품절 확인] (버튼 트리거, 무료).
// 자동 감시+알림톡(라인 4, 유료)의 전제 화면. 행 클릭 = 원링크 재조회.

import { useRouter } from 'next/navigation';
import styled from '@emotion/styled';
import dayjs from 'dayjs';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { useSnackbar } from 'notistack';
import { signInWithKakao } from '@/shared/services/authService';
import { SAVED_PRODUCTS_FREE_LIMIT, type StockCheckResult } from '@/shared/services/savedProductsService';
import { useSavedProducts } from './_hooks/useSavedProducts';

////////// 품절 확인 결과 → 상태 칩
function stockChip(result: StockCheckResult | undefined) {
  if (!result) return null;
  if (result.failed) return <Chip size="small" color="warning" label="확인 실패 — 상품이 내려갔을 수 있음" />;
  if (result.isSoldOut) {
    return (
      <Chip
        size="small"
        color="error"
        label={result.saleStatus && result.saleStatus !== '판매중' ? result.saleStatus : '품절'}
      />
    );
  }
  return (
    <Chip
      size="small"
      color="success"
      variant="outlined"
      label={result.inventory !== null ? `재고 ${result.inventory.toLocaleString()}개` : '판매중'}
    />
  );
}

export default function MyProductsView() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { session, isSessionLoading, products, isLoading, stockResults, checkProgress, remove, checkStock } =
    useSavedProducts();

  const handleSignIn = async () => {
    try {
      await signInWithKakao();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error instanceof Error ? error.message : '로그인에 실패했습니다.', { variant: 'error' });
    }
  };

  const isBusy = isSessionLoading || isLoading;

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Stack spacing={3}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Stack spacing={0.5}>
            <Typography component="h1" variant="h5">
              내 상품 목록
            </Typography>
            <Typography variant="body2" color="text.secondary">
              원링크에서 저장한 상품의 도매꾹 재고를 한 번에 확인하세요 ({products.length}/{SAVED_PRODUCTS_FREE_LIMIT})
            </Typography>
          </Stack>
          {session && products.length > 0 && (
            <Button
              variant="contained"
              startIcon={checkProgress ? <CircularProgress size={16} color="inherit" /> : <FactCheckOutlinedIcon />}
              onClick={checkStock}
              disabled={checkProgress !== null}
            >
              {checkProgress ?? '일괄 품절 확인'}
            </Button>
          )}
        </Stack>

        {isBusy ? (
          <Stack sx={{ alignItems: 'center', py: 8 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : !session ? (
          <EmptyBox>
            <Typography variant="body2" color="text.secondary">
              로그인하면 상품을 저장하고 품절을 한 번에 확인할 수 있습니다.
            </Typography>
            <Button variant="contained" onClick={handleSignIn}>
              로그인
            </Button>
          </EmptyBox>
        ) : products.length === 0 ? (
          <EmptyBox>
            <Typography variant="body2" color="text.secondary">
              아직 저장한 상품이 없습니다 — 원링크에서 상품 조회 후 [내 목록에 저장]을 눌러보세요.
            </Typography>
            <Button variant="outlined" onClick={() => router.push('/domeggook-import')}>
              원링크로 가기
            </Button>
          </EmptyBox>
        ) : (
          <Stack spacing={1.5}>
            {products.map((product) => (
              <ProductRow key={product.id} onClick={() => router.push(`/domeggook-import?input=${product.product_no}`)}>
                <ThumbBox>
                  {product.thumb_url ? (
                    // referrerPolicy — 도매꾹 CDN 핫링크 차단 대응
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.thumb_url} alt={product.title} loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </ThumbBox>
                <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                    {stockChip(stockResults?.get(product.product_no))}
                  </Stack>
                  <RowTitle variant="body2">{product.title}</RowTitle>
                  <Typography variant="caption" color="text.secondary">
                    {product.dome_price !== null ? `도매꾹가 ${product.dome_price.toLocaleString()}원 · ` : ''}
                    저장 {dayjs(product.created_at).format('M월 D일')}
                  </Typography>
                </Stack>
                <Tooltip title="목록에서 삭제">
                  <IconButton
                    size="small"
                    aria-label="삭제"
                    onClick={(event) => {
                      event.stopPropagation();
                      remove(product.id);
                    }}
                  >
                    <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </ProductRow>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const EmptyBox = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(8, 3),
  borderRadius: theme.shape.borderRadius,
  border: `1px dashed ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const ProductRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  cursor: 'pointer',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow: theme.shadows[2],
  },
}));

const ThumbBox = styled.div(({ theme }) => ({
  width: 64,
  height: 64,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
}));

const RowTitle = styled(Typography)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontWeight: 600,
});
