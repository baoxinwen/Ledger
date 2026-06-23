// MUI 主题集中定义应用色彩、字体和组件默认视觉风格。
import { createTheme } from '@mui/material/styles';

// Neo-Brutalist × Financial Times aesthetic
// Deep ink backgrounds, gold accents, editorial typography

const commonTypography = {
  fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
  h1: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontWeight: 700,
    letterSpacing: 0,
  },
  h2: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontWeight: 700,
    letterSpacing: 0,
  },
  h3: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontWeight: 700,
    letterSpacing: 0,
  },
  h4: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontWeight: 600,
    letterSpacing: 0,
  },
  h5: {
    fontFamily: '"DM Sans", sans-serif',
    fontWeight: 600,
    letterSpacing: '0.01em',
  },
  h6: {
    fontFamily: '"DM Sans", sans-serif',
    fontWeight: 600,
    letterSpacing: '0.01em',
  },
  subtitle1: {
    fontWeight: 500,
    letterSpacing: '0.005em',
  },
  subtitle2: {
    fontWeight: 500,
    letterSpacing: '0.01em',
    fontSize: '0.8rem',
  },
  body1: {
    fontSize: '0.9rem',
    lineHeight: 1.7,
    letterSpacing: '0.01em',
  },
  body2: {
    fontSize: '0.8rem',
    lineHeight: 1.6,
    letterSpacing: '0.02em',
  },
  caption: {
    fontSize: '0.7rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  button: {
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'none',
  },
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a1a2e', // Deep ink
      light: '#16213e',
      dark: '#0f0f1a',
    },
    secondary: {
      main: '#c9a84c', // Antique gold
      light: '#d4b96e',
      dark: '#b8952e',
    },
    success: {
      main: '#2d6a4f',
      light: '#40916c',
    },
    error: {
      main: '#9b2226',
      light: '#ae3a3e',
    },
    warning: {
      main: '#ca6702',
    },
    background: {
      default: '#faf9f7', // Warm paper
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a2e',
      secondary: '#6b7280',
    },
    divider: '#e5e2db',
    action: {
      hover: '#f5f3ef',
      selected: '#ede9e3',
    },
  },
  typography: commonTypography,
  shape: {
    borderRadius: 2, // Sharp, brutalist edges
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@global': {
          // Fonts loaded via <link> in index.html for reliable loading
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid #e5e2db',
          borderRadius: 2,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: '#c9a84c',
            boxShadow: '0 4px 24px rgba(201, 168, 76, 0.08)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          minHeight: 40,
          padding: '9px 20px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
          '&.MuiButton-contained': {
            backgroundColor: '#1a1a2e',
            color: '#faf9f7',
            '&:hover': {
              backgroundColor: '#16213e',
            },
          },
          '&.MuiButton-outlined': {
            borderColor: '#1a1a2e',
            color: '#1a1a2e',
            '&:hover': {
              backgroundColor: '#1a1a2e',
              color: '#faf9f7',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          '&:focus-visible': {
            outline: '2px solid #c9a84c',
            outlineOffset: 2,
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          border: '1px solid #e5e2db',
          borderRadius: 2,
          overflow: 'hidden',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          minHeight: 38,
          border: 0,
          borderRadius: 0,
          padding: '8px 14px',
          color: '#6b7280',
          fontWeight: 600,
          '&.Mui-selected': {
            backgroundColor: '#1a1a2e',
            color: '#faf9f7',
            '&:hover': {
              backgroundColor: '#16213e',
            },
          },
          '&:focus-visible': {
            outline: '2px solid #c9a84c',
            outlineOffset: -2,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #e5e2db',
          padding: '16px',
          fontFamily: '"DM Sans", sans-serif',
        },
        head: {
          fontWeight: 700,
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#6b7280',
          borderBottom: '2px solid #1a1a2e',
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
          backgroundColor: '#e5e2db',
          '& .MuiLinearProgress-bar': {
            borderRadius: 0,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 2,
          border: '1px solid #e5e2db',
          boxShadow: '0 24px 48px rgba(26, 26, 46, 0.12)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: '"Playfair Display", Georgia, serif',
          fontWeight: 700,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          border: '1px solid #e5e2db',
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '& fieldset': {
              borderColor: '#e5e2db',
            },
            '&:hover fieldset': {
              borderColor: '#c9a84c',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1a1a2e',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          letterSpacing: '0.04em',
          '&.Mui-selected': {
            color: '#1a1a2e',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#c9a84c',
          height: 2,
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#faf9f7', // Warm white
      light: '#ffffff',
      dark: '#e5e2db',
    },
    secondary: {
      main: '#c9a84c', // Antique gold
      light: '#d4b96e',
      dark: '#b8952e',
    },
    success: {
      main: '#40916c',
      light: '#52b788',
    },
    error: {
      main: '#e5383b',
      light: '#ef4444',
    },
    warning: {
      main: '#f4a261',
    },
    background: {
      default: '#0a0a0f', // Deep space
      paper: '#12121a', // Slightly lighter
    },
    text: {
      primary: '#faf9f7',
      secondary: '#9ca3af',
    },
    divider: '#1f1f2e',
    action: {
      hover: '#1f1f2e',
      selected: '#2a2a3e',
    },
  },
  typography: commonTypography,
  shape: {
    borderRadius: 2,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@global': {
          // Fonts loaded via <link> in index.html for reliable loading
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid #1f1f2e',
          borderRadius: 2,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: '#c9a84c',
            boxShadow: '0 4px 24px rgba(201, 168, 76, 0.05)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          minHeight: 40,
          padding: '9px 20px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
          '&.MuiButton-contained': {
            backgroundColor: '#c9a84c',
            color: '#0a0a0f',
            '&:hover': {
              backgroundColor: '#d4b96e',
            },
          },
          '&.MuiButton-outlined': {
            borderColor: '#c9a84c',
            color: '#c9a84c',
            '&:hover': {
              backgroundColor: '#c9a84c',
              color: '#0a0a0f',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          '&:focus-visible': {
            outline: '2px solid #c9a84c',
            outlineOffset: 2,
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          border: '1px solid #1f1f2e',
          borderRadius: 2,
          overflow: 'hidden',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          minHeight: 38,
          border: 0,
          borderRadius: 0,
          padding: '8px 14px',
          color: '#9ca3af',
          fontWeight: 600,
          '&.Mui-selected': {
            backgroundColor: '#c9a84c',
            color: '#0a0a0f',
            '&:hover': {
              backgroundColor: '#d4b96e',
            },
          },
          '&:focus-visible': {
            outline: '2px solid #c9a84c',
            outlineOffset: -2,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#12121a',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #1f1f2e',
          padding: '16px',
          fontFamily: '"DM Sans", sans-serif',
        },
        head: {
          fontWeight: 700,
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#9ca3af',
          borderBottom: '2px solid #c9a84c',
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
          backgroundColor: '#1f1f2e',
          '& .MuiLinearProgress-bar': {
            borderRadius: 0,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 2,
          border: '1px solid #1f1f2e',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
          backgroundImage: 'none',
          backgroundColor: '#12121a',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: '"Playfair Display", Georgia, serif',
          fontWeight: 700,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          border: '1px solid #1f1f2e',
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '& fieldset': {
              borderColor: '#1f1f2e',
            },
            '&:hover fieldset': {
              borderColor: '#c9a84c',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#c9a84c',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          letterSpacing: '0.04em',
          '&.Mui-selected': {
            color: '#c9a84c',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#c9a84c',
          height: 2,
        },
      },
    },
  },
});
