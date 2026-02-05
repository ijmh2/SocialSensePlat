import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Comment as CommentIcon,
  VideoLibrary as VideoIcon,
  Token as TokenIcon,
  TrendingUp,
  ArrowForward,
  YouTube,
  MusicNote,
  History,
  Refresh,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

import { useAuth } from '../contexts/AuthContext';
import { analysisApi } from '../utils/api';
import { neumorphShadows } from '../styles/theme';

const MotionCard = motion(Card);
const MotionBox = motion(Box);

const StatCard = ({ title, value, subtitle, icon: Icon, accentColor = '#6C63FF', delay = 0, loading }) => {
  return (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      sx={{
        height: '100%',
        borderRadius: '24px',
        boxShadow: neumorphShadows.extruded,
        background: '#E0E5EC',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: neumorphShadows.extrudedHover,
        },
        transition: 'all 300ms ease-out',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={80} height={48} sx={{ background: 'rgba(163, 177, 198, 0.3)' }} />
            ) : (
              <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5, color: '#3D4852' }}>
                {value}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: neumorphShadows.insetDeep,
              background: '#E0E5EC',
            }}
          >
            <Icon sx={{ fontSize: 26, color: accentColor }} />
          </Box>
        </Box>
      </CardContent>
    </MotionCard>
  );
};

