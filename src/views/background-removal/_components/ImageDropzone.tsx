'use client';

//////////////////////////////////////// 이미지 드롭존 ////////////////////////////////////////
// 드래그앤드롭 + 클릭 파일선택(다중)으로 이미지를 추가한다.

import { useRef, useState } from 'react';
import styled from '@emotion/styled';
import Typography from '@mui/material/Typography';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import {
  ACCEPT_ATTR,
  MAX_FILE_SIZE,
  MAX_FILE_COUNT,
  MAX_TOTAL_SIZE,
} from '../_constants/backgroundRemoval';

const MB = (bytes: number) => Math.round(bytes / (1024 * 1024));

type ImageDropzoneProps = {
  onFilesAdded: (files: File[] | FileList) => void;
  disabled?: boolean;
};

export default function ImageDropzone({ onFilesAdded, disabled = false }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false); // 순수 UI 상태

  ////////////////////// 드롭 처리 //////////////////////
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (event.dataTransfer.files.length > 0) {
      onFilesAdded(event.dataTransfer.files);
    }
  };

  ////////////////////// 파일 선택 //////////////////////
  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFilesAdded(event.target.files);
    }
    event.target.value = ''; // 같은 파일 재선택 허용
  };

  return (
    <DropArea
      $isDragging={isDragging}
      $disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <CloudUploadOutlinedIcon color="primary" sx={{ fontSize: 56 }} />
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        이미지를 드래그하거나 클릭해서 업로드
      </Typography>
      <Typography variant="body2" color="text.secondary">
        PNG · JPG · WEBP · 여러 장 동시 선택 가능
      </Typography>
      <Typography variant="body2" color="text.disabled">
        개별 {MB(MAX_FILE_SIZE)}MB · 최대 {MAX_FILE_COUNT}장 · 총 {MB(MAX_TOTAL_SIZE)}MB 까지
      </Typography>
      <HiddenInput
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        onChange={handleSelect}
        disabled={disabled}
      />
    </DropArea>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const DropArea = styled.div<{ $isDragging: boolean; $disabled: boolean }>(
  ({ theme, $isDragging, $disabled }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1.25),
    padding: theme.spacing(10, 5),
    border: `2px dashed ${$isDragging ? theme.palette.primary.main : theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: $isDragging ? theme.palette.action.hover : theme.palette.background.paper,
    cursor: $disabled ? 'not-allowed' : 'pointer',
    opacity: $disabled ? 0.6 : 1,
    transition: 'border-color 0.15s, background-color 0.15s',
  }),
);

const HiddenInput = styled.input({
  display: 'none',
});
