'use client';

//////////////////////////////////////// 이미지 카드 그리드 ////////////////////////////////////////

import styled from '@emotion/styled';
import type { ImageJob } from '../_store/backgroundRemovalStore';
import ImageJobCard from './ImageJobCard';

type ImageJobGridProps = {
  jobs: ImageJob[];
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
};

export default function ImageJobGrid({ jobs, onRemove, onOpen }: ImageJobGridProps) {
  return (
    <Grid>
      {jobs.map((job) => (
        <ImageJobCard key={job.id} job={job} onRemove={onRemove} onOpen={onOpen} />
      ))}
    </Grid>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const Grid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
  gap: theme.spacing(1.5),
}));
