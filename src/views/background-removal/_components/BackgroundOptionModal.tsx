'use client';

//////////////////////////////////////// 배경 선택 모달 ////////////////////////////////////////
// 완료된 이미지의 배경 옵션(투명/흰색/커스텀)을 선택하는 모달.
// 옵션 변경 시 완료 이미지들이 즉시 재합성된다(훅의 changeBackgroundOption).

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import type { BackgroundOption } from '../_constants/backgroundRemoval';
import BackgroundOptionSelector from './BackgroundOptionSelector';

type BackgroundOptionModalProps = {
  open: boolean;
  value: BackgroundOption;
  customColor: string;
  onChange: (option: BackgroundOption) => void;
  onCustomColorChange: (hex: string) => void;
  onClose: () => void;
};

export default function BackgroundOptionModal({
  open,
  value,
  customColor,
  onChange,
  onCustomColorChange,
  onClose,
}: BackgroundOptionModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>배경 선택</DialogTitle>
      <DialogContent>
        <BackgroundOptionSelector
          value={value}
          customColor={customColor}
          onChange={onChange}
          onCustomColorChange={onCustomColorChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>확인</Button>
      </DialogActions>
    </Dialog>
  );
}