const QuickActionCard = ({ title, description, icon: Icon, onClick, accentColor, delay = 0 }) => {
  return (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      sx={{
        height: '100%',
        cursor: 'pointer',
        borderRadius: '24px',
        boxShadow: neumorphShadows.extruded,
        background: '#E0E5EC',
        transition: 'all 300ms ease-out',
        '&:hover': {
          boxShadow: neumorphShadows.extrudedHover,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
            boxShadow: neumorphShadows.extrudedSmall,
            mb: 2,
          }}
        >
          <Icon sx={{ fontSize: 28, color: 'white' }} />
        </Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: '#3D4852' }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#6B7280', mb: 2 }}>
          {description}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: neumorphShadows.extrudedSmall,
              background: '#E0E5EC',
            }}
          >
            <ArrowForward sx={{ color: accentColor, fontSize: 18 }} />
          </Box>
        </Box>
      </CardContent>
    </MotionCard>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, tokenBalance, refreshTokenBalance } = useAuth();
  
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data: historyData } = await analysisApi.getHistory({ limit: 5 });
      setRecentAnalyses(historyData.analyses || []);
      
      await refreshTokenBalance();
      
      const totalAnalyses = historyData.total || 0;
      const completedAnalyses = (historyData.analyses || []).filter(a => a.status === 'completed').length;
      
      setStats({
        totalAnalyses,
        completedAnalyses,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'youtube':
        return <YouTube sx={{ fontSize: 18, color: '#FF0000' }} />;
      case 'tiktok':
        return <MusicNote sx={{ fontSize: 18, color: '#00F2EA' }} />;
      default:
        return <VideoIcon sx={{ fontSize: 18, color: '#6B7280' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#38B2AC';
      case 'processing':
        return '#DD6B20';
      case 'failed':
        return '#E53E3E';
      default:
        return '#6B7280';
    }
  };

  return (
    <Box>
      {/* Header */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{ mb: 4 }}
      >
        <Typography variant="h4" fontWeight={800} sx={{ mb: 1, color: '#3D4852' }}>
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
        </Typography>
        <Typography variant="body1" sx={{ color: '#6B7280' }}>
          Here's an overview of your social media analytics
        </Typography>
      </MotionBox>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: '16px', boxShadow: neumorphShadows.extrudedSmall }}
          action={
            <Button color="inherit" size="small" onClick={loadDashboardData} startIcon={<Refresh />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Token Balance"
            value={tokenBalance}
            subtitle="Available tokens"
            icon={TokenIcon}
            accentColor="#6C63FF"
            delay={0}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Analyses"
            value={stats?.totalAnalyses || 0}
            subtitle="All time"
            icon={TrendingUp}
            accentColor="#8B84FF"
            delay={0.1}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tokens Used"
            value={profile?.total_tokens_purchased || 0}
            subtitle="Total purchased"
            icon={CommentIcon}
            accentColor="#38B2AC"
            delay={0.2}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Success Rate"
            value={stats?.totalAnalyses > 0 
              ? `${Math.round((stats.completedAnalyses / stats.totalAnalyses) * 100)}%`
              : '100%'}
            subtitle="Completed analyses"
            icon={History}
            accentColor="#6C63FF"
            delay={0.3}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#3D4852' }}>
        Quick Actions
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <QuickActionCard
            title="New Analysis"
            description="Extract insights from comments, with optional video upload for audio transcription and visual analysis"
            icon={CommentIcon}
            onClick={() => navigate('/analyze/comments')}
            accentColor="#6C63FF"
            delay={0.4}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <QuickActionCard
            title="Buy Tokens"
            description="Purchase tokens to run more analyses"
            icon={TokenIcon}
            onClick={() => navigate('/tokens')}
            accentColor="#38B2AC"
            delay={0.5}
          />
        </Grid>
      </Grid>

      {/* Recent Analyses */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#3D4852' }}>
          Recent Analyses
        </Typography>
        <Button
          endIcon={<ArrowForward />}
          onClick={() => navigate('/history')}
          sx={{ color: '#6C63FF' }}
        >
          View All
        </Button>
      </Box>
      
      <Card
        sx={{
          borderRadius: '24px',
          boxShadow: neumorphShadows.extruded,
          background: '#E0E5EC',
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 3 }}>
              {[1, 2, 3].map((i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Skeleton width="60%" height={24} sx={{ background: 'rgba(163, 177, 198, 0.3)' }} />
                  <Skeleton width="40%" height={20} sx={{ background: 'rgba(163, 177, 198, 0.3)' }} />
                </Box>
              ))}
            </Box>
          ) : recentAnalyses.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#6B7280', mb: 2 }}>
                No analyses yet. Start by analyzing your first video!
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/analyze/comments')}
                sx={{
                  borderRadius: '16px',
                  px: 4,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #6C63FF 0%, #8B84FF 100%)',
                  boxShadow: neumorphShadows.extrudedSmall,
                }}
              >
                Start Analysis
              </Button>
            </Box>
          ) : (
            <Box>
              {recentAnalyses.map((analysis, index) => (
                <Box
                  key={analysis.id}
                  component={motion.div}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => navigate(`/analysis/${analysis.id}`)}
                  sx={{
                    p: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    cursor: 'pointer',
                    borderBottom: index < recentAnalyses.length - 1 
                      ? '1px solid rgba(163, 177, 198, 0.3)' 
                      : 'none',
                    transition: 'all 200ms ease-out',
                    '&:hover': {
                      background: 'rgba(108, 99, 255, 0.05)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: neumorphShadows.inset,
                      background: '#E0E5EC',
                    }}
                  >
                    {getPlatformIcon(analysis.platform)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ color: '#3D4852' }}>
                      {analysis.video_title || 'Untitled Analysis'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      {analysis.comment_count?.toLocaleString() || 0} comments • {new Date(analysis.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Chip
                    label={analysis.status}
                    size="small"
                    sx={{
                      boxShadow: neumorphShadows.insetSmall,
                      background: '#E0E5EC',
                      color: getStatusColor(analysis.status),
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      border: 'none',
                    }}
                  />
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>
                    {analysis.tokens_used} tokens
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Low Token Warning */}
      {tokenBalance < 10 && (
        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{
            mt: 3,
            borderRadius: '24px',
            boxShadow: neumorphShadows.extruded,
            background: '#E0E5EC',
            borderLeft: '4px solid #DD6B20',
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="body1" fontWeight={600} sx={{ color: '#3D4852' }}>
                Running low on tokens
              </Typography>
              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                You have {tokenBalance} tokens remaining. Purchase more to continue analyzing.
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => navigate('/tokens')}
              sx={{
                borderRadius: '16px',
                px: 3,
                background: 'linear-gradient(135deg, #DD6B20 0%, #ED8936 100%)',
                boxShadow: neumorphShadows.extrudedSmall,
              }}
            >
              Buy Tokens
            </Button>
          </CardContent>
        </MotionCard>
      )}
    </Box>
  );
};

export default Dashboard;
