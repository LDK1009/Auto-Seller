//////////////////////////////////////// MUI 중앙 테마 ////////////////////////////////////////
// 디자인 토큰(색상·타이포·간격·모양)을 이 파일에서 중앙 관리한다.
// 컴포넌트에서 sx/인라인으로 값을 하드코딩하지 말고 테마 토큰을 사용할 것.

import { createTheme } from '@mui/material/styles';

//////////////////// 색상 팔레트 ////////////////////
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#03C75A', // 네이버 그린
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1E88E5',
    },
    background: {
      default: '#F7F8FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#5F6368',
    },
  },

  //////////////////// 타이포그래피 ////////////////////
  typography: {
    fontFamily: [
      'Pretendard',
      '-apple-system',
      'BlinkMacSystemFont',
      'system-ui',
      'Roboto',
      '"Apple SD Gothic Neo"',
      '"Noto Sans KR"',
      '"Helvetica Neue"',
      'sans-serif',
    ].join(','),
  },

  //////////////////// 모양 ////////////////////
  shape: {
    borderRadius: 10,
  },

  //////////////////// 컴포넌트 기본값 override ////////////////////
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export default theme;
