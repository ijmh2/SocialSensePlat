import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Forum,
  Psychology,
  ShoppingCart,
  Warning,
} from '@mui/icons-material';

const ScoreBreakdown = ({ breakdown, totalScore }) => {
  const theme = useTheme();

  if (!breakdown) return null;

  const categories = [
    {
      key: 'engagement',
      label: 'Engagement Quality',
      icon: Forum,
      color: theme.palette.primary.main,
      description: 'How substantive and meaningful are the comments?',
    },
    {
      key: 'contentFit',
      label: 'Content-Audience Fit',
      icon: Psychology,
      color: theme.palette.secondary.main,
      description: 'Do viewers understand and resonate with the content?',
    },
    {
      key: 'conversion',
      label: 'Conversion Signals',
      icon: ShoppingCart,
      color: theme.palette.success.main,
      description: 'Purchase intent, action-taking, application questions',
    },
    {
      key: 'redFlags',
      label: 'Red Flags',
      icon: Warning,
      color: theme.palette.error.main,
      description: 'Complaints, negativity, disappointment',
      isNegative: true,
    },
  ];

  const getPercentage = (score, max) => Math.min(100, (score / max) * 100);

  return (
    <Card
      sx={{
        mb: 3,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        borderRadius: '16px',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Score Breakdown
          </Typography>
          <Box
            sx={{
              px: 2,
              py: 0.5,
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            }}
          >
            <Typography variant="h6" fontWeight={700} color="white">
              {totalScore}/100
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {categories.map(({ key, label, icon: Icon, color, description, isNegative }) => {
            const data = breakdown[key];
            if (!data) return null;

            const percentage = getPercentage(data.score, data.max);

            return (
              <Box key={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Tooltip title={description} arrow placement="top">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'help' }}>
                      <Icon sx={{ fontSize: 18, color }} />
                      <Typography variant="body2" fontWeight={600}>
                        {label}
                      </Typography>
                    </Box>
                  </Tooltip>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ color: isNegative ? theme.palette.error.main : color }}
                  >
                    {isNegative ? `-${data.score}` : data.score}/{data.max}
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: alpha(color, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      backgroundColor: color,
                    },
                  }}
                />

                {data.reason && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5, display: 'block' }}
                  >
                    {data.reason}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>

        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: '12px',
            background: alpha(theme.palette.info.main, 0.05),
            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            <strong>How it's calculated:</strong> Engagement (40%) + Content Fit (30%) + Conversion (20%) - Red Flags (up to 10%)
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ScoreBreakdown;
