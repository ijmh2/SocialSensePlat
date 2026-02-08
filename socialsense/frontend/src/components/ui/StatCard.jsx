import { Box, Typography } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';
import { colors, shadows } from '../../styles/theme';

/**
 * StatCard - Display a stat with label, optional trend indicator, and icon
 *
 * @param {string} label - Label text (e.g., "Tokens", "Analyses")
 * @param {string|number} value - The stat value to display
 * @param {number} [trend] - Optional trend percentage (+5, -3, etc.)
 * @param {ReactNode} [icon] - Optional icon component
 * @param {string} [iconColor] - Color for the icon background
 * @param {function} [onClick] - Optional click handler
 */
const StatCard = ({ label, value, trend, icon, iconColor = colors.primary, onClick }) => {
  const getTrendIcon = () => {
    if (trend === undefined || trend === null) return null;
    if (trend > 0) return <TrendingUp sx={{ fontSize: 16 }} />;
    if (trend < 0) return <TrendingDown sx={{ fontSize: 16 }} />;
    return <TrendingFlat sx={{ fontSize: 16 }} />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === null) return colors.textMuted;
    if (trend > 0) return colors.success;
    if (trend < 0) return colors.error;
    return colors.textMuted;
  };

  const formatTrend = () => {
    if (trend === undefined || trend === null) return null;
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend}`;
  };

  return (
    <Box
      onClick={onClick}
      sx={{
        background: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: shadows.card,
        transition: 'all 200ms ease-out',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          boxShadow: shadows.cardHover,
          transform: onClick ? 'translateY(-2px)' : 'none',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        {icon && (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: `${iconColor}10`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: iconColor,
            }}
          >
            {icon}
          </Box>
        )}
        {trend !== undefined && trend !== null && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: getTrendColor(),
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            {getTrendIcon()}
            <span className="font-mono">{formatTrend()}</span>
          </Box>
        )}
      </Box>

      <Typography
        variant="h3"
        className="stat-number"
        sx={{
          fontSize: '2rem',
          fontWeight: 700,
          color: colors.textPrimary,
          mb: 0.5,
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: colors.textSecondary,
          fontSize: '0.9rem',
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export default StatCard;
