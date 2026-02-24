import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Collapse,
  LinearProgress,
} from '@mui/material';
import {
  YouTube,
  Search,
  Token,
  Upload,
  Analytics,
  ArrowForward,
  ArrowBack,
  Refresh,
  CheckCircle,
  VideoFile,
  Delete,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';
import { analysisApi } from '../utils/api';
import { colors, shadows } from '../styles/theme';
import TikTokIcon from '../components/icons/TikTokIcon';

const MotionBox = motion(Box);

const steps = ['Enter URL & Upload', 'Configure Options', 'Review & Analyze'];

const CommentAnalysis = () => {
  const navigate = useNavigate();
  const { tokenBalance, refreshTokenBalance } = useAuth();
  const abortControllerRef = useRef(null);

  const [activeStep, setActiveStep] = useState(0);
  const [platform, setPlatform] = useState('youtube');
  const [url, setUrl] = useState('');
  const [maxComments, setMaxComments] = useState(1000);
  const [includeTextAnalysis, setIncludeTextAnalysis] = useState(true);
  const [includeMarketing, setIncludeMarketing] = useState(false);
  const [includeEngagement, setIncludeEngagement] = useState(false);
  const [productDescription, setProductDescription] = useState('');
  const [productImage, setProductImage] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [isMyVideo, setIsMyVideo] = useState(false);
  const [isCompetitor, setIsCompetitor] = useState(false);
  const [creatorNotes, setCreatorNotes] = useState('');
  const [competitorNotes, setCompetitorNotes] = useState('');
  const [harshFeedback, setHarshFeedback] = useState(false);

  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [requestId, setRequestId] = useState(null); // REQUEST ID FOR POLLING
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState('');

  // Live progress tracking
  const [progressStage, setProgressStage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [commentsCollected, setCommentsCollected] = useState(0);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Poll for REAL progress updates from backend
  useEffect(() => {
    let interval;
    if (analyzing && requestId) {
      // Immediate initial check
      const checkProgress = async () => {
        try {
          const { data } = await analysisApi.getProgress(requestId);
          if (data) {
            if (data.percent > 0) setProgressPercent(data.percent);
            if (data.count > 0) setCommentsCollected(data.count);

            if (data.stage === 'scraping') {
              setProgressStage(`Scraping comments... (${data.count} collected)`);
            } else if (data.stage === 'processing') {
              setProgressStage('Processing & filtering comments...');
            } else if (data.stage === 'analyzing_sentiment') {
              setProgressStage('Analyzing comment sentiment...');
            } else if (data.stage === 'extracting_video') {
              setProgressStage('Extracting video frames...');
            } else if (data.stage === 'transcribing_audio') {
              setProgressStage('Transcribing video audio...');
            } else if (data.stage === 'analyzing_ai') {
              const waitTime = data.count > 1000 ? '3-5 minutes' : '30-60 seconds';
              setProgressStage(`Running AI analysis (this takes ${waitTime})...`);
            } else if (data.stage === 'validating_engagement') {
              setProgressStage('Validating engagement authenticity...');
            } else if (data.stage === 'fetching_details') {
              setProgressStage('Fetching video details...');
            }
          }
        } catch (err) {
          // Ignore 404s (analysis hasn't started yet)
        }
      };

      checkProgress();
      interval = setInterval(checkProgress, 1000);
    }
    return () => clearInterval(interval);
  }, [analyzing, requestId]);

  const handleEstimate = async () => {
    if (!url.trim()) {
      setError('Please enter a video URL');
      return;
    }

    if (platform === 'youtube' && !url.includes('youtube.com') && !url.includes('youtu.be')) {
      setError('Please enter a valid YouTube URL');
      return;
    }
    if (platform === 'tiktok' && !url.includes('tiktok.com')) {
      setError('Please enter a valid TikTok URL');
      return;
    }

    setError('');
    setErrorDetails('');
    setEstimating(true);
    setProgressStage('Fetching video information...');

    try {
      const { data } = await analysisApi.estimate({
        url,
        platform,
        include_text_analysis: includeTextAnalysis,
        include_marketing: includeMarketing,
        include_engagement: includeEngagement,
        has_video: !!videoFile,
      });

      setEstimate(data);
      setActiveStep(2);
      setProgressStage('');
    } catch (err) {
      console.error('Estimate error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to fetch video information';
      const errorDetail = err.response?.data?.details || '';
      setError(errorMsg);
      setErrorDetails(errorDetail);

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Request timed out. Please check your internet connection and try again.');
      }
    } finally {
      setEstimating(false);
      setProgressStage('');
    }
  };

  const handleAnalyze = async () => {
    if (!estimate?.can_afford) {
      toast.error('Insufficient tokens. Please purchase more.');
      navigate('/tokens');
      return;
    }

    // Generate unique ID for this analysis request
    const newRequestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setRequestId(newRequestId);

    setAnalyzing(true);
    setError('');
    setErrorDetails('');
    setProgressStage('Starting analysis...');
    setProgressPercent(5);
    setCommentsCollected(0);

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('url', url);
      formData.append('platform', platform);
      formData.append('max_comments', maxComments);
      formData.append('include_text_analysis', includeTextAnalysis);
      formData.append('include_marketing', includeMarketing);
      formData.append('include_engagement', includeEngagement);
      formData.append('request_id', newRequestId); // Tell backend to track this ID

      if (includeMarketing) {
        formData.append('product_description', productDescription);
        if (productImage) {
          formData.append('product_image', productImage);
        }
      }

      if (videoFile) {
        formData.append('video', videoFile);
      }

      // Account score fields
      formData.append('is_my_video', isMyVideo);
      formData.append('is_competitor', isCompetitor);
      formData.append('harsh_feedback', harshFeedback);
      if (isMyVideo && creatorNotes.trim()) {
        formData.append('creator_notes', creatorNotes.trim());
      }
      if (isCompetitor && competitorNotes.trim()) {
        formData.append('competitor_notes', competitorNotes.trim());
      }

      const { data } = await analysisApi.analyzeComments(formData);

      await refreshTokenBalance();
      // Analysis runs in background now
      toast.success('Analysis started! Redirecting to status page...');

      setTimeout(() => {
        navigate(`/analysis/${data.analysis_id}`);
      }, 500);
    } catch (err) {
      console.error('Analysis error:', err);

      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        setError('Analysis was cancelled');
        return;
      }

      if (err.response?.status === 402) {
        toast.error('Insufficient tokens');
        navigate('/tokens');
        return;
      }

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Analysis timed out. Try with fewer comments or a different video.');
        return;
      }

      const errorMsg = err.response?.data?.error || 'Analysis failed. Please try again.';
      setError(errorMsg);

      if (err.response?.data?.analysis_id) {
        setErrorDetails('Partial results may be available.');
      }
    } finally {
      setAnalyzing(false);
      setRequestId(null);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setAnalyzing(false);
    setProgressStage('');
    setProgressPercent(0);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setProductImage(file);
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error('Video must be less than 100MB');
        return;
      }
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      setVideoFile(file);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setEstimate(null);
    setError('');
    setErrorDetails('');
    setProgressStage('');
    setProgressPercent(0);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <MotionBox initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: colors.textPrimary }}>
              Select Platform & Enter URL
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              {/* YouTube Card */}
              <Card
                onClick={() => setPlatform('youtube')}
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  borderRadius: '20px',
                  boxShadow: platform === 'youtube' ? shadows.sm : shadows.card,
                  background: colors.background,
                  border: platform === 'youtube' ? '2px solid #FF0000' : 'none',
                  transition: 'all 300ms ease-out',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: platform === 'youtube' ? shadows.sm : shadows.md,
                      background: platform === 'youtube' ? '#FF0000' : '#E0E5EC',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <YouTube sx={{ fontSize: 32, color: platform === 'youtube' ? 'white' : '#FF0000' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600} sx={{ color: colors.textPrimary }}>YouTube</Typography>
                  <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                    1 token per 1,000 comments
                  </Typography>
                </CardContent>
              </Card>

              {/* TikTok Card */}
              <Card
                onClick={() => setPlatform('tiktok')}
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  borderRadius: '20px',
                  boxShadow: platform === 'tiktok' ? shadows.sm : shadows.card,
                  background: colors.background,
                  border: platform === 'tiktok' ? '2px solid #000000' : 'none',
                  transition: 'all 300ms ease-out',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: platform === 'tiktok' ? shadows.sm : shadows.md,
                      background: platform === 'tiktok' ? '#000000' : '#E0E5EC',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <TikTokIcon sx={{ fontSize: 32, color: platform === 'tiktok' ? 'white' : '#000000' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600} sx={{ color: colors.textPrimary }}>TikTok</Typography>
                  <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                    1 token per 100 comments
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Alert severity="info" sx={{ mb: 3, borderRadius: '16px', boxShadow: shadows.sm }}>
              {platform === 'youtube' ? (
                <>
                  <strong>YouTube URL formats:</strong><br />
                  • https://www.youtube.com/watch?v=VIDEO_ID<br />
                  • https://youtu.be/VIDEO_ID
                </>
              ) : (
                <>
                  <strong>TikTok URL formats:</strong><br />
                  • https://www.tiktok.com/@user/video/VIDEO_ID<br />
                  • https://vm.tiktok.com/SHORTCODE
                </>
              )}
            </Alert>

            <TextField
              fullWidth
              label={`${platform === 'youtube' ? 'YouTube' : 'TikTok'} Video URL`}
              placeholder={platform === 'youtube'
                ? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                : 'https://www.tiktok.com/@user/video/1234567890'}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              sx={{ mb: 3 }}
            />

            {/* Optional Video Upload */}
            <Card sx={{ mb: 3, borderRadius: '16px', boxShadow: shadows.sm, background: colors.background }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <VideoFile sx={{ color: colors.primary }} />
                  <Typography variant="body1" fontWeight={600} sx={{ color: colors.textPrimary }}>
                    Enhance with Video Upload (+20 tokens)
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 2 }}>
                  Upload your video file to include audio transcription and visual analysis in the AI insights.
                </Typography>
                {videoFile ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderRadius: '12px', boxShadow: shadows.sm, background: colors.background }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ color: colors.success }} />
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ color: colors.textPrimary }}>{videoFile.name}</Typography>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</Typography>
                      </Box>
                    </Box>
                    <Button size="small" color="error" onClick={() => setVideoFile(null)} startIcon={<Delete />}>
                      Remove
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<Upload />}
                    sx={{ borderRadius: '12px', borderStyle: 'dashed' }}
                  >
                    Upload Video (max 100MB)
                    <input type="file" hidden accept="video/*" onChange={handleVideoUpload} />
                  </Button>
                )}
              </CardContent>
            </Card>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={() => setActiveStep(1)}
              disabled={!url.trim()}
              endIcon={<ArrowForward />}
              sx={{
                borderRadius: '16px',
                py: 1.5,
                boxShadow: shadows.sm,
                background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
              }}
            >
              Continue
            </Button>
          </MotionBox>
        );

      case 1:
        return (
          <MotionBox initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: colors.textPrimary }}>
              Configure Analysis Options
            </Typography>

            <TextField
              fullWidth
              type="number"
              label="Max Comments to Analyze"
              value={maxComments}
              onChange={(e) => setMaxComments(Math.max(1, parseInt(e.target.value) || 100))}
              helperText={`Recommended: ${platform === 'youtube' ? '1000-5000' : '100-500'} for best results`}
              sx={{ mb: 3 }}
              inputProps={{ min: 1, max: platform === 'youtube' ? 50000 : 5000 }}
            />

            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={<Checkbox checked={includeTextAnalysis} onChange={(e) => setIncludeTextAnalysis(e.target.checked)} />}
                label={
                  <Box>
                    <Typography variant="body1" sx={{ color: colors.textPrimary }}>AI Text Analysis</Typography>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      Get actionable insights and recommendations (+5 tokens)
                    </Typography>
                  </Box>
                }
                sx={{ display: 'flex', alignItems: 'flex-start' }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={<Checkbox checked={includeMarketing} onChange={(e) => setIncludeMarketing(e.target.checked)} />}
                label={
                  <Box>
                    <Typography variant="body1" sx={{ color: colors.textPrimary }}>Marketing Analysis</Typography>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      Product positioning and creative recommendations (+5 tokens)
                    </Typography>
                  </Box>
                }
                sx={{ display: 'flex', alignItems: 'flex-start' }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={<Checkbox checked={includeEngagement} onChange={(e) => setIncludeEngagement(e.target.checked)} />}
                label={
                  <Box>
                    <Typography variant="body1" sx={{ color: colors.textPrimary }}>Engagement Validation</Typography>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      Analyze engagement authenticity, detect bot patterns (+20 tokens)
                    </Typography>
                  </Box>
                }
                sx={{ display: 'flex', alignItems: 'flex-start' }}
              />
            </Box>

            <Collapse in={includeMarketing}>
              <Card sx={{ p: 2, mb: 3, borderRadius: '16px', boxShadow: shadows.sm, background: colors.background }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: colors.textPrimary }}>
                  Product Information (Optional)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Product Description"
                  placeholder="Describe your product..."
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button variant="outlined" component="label" startIcon={<Upload />} size="small">
                  {productImage ? productImage.name : 'Upload Product Image'}
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </Button>
              </Card>
            </Collapse>

            <Divider sx={{ my: 3 }} />

            {/* Video Ownership Section */}
            <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: colors.textPrimary }}>
              Whose video is this?
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              {/* My Video Option */}
              <Card
                onClick={() => { setIsMyVideo(true); setIsCompetitor(false); }}
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  borderRadius: '16px',
                  boxShadow: isMyVideo ? shadows.sm : shadows.card,
                  background: colors.background,
                  border: isMyVideo ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                  transition: 'all 200ms ease-out',
                  p: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Checkbox
                    checked={isMyVideo}
                    sx={{ p: 0, color: colors.primary }}
                  />
                  <Typography variant="body1" fontWeight={600} sx={{ color: colors.textPrimary }}>
                    My Video
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  Get a 0-100 score that contributes to your Account Score
                </Typography>
              </Card>

              {/* Competitor Option */}
              <Card
                onClick={() => { setIsCompetitor(true); setIsMyVideo(false); }}
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  borderRadius: '16px',
                  boxShadow: isCompetitor ? shadows.sm : shadows.card,
                  background: colors.background,
                  border: isCompetitor ? '2px solid #E53E3E' : `1px solid ${colors.border}`,
                  transition: 'all 200ms ease-out',
                  p: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Checkbox
                    checked={isCompetitor}
                    sx={{ p: 0, color: '#E53E3E' }}
                  />
                  <Typography variant="body1" fontWeight={600} sx={{ color: colors.textPrimary }}>
                    Competitor
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  Analyze rival content — won't affect your Account Score
                </Typography>
              </Card>
            </Box>

            <Collapse in={isMyVideo}>
              <Card sx={{ p: 2, mb: 3, borderRadius: '16px', boxShadow: shadows.sm, background: colors.surface, border: `1px solid ${colors.border}` }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: colors.textPrimary }}>
                  What do you think went well? (Optional)
                </Typography>
                <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block', mb: 2 }}>
                  Write your self-assessment before seeing results. The AI will compare your beliefs against actual audience reactions.
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="e.g., I think the hook worked well, the call-to-action was clear..."
                  value={creatorNotes}
                  onChange={(e) => setCreatorNotes(e.target.value)}
                />
              </Card>
            </Collapse>

            <Collapse in={isCompetitor}>
              <Card sx={{ p: 2, mb: 3, borderRadius: '16px', boxShadow: shadows.sm, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#991B1B' }}>
                  What do you want to learn? (Optional)
                </Typography>
                <Typography variant="caption" sx={{ color: '#B91C1C', display: 'block', mb: 2 }}>
                  Describe what you're trying to understand about this competitor. The AI will focus on extracting actionable competitive intelligence.
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="e.g., How do they handle objections? What makes their audience engage? What can I copy?"
                  value={competitorNotes}
                  onChange={(e) => setCompetitorNotes(e.target.value)}
                />
              </Card>
            </Collapse>

            {videoFile && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: '16px' }} icon={<VideoFile />}>
                <strong>Video attached:</strong> {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB) — frames and audio will be analyzed
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Feedback Tone */}
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={harshFeedback}
                    onChange={(e) => setHarshFeedback(e.target.checked)}
                    sx={{ color: '#E53E3E', '&.Mui-checked': { color: '#E53E3E' } }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" sx={{ color: colors.textPrimary }}>
                      Harsh Feedback Mode
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      Enable brutally honest criticism — not for the faint-hearted
                    </Typography>
                  </Box>
                }
                sx={{ display: 'flex', alignItems: 'flex-start' }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                size="large"
                onClick={() => setActiveStep(0)}
                startIcon={<ArrowBack />}
                sx={{ borderRadius: '16px', boxShadow: shadows.sm, background: colors.background, border: 'none' }}
              >
                Back
              </Button>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleEstimate}
                disabled={estimating}
                endIcon={estimating ? <CircularProgress size={20} color="inherit" /> : <Search />}
                sx={{ borderRadius: '16px', boxShadow: shadows.sm, background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)' }}
              >
                {estimating ? 'Checking...' : 'Check & Estimate Cost'}
              </Button>
            </Box>

            {estimating && progressStage && (
              <Box sx={{ mt: 3 }}>
                <LinearProgress sx={{ borderRadius: '8px' }} />
                <Typography variant="caption" sx={{ color: colors.textSecondary, mt: 1, display: 'block' }}>
                  {progressStage}
                </Typography>
              </Box>
            )}
          </MotionBox>
        );

      case 2:
        return (
          <MotionBox initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: colors.textPrimary }}>
              Review & Confirm
            </Typography>

            {estimate && (
              <>
                {/* Video Info */}
                <Card sx={{ mb: 3, borderRadius: '20px', boxShadow: shadows.sm, background: colors.background }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1 }}>Video Details</Typography>
                    <Typography variant="h6" fontWeight={600} sx={{ color: colors.textPrimary }}>
                      {estimate.video?.title || 'Video'}
                    </Typography>
                    {estimate.video?.channel && (
                      <Typography variant="body2" sx={{ color: colors.textSecondary }}>{estimate.video.channel}</Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                      <Chip
                        label={`${(estimate.total_comments || estimate.comment_count)?.toLocaleString() || 0} comments found`}
                        size="small"
                        sx={{ boxShadow: shadows.sm, background: colors.background, color: colors.primary, fontWeight: 600 }}
                      />
                      <Chip
                        label={`Analyzing up to ${Math.min(maxComments, estimate.comment_count || maxComments).toLocaleString()}`}
                        size="small"
                        sx={{ boxShadow: shadows.sm, background: colors.background, color: colors.textPrimary }}
                      />
                    </Box>
                    {estimate.is_capped && (
                      <Typography variant="caption" sx={{ color: colors.textSecondary, mt: 1, display: 'block' }}>
                        Capped at {estimate.max_comments?.toLocaleString()} comments to keep everything running smoothly.
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                {/* Cost Breakdown */}
                <Card sx={{ mb: 3, borderRadius: '20px', boxShadow: shadows.card, background: colors.background }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 2 }}>Cost Breakdown</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ color: colors.textPrimary }}>Comment Scraping</Typography>
                      <Typography variant="body2" sx={{ color: colors.textPrimary }}>{estimate.breakdown?.scraping || 1} tokens</Typography>
                    </Box>
                    {estimate.breakdown?.text_analysis > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: colors.textPrimary }}>AI Analysis</Typography>
                        <Typography variant="body2" sx={{ color: colors.textPrimary }}>{estimate.breakdown.text_analysis} tokens</Typography>
                      </Box>
                    )}
                    {estimate.breakdown?.marketing > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: colors.textPrimary }}>Marketing Insights</Typography>
                        <Typography variant="body2" sx={{ color: colors.textPrimary }}>{estimate.breakdown.marketing} tokens</Typography>
                      </Box>
                    )}
                    {estimate.breakdown?.video > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <VideoFile sx={{ fontSize: 16, color: colors.primary }} />
                          <Typography variant="body2" sx={{ color: colors.textPrimary }}>Video Analysis</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: colors.textPrimary }}>{estimate.breakdown.video} tokens</Typography>
                      </Box>
                    )}
                    {estimate.breakdown?.engagement > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: colors.textPrimary }}>Engagement Validation</Typography>
                        <Typography variant="body2" sx={{ color: colors.textPrimary }}>{estimate.breakdown.engagement} tokens</Typography>
                      </Box>
                    )}
                    <Divider sx={{ my: 2, opacity: 0.3 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6" fontWeight={600} sx={{ color: colors.textPrimary }}>Total</Typography>
                      <Typography variant="h6" fontWeight={600} className="gradient-text">{estimate.token_cost} tokens</Typography>
                    </Box>
                  </CardContent>
                </Card>

                {!estimate.can_afford && (
                  <Alert severity="warning" sx={{ mb: 3, borderRadius: '16px' }}>
                    You need {estimate.token_cost - estimate.user_balance} more tokens.
                    <Button size="small" onClick={() => navigate('/tokens')} sx={{ ml: 1 }}>Buy Tokens</Button>
                  </Alert>
                )}

                {/* Balance Info */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    borderRadius: '16px',
                    boxShadow: estimate.can_afford ? shadows.sm : shadows.sm,
                    background: colors.background,
                    mb: 3,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Token sx={{ color: estimate.can_afford ? '#38B2AC' : '#DD6B20' }} />
                    <Typography variant="body2" sx={{ color: colors.textPrimary }}>Your Balance</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={600} sx={{ color: colors.textPrimary }}>
                    {estimate.user_balance} tokens
                  </Typography>
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => setActiveStep(1)}
                    startIcon={<ArrowBack />}
                    disabled={analyzing}
                    sx={{ borderRadius: '16px', boxShadow: shadows.sm, background: colors.background, border: 'none' }}
                  >
                    Back
                  </Button>
                  {analyzing ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      onClick={handleCancel}
                      color="error"
                      sx={{ borderRadius: '16px' }}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handleAnalyze}
                      disabled={!estimate.can_afford}
                      endIcon={<Analytics />}
                      sx={{ borderRadius: '16px', boxShadow: shadows.sm, background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)' }}
                    >
                      Start Analysis
                    </Button>
                  )}
                </Box>

                {/* Live Progress */}
                <AnimatePresence>
                  {analyzing && (
                    <MotionBox
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      sx={{ mt: 3 }}
                    >
                      <Card sx={{ borderRadius: '20px', boxShadow: shadows.sm, background: colors.background, p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <CircularProgress size={24} />
                          <Typography variant="body1" fontWeight={600} sx={{ color: colors.textPrimary }}>
                            {progressStage}
                          </Typography>
                        </Box>

                        <LinearProgress
                          variant="determinate"
                          value={progressPercent}
                          sx={{ mb: 2, height: 10, borderRadius: '5px' }}
                        />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                            {commentsCollected.toLocaleString()} comments collected
                          </Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ color: colors.primary }}>
                            {progressPercent}%
                          </Typography>
                        </Box>

                        <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block', mt: 2 }}>
                          This may take 1-3 minutes depending on the number of comments
                        </Typography>
                      </Card>
                    </MotionBox>
                  )}
                </AnimatePresence>
              </>
            )}
          </MotionBox>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 1, color: colors.textPrimary }}>
        Analysis
      </Typography>
      <Typography variant="body1" sx={{ color: colors.textSecondary, mb: 4 }}>
        Extract insights from YouTube or TikTok comments, with optional video analysis
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: '16px', boxShadow: shadows.sm }}
          action={
            <Button color="inherit" size="small" onClick={handleReset} startIcon={<Refresh />}>
              Start Over
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={600}>{error}</Typography>
          {errorDetails && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{errorDetails}</Typography>
          )}
        </Alert>
      )}

      <Card sx={{ borderRadius: '24px', boxShadow: shadows.card, background: colors.background }}>
        <CardContent sx={{ p: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {renderStepContent()}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CommentAnalysis;
