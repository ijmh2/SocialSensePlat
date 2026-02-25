import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Skeleton,
  Alert,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  EmojiEvents,
  Warning,
  YouTube,
  VideoLibrary,
  ArrowForward,
  Refresh,
  Timeline,
  Star,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

import { analyticsApi } from '../utils/api';
import { colors, shadows } from '../styles/theme';
import TikTokIcon from '../components/icons/TikTokIcon';

const MotionBox = motion(Box);

const Performance = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      setError('');
      const { data: perfData } = await analyticsApi.getPerformance();
      setData(perfData);
    } catch (err) {
      console.error('Failed to load performance data:', err);
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return theme.palette.success.main;
    if (score >= 60) return theme.palette.primary.main;
    if (score >= 40) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getScoreLabel = (score) => {
    if (score >= 85) return 'Exceptional';
    if (score >= 70) return 'Strong';
    if (score >= 55) return 'Average';
    if (score >= 40) return 'Below Average';
    return 'Poor';
  };

  const getPlatformIcon = (platform) => {
    if (platform === 'youtube') return <YouTube sx={{ fontSize: 18, color: '#FF0000' }} />;
    if (platform === 'tiktok') return <TikTokIcon sx={{ fontSize: 18 }} />;
    return <VideoLibrary sx={{ fontSize: 18 }} />;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const DISTRIBUTION_COLORS = [
    theme.palette.success.main,
    theme.palette.primary.main,
    theme.palette.info.main,
    theme.palette.warning.main,
    theme.palette.error.main,
  ];

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={140} sx={{ borderRadius: '16px' }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadPerformanceData} startIcon={<Refresh />}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!data?.hasData) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', textAlign: 'center', py: 8 }}>
        <Timeline sx={{ fontSize: 64, color: colors.textMuted, mb: 3 }} />
        <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
          No Performance Data Yet
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Analyze your own videos with "This is my video" checked to start tracking performance.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/analyze/comments')}
          endIcon={<ArrowForward />}
        >
          Analyze a Video
        </Button>
      </Box>
    );
  }

  const distributionData = [
    { name: 'Exceptional (85+)', value: data.scoreDistribution.exceptional },
    { name: 'Strong (70-84)', value: data.scoreDistribution.strong },
    { name: 'Average (55-69)', value: data.scoreDistribution.average },
    { name: 'Below Avg (40-54)', value: data.scoreDistribution.belowAverage },
    { name: 'Poor (<40)', value: data.scoreDistribution.poor },
  ].filter(d => d.value > 0);

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
            Performance Dashboard
          </Typography>
          <Typography color="text.secondary">
            Track your video performance over time
          </Typography>
        </Box>
        <Button variant="outlined" onClick={loadPerformanceData} startIcon={<Refresh />}>
          Refresh
        </Button>
      </MotionBox>

      {/* Stats Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: shadows.card }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <BarChartIcon sx={{ fontSize: 32, color: theme.palette.primary.main, mb: 1 }} />
                <Typography variant="h3" fontWeight={700}>
                  {data.totalVideos}
                </Typography>
                <Typography color="text.secondary">Videos Analyzed</Typography>
              </CardContent>
            </Card>
          </MotionBox>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: shadows.card }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Star sx={{ fontSize: 32, color: getScoreColor(data.averageScore), mb: 1 }} />
                <Typography variant="h3" fontWeight={700} sx={{ color: getScoreColor(data.averageScore) }}>
                  {data.averageScore}
                </Typography>
                <Typography color="text.secondary">Average Score</Typography>
              </CardContent>
            </Card>
          </MotionBox>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: shadows.card }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <EmojiEvents sx={{ fontSize: 32, color: '#FFD700', mb: 1 }} />
                <Typography variant="h3" fontWeight={700} sx={{ color: theme.palette.success.main }}>
                  {data.bestVideo?.score}
                </Typography>
                <Typography color="text.secondary">Best Score</Typography>
              </CardContent>
            </Card>
          </MotionBox>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: shadows.card }}>
              <CardContent sx={{ textAlign: 'center' }}>
                {data.recentTrend ? (
                  <>
                    {data.recentTrend.direction === 'up' ? (
                      <TrendingUp sx={{ fontSize: 32, color: theme.palette.success.main, mb: 1 }} />
                    ) : data.recentTrend.direction === 'down' ? (
                      <TrendingDown sx={{ fontSize: 32, color: theme.palette.error.main, mb: 1 }} />
                    ) : (
                      <Timeline sx={{ fontSize: 32, color: theme.palette.grey[500], mb: 1 }} />
                    )}
                    <Typography
                      variant="h3"
                      fontWeight={700}
                      sx={{
                        color: data.recentTrend.direction === 'up'
                          ? theme.palette.success.main
                          : data.recentTrend.direction === 'down'
                            ? theme.palette.error.main
                            : theme.palette.grey[500],
                      }}
                    >
                      {data.recentTrend.change > 0 ? '+' : ''}{data.recentTrend.change}
                    </Typography>
                    <Typography color="text.secondary">Recent Trend</Typography>
                  </>
                ) : (
                  <>
                    <Timeline sx={{ fontSize: 32, color: theme.palette.grey[400], mb: 1 }} />
                    <Typography variant="h5" fontWeight={600} color="text.secondary">—</Typography>
                    <Typography color="text.secondary">Need 6+ videos</Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </MotionBox>
        </Grid>
      </Grid>

      {/* Best & Worst Videos */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card
              sx={{
                borderRadius: '16px',
                boxShadow: shadows.card,
                background: alpha(theme.palette.success.main, 0.05),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                cursor: 'pointer',
                '&:hover': { boxShadow: shadows.dropdown },
              }}
              onClick={() => navigate(`/analysis/${data.bestVideo?.id}`)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <EmojiEvents sx={{ color: '#FFD700' }} />
                  <Typography variant="h6" fontWeight={600}>Best Performing</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                      borderRadius: '12px',
                      background: alpha(theme.palette.success.main, 0.15),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.success.main, whiteSpace: 'nowrap' }}>
                      {data.bestVideo?.score}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getPlatformIcon(data.bestVideo?.platform)}
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {data.bestVideo?.title}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(data.bestVideo?.date)}
                    </Typography>
                  </Box>
                  <ArrowForward sx={{ color: 'text.secondary', flexShrink: 0 }} />
                </Box>
              </CardContent>
            </Card>
          </MotionBox>
        </Grid>

        <Grid item xs={12} md={6}>
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card
              sx={{
                borderRadius: '16px',
                boxShadow: shadows.card,
                background: alpha(theme.palette.warning.main, 0.05),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                cursor: 'pointer',
                '&:hover': { boxShadow: shadows.dropdown },
              }}
              onClick={() => navigate(`/analysis/${data.worstVideo?.id}`)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Warning sx={{ color: theme.palette.warning.main }} />
                  <Typography variant="h6" fontWeight={600}>Needs Improvement</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                      borderRadius: '12px',
                      background: alpha(theme.palette.warning.main, 0.15),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.warning.main, whiteSpace: 'nowrap' }}>
                      {data.worstVideo?.score}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getPlatformIcon(data.worstVideo?.platform)}
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {data.worstVideo?.title}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {data.worstVideo?.improvement || 'View for tips'}
                    </Typography>
                  </Box>
                  <ArrowForward sx={{ color: 'text.secondary', flexShrink: 0 }} />
                </Box>
              </CardContent>
            </Card>
          </MotionBox>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Monthly Averages */}
        {data.monthlyAverages.length > 1 && (
          <Grid item xs={12} md={8}>
            <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card sx={{ borderRadius: '16px', boxShadow: shadows.card }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                    Monthly Score Trends
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.monthlyAverages}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                      <XAxis
                        dataKey="month"
                        stroke={theme.palette.text.secondary}
                        tickFormatter={(v) => {
                          const [y, m] = v.split('-');
                          return new Date(y, parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short' });
                        }}
                      />
                      <YAxis domain={[0, 100]} stroke={theme.palette.text.secondary} />
                      <Tooltip
                        contentStyle={{
                          background: theme.palette.background.paper,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                          borderRadius: 8,
                        }}
                        formatter={(value) => [`${value}/100`, 'Avg Score']}
                        labelFormatter={(v) => {
                          const [y, m] = v.split('-');
                          return new Date(y, parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        }}
                      />
                      <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                        {data.monthlyAverages.map((entry, index) => (
                          <Cell key={index} fill={getScoreColor(entry.average)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </MotionBox>
          </Grid>
        )}

        {/* Score Distribution */}
        <Grid item xs={12} md={data.monthlyAverages.length > 1 ? 4 : 12}>
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: shadows.card, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Score Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${value}`}
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={index} fill={DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
                  {distributionData.map((entry, index) => (
                    <Chip
                      key={entry.name}
                      label={`${entry.name}: ${entry.value}`}
                      size="small"
                      sx={{
                        background: alpha(DISTRIBUTION_COLORS[index], 0.15),
                        color: DISTRIBUTION_COLORS[index],
                        fontSize: '0.7rem',
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </MotionBox>
        </Grid>
      </Grid>

      {/* All Videos Table */}
      <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card sx={{ borderRadius: '16px', boxShadow: shadows.card }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>All Scored Videos</Typography>
              <Button size="small" onClick={() => navigate('/history')} endIcon={<ArrowForward />}>
                View All
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Video</TableCell>
                    <TableCell align="center">Score</TableCell>
                    <TableCell>Priority Improvement</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.videos.map((video) => (
                    <TableRow
                      key={video.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/analysis/${video.id}`)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getPlatformIcon(video.platform)}
                          <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 250 }}>
                            {video.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={video.score}
                          size="small"
                          sx={{
                            background: alpha(getScoreColor(video.score), 0.15),
                            color: getScoreColor(video.score),
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                          {video.improvement || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(video.date)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </MotionBox>
    </Box>
  );
};

export default Performance;
