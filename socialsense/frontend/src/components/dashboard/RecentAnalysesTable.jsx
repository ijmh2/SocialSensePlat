import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { YouTube, ChevronRight, CheckCircle, Error as ErrorIcon, Schedule } from '@mui/icons-material';
import TikTokIcon from '../icons/TikTokIcon';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { colors, shadows } from '../../styles/theme';

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
 * RecentAnalysesTable - Display recent analyses in a clean table format
 *
 * @param {Array} analyses - Array of analysis objects
 * @param {function} [onViewAll] - Optional callback for "View All" button
 */
const RecentAnalysesTable = ({ analyses = [], onViewAll }) => {
  const navigate = useNavigate();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ fontSize: 16, color: colors.success }} />;
      case 'failed':
        return <ErrorIcon sx={{ fontSize: 16, color: colors.error }} />;
      case 'processing':
        return <Schedule sx={{ fontSize: 16, color: colors.warning }} />;
      default:
        return <Schedule sx={{ fontSize: 16, color: colors.textMuted }} />;
    }
  };

  const getPlatformIcon = (platform) => {
    if (platform === 'youtube') {
      return <YouTube sx={{ fontSize: 18, color: '#FF0000' }} />;
    }
    return <TikTokIcon sx={{ fontSize: 18, color: '#000000' }} />;
  };

  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const handleRowClick = (analysis) => {
    if (analysis.status === 'completed') {
      navigate(`/analysis/${analysis.id}`);
    }
  };

  return (
    <Box
      sx={{
        background: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: shadows.card,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: '1rem',
            fontWeight: 600,
            color: colors.textPrimary,
          }}
        >
          Recent Analyses
        </Typography>
        {onViewAll && (
          <Typography
            onClick={onViewAll}
            sx={{
              fontSize: '0.85rem',
              fontWeight: 500,
              color: colors.primary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            View All
            <ChevronRight sx={{ fontSize: 18 }} />
          </Typography>
        )}
      </Box>

      {/* Table Body */}
      {analyses.length === 0 ? (
        <Box sx={{ padding: '40px 20px', textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: colors.textMuted }}>
            No analyses yet. Start by analyzing your first video!
          </Typography>
        </Box>
      ) : (
        <Box>
          {analyses.slice(0, 5).map((analysis, index) => (
            <Box
              key={analysis.id}
              onClick={() => handleRowClick(analysis)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px 20px',
                gap: 2,
                borderBottom: index < analyses.length - 1 ? `1px solid ${colors.border}` : 'none',
                cursor: analysis.status === 'completed' ? 'pointer' : 'default',
                transition: 'background 150ms ease',
                '&:hover': {
                  background: analysis.status === 'completed' ? colors.surface : 'transparent',
                },
              }}
            >
              {/* Status */}
              <Box sx={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                {getStatusIcon(analysis.status)}
              </Box>

              {/* Title */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: colors.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {analysis.video_title || analysis.url || 'Untitled'}
                </Typography>
              </Box>

              {/* Platform */}
              <Box sx={{ width: 32, display: 'flex', justifyContent: 'center' }}>
                {getPlatformIcon(analysis.platform)}
              </Box>

              {/* Comment Count */}
              <Typography
                variant="body2"
                className="font-mono"
                sx={{
                  width: 60,
                  textAlign: 'right',
                  color: colors.textSecondary,
                  fontSize: '0.85rem',
                }}
              >
                {analysis.comment_count?.toLocaleString() || '—'}
              </Typography>

              {/* Score */}
              <Box sx={{ width: 50, display: 'flex', justifyContent: 'center' }}>
                {analysis.is_my_video && analysis.video_score != null ? (
                  <Tooltip
                    title={analysis.priority_improvement || 'Video score'}
                    arrow
                    placement="top"
                  >
                    <Box
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: '8px',
                        background: `${getScoreColor(analysis.video_score)}15`,
                        border: `1px solid ${getScoreColor(analysis.video_score)}40`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        className="font-mono"
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: getScoreColor(analysis.video_score),
                        }}
                      >
                        {analysis.video_score}
                      </Typography>
                    </Box>
                  </Tooltip>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: colors.textMuted, fontSize: '0.85rem' }}
                  >
                    —
                  </Typography>
                )}
              </Box>

              {/* Time */}
              <Typography
                variant="body2"
                sx={{
                  width: 80,
                  textAlign: 'right',
                  color: colors.textMuted,
                  fontSize: '0.8rem',
                }}
              >
                {formatTime(analysis.created_at)}
              </Typography>

              {/* Arrow */}
              {analysis.status === 'completed' && (
                <ChevronRight sx={{ color: colors.textMuted, fontSize: 20 }} />
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default RecentAnalysesTable;
