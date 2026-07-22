'use client';

//////////////////////////////////////// 법적 문서 공통 레이아웃 ////////////////////////////////////////
// 이용약관·개인정보처리방침·환불 규정 3페이지 공용. 제목 + 시행일 + 조항 섹션 나열.

import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { LEGAL_EFFECTIVE_DATE } from '@/shared/constants/business';

export type LegalSection = {
  heading: string;
  paragraphs: string[]; // 문단 — 줄바꿈 유지
};

type LegalDocumentProps = {
  title: string;
  sections: LegalSection[];
};

export default function LegalDocument({ title, sections }: LegalDocumentProps) {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography component="h1" variant="h4">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            시행일: {LEGAL_EFFECTIVE_DATE}
          </Typography>
          <Divider />
        </Stack>

        {sections.map((section) => (
          <Stack key={section.heading} spacing={1}>
            <Typography component="h2" variant="h6">
              {section.heading}
            </Typography>
            {section.paragraphs.map((paragraph) => (
              <Typography key={paragraph.slice(0, 40)} variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                {paragraph}
              </Typography>
            ))}
          </Stack>
        ))}
      </Stack>
    </Container>
  );
}
