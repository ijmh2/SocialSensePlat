import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Divider,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  Download,
  YouTube,
  VideoLibrary,
  Comment,
  TrendingUp,
  FilterAlt,
  Lightbulb,
  SentimentSatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  ExpandMore,
  ExpandLess,
  Star,
  EmojiEvents,
  Warning,
  TipsAndUpdates,
  Psychology,
  Search,
  ThumbUp,
  CompareArrows,
  Visibility,
  PictureAsPdf,
  VerifiedUser,
  Flag,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import Collapse from '@mui/material/Collapse';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

import { analysisApi } from '../utils/api';
import { generateAnalysisPDF } from '../utils/pdfExport';
import TikTokIcon from '../components/icons/TikTokIcon';
import ActionPlanCard from '../components/ActionPlanCard';
import ScoreBreakdown from '../components/ScoreBreakdown';

const MotionBox = motion(Box);

const AnalysisDetail = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState('all'); // 'all', 'positive', 'neutral', 'negative'

  useEffect(() => {
    loadAnalysis();
  }, [id]);

  // Separate effect for polling - only runs when status is processing
  useEffect(() => {
    if (analysis?.status !== 'processing') return;

    const interval = setInterval(() => {
      loadAnalysis(true); // silent update
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.status, id]);

  const loadAnalysis = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data } = await analysisApi.getAnalysis(id);
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analysis');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await analysisApi.exportCsv(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analysis-${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url); // Prevent memory leak
      toast.success('CSV exported successfully');
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const handlePdfExport = () => {
    try {
      generateAnalysisPDF(analysis);
      toast.success('PDF export opened in new tab');
    } catch (err) {
      toast.error(err.message || 'Failed to export PDF');
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'youtube':
        return <YouTube sx={{ fontSize: 24, color: '#FF0000' }} />;
      case 'tiktok':
        return <TikTokIcon sx={{ fontSize: 24, color: '#000000' }} />;
      default:
        return <VideoLibrary sx={{ fontSize: 24 }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'processing':
        return theme.palette.warning.main;
      case 'failed':
        return theme.palette.error.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return theme.palette.success.main;
    if (score >= 60) return theme.palette.primary.main;
    if (score >= 40) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return 'Exceptional';
    if (score >= 75) return 'Strong';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    if (score >= 20) return 'Poor';
    return 'Critical';
  };

  const getScoreIcon = (score) => {
    if (score >= 75) return <EmojiEvents sx={{ fontSize: 20, color: '#FFD700' }} />;
    if (score >= 60) return <Star sx={{ fontSize: 20, color: theme.palette.primary.main }} />;
    if (score >= 40) return <TrendingUp sx={{ fontSize: 20, color: theme.palette.warning.main }} />;
    return <Warning sx={{ fontSize: 20, color: theme.palette.error.main }} />;
  };

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.info.main,
    '#14B8A6',
    '#F59E0B',
    '#8B5CF6',
  ];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Alert severity="error" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/history')}>
          Back to History
        </Button>
      </Box>
    );
  }

  if (!analysis) {
    return null;
  }

  let keywords = [];
  try {
    keywords = Array.isArray(analysis.keywords)
      ? analysis.keywords
      : (typeof analysis.keywords === 'string' ? JSON.parse(analysis.keywords) : []);
  } catch (e) { console.error('Error parsing keywords', e); }

  let themes = [];
  try {
    themes = Array.isArray(analysis.themes)
      ? analysis.themes
      : (typeof analysis.themes === 'string' ? JSON.parse(analysis.themes) : []);
  } catch (e) { console.error('Error parsing themes', e); }

  const filterStats = analysis.filter_stats || {};

  let comments = [];
  try {
    comments = Array.isArray(analysis.raw_comments)
      ? analysis.raw_comments
      : (typeof analysis.raw_comments === 'string' ? JSON.parse(analysis.raw_comments) : []);
  } catch (e) { console.error('Error parsing comments', e); }

  const keywordChartData = keywords
    .filter(k => k && typeof k === 'object')
    .slice(0, 10)
    .map((k) => ({
      name: k.word || 'Unknown',
      count: k.count || 0,
    }));

  const themeChartData = themes
    .filter(t => t && typeof t === 'object')
    .slice(0, 8)
    .map((t) => ({
      name: t.theme || 'Unknown',
      count: t.count || 0,
    }));

  const filterPieData = [
    { name: 'Analyzed', value: filterStats.after_hard_filters || 0 },
    { name: 'Emoji Only', value: filterStats.emoji_only || 0 },
    { name: 'Spam/Promo', value: filterStats.spam_promo || 0 },
    { name: 'Duplicates', value: filterStats.duplicates || 0 },
  ].filter((d) => d.value > 0);

  // Sentiment data
  let sentimentScores = {};
  try {
    sentimentScores = typeof analysis.sentiment_scores === 'string'
      ? JSON.parse(analysis.sentiment_scores)
      : (analysis.sentiment_scores || {});
  } catch (e) { console.error('Error parsing sentiment_scores', e); }

  const sentimentPieData = [
    { name: 'Positive', value: sentimentScores.positive || 0, color: theme.palette.success.main },
    { name: 'Neutral', value: sentimentScores.neutral || 0, color: theme.palette.grey[500] },
    { name: 'Negative', value: sentimentScores.negative || 0, color: theme.palette.error.main },
  ].filter((d) => d.value > 0);

  const SENTIMENT_COLORS = [theme.palette.success.main, theme.palette.grey[500], theme.palette.error.main];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, gap: 2, mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/history')}
          variant="outlined"
          sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
        >
          Back
        </Button>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {getPlatformIcon(analysis.platform)}
            <Typography variant="h5" fontWeight={700}>
              {analysis.video_title || 'Analysis Results'}
            </Typography>
            <Chip
              label={analysis.status}
              size="small"
              sx={{
                background: alpha(getStatusColor(analysis.status), 0.15),
                color: getStatusColor(analysis.status),
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            />
            {analysis.has_video && (
              <Chip
                icon={<VideoLibrary sx={{ fontSize: 16 }} />}
                label="Video"
                size="small"
                sx={{
                  background: alpha(theme.palette.info.main, 0.15),
                  color: theme.palette.info.main,
                  fontWeight: 600,
                }}
              />
            )}
            {analysis.is_my_video && analysis.video_score != null && (
              <Chip
                icon={getScoreIcon(analysis.video_score)}
                label={`Score: ${analysis.video_score} - ${getScoreLabel(analysis.video_score)}`}
                size="small"
                sx={{
                  background: alpha(getScoreColor(analysis.video_score), 0.15),
                  color: getScoreColor(analysis.video_score),
                  fontWeight: 600,
                  '& .MuiChip-icon': {
                    color: 'inherit',
                  },
                }}
              />
            )}
            {analysis.is_competitor && (
              <Chip
                icon={<CompareArrows sx={{ fontSize: 16 }} />}
                label="Competitor"
                size="small"
                sx={{
                  background: alpha('#E53E3E', 0.15),
                  color: '#E53E3E',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {formatDate(analysis.created_at)} • {analysis.tokens_used} tokens used
            {analysis.is_my_video && ' • My Video'}
          </Typography>
        </Box>
        {analysis.status === 'completed' && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
            <Button
              variant="outlined"
              startIcon={<CompareArrows />}
              onClick={() => navigate(`/compare?a=${id}`)}
              size="small"
              sx={{
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                '&:hover': {
                  borderColor: theme.palette.primary.dark,
                  background: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              Compare
            </Button>
            <Button
              variant="contained"
              startIcon={<PictureAsPdf />}
              onClick={handlePdfExport}
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)',
                },
              }}
            >
              PDF
            </Button>
            {analysis.raw_comments?.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExport}
                size="small"
              >
                CSV
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Processing Alert */}
      {analysis.status === 'processing' && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} />
            <Typography>
              Analysis in progress... This may take a few minutes.
              The page will update automatically when results are ready.
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Failed Alert */}
      {analysis.status === 'failed' && (
        <Alert severity="error" sx={{ mb: 4 }}>
          <Typography fontWeight={600}>Analysis Failed</Typography>
          <Typography>{analysis.error_message || 'An unexpected error occurred during analysis.'}</Typography>
        </Alert>
      )}

      {/* Priority Improvement Tip */}
      {analysis.is_my_video && analysis.priority_improvement && (
        <Card
          sx={{
            mb: 3,
            background: alpha(theme.palette.warning.main, 0.05),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <TipsAndUpdates sx={{ color: theme.palette.warning.main, mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600} color="warning.main" sx={{ mb: 0.5 }}>
                Priority Improvement
              </Typography>
              <Typography variant="body1">
                {analysis.priority_improvement}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Score Breakdown */}
      {analysis.is_my_video && analysis.video_score != null && analysis.score_breakdown && (
        <ScoreBreakdown
          breakdown={analysis.score_breakdown}
          totalScore={analysis.video_score}
        />
      )}

      {/* Creator Notes Reality Check */}
      {analysis.is_my_video && analysis.creator_notes && (
        <Card
          sx={{
            mb: 3,
            background: alpha(theme.palette.info.main, 0.05),
            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              <Psychology sx={{ color: theme.palette.info.main, mt: 0.5 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={600} color="info.main" sx={{ mb: 0.5 }}>
                  Your Pre-Analysis Notes
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  "{analysis.creator_notes}"
                </Typography>
              </Box>
            </Box>
            {analysis.notes_assessment && (
              <Box
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  AI Reality Check
                </Typography>
                <Typography variant="body2">
                  {analysis.notes_assessment}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Competitor Analysis Intelligence */}
      {analysis.is_competitor && (
        <Card
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)',
            border: '1px solid #FECACA',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#E53E3E',
                }}
              >
                <Visibility sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ color: '#991B1B' }}>
                  Competitor Intelligence Report
                </Typography>
                <Typography variant="body2" sx={{ color: '#B91C1C' }}>
                  Strategic insights extracted from competitor's audience
                </Typography>
              </Box>
            </Box>

            {analysis.competitor_notes && (
              <Box
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.5)',
                  border: '1px dashed #FECACA',
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  YOUR QUESTION:
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                  "{analysis.competitor_notes}"
                </Typography>
              </Box>
            )}

            {analysis.competitor_analysis && (
              <Box
                sx={{
                  '& h3': {
                    fontSize: '1rem',
                    fontWeight: 700,
                    mt: 2,
                    mb: 1,
                    color: '#991B1B',
                  },
                  '& p': {
                    mb: 1.5,
                    lineHeight: 1.7,
                  },
                  '& ul, & ol': {
                    mb: 1.5,
                    pl: 2,
                  },
                  '& li': {
                    mb: 0.5,
                  },
                  '& strong': {
                    color: '#7F1D1D',
                  },
                }}
              >
                <ReactMarkdown skipHtml>{analysis.competitor_analysis}</ReactMarkdown>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Plan */}
      {analysis.status === 'completed' && analysis.action_items?.length > 0 && (
        <ActionPlanCard
          analysisId={analysis.id}
          actionItems={analysis.action_items}
          onUpdate={(updatedItems) => {
            setAnalysis(prev => ({ ...prev, action_items: updatedItems }));
          }}
        />
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Comment sx={{ fontSize: 32, color: theme.palette.primary.main, mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>
                {analysis.comment_count?.toLocaleString() || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Comments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <FilterAlt sx={{ fontSize: 32, color: theme.palette.secondary.main, mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>
                {filterStats.after_hard_filters?.toLocaleString() || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Analyzed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 32, color: theme.palette.success.main, mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>
                {keywords.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Keywords
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Lightbulb sx={{ fontSize: 32, color: theme.palette.warning.main, mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>
                {themes.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Themes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="AI Analysis" />
          <Tab label="Keywords & Themes" />
          <Tab label="Sentiment" />
          <Tab label="Filter Stats" />
          {analysis.engagement_validation && <Tab label="Engagement" icon={<VerifiedUser sx={{ fontSize: 18 }} />} iconPosition="start" />}
        </Tabs>
      </Card>

      {/* Tab Content */}
      {activeTab === 0 && (
        <MotionBox
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Video Transcript Section */}
          {analysis.video_transcript && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setTranscriptOpen(!transcriptOpen)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VideoLibrary sx={{ color: theme.palette.info.main }} />
                    <Typography variant="h6" fontWeight={600}>
                      Video Transcript
                    </Typography>
                    <Chip label={`${analysis.video_transcript.length.toLocaleString()} chars`} size="small" />
                  </Box>
                  {transcriptOpen ? <ExpandLess /> : <ExpandMore />}
                </Box>
                <Collapse in={transcriptOpen}>
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: 2,
                      background: alpha(theme.palette.info.main, 0.05),
                      maxHeight: 400,
                      overflowY: 'auto',
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                      {analysis.video_transcript}
                    </Typography>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent sx={{ p: 4 }}>
              {analysis.summary ? (
                <Box
                  sx={{
                    '& h2': {
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      mt: 3,
                      mb: 2,
                      color: theme.palette.primary.main,
                    },
                    '& h3': {
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      mt: 2,
                      mb: 1,
                    },
                    '& p': {
                      mb: 2,
                      lineHeight: 1.7,
                    },
                    '& ul, & ol': {
                      mb: 2,
                      pl: 3,
                    },
                    '& li': {
                      mb: 1,
                    },
                    '& strong': {
                      color: theme.palette.text.primary,
                    },
                    '& hr': {
                      my: 3,
                      borderColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <ReactMarkdown skipHtml>{analysis.summary}</ReactMarkdown>
                </Box>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No AI analysis available for this report.
                </Typography>
              )}
            </CardContent>
          </Card>
        </MotionBox>
      )}

      {activeTab === 1 && (
        <MotionBox
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Grid container spacing={3}>
            {/* Keywords Chart */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                    Top Keywords
                  </Typography>
                  {keywordChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={keywordChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                        <XAxis type="number" stroke={theme.palette.text.secondary} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          stroke={theme.palette.text.secondary}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: theme.palette.background.paper,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            borderRadius: 8,
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill={theme.palette.primary.main}
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="text.secondary" textAlign="center" py={4}>
                      No keyword data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Themes Chart */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                    Top Themes
                  </Typography>
                  {themeChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={themeChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                        <XAxis type="number" stroke={theme.palette.text.secondary} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={120}
                          stroke={theme.palette.text.secondary}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: theme.palette.background.paper,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            borderRadius: 8,
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill={theme.palette.secondary.main}
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="text.secondary" textAlign="center" py={4}>
                      No theme data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Keyword List */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    All Keywords
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {keywords.map((k, i) => (
                      <Chip
                        key={k.word}
                        label={`${k.word} (${k.count})`}
                        size="small"
                        sx={{
                          background: alpha(COLORS[i % COLORS.length], 0.15),
                          color: COLORS[i % COLORS.length],
                        }}
                      />
                    ))}
                    {keywords.length === 0 && (
                      <Typography color="text.secondary">No keywords extracted</Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </MotionBox>
      )}

      {/* Sentiment Tab */}
      {activeTab === 2 && (
        <MotionBox
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Grid container spacing={3}>
            {/* Sentiment Pie Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                    Sentiment Distribution
                  </Typography>
                  {sentimentPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={sentimentPieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={60}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                          }
                        >
                          {sentimentPieData.map((entry, index) => (
                            <Cell key={index} fill={SENTIMENT_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: theme.palette.background.paper,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            borderRadius: 8,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="text.secondary" textAlign="center" py={4}>
                      No sentiment data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Sentiment Stats */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                    Sentiment Breakdown
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 2,
                        background: alpha(theme.palette.success.main, 0.1),
                        cursor: 'pointer',
                        border: sentimentFilter === 'positive' ? `2px solid ${theme.palette.success.main}` : '2px solid transparent',
                        transition: 'all 0.2s',
                        '&:hover': { background: alpha(theme.palette.success.main, 0.15) },
                      }}
                      onClick={() => setSentimentFilter(sentimentFilter === 'positive' ? 'all' : 'positive')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SentimentSatisfied sx={{ color: theme.palette.success.main }} />
                        <Typography variant="body1" fontWeight={500}>Positive</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h5" fontWeight={700} color="success.main">
                          {sentimentScores.positive || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {sentimentScores.positive_pct?.toFixed(1) || 0}%
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 2,
                        background: alpha(theme.palette.grey[500], 0.1),
                        cursor: 'pointer',
                        border: sentimentFilter === 'neutral' ? `2px solid ${theme.palette.grey[500]}` : '2px solid transparent',
                        transition: 'all 0.2s',
                        '&:hover': { background: alpha(theme.palette.grey[500], 0.15) },
                      }}
                      onClick={() => setSentimentFilter(sentimentFilter === 'neutral' ? 'all' : 'neutral')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SentimentNeutral sx={{ color: theme.palette.grey[500] }} />
                        <Typography variant="body1" fontWeight={500}>Neutral</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h5" fontWeight={700} color="text.secondary">
                          {sentimentScores.neutral || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {sentimentScores.neutral_pct?.toFixed(1) || 0}%
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 2,
                        background: alpha(theme.palette.error.main, 0.1),
                        cursor: 'pointer',
                        border: sentimentFilter === 'negative' ? `2px solid ${theme.palette.error.main}` : '2px solid transparent',
                        transition: 'all 0.2s',
                        '&:hover': { background: alpha(theme.palette.error.main, 0.15) },
                      }}
                      onClick={() => setSentimentFilter(sentimentFilter === 'negative' ? 'all' : 'negative')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SentimentDissatisfied sx={{ color: theme.palette.error.main }} />
                        <Typography variant="body1" fontWeight={500}>Negative</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h5" fontWeight={700} color="error.main">
                          {sentimentScores.negative || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {sentimentScores.negative_pct?.toFixed(1) || 0}%
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 2,
                        background: alpha(theme.palette.primary.main, 0.05),
                      }}
                    >
                      <Typography variant="body1" fontWeight={500}>Total Analyzed</Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {sentimentScores.total || 0}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 2,
                        background: alpha(theme.palette.primary.main, 0.05),
                      }}
                    >
                      <Typography variant="body1" fontWeight={500}>Average Score</Typography>
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        color={
                          (sentimentScores.average_score || 0) > 0.1
                            ? 'success.main'
                            : (sentimentScores.average_score || 0) < -0.1
                              ? 'error.main'
                              : 'text.secondary'
                        }
                      >
                        {(sentimentScores.average_score || 0).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Filtered Comments */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight={600}>
                      Comments by Sentiment
                      {sentimentFilter !== 'all' && (
                        <Chip
                          label={sentimentFilter}
                          size="small"
                          onDelete={() => setSentimentFilter('all')}
                          sx={{
                            ml: 2,
                            textTransform: 'capitalize',
                            background: sentimentFilter === 'positive'
                              ? alpha(theme.palette.success.main, 0.15)
                              : sentimentFilter === 'negative'
                                ? alpha(theme.palette.error.main, 0.15)
                                : alpha(theme.palette.grey[500], 0.15),
                            color: sentimentFilter === 'positive'
                              ? theme.palette.success.main
                              : sentimentFilter === 'negative'
                                ? theme.palette.error.main
                                : theme.palette.grey[600],
                          }}
                        />
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click sentiment rows above to filter
                    </Typography>
                  </Box>
                  <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                    {comments
                      .filter(c => sentimentFilter === 'all' || c.sentiment?.label === sentimentFilter)
                      .slice(0, 50)
                      .map((comment, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            p: 2,
                            mb: 1,
                            borderRadius: 2,
                            background: alpha(
                              comment.sentiment?.label === 'positive'
                                ? theme.palette.success.main
                                : comment.sentiment?.label === 'negative'
                                  ? theme.palette.error.main
                                  : theme.palette.grey[500],
                              0.05
                            ),
                            borderLeft: `3px solid ${
                              comment.sentiment?.label === 'positive'
                                ? theme.palette.success.main
                                : comment.sentiment?.label === 'negative'
                                  ? theme.palette.error.main
                                  : theme.palette.grey[400]
                            }`,
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={600} color="text.secondary">
                              {comment.user || 'Anonymous'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {comment.likes > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <ThumbUp sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {comment.likes}
                                  </Typography>
                                </Box>
                              )}
                              <Chip
                                label={comment.sentiment?.label || 'unknown'}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  textTransform: 'capitalize',
                                  background: comment.sentiment?.label === 'positive'
                                    ? alpha(theme.palette.success.main, 0.15)
                                    : comment.sentiment?.label === 'negative'
                                      ? alpha(theme.palette.error.main, 0.15)
                                      : alpha(theme.palette.grey[500], 0.15),
                                  color: comment.sentiment?.label === 'positive'
                                    ? theme.palette.success.main
                                    : comment.sentiment?.label === 'negative'
                                      ? theme.palette.error.main
                                      : theme.palette.grey[600],
                                }}
                              />
                            </Box>
                          </Box>
                          <Typography variant="body2">
                            {comment.clean_text || comment.text}
                          </Typography>
                        </Box>
                      ))}
                    {comments.filter(c => sentimentFilter === 'all' || c.sentiment?.label === sentimentFilter).length === 0 && (
                      <Typography color="text.secondary" textAlign="center" py={4}>
                        No comments found with this sentiment
                      </Typography>
                    )}
                    {comments.filter(c => sentimentFilter === 'all' || c.sentiment?.label === sentimentFilter).length > 50 && (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                        Showing first 50 of {comments.filter(c => sentimentFilter === 'all' || c.sentiment?.label === sentimentFilter).length} comments
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </MotionBox>
      )}

      {/* Filter Stats Tab */}
      {activeTab === 3 && (
        <MotionBox
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                    Filter Breakdown
                  </Typography>
                  {filterPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={filterPieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                          }
                        >
                          {filterPieData.map((entry, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: theme.palette.background.paper,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            borderRadius: 8,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography color="text.secondary" textAlign="center" py={4}>
                      No filter data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                    Filter Statistics
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[
                      { label: 'Original Comments', value: filterStats.original },
                      { label: 'Emoji-only Removed', value: filterStats.emoji_only },
                      { label: 'Spam/Promo Removed', value: filterStats.spam_promo },
                      { label: 'Duplicates Removed', value: filterStats.duplicates },
                      { label: 'Generic Praise (flagged)', value: filterStats.generic_praise },
                      { label: 'Off-topic (flagged)', value: filterStats.off_topic },
                      { label: 'Final Analyzed', value: filterStats.after_hard_filters },
                    ].map((stat) => (
                      <Box
                        key={stat.label}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          p: 1.5,
                          borderRadius: 2,
                          background: alpha(theme.palette.primary.main, 0.05),
                        }}
                      >
                        <Typography variant="body2">{stat.label}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {stat.value?.toLocaleString() || 0}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </MotionBox>
      )}

      {/* Engagement Validation Tab */}
      {activeTab === 4 && analysis.engagement_validation && (
        <MotionBox
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {(() => {
            const eng = analysis.engagement_validation;
            const getVerdictColor = (verdict) => {
              if (verdict?.includes('Highly Authentic') || verdict?.includes('Likely Authentic')) return theme.palette.success.main;
              if (verdict?.includes('Some Concerns')) return theme.palette.warning.main;
              return theme.palette.error.main;
            };
            const getScoreGradient = (score) => {
              if (score >= 75) return 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)';
              if (score >= 60) return 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)';
              if (score >= 40) return 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)';
              return 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)';
            };

            return (
              <Grid container spacing={3}>
                {/* Authenticity Score Card */}
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <Box
                        sx={{
                          width: 120,
                          height: 120,
                          borderRadius: '50%',
                          background: getScoreGradient(eng.authenticityScore),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                          boxShadow: `0 8px 32px ${alpha(getVerdictColor(eng.verdict), 0.3)}`,
                        }}
                      >
                        <Typography variant="h3" fontWeight={800} sx={{ color: 'white' }}>
                          {eng.authenticityScore ?? '?'}
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                        Authenticity Score
                      </Typography>
                      <Chip
                        label={eng.verdict || 'Unknown'}
                        sx={{
                          background: alpha(getVerdictColor(eng.verdict), 0.15),
                          color: getVerdictColor(eng.verdict),
                          fontWeight: 600,
                          fontSize: '0.9rem',
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>

                {/* Metrics Analysis */}
                <Grid item xs={12} md={8}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp sx={{ color: theme.palette.primary.main }} />
                        Engagement Metrics
                      </Typography>
                      {eng.metricsAnalysis && (
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={4}>
                            <Box sx={{ p: 2, borderRadius: 2, background: alpha(theme.palette.primary.main, 0.05) }}>
                              <Typography variant="caption" color="text.secondary">Views</Typography>
                              <Typography variant="h6" fontWeight={600}>
                                {eng.metricsAnalysis.viewCount?.toLocaleString() || 0}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={4}>
                            <Box sx={{ p: 2, borderRadius: 2, background: alpha(theme.palette.primary.main, 0.05) }}>
                              <Typography variant="caption" color="text.secondary">Likes</Typography>
                              <Typography variant="h6" fontWeight={600}>
                                {eng.metricsAnalysis.likeCount?.toLocaleString() || 0}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={4}>
                            <Box sx={{ p: 2, borderRadius: 2, background: alpha(theme.palette.primary.main, 0.05) }}>
                              <Typography variant="caption" color="text.secondary">Comments</Typography>
                              <Typography variant="h6" fontWeight={600}>
                                {eng.metricsAnalysis.commentCount?.toLocaleString() || 0}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={4}>
                            <Box sx={{ p: 2, borderRadius: 2, background: alpha(theme.palette.success.main, 0.05) }}>
                              <Typography variant="caption" color="text.secondary">Engagement Rate</Typography>
                              <Typography variant="h6" fontWeight={600} color="success.main">
                                {eng.metricsAnalysis.engagementRate?.toFixed(2) || 0}%
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={4}>
                            <Box sx={{ p: 2, borderRadius: 2, background: alpha(theme.palette.info.main, 0.05) }}>
                              <Typography variant="caption" color="text.secondary">Likes/Views</Typography>
                              <Typography variant="h6" fontWeight={600} color="info.main">
                                {eng.metricsAnalysis.likesToViews?.toFixed(2) || 0}%
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={4}>
                            <Box sx={{ p: 2, borderRadius: 2, background: alpha(theme.palette.secondary.main, 0.05) }}>
                              <Typography variant="caption" color="text.secondary">Comments/Likes</Typography>
                              <Typography variant="h6" fontWeight={600} color="secondary.main">
                                {eng.metricsAnalysis.commentsToLikes?.toFixed(2) || 0}%
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Comment Analysis */}
                {eng.commentAnalysis && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Comment sx={{ color: theme.palette.secondary.main }} />
                          Comment Patterns
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, borderRadius: 2, background: alpha(theme.palette.warning.main, 0.05) }}>
                            <Typography variant="body2">Emoji-Only Comments</Typography>
                            <Typography variant="body2" fontWeight={600} color="warning.main">
                              {eng.commentAnalysis.emojiOnlyPct?.toFixed(1) || 0}%
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, borderRadius: 2, background: alpha(theme.palette.warning.main, 0.05) }}>
                            <Typography variant="body2">Generic Phrases</Typography>
                            <Typography variant="body2" fontWeight={600} color="warning.main">
                              {eng.commentAnalysis.genericPct?.toFixed(1) || 0}%
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, borderRadius: 2, background: alpha(theme.palette.error.main, 0.05) }}>
                            <Typography variant="body2">Duplicate Comments</Typography>
                            <Typography variant="body2" fontWeight={600} color="error.main">
                              {eng.commentAnalysis.duplicatePct?.toFixed(1) || 0}%
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, borderRadius: 2, background: alpha(theme.palette.primary.main, 0.05) }}>
                            <Typography variant="body2">Total Analyzed</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {eng.commentAnalysis.total?.toLocaleString() || 0}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* AI Assessment */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Psychology sx={{ color: theme.palette.info.main }} />
                        AI Assessment
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {eng.engagementAssessment && (
                          <Box sx={{ p: 2, borderRadius: 2, background: alpha(theme.palette.primary.main, 0.05) }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Engagement</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>{eng.engagementAssessment}</Typography>
                          </Box>
                        )}
                        {eng.ratioAnalysis && (
                          <Box sx={{ p: 2, borderRadius: 2, background: alpha(theme.palette.info.main, 0.05) }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Ratio Analysis</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>{eng.ratioAnalysis}</Typography>
                          </Box>
                        )}
                        {eng.commentQuality && (
                          <Box sx={{ p: 2, borderRadius: 2, background: alpha(theme.palette.secondary.main, 0.05) }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Comment Quality</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>{eng.commentQuality}</Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Red Flags */}
                {eng.redFlags?.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card sx={{ border: `1px solid ${alpha(theme.palette.error.main, 0.3)}` }}>
                      <CardContent>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                          <Flag sx={{ color: theme.palette.error.main }} />
                          Red Flags ({eng.redFlags.length})
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {eng.redFlags.map((flag, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                background: alpha(theme.palette.error.main, 0.05),
                                borderLeft: `4px solid ${
                                  flag.severity === 'high' ? theme.palette.error.main :
                                  flag.severity === 'medium' ? theme.palette.warning.main :
                                  theme.palette.grey[400]
                                }`,
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="body2" fontWeight={600}>{flag.flag}</Typography>
                                <Chip
                                  label={flag.severity}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    textTransform: 'uppercase',
                                    background: flag.severity === 'high' ? alpha(theme.palette.error.main, 0.15) :
                                      flag.severity === 'medium' ? alpha(theme.palette.warning.main, 0.15) :
                                      alpha(theme.palette.grey[500], 0.15),
                                    color: flag.severity === 'high' ? theme.palette.error.main :
                                      flag.severity === 'medium' ? theme.palette.warning.main :
                                      theme.palette.grey[600],
                                  }}
                                />
                              </Box>
                              <Typography variant="caption" color="text.secondary">{flag.details}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Positive Signals */}
                {eng.positiveSignals?.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card sx={{ border: `1px solid ${alpha(theme.palette.success.main, 0.3)}` }}>
                      <CardContent>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                          <CheckCircle sx={{ color: theme.palette.success.main }} />
                          Positive Signals ({eng.positiveSignals.length})
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {eng.positiveSignals.map((signal, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                background: alpha(theme.palette.success.main, 0.05),
                                borderLeft: `4px solid ${theme.palette.success.main}`,
                              }}
                            >
                              <Typography variant="body2" fontWeight={600}>{signal.signal}</Typography>
                              <Typography variant="caption" color="text.secondary">{signal.details}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Recommendations */}
                {eng.recommendations?.length > 0 && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Lightbulb sx={{ color: theme.palette.warning.main }} />
                          Recommendations
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {eng.recommendations.map((rec, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                background: alpha(theme.palette.warning.main, 0.05),
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1,
                              }}
                            >
                              <Typography variant="body2" fontWeight={600} sx={{ minWidth: 24 }}>{idx + 1}.</Typography>
                              <Typography variant="body2">{rec}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            );
          })()}
        </MotionBox>
      )}
    </Box>
  );
};

export default AnalysisDetail;
