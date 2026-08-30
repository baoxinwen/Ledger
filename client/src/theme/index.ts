// MUI 主题：从 theme/tokens.ts 的设计 token 生成 light/dark 两套主题。
// 组件内需要 token 时用 getTokens(theme.palette.mode)，不再各自硬编码。
import { createTheme } from '@mui/material/styles';
import {
  darkTokens,
  EASE_OUT,
  FONT_SANS,
  FONT_SERIF,
  lightTokens,
  NUMERIC_TEXT,
  type PaletteTokens,
} from './tokens';

export * from './tokens';

export type ThemeMode = 'light' | 'dark';

// 自定义 palette 槽位：卡片内嵌套面板底色。
declare module '@mui/material/styles' {
  interface Palette {
    subcard: string;
    /** 吸顶栏半透明底色（移动端顶栏毛玻璃） */
    overlayBar: string;
  }
  interface PaletteOptions {
    subcard?: string;
    overlayBar?: string;
  }
}

export function getTokens(mode: ThemeMode): PaletteTokens {
  return mode === 'dark' ? darkTokens : lightTokens;
}

const commonTypography = {
  fontFamily: FONT_SANS,
  h1: { fontFamily: FONT_SERIF, fontWeight: 700, letterSpacing: 0 },
  h2: { fontFamily: FONT_SERIF, fontWeight: 700, letterSpacing: 0 },
  h3: { fontFamily: FONT_SERIF, fontWeight: 700, letterSpacing: 0 },
  h4: { fontFamily: FONT_SERIF, fontWeight: 600, letterSpacing: 0 },
  h5: { fontFamily: FONT_SANS, fontWeight: 600, letterSpacing: '0.01em' },
  h6: { fontFamily: FONT_SANS, fontWeight: 600, letterSpacing: '0.01em' },
  subtitle1: { fontWeight: 500, letterSpacing: '0.005em' },
  subtitle2: { fontWeight: 500, letterSpacing: '0.01em', fontSize: '0.8rem' },
  body1: { fontSize: '0.9rem', lineHeight: 1.7, letterSpacing: '0.01em' },
  body2: { fontSize: '0.8rem', lineHeight: 1.6, letterSpacing: '0.02em' },
  caption: {
    fontSize: '0.7rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  button: { fontWeight: 600, letterSpacing: '0.04em', textTransform: 'none' },
};

function buildComponents(t: PaletteTokens) {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        '@global': {
          // 字体经 index.html <link> 加载（Playfair Display + DM Sans）。
          // 行内悬浮操作：显隐规则必须由宿主的祖先级选择器驱动（子组件 sx 内
          // 无法表达"根据祖先 hover 修改自身"），所以集中定义在全局。
          '.hover-actions': {
            opacity: 0,
            transition: 'opacity 150ms cubic-bezier(0.23, 1, 0.32, 1)',
            '& .MuiIconButton-root': { p: 0.75 },
          },
          '.hover-actions:focus-within': { opacity: 1 },
          '@media (hover: hover)': {
            '.hover-actions-host:hover .hover-actions, .hover-actions-host:focus-within .hover-actions': {
              opacity: 1,
            },
          },
          // 触屏无 hover，操作常显，避免无法触达
          '@media (hover: none)': {
            '.hover-actions': { opacity: 1 },
          },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            transition: 'none !important',
            animation: 'none !important',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: `1px solid ${t.divider}`,
          borderRadius: 2,
          transition: `border-color 200ms ${EASE_OUT}, box-shadow 200ms ${EASE_OUT}`,
          '&:hover': {
            borderColor: t.gold,
            boxShadow: t.shadowCard,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        sizeSmall: { minHeight: 32, padding: '5px 12px', fontSize: '0.75rem' },
        root: {
          borderRadius: 2,
          minHeight: 40,
          padding: '9px 20px',
          fontWeight: 600,
          boxShadow: 'none',
          transition: `transform 160ms ${EASE_OUT}`,
          '&:active': { transform: 'scale(0.97)' },
          '&:hover': { boxShadow: 'none' },
          '&.MuiButton-contained': {
            backgroundColor: t.ink,
            color: t.page,
            '&:hover': { backgroundColor: t.inkHover },
          },
          '&.MuiButton-outlined': {
            borderColor: t.ink,
            color: t.ink,
            '&:hover': { backgroundColor: t.ink, color: t.page },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          transition: `transform 160ms ${EASE_OUT}`,
          '&:active': { transform: 'scale(0.94)' },
          '&:focus-visible': { outline: `2px solid ${t.gold}`, outlineOffset: 2 },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { border: `1px solid ${t.divider}`, borderRadius: 2, overflow: 'hidden' },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          minHeight: 38,
          border: 0,
          borderRadius: 0,
          padding: '8px 14px',
          color: t.textSecondary,
          fontWeight: 600,
          '&.Mui-selected': {
            backgroundColor: t.ink,
            color: t.page,
            '&:hover': { backgroundColor: t.inkHover },
          },
          '&:focus-visible': { outline: `2px solid ${t.gold}`, outlineOffset: -2 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', backgroundColor: t.paper },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${t.divider}`,
          padding: '16px',
          fontFamily: FONT_SANS,
        },
        head: {
          fontWeight: 700,
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: t.textSecondary,
          borderBottom: `2px solid ${t.ink === '#faf9f7' ? t.gold : t.ink}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 1,
          fontWeight: 500,
          fontSize: '0.7rem',
          letterSpacing: '0.04em',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          backgroundColor: t.divider,
          '& .MuiLinearProgress-bar': { borderRadius: 0 },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 2,
          border: `1px solid ${t.divider}`,
          boxShadow: t.shadowDialog,
          backgroundImage: 'none',
          backgroundColor: t.paper,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontFamily: FONT_SERIF, fontWeight: 700 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          border: `1px solid ${t.divider}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '& fieldset': { borderColor: t.divider },
            '&:hover fieldset': { borderColor: t.gold },
            '&.Mui-focused fieldset': { borderColor: t.gold, borderWidth: 2 },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          letterSpacing: '0.04em',
          '&.Mui-selected': { color: t.gold },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: t.gold, height: 2 },
      },
    },
    // 金额/数字单元格统一等宽数字。
    MuiTableBody: {
      styleOverrides: {
        root: { ...NUMERIC_TEXT },
      },
    },
  };
}

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: lightTokens.ink, light: lightTokens.inkHover, dark: '#0f0f1a' },
    secondary: {
      main: lightTokens.gold,
      light: lightTokens.goldLight,
      dark: lightTokens.goldDark,
    },
    success: { main: lightTokens.income, light: '#40916c' },
    error: { main: lightTokens.expense, light: '#ae3a3e' },
    warning: { main: lightTokens.warning },
    background: { default: lightTokens.page, paper: lightTokens.paper },
    subcard: lightTokens.subcard,
    overlayBar: lightTokens.overlayBar,
    text: { primary: lightTokens.text, secondary: lightTokens.textSecondary },
    divider: lightTokens.divider,
    action: { hover: lightTokens.hover, selected: lightTokens.selected },
  },
  typography: commonTypography,
  shape: { borderRadius: 2 },
  components: buildComponents(lightTokens),
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: darkTokens.ink, light: '#ffffff', dark: darkTokens.inkHover },
    secondary: {
      main: darkTokens.gold,
      light: darkTokens.goldLight,
      dark: darkTokens.goldDark,
    },
    success: { main: darkTokens.income, light: '#52b788' },
    error: { main: darkTokens.expense, light: '#ef4444' },
    warning: { main: darkTokens.warning },
    background: { default: darkTokens.page, paper: darkTokens.paper },
    subcard: darkTokens.subcard,
    overlayBar: darkTokens.overlayBar,
    text: { primary: darkTokens.text, secondary: darkTokens.textSecondary },
    divider: darkTokens.divider,
    action: { hover: darkTokens.hover, selected: darkTokens.selected },
  },
  typography: commonTypography,
  shape: { borderRadius: 2 },
  components: buildComponents(darkTokens),
});
