import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Button, Alert, Skeleton, Card, CardContent, useTheme, alpha } from '@mui/material';
import { Token, BarChart, TrendingUp, Add, Refresh, Timeline } from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { useAuth } from '../contexts/AuthContext';
import { analysisApi } from '../utils/api';
import { colors, shadows } from '../styles/theme';
import StatCard from '../components/ui/StatCard';
import AccountScoreCard from '../components/dashboard/AccountScoreCard';
import RecentAnalysesTable from '../components/dashboard/RecentAnalysesTable';
import QuickActions from '../components/dashboard/QuickActions';
import ReferralCard from '../components/ReferralCard';

const MotionBox = motion(Box);

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { profile, tokenBalance, refreshTokenBalance } = useAuth();

  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [stats, setStats] = useState(null);
  const [accountScore, setAccountScore] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch data in parallel
      const [historyResponse, scoreResponse, scoreHistoryResponse] = await Promise.all([
        analysisApi.getHistory({ limit: 10 }),
        analysisApi.getAccountScore().catch(() => ({ data: null })),
        analysisApi.getScoreHistory().catch(() => ({ data: { history: [] } })),
      ]);

      const historyData = historyResponse.data;
      setRecentAnalyses(historyData.analyses || []);
      setAccountScore(scoreResponse.data);
      setScoreHistory(scoreHistoryResponse.data?.history || []);

      await refreshTokenBalance();

      // Calculate stats from history
      const analyses = historyData.analyses || [];
      const thisWeek = analyses.filter(a => {
        const date = new Date(a.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      }).length;

      setStats({
        totalAnalyses: historyData.total || 0,
        thisWeek,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: colors.textPrimary,
              mb: 0.5,
            }}
          >
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
          </Typography>
          <Typography variant="body1" sx={{ color: colors.textSecondary }}>
            Here's an overview of your social media analytics
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/analyze/comments')}
          sx={{
            px: 3,
            py: 1.5,
            boxShadow: shadows.button,
          }}
        >
          New Analysis
        </Button>
      </MotionBox>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={loadDashboardData} startIcon={<Refresh />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            {loading ? (
              <Skeleton variant="rounded" height={140} sx={{ borderRadius: '16px' }} />
            ) : (
              <StatCard
                label="Tokens"
                value={tokenBalance}
                icon={<Token sx={{ fontSize: 24 }} />}
                iconColor={colors.primary}
                onClick={() => navigate('/tokens')}
              />
            )}
          </MotionBox>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {loading ? (
              <Skeleton variant="rounded" height={140} sx={{ borderRadius: '16px' }} />
            ) : (
              <StatCard
                label="Total Analyses"
                value={stats?.totalAnalyses || 0}
                icon={<BarChart sx={{ fontSize: 24 }} />}
                iconColor={colors.textSecondary}
                onClick={() => navigate('/history')}
              />
            )}
          </MotionBox>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {loading ? (
              <Skeleton variant="rounded" height={140} sx={{ borderRadius: '16px' }} />
            ) : (
              <StatCard
                label="This Week"
                value={stats?.thisWeek || 0}
                trend={stats?.thisWeek > 0 ? stats.thisWeek : null}
                icon={<TrendingUp sx={{ fontSize: 24 }} />}
                iconColor={colors.success}
              />
            )}
          </MotionBox>
        </Grid>
      </Grid>

      {/* Account Score */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        sx={{ mb: 4 }}
      >
        {loading ? (
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: '20px' }} />
        ) : (
          <AccountScoreCard
            score={accountScore?.score}
            videoCount={accountScore?.videoCount}
            hasScore={accountScore?.hasScore}
          />
        )}
      </MotionBox>

      {/* Score Trend Chart */}
      {scoreHistory.length >= 2 && (
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          sx={{ mb: 4 }}
        >
          <Card
            sx={{
              borderRadius: '20px',
              boxShadow: shadows.card,
              background: colors.background,
              border: `1px solid ${colors.border}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: alpha(theme.palette.primary.main, 0.1),
                  }}
                >
                  <Timeline sx={{ color: theme.palette.primary.main }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600} color="text.primary">
                    Score Trend
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your video performance over time
                  </Typography>
                </Box>
              </Box>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart
                  data={scoreHistory.map(h => ({
                    ...h,
                    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    shortTitle: h.title.length > 20 ? h.title.slice(0, 20) + '...' : h.title,
                  }))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                  <XAxis
                    dataKey="date"
                    stroke={theme.palette.text.secondary}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke={theme.palette.text.secondary}
                    tick={{ fontSize: 12 }}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme.palette.background.paper,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      borderRadius: 8,
                      boxShadow: shadows.dropdown,
                    }}
                    formatter={(value, name) => [`${value}/100`, 'Score']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.shortTitle || label}
                  />
                  <ReferenceLine y={accountScore?.score || 50} stroke={alpha(theme.palette.primary.main, 0.5)} strokeDasharray="5 5" />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={theme.palette.primary.main}
                    strokeWidth={3}
                    dot={{
                      fill: theme.palette.primary.main,
                      strokeWidth: 2,
                      r: 5,
                    }}
                    activeDot={{
                      fill: theme.palette.primary.main,
                      strokeWidth: 2,
                      r: 7,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 3, borderRadius: 1, background: theme.palette.primary.main }} />
                  <Typography variant="caption" color="text.secondary">Score</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 3, borderRadius: 1, background: alpha(theme.palette.primary.main, 0.5), borderStyle: 'dashed', border: `1px dashed ${alpha(theme.palette.primary.main, 0.5)}` }} />
                  <Typography variant="caption" color="text.secondary">Average ({accountScore?.score || '—'})</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </MotionBox>
      )}

      {/* Recent Analyses */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        sx={{ mb: 4 }}
      >
        {loading ? (
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: '16px' }} />
        ) : (
          <RecentAnalysesTable
            analyses={recentAnalyses}
            onViewAll={() => navigate('/history')}
          />
        )}
      </MotionBox>

      {/* Quick Actions */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        sx={{ mb: 4 }}
      >
        <QuickActions />
      </MotionBox>

      {/* Referral Card */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <ReferralCard />
      </MotionBox>

      {/* Low Token Warning */}
      {tokenBalance < 10 && (
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{
            mt: 4,
            p: 3,
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 600, color: colors.warning }}>
              Running low on tokens
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              You have {tokenBalance} tokens remaining. Purchase more to continue analyzing.
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => navigate('/tokens')}
            sx={{
              background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)',
              },
            }}
          >
            Buy Tokens
          </Button>
        </MotionBox>
      )}
    </Box>
  );
};

export default Dashboard;
