import { createTheme, alpha } from '@mui/material/styles';

// Clean Blue & White Design System
const colors = {
  // Base Light Palette
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceHover: '#F1F5F9',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  // Blue Accent Colors
  primary: '#1E40AF',
  primaryHover: '#1E3A8A',
  primaryLight: '#3B82F6',
  primaryGlow: 'rgba(30, 64, 175, 0.1)',

  // Secondary Accent (Teal)
  secondary: '#38B2AC',
  secondaryLight: '#4FD1C5',
  secondaryDark: '#2C7A7B',

  // Status Colors
  success: '#16A34A',
  error: '#DC2626',
  warning: '#D97706',
  info: '#0EA5E9',
};

// Soft shadow presets (not neumorphic)
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  card: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
  cardHover: '0 4px 12px -2px rgba(0, 0, 0, 0.12), 0 2px 6px -2px rgba(0, 0, 0, 0.08)',
  button: '0 1px 2px 0 rgba(30, 64, 175, 0.15)',
  buttonHover: '0 4px 8px -2px rgba(30, 64, 175, 0.25)',
};

// Gradient presets
export const gradients = {
  primary: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
  primarySubtle: 'linear-gradient(135deg, rgba(30, 64, 175, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
  success: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      light: colors.primaryLight,
      dark: colors.primaryHover,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: colors.textSecondary,
      light: colors.textMuted,
      dark: colors.textPrimary,
      contrastText: '#FFFFFF',
    },
    background: {
      default: colors.background,
      paper: colors.surface,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
    error: {
      main: colors.error,
    },
    warning: {
      main: colors.warning,
    },
    success: {
      main: colors.success,
    },
    info: {
      main: colors.info,
    },
    divider: colors.border,
  },

  typography: {
    fontFamily: '"DM Sans", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      color: colors.textPrimary,
    },
    h2: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: colors.textPrimary,
    },
    h3: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: colors.textPrimary,
    },
    h4: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 700,
      color: colors.textPrimary,
    },
    h5: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 600,
      color: colors.textPrimary,
    },
    h6: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 600,
      color: colors.textPrimary,
    },
    body1: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 400,
      color: colors.textPrimary,
    },
    body2: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 400,
      color: colors.textSecondary,
    },
    button: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 500,
      textTransform: 'none',
    },
  },

  shape: {
    borderRadius: 12,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.background,
          scrollBehavior: 'smooth',
        },
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          background: colors.surface,
          borderRadius: '4px',
        },
        '*::-webkit-scrollbar-thumb': {
          background: colors.border,
          borderRadius: '4px',
          '&:hover': {
            background: colors.textMuted,
          },
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 20px',
          fontSize: '0.9rem',
          fontWeight: 500,
          boxShadow: 'none',
          transition: 'all 200ms ease-out',
          '&:hover': {
            boxShadow: shadows.button,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          background: gradients.primary,
          color: '#FFFFFF',
          '&:hover': {
            background: gradients.primary,
            boxShadow: shadows.buttonHover,
          },
        },
        outlined: {
          background: colors.background,
          color: colors.primary,
          borderColor: colors.border,
          '&:hover': {
            background: colors.surface,
            borderColor: colors.primary,
          },
        },
        text: {
          color: colors.primary,
          '&:hover': {
            background: colors.primaryGlow,
          },
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          background: colors.background,
          borderRadius: 16,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.card,
          transition: 'all 200ms ease-out',
          '&:hover': {
            boxShadow: shadows.cardHover,
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          background: colors.background,
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: shadows.sm,
          border: `1px solid ${colors.border}`,
        },
        elevation2: {
          boxShadow: shadows.base,
          border: `1px solid ${colors.border}`,
        },
        elevation3: {
          boxShadow: shadows.md,
          border: `1px solid ${colors.border}`,
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: colors.background,
            borderRadius: 10,
            transition: 'all 200ms ease-out',
            '& fieldset': {
              borderColor: colors.border,
            },
            '&:hover fieldset': {
              borderColor: colors.textMuted,
            },
            '&.Mui-focused': {
              '& fieldset': {
                borderColor: colors.primary,
                borderWidth: 2,
              },
            },
          },
          '& .MuiInputLabel-root': {
            color: colors.textMuted,
          },
          '& .MuiOutlinedInput-input': {
            color: colors.textPrimary,
            '&::placeholder': {
              color: colors.textMuted,
            },
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
        filled: {
          background: colors.surface,
          color: colors.textPrimary,
          border: `1px solid ${colors.border}`,
        },
        outlined: {
          background: colors.background,
          borderColor: colors.border,
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'all 200ms ease-out',
          '&:hover': {
            background: colors.primaryGlow,
          },
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: colors.background,
          borderRight: `1px solid ${colors.border}`,
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          background: colors.background,
          boxShadow: shadows.sm,
          borderBottom: `1px solid ${colors.border}`,
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: '1px solid',
        },
        standardError: {
          background: '#FEF2F2',
          borderColor: '#FECACA',
          color: colors.error,
        },
        standardWarning: {
          background: '#FFFBEB',
          borderColor: '#FDE68A',
          color: colors.warning,
        },
        standardInfo: {
          background: '#EFF6FF',
          borderColor: '#BFDBFE',
          color: colors.primary,
        },
        standardSuccess: {
          background: '#F0FDF4',
          borderColor: '#BBF7D0',
          color: colors.success,
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 6,
          background: colors.surface,
        },
        bar: {
          borderRadius: 8,
          background: gradients.primary,
        },
      },
    },

    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: colors.primary,
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${colors.border}`,
          color: colors.textPrimary,
          padding: '16px',
        },
        head: {
          fontWeight: 600,
          color: colors.textSecondary,
          background: colors.surface,
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            background: colors.surface,
          },
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          color: colors.textSecondary,
          '&.Mui-selected': {
            color: colors.primary,
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          background: colors.primary,
          borderRadius: 2,
          height: 3,
        },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.lg,
          marginTop: 8,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: '4px 8px',
          '&:hover': {
            background: colors.surface,
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
          color: colors.textMuted,
          '&.Mui-active': {
            color: colors.primary,
            fontWeight: 600,
          },
          '&.Mui-completed': {
            color: colors.success,
          },
        },
      },
    },

    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: colors.border,
          '&.Mui-active': {
            color: colors.primary,
          },
          '&.Mui-completed': {
            color: colors.success,
          },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },

    MuiFormControl: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: colors.background,
            borderRadius: 10,
            '& fieldset': {
              borderColor: colors.border,
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary,
            },
          },
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: colors.border,
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: colors.textPrimary,
          borderRadius: 8,
          fontSize: '0.8rem',
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: colors.primary,
            '& + .MuiSwitch-track': {
              backgroundColor: colors.primaryLight,
            },
          },
        },
      },
    },
  },
});

// Export colors for use in components
export { colors };

// Legacy export for backwards compatibility
export const neumorphColors = colors;
export const neumorphShadows = shadows;

export default theme;
