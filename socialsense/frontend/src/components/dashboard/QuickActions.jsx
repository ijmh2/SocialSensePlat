import { Box, Typography } from '@mui/material';
import { Add, History, CreditCard } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { colors, shadows, gradients } from '../../styles/theme';

/**
 * QuickActions - Quick action buttons for the dashboard
 */
const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'New Analysis',
      description: 'Analyze a video',
      icon: <Add sx={{ fontSize: 24 }} />,
      path: '/analyze',
      primary: true,
    },
    {
      label: 'History',
      description: 'View past analyses',
      icon: <History sx={{ fontSize: 24 }} />,
      path: '/history',
      primary: false,
    },
    {
      label: 'Buy Tokens',
      description: 'Get more credits',
      icon: <CreditCard sx={{ fontSize: 24 }} />,
      path: '/tokens',
      primary: false,
    },
  ];

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {actions.map((action) => (
        <Box
          key={action.label}
          onClick={() => navigate(action.path)}
          sx={{
            flex: action.primary ? '1 1 auto' : '0 1 auto',
            minWidth: 140,
            background: action.primary ? gradients.primary : colors.background,
            border: action.primary ? 'none' : `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: action.primary ? shadows.md : shadows.card,
            cursor: 'pointer',
            transition: 'all 200ms ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: action.primary ? shadows.lg : shadows.cardHover,
            },
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              background: action.primary ? 'rgba(255,255,255,0.2)' : colors.primaryGlow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: action.primary ? '#FFFFFF' : colors.primary,
            }}
          >
            {action.icon}
          </Box>
          <Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: action.primary ? '#FFFFFF' : colors.textPrimary,
                fontSize: '0.95rem',
              }}
            >
              {action.label}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: action.primary ? 'rgba(255,255,255,0.8)' : colors.textMuted,
                fontSize: '0.8rem',
              }}
            >
              {action.description}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default QuickActions;
