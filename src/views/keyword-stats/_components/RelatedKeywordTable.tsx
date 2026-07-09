//////////////////////////////////////// 연관 키워드 표 (체크 = 비교 후보, 클릭 = 재검색) ////////////////////////////////////////
// 검색수는 연관 풀에서, 상품 수는 keyword-competition 일괄 조회로 늦게 채워진다 (경쟁강도 = 계산값).

import styled from '@emotion/styled';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import ButtonBase from '@mui/material/ButtonBase';
import Tooltip from '@mui/material/Tooltip';
import type { RelatedKeyword } from '@/shared/types/keywordStats';
import { judgeCompetition } from '../_utils/judgeCompetition';

export const MAX_COMPARE_CHECKS = 4; // 현재 키워드 포함 5개 = 데이터랩 단일 요청 그룹 상한

type PropsType = {
  related: RelatedKeyword[];
  productCounts: Map<string, number | null>; // 일괄 조회 결과 (없으면 로딩 중)
  isCountsLoaded: boolean;
  checkedKeywords: Set<string>;
  onToggleCheck: (keyword: string) => void;
  onSelectKeyword: (keyword: string) => void; // 키워드 클릭 → 해당 키워드로 재검색
};

export default function RelatedKeywordTable({
  related,
  productCounts,
  isCountsLoaded,
  checkedKeywords,
  onToggleCheck,
  onSelectKeyword,
}: PropsType) {
  const isCheckLimitReached = checkedKeywords.size >= MAX_COMPARE_CHECKS;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="subtitle2">연관 키워드 {related.length}개</Typography>
        <Typography variant="caption" color="text.secondary">
          최대 {MAX_COMPARE_CHECKS}개 체크 후 비교 · 키워드 클릭 시 재검색
        </Typography>
      </Stack>
      <ListBox>
        {/* 헤더를 스크롤 박스 안(sticky)에 둬야 스크롤바 폭만큼 행과 어긋나지 않음 */}
        <HeaderRow>
          <CheckCell />
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: 'center' }}>키워드</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ width: 100, textAlign: 'center' }}>월간 검색수</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ width: 100, textAlign: 'center' }}>상품 수</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ width: 80, textAlign: 'center' }}>경쟁강도</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ width: 76, textAlign: 'center' }}>판정</Typography>
        </HeaderRow>
        {related.map((entry) => {
          const isChecked = checkedKeywords.has(entry.keyword);
          const productCount = productCounts.get(entry.keyword) ?? null;
          const ratio =
            productCount !== null && entry.monthlySearches > 0
              ? Math.round((productCount / entry.monthlySearches) * 100) / 100
              : null;
          const verdict = judgeCompetition(ratio);
          const isCheckDisabled = !isChecked && isCheckLimitReached;
          return (
            <Row key={entry.keyword}>
              <CheckCell>
                <Tooltip title={isCheckDisabled ? `비교는 최대 ${MAX_COMPARE_CHECKS}개까지 선택할 수 있어요` : ''}>
                  <span>
                    <Checkbox
                      size="small"
                      checked={isChecked}
                      disabled={isCheckDisabled}
                      onChange={() => onToggleCheck(entry.keyword)}
                    />
                  </span>
                </Tooltip>
              </CheckCell>
              <KeywordButton onClick={() => onSelectKeyword(entry.keyword)}>
                <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all', textAlign: 'left' }}>
                  {entry.keyword}
                </Typography>
              </KeywordButton>
              <Typography variant="body2" sx={{ width: 100, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {entry.isLowVolume ? '10 미만' : entry.monthlySearches.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ width: 100, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {productCount !== null ? productCount.toLocaleString() : isCountsLoaded ? '—' : '…'}
              </Typography>
              <Typography variant="body2" sx={{ width: 80, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {ratio !== null ? ratio : isCountsLoaded ? '—' : '…'}
              </Typography>
              <ChipCell>
                <Chip
                  size="small"
                  label={verdict.label}
                  color={verdict.color}
                  variant={verdict.color === 'default' ? 'outlined' : 'filled'}
                />
              </ChipCell>
            </Row>
          );
        })}
      </ListBox>
      <Typography variant="caption" color="text.secondary">
        검색량 높은 순이에요. 경쟁강도가 1 미만이면 틈새 키워드예요.
      </Typography>
    </Stack>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const HeaderRow = styled.div(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(0.75, 1.5),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const ListBox = styled.div(({ theme }) => ({
  maxHeight: 420,
  overflowY: 'auto',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const Row = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(0.25, 1.5),
  '&:not(:last-of-type)': {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

const CheckCell = styled.div({
  width: 38,
  display: 'flex',
  justifyContent: 'center',
  flexShrink: 0,
});

const KeywordButton = styled(ButtonBase)(({ theme }) => ({
  flex: 1,
  justifyContent: 'flex-start',
  minWidth: 0,
  padding: theme.spacing(0.75, 0.5),
  borderRadius: theme.shape.borderRadius,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const ChipCell = styled.div({
  width: 76,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});
