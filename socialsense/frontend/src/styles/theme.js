import { createTheme, alpha } from '@mui/material/styles';

// Neumorphism Design System Colors
const neumorphColors = {
  background: '#E0E5EC',
  foreground: '#3D4852',
  muted: '#6B7280',
  accent: '#6C63FF',
  accentLight: '#8B84FF',
  accentSecondary: '#38B2AC',
  placeholder: '#A0AEC0',

  // Shadow colors (RGBA for smoothness)
  shadowLight: 'rgba(255, 255, 255, 0.5)',
  shadowLightStrong: 'rgba(255, 255, 255, 0.6)',
  shadowDark: 'rgb(163, 177, 198, 0.6)',
  shadowDarkStrong: 'rgb(163, 177, 198, 0.7)',
};

// Neumorphic shadow presets
export const neumorphShadows = {
  // Extruded (raised) states
  extruded: `9px 9px 16px ${neumorphColors.shadowDark}, -9px -9px 16px ${neumorphColors.shadowLight}`,
  extrudedHover: `12px 12px 20px ${neumorphColors.shadowDarkStrong}, -12px -12px 20px ${neumorphColors.shadowLightStrong}`,
  extrudedSmall: `5px 5px 10px ${neumorphColors.shadowDark}, -5px -5px 10px ${neumorphColors.shadowLight}`,

  // Inset (pressed) states
  inset: `inset 6px 6px 10px ${neumorphColors.shadowDark}, inset -6px -6px 10px ${neumorphColors.shadowLight}`,
  insetDeep: `inset 10px 10px 20px ${neumorphColors.shadowDarkStrong}, inset -10px -10px 20px ${neumorphColors.shadowLightStrong}`,
  insetSmall: `inset 3px 3px 6px ${neumorphColors.shadowDark}, inset -3px -3px 6px ${neumorphColors.shadowLight}`,
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: neumorphColors.accent,
      light: neumorphColors.accentLight,
      dark: '#5A52E0',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: neumorphColors.accentSecondary,
      light: '#4FD1C5',
      dark: '#2C9A8F',
      contrastText: '#FFFFFF',
    },
    background: {
      default: neumorphColors.background,
      paper: neumorphColors.background,
    },
    text: {
      primary: neumorphColors.foreground,
      secondary: neumorphColors.muted,
    },
    error: {
      main: '#E53E3E',
    },
    warning: {
      main: '#DD6B20',
    },
    success: {
      main: neumorphColors.accentSecondary,
    },
    info: {
      main: neumorphColors.accent,
    },
    divider: 'rgba(0, 0, 0, 0.05)',
  },

  typography: {
    fontFamily: '"DM Sans", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      color: neumorphColors.foreground,
    },
    h2: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: neumorphColors.foreground,
    },
    h3: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: neumorphColors.foreground,
    },
    h4: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 700,
      color: neumorphColors.foreground,
    },
    h5: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 600,
      color: neumorphColors.foreground,
    },
    h6: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 600,
      color: neumorphColors.foreground,
    },
    body1: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 400,
      color: neumorphColors.foreground,
    },
    body2: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 400,
      color: neumorphColors.muted,
    },
    button: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 500,
      textTransform: 'none',
    },
  },

  shape: {
    borderRadius: 16,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: neumorphColors.background,
          scrollBehavior: 'smooth',
        },
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          background: neumorphColors.background,
          boxShadow: neumorphShadows.insetSmall,
          borderRadius: '4px',
        },
        '*::-webkit-scrollbar-thumb': {
          background: neumorphColors.muted,
          borderRadius: '4px',
          '&:hover': {
            background: neumorphColors.foreground,
          },
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          padding: '12px 24px',
          fontSize: '0.95rem',
          fontWeight: 500,
          boxShadow: neumorphShadows.extrudedSmall,
          border: 'none',
          transition: 'all 300ms ease-out',
          '&:hover': {
            boxShadow: neumorphShadows.extruded,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            boxShadow: neumorphShadows.insetSmall,
            transform: 'translateY(0.5px)',
          },
        },
        contained: {
          background: neumorphColors.accent,
          color: '#FFFFFF',
          '&:hover': {
            background: neumorphColors.accentLight,
          },
        },
        outlined: {
          background: neumorphColors.background,
          color: neumorphColors.foreground,
          border: 'none',
          '&:hover': {
            background: neumorphColors.background,
            border: 'none',
          },
        },
        text: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
            background: alpha(neumorphColors.accent, 0.1),
          },
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          background: neumorphColors.background,
          borderRadius: 24,
          boxShadow: neumorphShadows.extruded,
          border: 'none',
          transition: 'all 300ms ease-out',
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          background: neumorphColors.background,
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: neumorphShadows.extrudedSmall,
        },
        elevation2: {
          boxShadow: neumorphShadows.extruded,
        },
        elevation3: {
          boxShadow: neumorphShadows.extrudedHover,
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: neumorphColors.background,
            borderRadius: 16,
            boxShadow: neumorphShadows.inset,
            transition: 'all 300ms ease-out',
            '& fieldset': {
              border: 'none',
            },
            '&:hover fieldset': {
              border: 'none',
            },
            '&.Mui-focused': {
              boxShadow: neumorphShadows.insetDeep,
              '& fieldset': {
                border: `2px solid ${neumorphColors.accent}`,
              },
            },
          },
          '& .MuiInputLabel-root': {
            color: neumorphColors.muted,
          },
          '& .MuiOutlinedInput-input': {
            color: neumorphColors.foreground,
            '&::placeholder': {
              color: neumorphColors.placeholder,
            },
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 500,
          border: 'none',
        },
        filled: {
          boxShadow: neumorphShadows.extrudedSmall,
          background: neumorphColors.background,
          color: neumorphColors.foreground,
        },
        outlined: {
          boxShadow: neumorphShadows.insetSmall,
          background: neumorphColors.background,
          border: 'none',
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          transition: 'all 300ms ease-out',
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: neumorphColors.background,
          border: 'none',
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          background: neumorphColors.background,
          boxShadow: neumorphShadows.extrudedSmall,
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: neumorphShadows.extrudedSmall,
          border: 'none',
        },
        standardError: {
          background: neumorphColors.background,
          color: '#E53E3E',
        },
        standardWarning: {
          background: neumorphColors.background,
          color: '#DD6B20',
        },
        standardInfo: {
          background: neumorphColors.background,
          color: neumorphColors.accent,
        },
        standardSuccess: {
          background: neumorphColors.background,
          color: neumorphColors.accentSecondary,
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 8,
          background: neumorphColors.background,
          boxShadow: neumorphShadows.insetSmall,
        },
        bar: {
          borderRadius: 8,
          background: `linear-gradient(90deg, ${neumorphColors.accent} 0%, ${neumorphColors.accentLight} 100%)`,
        },
      },
    },

    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: neumorphColors.accent,
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: 'none',
          color: neumorphColors.foreground,
        },
        head: {
          fontWeight: 600,
          color: neumorphColors.muted,
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            background: alpha(neumorphColors.accent, 0.05),
          },
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          color: neumorphColors.muted,
          '&.Mui-selected': {
            color: neumorphColors.accent,
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          background: neumorphColors.accent,
          borderRadius: 4,
        },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: neumorphShadows.extruded,
          marginTop: 8,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          '&:hover': {
            background: alpha(neumorphColors.accent, 0.1),
          },
        },
      },
    },

    MuiStepper: {
      styleOverrides: {
        root: {
          background: 'transparent',
        },
      },
    },

    MuiStepLabel: {
      styleOverrides: {
        label: {
          color: neumorphColors.muted,
          '&.Mui-active': {
            color: neumorphColors.accent,
            fontWeight: 600,
          },
          '&.Mui-completed': {
            color: neumorphColors.accentSecondary,
          },
        },
      },
    },

    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: neumorphColors.muted,
          '&.Mui-active': {
            color: neumorphColors.accent,
          },
          '&.Mui-completed': {
            color: neumorphColors.accentSecondary,
          },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },

    MuiFormControl: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: neumorphColors.background,
            borderRadius: 16,
            boxShadow: neumorphShadows.inset,
            '& fieldset': {
              border: 'none',
            },
            '&.Mui-focused fieldset': {
              border: `2px solid ${neumorphColors.accent}`,
            },
          },
        },
      },
    },
  },
});

export { neumorphColors };
export default theme;
