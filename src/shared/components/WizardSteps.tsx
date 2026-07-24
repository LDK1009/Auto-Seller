'use client';

//////////////////////////////////////// 위저드 스텝 인디케이터 (공통) ////////////////////////////////////////
// 하위 도구 페이지의 작업 단계 표시 — 원링크 번호 뱃지 디자인 언어(프라이머리 원형 뱃지)로 통일.
// 완료 = 체크(프라이머리 채움) / 현재 = 숫자(프라이머리 채움) / 이후 = 숫자(회색).

import styled from '@emotion/styled';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import { Fragment } from 'react';
import { transientOptions } from '@/shared/utils/emotionTransientProps';

export type WizardStepInfo = {
  title: string;
};

type WizardStepsProps = {
  steps: WizardStepInfo[];
  activeStep: number; // 0부터 — steps.length 이상이면 전부 완료로 표시
};

export default function WizardSteps({ steps, activeStep }: WizardStepsProps) {
  return (
    <Track>
      {steps.map((step, index) => {
        const state: StepState = index < activeStep ? 'done' : index === activeStep ? 'active' : 'todo';
        return (
          <Fragment key={step.title}>
            {index > 0 && <Connector $isDone={index <= activeStep} />}
            <StepItem>
              <StepBadge $state={state}>
                {state === 'done' ? <CheckIcon sx={{ fontSize: 14 }} /> : index + 1}
              </StepBadge>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: state === 'active' ? 700 : 400,
                  color: state === 'todo' ? 'text.secondary' : 'text.primary',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.title}
              </Typography>
            </StepItem>
          </Fragment>
        );
      })}
    </Track>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
type StepState = 'done' | 'active' | 'todo';

const Track = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(2, 2.5),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  overflowX: 'auto',
}));

const StepItem = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flexShrink: 0,
}));

const StepBadge = styled('span', transientOptions)<{ $state: StepState }>(({ theme, $state }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  flexShrink: 0,
  borderRadius: '50%',
  fontSize: 12,
  fontWeight: 700,
  backgroundColor:
    $state === 'todo' ? theme.palette.action.hover : $state === 'active' ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.12),
  color:
    $state === 'todo'
      ? theme.palette.text.secondary
      : $state === 'active'
        ? theme.palette.primary.contrastText
        : theme.palette.primary.main,
}));

const Connector = styled('div', transientOptions)<{ $isDone: boolean }>(({ theme, $isDone }) => ({
  flex: 1,
  minWidth: 16,
  height: 2,
  borderRadius: 1,
  backgroundColor: $isDone ? alpha(theme.palette.primary.main, 0.4) : theme.palette.divider,
}));
