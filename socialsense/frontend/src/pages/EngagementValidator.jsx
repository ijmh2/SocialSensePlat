import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Alert,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
} from '@mui/material';
import {
  YouTube,
  VerifiedUser,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  ArrowBack,
  TipsAndUpdates,
  Flag,
  ThumbUp,
  SmartToy,
  Assessment,
  Link as LinkIcon,
  History,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

import { useAuth } from '../contexts/AuthContext';
import { engagementApi } from '../utils/api';
import { colors, shadows } from '../styles/theme';
import TikTokIcon from '../components/icons/TikTokIcon';

const MotionBox = motion(Box);

const platformConfig = {
  youtube: { icon: YouTube, color: '#FF0000', label: 'YouTube' },
  tiktok: { icon: TikTokIcon, color: '#000000', label: 'TikTok' },
};

const getScoreColor = (score) => {
  if (score >= 75) return colors.success;
  if (score >= 60) return colors.primary;
  if (score >= 40) return colors.warning;
  return colors.error;
};

const EngagementValidator = () => {
  const { tokenBalance, refreshTokenBalance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [tokenCost, setTokenCost] = useState(null);
  const [inputMode, setInputMode] = useState(0); // 0 = URL, 1 = Cached
  const [cachedAnalyses, setCachedAnalyses] = useState([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);

  // Form state
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('');

  useEffect(() => {
    fetchTokenCost();
    fetchCachedAnalyses();
  }, []);

  const fetchTokenCost = async () => {
    try {
      const { data } = await engagementApi.estimate();
      setTokenCost(data);
    } catch (err) {
      console.error('Failed to fetch cost:', err);
    }
  };

  const fetchCachedAnalyses = async () => {
    setLoadingAnalyses(true);
    try {
      const { data } = await engagementApi.getAnalyses();
      setCachedAnalyses(data.analyses || []);
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
    } finally {
      setLoadingAnalyses(false);
    }
  };

  const handleValidate = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = inputMode === 0
        ? { url, platform }
        : { analysisId: selectedAnalysisId };

      const { data } = await engagementApi.validate(payload);
      setResult(data);
      refreshTokenBalance();
    } catch (err) {
      setError(err.response?.data?.error || 'Validation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setUrl('');
    setSelectedAnalysisId('');
    setError('');
  };

  const canSubmit = inputMode === 0 ? url.trim() : selectedAnalysisId;

  // Render result view
  if (result) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Box>
              <Typography variant="h4" fontWeight={700}>Engagement Validation Report</Typography>
              <Typography variant="body2" sx={{ color: colors.textMuted, mt: 0.5 }}>
                {result.videoTitle} - {platformConfig[result.platform]?.label}
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleReset}>
              New Validation
            </Button>
          </Box>

          {/* Score Card */}
          <Card sx={{ mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 160, height: 160, borderRadius: '50%', mx: 'auto', mb: 2,
                        background: `conic-gradient(${getScoreColor(result.authenticityScore)} ${result.authenticityScore * 3.6}deg, ${colors.border} 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Box sx={{ width: 130, height: 130, borderRadius: '50%', background: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <Typography variant="h2" fontWeight={700} sx={{ color: getScoreColor(result.authenticityScore) }}>
                          {result.authenticityScore}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted }}>/100</Typography>
                      </Box>
                    </Box>
                    <Chip label={result.verdict} sx={{ background: getScoreColor(result.authenticityScore), color: 'white', fontWeight: 600, px: 2 }} />
                  </Box>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Key Metrics</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <Box sx={{ p: 2, background: colors.surface, borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ color: colors.textMuted }}>Views</Typography>
                        <Typography variant="h6" fontWeight={700}>{result.metricsAnalysis?.viewCount?.toLocaleString() || 0}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box sx={{ p: 2, background: colors.surface, borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ color: colors.textMuted }}>Likes</Typography>
                        <Typography variant="h6" fontWeight={700}>{result.metricsAnalysis?.likeCount?.toLocaleString() || 0}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box sx={{ p: 2, background: colors.surface, borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ color: colors.textMuted }}>Engagement Rate</Typography>
                        <Typography variant="h6" fontWeight={700}>{result.metricsAnalysis?.engagementRate || 0}%</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Analysis Sections */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {result.engagementAssessment && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                      <Assessment sx={{ mr: 1, verticalAlign: 'middle', color: colors.primary }} />
                      Engagement Assessment
                    </Typography>
                    <Typography variant="body2">{result.engagementAssessment}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {result.commentQuality && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                      <SmartToy sx={{ mr: 1, verticalAlign: 'middle', color: colors.warning }} />
                      Comment Quality Analysis
                    </Typography>
                    <Typography variant="body2">{result.commentQuality}</Typography>
                    {result.commentAnalysis && (
                      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Chip size="small" label={`${result.commentAnalysis.total} comments`} />
                        <Chip size="small" label={`${result.commentAnalysis.emojiOnlyPct}% emoji-only`} color={result.commentAnalysis.emojiOnlyPct > 20 ? 'warning' : 'default'} />
                        <Chip size="small" label={`${result.commentAnalysis.genericPct}% generic`} color={result.commentAnalysis.genericPct > 30 ? 'warning' : 'default'} />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>

          {/* Red Flags & Positive Signals */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Flag sx={{ color: colors.error }} />
                    <Typography variant="h6" fontWeight={600}>Red Flags ({result.redFlags?.length || 0})</Typography>
                  </Box>
                  {result.redFlags?.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {result.redFlags.map((flag, i) => (
                        <Box key={i} sx={{ p: 2, borderRadius: 2, background: flag.severity === 'high' ? '#FEF2F2' : '#FFFBEB', border: `1px solid ${flag.severity === 'high' ? '#FECACA' : '#FDE68A'}` }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            {flag.severity === 'high' ? <ErrorIcon sx={{ fontSize: 18, color: colors.error }} /> : <Warning sx={{ fontSize: 18, color: colors.warning }} />}
                            <Typography variant="body2" fontWeight={600}>{flag.flag}</Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: colors.textMuted }}>{flag.details}</Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: colors.textMuted }}>No red flags detected</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ThumbUp sx={{ color: colors.success }} />
                    <Typography variant="h6" fontWeight={600}>Positive Signals ({result.positiveSignals?.length || 0})</Typography>
                  </Box>
                  {result.positiveSignals?.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {result.positiveSignals.map((signal, i) => (
                        <Box key={i} sx={{ p: 2, borderRadius: 2, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <CheckCircle sx={{ fontSize: 18, color: colors.success }} />
                            <Typography variant="body2" fontWeight={600} sx={{ color: colors.success }}>{signal.signal}</Typography>
                          </Box>
                          {signal.details && <Typography variant="caption" sx={{ color: colors.textMuted }}>{signal.details}</Typography>}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: colors.textMuted }}>No positive signals detected</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TipsAndUpdates sx={{ color: colors.primary }} />
                  <Typography variant="h6" fontWeight={600}>Recommendations</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {result.recommendations.map((rec, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <CheckCircle sx={{ fontSize: 18, color: colors.primary, mt: 0.3 }} />
                      <Typography variant="body2">{rec}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </MotionBox>
      </Box>
    );
  }

  // Render input form
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700}>Engagement Validator</Typography>
          <Typography variant="body2" sx={{ color: colors.textMuted, mt: 0.5 }}>
            Analyze influencer authenticity using GPT-5.2 - detect fake followers and bot activity
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
        )}

        {/* Input Mode Tabs */}
        <Card sx={{ mb: 3 }}>
          <Tabs value={inputMode} onChange={(e, v) => setInputMode(v)} sx={{ borderBottom: `1px solid ${colors.border}` }}>
            <Tab icon={<LinkIcon />} iconPosition="start" label="Enter URL" />
            <Tab icon={<History />} iconPosition="start" label="Use Cached Analysis" />
          </Tabs>
          <CardContent sx={{ p: 4 }}>
            {/* URL Input Mode */}
            {inputMode === 0 && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2, color: colors.textSecondary }}>
                  Enter a YouTube or TikTok video URL to analyze engagement authenticity
                </Typography>

                {/* Platform Selection */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {Object.entries(platformConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = platform === key;
                    return (
                      <Grid item xs={6} key={key}>
                        <Box
                          onClick={() => setPlatform(key)}
                          sx={{
                            p: 2, borderRadius: 2, cursor: 'pointer', textAlign: 'center',
                            border: `2px solid ${isSelected ? config.color : colors.border}`,
                            background: isSelected ? `${config.color}10` : colors.background,
                            transition: 'all 200ms', '&:hover': { borderColor: config.color },
                          }}
                        >
                          <Icon sx={{ fontSize: 32, color: config.color, mb: 0.5 }} />
                          <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>{config.label}</Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>

                <TextField
                  fullWidth
                  label="Video URL"
                  placeholder={platform === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://tiktok.com/@user/video/...'}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </Box>
            )}

            {/* Cached Analysis Mode */}
            {inputMode === 1 && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2, color: colors.textSecondary }}>
                  Select a previous comment analysis to run engagement validation
                </Typography>

                {loadingAnalyses ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={32} /></Box>
                ) : cachedAnalyses.length > 0 ? (
                  <FormControl fullWidth>
                    <InputLabel>Select Analysis</InputLabel>
                    <Select
                      value={selectedAnalysisId}
                      label="Select Analysis"
                      onChange={(e) => setSelectedAnalysisId(e.target.value)}
                    >
                      {cachedAnalyses.map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {a.platform === 'youtube' ? <YouTube sx={{ color: '#FF0000', fontSize: 20 }} /> : <TikTokIcon sx={{ fontSize: 20 }} />}
                            <Box>
                              <Typography variant="body2">{a.video_title}</Typography>
                              <Typography variant="caption" sx={{ color: colors.textMuted }}>
                                {a.comment_count} comments - {new Date(a.created_at).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Alert severity="info">
                    No cached analyses found. Run a comment analysis first or enter a URL above.
                  </Alert>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Cost & Submit */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" sx={{ color: colors.textMuted }}>Cost</Typography>
                <Typography variant="h5" fontWeight={700}>{tokenCost?.token_cost || 20} tokens</Typography>
                <Typography variant="caption" sx={{ color: tokenCost?.can_afford ? colors.success : colors.error }}>
                  Balance: {tokenBalance} tokens
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <VerifiedUser />}
                onClick={handleValidate}
                disabled={loading || !canSubmit || (tokenCost && !tokenCost.can_afford)}
              >
                {loading ? 'Analyzing...' : 'Validate Engagement'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Alert severity="info" sx={{ mt: 3 }}>
          Powered by GPT-5.2 for advanced engagement analysis. Examines metrics, ratios, and comment patterns to detect fake engagement.
        </Alert>
      </MotionBox>
    </Box>
  );
};

export default EngagementValidator;
