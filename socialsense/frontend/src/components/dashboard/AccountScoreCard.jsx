import React from 'react';
import { Box, Typography, Button, LinearProgress } from '@mui/material';
import { Star, EmojiEvents, TrendingUp, Warning } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { colors, shadows, gradients } from '../../styles/theme';

/**
 * Get score color based on value
 */
const getScoreColor = (score) => {
  if (score >= 75) return colors.success;
  if (score >= 60) return colors.primary;
  if (score >= 40) return colors.warning;
  return colors.error;
};

/**
 * Get score label based on value
 */
const getScoreLabel = (score) => {
  if (score >= 90) return 'Exceptional';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Work';
  if (score >= 20) return 'Poor';
  return 'Critical';
};

/**
 * Get score icon based on value
 */
const getScoreIcon = (score) => {
  if (score >= 75) return <EmojiEvents sx={{ fontSize: 48, color: '#FFD700' }} />;
  if (score >= 60) return <Star sx={{ fontSize: 48, color: colors.primary }} />;
  if (score >= 40) return <TrendingUp sx={{ fontSize: 48, color: colors.warning }} />;
  return <Warning sx={{ fontSize: 48, color: colors.error }} />;
};

/**
 * AccountScoreCard - Display user's account score on dashboard
 *
 * @param {number} score - Average score (0-100)
 * @param {number} videoCount - Number of scored videos
 * @param {boolean} hasScore - Whether user has any scored videos
 */
const AccountScoreCard = ({ score = null, videoCount = 0, hasScore = false }) => {
  const navigate = useNavigate();

  // Empty state - no scored videos yet
  if (!hasScore) {
    return (
      <Box
        sx={{
          background: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: '20px',
          boxShadow: shadows.card,
          p: 4,
          textAlign: 'center',
        }}
      >
        <Star sx={{ fontSize: 64, color: colors.textMuted, mb: 2 }} />
        <Typography variant="h5" fontWeight={700} sx={{ color: colors.textPrimary, mb: 1 }}>
          Your Account Score
        </Typography>
        <Typography variant="body1" sx={{ color: colors.textSecondary, mb: 3, maxWidth: 400, mx: 'auto' }}>
          Analyze your own videos to build your Account Score. Check "This is my video" during analysis to track your content performance over time.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/analyze/comments')}
          sx={{
            background: gradients.primary,
            px: 4,
            py: 1.5,
            borderRadius: '12px',
            boxShadow: shadows.sm,
          }}
        >
          Analyze Your First Video
        </Button>
      </Box>
    );
  }

  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  return (
    <Box
      sx={{
        background: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: '20px',
        boxShadow: shadows.card,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {/* Score Display */}
        <Box
          sx={{
            flex: '0 0 260px',
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${scoreColor}10 0%, ${scoreColor}05 100%)`,
            borderRight: { md: `1px solid ${colors.border}` },
            borderBottom: { xs: `1px solid ${colors.border}`, md: 'none' },
          }}
        >
          {getScoreIcon(score)}
          <Typography
            sx={{
              fontSize: '4rem',
              fontWeight: 800,
              color: scoreColor,
              lineHeight: 1,
              mt: 1,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {Math.round(score)}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: scoreColor,
              fontWeight: 600,
              mt: 0.5,
            }}
          >
            {scoreLabel}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: colors.textSecondary,
              mt: 1,
            }}
          >
            Based on {videoCount} video{videoCount !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {/* Score Details */}
        <Box sx={{ flex: 1, p: 4 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: colors.textPrimary, mb: 3 }}>
            Account Score
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                Overall Performance
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ color: scoreColor }}>
                {Math.round(score)}/100
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={score}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: `${scoreColor}20`,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: scoreColor,
                  borderRadius: 5,
                },
              }}
            />
          </Box>

          <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 3 }}>
            Your Account Score reflects the average quality and engagement of your content based on AI analysis of viewer comments. The AI uses harsh, expert-level evaluation to give you honest feedback.
          </Typography>

          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/analyze/comments')}
            sx={{
              borderRadius: '10px',
              borderColor: colors.border,
              color: colors.textPrimary,
              '&:hover': {
                borderColor: colors.primary,
                background: colors.surface,
              },
            }}
          >
            Analyze Another Video
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AccountScoreCard;
