//////////////////////////////////////// Emotion 테마 타입 연결 ////////////////////////////////////////
// @emotion/styled의 theme을 MUI Theme으로 타이핑한다.
// (MUI ThemeProvider가 런타임에 emotion 컨텍스트로 테마를 주입하므로 타입만 맞춰준다.)

import type { Theme as MuiTheme } from '@mui/material/styles';

declare module '@emotion/react' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Theme extends MuiTheme {}
}
