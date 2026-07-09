'use client';

//////////////////////////////////////// 시작 키워드 순위 표 (빈 화면용) ////////////////////////////////////////
// 큐레이션 키워드를 실제 조회 결과(월간 검색수 내림차순)로 랭킹해 보여준다.
// 행 클릭 = 해당 키워드 분석 실행. 기본 5개 노출 + 더보기.

import { useState } from 'react';
import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import type { KeywordStat } from '@/shared/types/keywordStats';

const COLLAPSED_COUNT = 5;

type PropsType = {
  title: string;
  stats: KeywordStat[]; // 검색수 내림차순 정렬 상태로 전달
  isLoading: boolean;
  onSelectKeyword: (keyword: string) => void;
};

export default function StarterKeywordTable({ title, stats, isLoading, onSelectKeyword }: PropsType) {
  // 접힘 상태 (순수 UI 상태)
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleStats = isExpanded ? stats : stats.slice(0, COLLAPSED_COUNT);
  const hiddenCount = stats.length - COLLAPSED_COUNT;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{title}</Typography>

      {isLoading && (
        <LoadingRow>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">검색수 불러오는 중…</Typography>
        </LoadingRow>
      )}

      {!isLoading && stats.length > 0 && (
        <>
          <HeaderRow>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>키워드</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ width: 200 }}>카테고리</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ width: 90, textAlign: 'right' }}>월간 검색수</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ width: 90, textAlign: 'right' }}>상품 수</Typography>
          </HeaderRow>
          <ListBox>
            {visibleStats.map((stat, index) => (
              <RowButton key={stat.keyword} onClick={() => onSelectKeyword(stat.keyword)}>
                <RankNumber $isTop={index < 3}>{index + 1}</RankNumber>
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, minWidth: 0, wordBreak: 'break-all', textAlign: 'left' }}>
                  {stat.keyword}
                </Typography>
                <CategoryText variant="caption" color="text.secondary" title={stat.category ?? undefined}>
                  {stat.category ?? '—'}
                </CategoryText>
                <Typography variant="body2" sx={{ width: 90, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {stat.monthlySearches === null ? '—' : stat.isLowVolume ? '10 미만' : stat.monthlySearches.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ width: 90, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {stat.productCount !== null ? stat.productCount.toLocaleString() : '—'}
                </Typography>
              </RowButton>
            ))}
          </ListBox>
          {hiddenCount > 0 && (
            <Button
              size="small"
              color="inherit"
              onClick={() => setIsExpanded((previous) => !previous)}
              startIcon={isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              sx={{ alignSelf: 'center', color: 'text.secondary' }}
            >
              {isExpanded ? '접기' : `${hiddenCount}개 더보기`}
            </Button>
          )}
        </>
      )}

      {!isLoading && stats.length === 0 && (
        <Typography variant="caption" color="text.secondary">데이터를 불러오지 못했어요</Typography>
      )}
    </Stack>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
import { transientOptions } from '@/shared/utils/emotionTransientProps';

const LoadingRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 0),
}));

const HeaderRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0, 1),
  paddingLeft: theme.spacing(4.5), // 순위 번호 폭만큼 들여쓰기
}));

const ListBox = styled.div(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const RowButton = styled(ButtonBase)(({ theme }) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.25, 1),
  '&:not(:last-of-type)': {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const RankNumber = styled('span', transientOptions)<{ $isTop: boolean }>(({ theme, $isTop }) => ({
  width: 20,
  flexShrink: 0,
  textAlign: 'center',
  fontSize: '0.8125rem',
  fontWeight: 700,
  color: $isTop ? theme.palette.primary.main : theme.palette.text.disabled,
}));

const CategoryText = styled(Typography)({
  width: 200,
  flexShrink: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'left',
});
