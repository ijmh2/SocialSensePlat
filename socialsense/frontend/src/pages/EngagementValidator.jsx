import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Collapse,
  Divider,
  Tooltip,
  FormControlLabel,
  Switch,
  LinearProgress,
} from '@mui/material';
import {
  YouTube,
  Instagram,
  VerifiedUser,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Add,
  Delete,
  ArrowBack,
  ArrowForward,
  TipsAndUpdates,
  Flag,
  ThumbUp,
  SmartToy,
  TrendingUp,
  Assessment,
  ContentPaste,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

import { useAuth } from '../contexts/AuthContext';
import { engagementApi } from '../utils/api';
import { colors, shadows, gradients } from '../styles/theme';
import TikTokIcon from '../components/icons/TikTokIcon';

const MotionBox = motion(Box);

const steps = ['Platform & Profile', 'Content Metrics', 'Comments (Optional)', 'Review & Validate'];

const platformConfig = {
  youtube: { icon: YouTube, color: '#FF0000', label: 'YouTube' },
  tiktok: { icon: TikTokIcon, color: '#000000', label: 'TikTok' },
  instagram: { icon: Instagram, color: '#E4405F', label: 'Instagram' },
};

const getScoreColor = (score) => {
  if (score >= 75) return colors.success;
  if (score >= 60) return colors.primary;
  if (score >= 40) return colors.warning;
  return colors.error;
};

const getScoreLabel = (score) => {
  if (score >= 90) return 'Highly Authentic';
  if (score >= 75) return 'Likely Authentic';
  if (score >= 60) return 'Some Concerns';
  if (score >= 40) return 'Significant Red Flags';
  return 'High Fraud Risk';
};

const EngagementValidator = () => {
  const { tokenBalance, refreshTokenBalance } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [tokenCost, setTokenCost] = useState(null);

  // Form state
  const [platform, setPlatform] = useState('');
  const [influencerName, setInfluencerName] = useState('');
  const [profileMetrics, setProfileMetrics] = useState({
    followers: '',
    following: '',
    totalPosts: '',
  });
  const [contentMetrics, setContentMetrics] = useState([
    { views: '', likes: '', comments: '', shares: '' },
  ]);
  const [commentSamples, setCommentSamples] = useState('');
  const [includeHistorical, setIncludeHistorical] = useState(false);

  // Estimate token cost when inputs change
  useEffect(() => {
    if (platform && profileMetrics.followers) {
      estimateCost();
    }
  }, [platform, contentMetrics.length, commentSamples, includeHistorical]);

  const estimateCost = async () => {
    try {
      const commentLines = commentSamples.split('\n').filter(l => l.trim()).length;
      const { data } = await engagementApi.estimate({
        platform,
        contentMetricsCount: contentMetrics.length,
        commentSamplesCount: commentLines,
        includeHistoricalAnalysis: includeHistorical,
      });
      setTokenCost(data);
    } catch (err) {
      console.error('Failed to estimate cost:', err);
    }
  };

  const handleAddContentRow = () => {
    if (contentMetrics.length < 20) {
      setContentMetrics([...contentMetrics, { views: '', likes: '', comments: '', shares: '' }]);
    }
  };

  const handleRemoveContentRow = (index) => {
    if (contentMetrics.length > 1) {
      setContentMetrics(contentMetrics.filter((_, i) => i !== index));
    }
  };

  const handleContentMetricChange = (index, field, value) => {
    const updated = [...contentMetrics];
    updated[index][field] = value;
    setContentMetrics(updated);
  };

  const handleNext = () => {
    setError('');
    if (activeStep === 0) {
      if (!platform) {
        setError('Please select a platform');
        return;
      }
      if (!profileMetrics.followers || parseInt(profileMetrics.followers) <= 0) {
        setError('Please enter a valid follower count');
        return;
      }
    }
    if (activeStep === 1) {
      const validMetrics = contentMetrics.filter(m => m.likes || m.views);
      if (validMetrics.length === 0) {
        setError('Please enter at least one post with likes or views');
        return;
      }
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setActiveStep(prev => prev - 1);
  };

  const handleValidate = async () => {
    setLoading(true);
    setError('');

    try {
      // Parse comment samples
      const parsedComments = commentSamples
        .split('\n')
        .filter(line => line.trim())
        .map(line => ({ text: line.trim(), user: 'unknown' }));

      // Parse content metrics
      const parsedMetrics = contentMetrics
        .filter(m => m.likes || m.views)
        .map(m => ({
          views: parseInt(m.views) || 0,
          likes: parseInt(m.likes) || 0,
          comments: parseInt(m.comments) || 0,
          shares: parseInt(m.shares) || 0,
        }));

      const { data } = await engagementApi.validate({
        platform,
        influencerName: influencerName || undefined,
        profileMetrics: {
          followers: parseInt(profileMetrics.followers),
          following: parseInt(profileMetrics.following) || 0,
          totalPosts: parseInt(profileMetrics.totalPosts) || 0,
        },
        contentMetrics: parsedMetrics,
        commentSamples: parsedComments.length > 0 ? parsedComments : undefined,
        historicalData: includeHistorical ? { followerHistory: [] } : undefined,
      });

      setResult(data);
      refreshTokenBalance();
    } catch (err) {
      setError(err.response?.data?.error || 'Validation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setResult(null);
    setPlatform('');
    setInfluencerName('');
    setProfileMetrics({ followers: '', following: '', totalPosts: '' });
    setContentMetrics([{ views: '', likes: '', comments: '', shares: '' }]);
    setCommentSamples('');
    setIncludeHistorical(false);
    setTokenCost(null);
    setError('');
  };

  // Render result view
  if (result) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Box>
              <Typography variant="h4" fontWeight={700} sx={{ color: colors.textPrimary }}>
                Engagement Validation Report
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textMuted, mt: 0.5 }}>
                {result.influencerName} • {platformConfig[result.platform]?.label}
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleReset}>
              New Validation
            </Button>
          </Box>

          {/* Score Card */}
          <Card sx={{ mb: 4, overflow: 'visible' }}>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 160,
                        height: 160,
                        borderRadius: '50%',
                        background: `conic-gradient(${getScoreColor(result.authenticityScore)} ${result.authenticityScore * 3.6}deg, ${colors.border} 0deg)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 130,
                          height: 130,
                          borderRadius: '50%',
                          background: colors.background,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                        }}
                      >
                        <Typography variant="h2" fontWeight={700} sx={{ color: getScoreColor(result.authenticityScore) }}>
                          {result.authenticityScore}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted }}>
                          / 100
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={result.verdict}
                      sx={{
                        background: getScoreColor(result.authenticityScore),
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        px: 2,
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    Score Breakdown
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(result.scoreBreakdown).map(([key, value]) => (
                      <Grid item xs={6} key={key}>
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ color: colors.textSecondary, textTransform: 'capitalize' }}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {value.score}/{value.max}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={(value.score / value.max) * 100}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              '& .MuiLinearProgress-bar': {
                                background: (value.score / value.max) >= 0.7 ? colors.success : (value.score / value.max) >= 0.4 ? colors.warning : colors.error,
                              },
                            }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Red Flags & Positive Signals */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Flag sx={{ color: colors.error }} />
                    <Typography variant="h6" fontWeight={600}>
                      Red Flags ({result.redFlags?.length || 0})
                    </Typography>
                  </Box>
                  {result.redFlags?.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {result.redFlags.map((flag, i) => (
                        <Box
                          key={i}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            background: flag.severity === 'high' ? '#FEF2F2' : flag.severity === 'medium' ? '#FFFBEB' : '#F0FDF4',
                            border: `1px solid ${flag.severity === 'high' ? '#FECACA' : flag.severity === 'medium' ? '#FDE68A' : '#BBF7D0'}`,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            {flag.severity === 'high' ? (
                              <ErrorIcon sx={{ fontSize: 18, color: colors.error }} />
                            ) : (
                              <Warning sx={{ fontSize: 18, color: flag.severity === 'medium' ? colors.warning : colors.success }} />
                            )}
                            <Typography variant="body2" fontWeight={600} sx={{ color: flag.severity === 'high' ? colors.error : flag.severity === 'medium' ? colors.warning : colors.textPrimary }}>
                              {flag.flag}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: colors.textMuted }}>
                            {flag.details}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: colors.textMuted }}>
                      No red flags detected
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ThumbUp sx={{ color: colors.success }} />
                    <Typography variant="h6" fontWeight={600}>
                      Positive Signals ({result.positiveSignals?.length || 0})
                    </Typography>
                  </Box>
                  {result.positiveSignals?.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {result.positiveSignals.map((signal, i) => (
                        <Box
                          key={i}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <CheckCircle sx={{ fontSize: 18, color: colors.success }} />
                            <Typography variant="body2" fontWeight={600} sx={{ color: colors.success }}>
                              {signal.signal}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: colors.textMuted }}>
                            {signal.details}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: colors.textMuted }}>
                      No positive signals detected
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Metrics Analysis */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Assessment sx={{ color: colors.primary }} />
                <Typography variant="h6" fontWeight={600}>
                  Metrics Analysis
                </Typography>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, background: colors.surface, borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ color: colors.textMuted }}>
                      Engagement Rate
                    </Typography>
                    <Typography variant="h5" fontWeight={700} sx={{ color: colors.textPrimary }}>
                      {result.metricsAnalysis?.engagementRate?.toFixed(2) || 0}%
                    </Typography>
                    <Chip
                      label={result.metricsAnalysis?.engagementAssessment?.replace('_', ' ') || 'N/A'}
                      size="small"
                      sx={{ mt: 1, textTransform: 'capitalize' }}
                    />
                  </Box>
                </Grid>
                {result.metricsAnalysis?.ratios && Object.entries(result.metricsAnalysis.ratios).map(([key, value]) => (
                  <Grid item xs={12} sm={6} md={3} key={key}>
                    <Box sx={{ p: 2, background: colors.surface, borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: colors.textMuted, textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Typography>
                      <Typography variant="h5" fontWeight={700} sx={{ color: colors.textPrimary }}>
                        {typeof value === 'number' ? (value * 100).toFixed(2) + '%' : value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Bot Analysis */}
          {result.botAnalysis && (
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <SmartToy sx={{ color: colors.warning }} />
                  <Typography variant="h6" fontWeight={600}>
                    Bot Analysis
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 3, background: colors.surface, borderRadius: 2 }}>
                      <Typography variant="h3" fontWeight={700} sx={{ color: result.botAnalysis.suspectedBotPercentage > 30 ? colors.error : result.botAnalysis.suspectedBotPercentage > 15 ? colors.warning : colors.success }}>
                        {result.botAnalysis.suspectedBotPercentage}%
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textMuted }}>
                        Suspected Bot Comments
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      Pattern Breakdown
                    </Typography>
                    <Grid container spacing={2}>
                      {Object.entries(result.botAnalysis.patterns || {}).map(([pattern, count]) => (
                        <Grid item xs={6} sm={4} key={pattern}>
                          <Box sx={{ p: 1.5, background: colors.surface, borderRadius: 1, textAlign: 'center' }}>
                            <Typography variant="body2" fontWeight={600}>
                              {count}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.textMuted, textTransform: 'capitalize' }}>
                              {pattern.replace(/([A-Z])/g, ' $1').trim()}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                </Grid>
                {result.botAnalysis.flaggedComments?.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                      Sample Flagged Comments
                    </Typography>
                    {result.botAnalysis.flaggedComments.slice(0, 5).map((c, i) => (
                      <Box key={i} sx={{ p: 1.5, mb: 1, background: '#FEF2F2', borderRadius: 1, border: '1px solid #FECACA' }}>
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                          "{c.text}"
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted }}>
                          Reasons: {c.reasons?.join(', ')}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TipsAndUpdates sx={{ color: colors.primary }} />
                <Typography variant="h6" fontWeight={600}>
                  Recommendations
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {result.recommendations?.map((rec, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <CheckCircle sx={{ fontSize: 18, color: colors.primary, mt: 0.3 }} />
                    <Typography variant="body2">
                      {rec}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </MotionBox>
      </Box>
    );
  }

  // Render form
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} sx={{ color: colors.textPrimary }}>
            Engagement Validator
          </Typography>
          <Typography variant="body2" sx={{ color: colors.textMuted, mt: 0.5 }}>
            Analyze influencer authenticity by examining engagement patterns and detecting fake followers
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Error Alert */}
        <Collapse in={!!error}>
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        </Collapse>

        {/* Step Content */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Step 0: Platform & Profile */}
            {activeStep === 0 && (
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Select Platform & Enter Profile Metrics
                </Typography>

                {/* Platform Selection */}
                <Typography variant="body2" sx={{ mb: 2, color: colors.textSecondary }}>
                  Platform
                </Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {Object.entries(platformConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = platform === key;
                    return (
                      <Grid item xs={4} key={key}>
                        <Box
                          onClick={() => setPlatform(key)}
                          sx={{
                            p: 3,
                            borderRadius: 2,
                            border: `2px solid ${isSelected ? config.color : colors.border}`,
                            background: isSelected ? `${config.color}10` : colors.background,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 200ms',
                            '&:hover': {
                              borderColor: config.color,
                            },
                          }}
                        >
                          <Icon sx={{ fontSize: 40, color: config.color, mb: 1 }} />
                          <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                            {config.label}
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>

                {/* Profile Metrics */}
                <Typography variant="body2" sx={{ mb: 2, color: colors.textSecondary }}>
                  Profile Information
                </Typography>
                <TextField
                  fullWidth
                  label="Influencer Name (optional)"
                  placeholder="e.g., @username"
                  value={influencerName}
                  onChange={(e) => setInfluencerName(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Followers"
                      placeholder="e.g., 50000"
                      value={profileMetrics.followers}
                      onChange={(e) => setProfileMetrics({ ...profileMetrics, followers: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Following"
                      placeholder="e.g., 500"
                      value={profileMetrics.following}
                      onChange={(e) => setProfileMetrics({ ...profileMetrics, following: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Total Posts"
                      placeholder="e.g., 200"
                      value={profileMetrics.totalPosts}
                      onChange={(e) => setProfileMetrics({ ...profileMetrics, totalPosts: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Step 1: Content Metrics */}
            {activeStep === 1 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Recent Post Metrics
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textMuted }}>
                      Enter metrics for 5-20 recent posts for best results
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Add />}
                    onClick={handleAddContentRow}
                    disabled={contentMetrics.length >= 20}
                  >
                    Add Post
                  </Button>
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Views</TableCell>
                        <TableCell>Likes *</TableCell>
                        <TableCell>Comments</TableCell>
                        <TableCell>Shares</TableCell>
                        <TableCell width={50}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {contentMetrics.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              placeholder="0"
                              value={row.views}
                              onChange={(e) => handleContentMetricChange(index, 'views', e.target.value)}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              placeholder="0"
                              value={row.likes}
                              onChange={(e) => handleContentMetricChange(index, 'likes', e.target.value)}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              placeholder="0"
                              value={row.comments}
                              onChange={(e) => handleContentMetricChange(index, 'comments', e.target.value)}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              placeholder="0"
                              value={row.shares}
                              onChange={(e) => handleContentMetricChange(index, 'shares', e.target.value)}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveContentRow(index)}
                              disabled={contentMetrics.length <= 1}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="caption" sx={{ color: colors.textMuted, mt: 1, display: 'block' }}>
                  * At least likes or views required per post
                </Typography>
              </Box>
            )}

            {/* Step 2: Comments */}
            {activeStep === 2 && (
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                  Comment Samples (Optional)
                </Typography>
                <Typography variant="body2" sx={{ color: colors.textMuted, mb: 3 }}>
                  Paste comment samples from their posts to analyze for bot patterns. One comment per line.
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  placeholder="Great video!
Love this content
🔥🔥🔥
Check my page for more
Amazing work, keep it up!
..."
                  value={commentSamples}
                  onChange={(e) => setCommentSamples(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    icon={<ContentPaste />}
                    label={`${commentSamples.split('\n').filter(l => l.trim()).length} comments`}
                    variant="outlined"
                  />
                  <Typography variant="caption" sx={{ color: colors.textMuted }}>
                    More comments = more accurate bot detection
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Step 3: Review */}
            {activeStep === 3 && (
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Review & Validate
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 3, background: colors.surface, borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, color: colors.textSecondary }}>
                        Validation Summary
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Platform</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {platformConfig[platform]?.label}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Influencer</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {influencerName || 'Not specified'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Followers</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {parseInt(profileMetrics.followers).toLocaleString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Posts Analyzed</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {contentMetrics.filter(m => m.likes || m.views).length}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Comment Samples</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {commentSamples.split('\n').filter(l => l.trim()).length}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 3, background: colors.primaryGlow, borderRadius: 2, border: `1px solid ${colors.primary}20` }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, color: colors.primary }}>
                        Token Cost
                      </Typography>
                      {tokenCost ? (
                        <>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2">Base analysis</Typography>
                              <Typography variant="body2">{tokenCost.breakdown.base} tokens</Typography>
                            </Box>
                            {tokenCost.breakdown.comments > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2">Comment analysis</Typography>
                                <Typography variant="body2">{tokenCost.breakdown.comments} tokens</Typography>
                              </Box>
                            )}
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body1" fontWeight={600}>Total</Typography>
                              <Typography variant="body1" fontWeight={600}>{tokenCost.token_cost} tokens</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ color: colors.textMuted }}>
                              Your balance: {tokenBalance} tokens
                            </Typography>
                            {!tokenCost.can_afford && (
                              <Chip label="Insufficient tokens" color="error" size="small" />
                            )}
                          </Box>
                        </>
                      ) : (
                        <CircularProgress size={20} />
                      )}
                    </Box>
                  </Grid>
                </Grid>

                <Alert severity="info" sx={{ mt: 3 }}>
                  This validation analyzes engagement patterns, ratio anomalies, and comment quality to estimate authenticity. Results are based on statistical analysis and should be used as one factor in your decision-making.
                </Alert>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handleBack}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={handleNext}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <VerifiedUser />}
              onClick={handleValidate}
              disabled={loading || (tokenCost && !tokenCost.can_afford)}
            >
              {loading ? 'Validating...' : 'Validate Engagement'}
            </Button>
          )}
        </Box>
      </MotionBox>
    </Box>
  );
};

export default EngagementValidator;
