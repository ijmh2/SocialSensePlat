import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  MenuItem,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  AutoAwesome,
  CheckCircle,
  Forum,
  Insights,
  Psychology,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { demoApi } from '../utils/api';
import ScoreBreakdown from '../components/ScoreBreakdown';

const MotionBox = motion(Box);

const EXAMPLE_COMMENTS = [
  'Love the quality. I have used it every day for three months and it still looks new.',
  'When will the blue version be back in stock? I have checked twice this week.',
  'Shipping took twelve days and the box arrived damaged, although the product works.',
  'The opening was useful but the middle repeated the same point for too long.',
  'Can you compare this with the cheaper version in your next video?',
  'Bought one after watching this. The size guide made the decision easy.',
  'The price feels high now. What makes this different from the older model?',
  'I shared this with my team because the setup explanation was genuinely clear.',
  'Please add captions. I could not follow the technical section without them.',
  'The real-world example at 4:20 was the best part—more of that next time.',
].join('\n');

function SentimentCard({ sentiment }) {
  const values = [
    ['Positive', sentiment?.positive || 0, '#16A34A'],
    ['Neutral', sentiment?.neutral || 0, '#64748B'],
    ['Negative', sentiment?.negative || 0, '#DC2626'],
  ];
  const total = values.reduce((sum, [, value]) => sum + value, 0) || 1;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={700}>
          Rule-based baseline
        </Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Sentiment mix
        </Typography>
        <Box sx={{ display: 'flex', height: 9, borderRadius: 99, overflow: 'hidden', mb: 2 }}>
          {values.map(([label, value, color]) => (
            <Box key={label} sx={{ width: `${(value / total) * 100}%`, background: color }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {values.map(([label, value, color]) => (
            <Box key={label}>
              <Typography variant="h6" fontWeight={800} sx={{ color }}>
                {Math.round((value / total) * 100)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Demo() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [comments, setComments] = useState(EXAMPLE_COMMENTS);
  const [platform, setPlatform] = useState('youtube');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const commentCount = useMemo(
    () => comments.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length,
    [comments]
  );

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await demoApi.analyze(comments, platform);
      setData(response.data);
    } catch (requestError) {
      setData(null);
      setError(
        requestError.response?.data?.error
        || requestError.message
        || 'The analysis could not be completed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const result = data?.result;

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFF', pb: 10 }}>
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(248,250,255,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      }}>
        <Container maxWidth="lg">
          <Box sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} color="inherit">
              Back
            </Button>
            <Divider orientation="vertical" flexItem />
            <AutoAwesome sx={{ color: theme.palette.primary.main }} />
            <Typography fontWeight={800}>CommentIQ LLM Lab</Typography>
            <Chip label="Live" size="small" color="success" variant="outlined" />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pt: { xs: 5, md: 8 } }}>
        <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Chip icon={<Psychology />} label="Evidence-grounded analysis" color="primary" variant="outlined" sx={{ mb: 2 }} />
          <Typography variant="h2" sx={{ fontSize: { xs: '2.4rem', md: '3.6rem' }, fontWeight: 850, mb: 2 }}>
            Turn a comment pile into a decision.
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '1.1rem', maxWidth: 720, mb: 5, lineHeight: 1.7 }}>
            Paste one comment per line. CommentIQ filters noise, calculates a deterministic sentiment baseline,
            then asks an LLM for a structured score, evidence-led findings, and an action plan.
          </Typography>
        </MotionBox>

        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%', border: `1px solid ${alpha(theme.palette.primary.main, 0.13)}` }}>
              <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>Comments</Typography>
                    <Typography variant="body2" color="text.secondary">One comment per line · 3–200 comments</Typography>
                  </Box>
                  <Chip label={`${commentCount} comments`} size="small" />
                </Box>
                <TextField
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  multiline
                  minRows={12}
                  fullWidth
                  inputProps={{ maxLength: 100000 }}
                  placeholder="Paste comments here…"
                  sx={{ '& .MuiOutlinedInput-root': { alignItems: 'flex-start', background: 'white' } }}
                />
                <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    select
                    label="Source"
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value)}
                    size="small"
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value="youtube">YouTube</MenuItem>
                    <MenuItem value="tiktok">TikTok</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </TextField>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AutoAwesome />}
                    onClick={handleAnalyze}
                    disabled={loading || commentCount < 3 || commentCount > 200}
                    sx={{ px: 4 }}
                  >
                    {loading ? 'Reading the signal…' : 'Run LLM analysis'}
                  </Button>
                  <Button variant="text" onClick={() => setComments(EXAMPLE_COMMENTS)} disabled={loading}>
                    Reset example
                  </Button>
                </Box>
                {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%', color: 'white', background: 'linear-gradient(145deg, #12204A 0%, #1E40AF 100%)' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Insights sx={{ fontSize: 36, mb: 3, color: '#93C5FD' }} />
                <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>What the LLM returns</Typography>
                {[
                  'A 0–100 audience signal score with category reasons',
                  'A grounded strategic summary—no invented quotes',
                  'Keywords and recurring themes from local processing',
                  'Prioritized, checkable action items',
                ].map((item) => (
                  <Box key={item} sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                    <CheckCircle sx={{ color: '#86EFAC', fontSize: 20, mt: 0.2 }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.86)', lineHeight: 1.55 }}>{item}</Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.16)' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                  The report uses the Responses API with a strict schema, so the UI receives validated fields rather than trying to parse prose.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {result && (
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} sx={{ mt: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
              <Forum color="primary" />
              <Typography variant="h4" fontWeight={850}>Audience report</Typography>
              <Chip label={`${data.comments_analyzed} analyzed`} size="small" />
              <Chip label={data.model} size="small" variant="outlined" color="primary" />
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <ScoreBreakdown breakdown={result.scoreBreakdown} totalScore={result.videoScore} />
              </Grid>
              <Grid item xs={12} md={5}>
                <SentimentCard sentiment={data.sentiment} />
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Typography variant="overline" color="primary" fontWeight={800}>LLM synthesis</Typography>
                    <Box sx={{ '& h2': { fontSize: '1.25rem', mt: 3 }, '& li': { mb: 1 }, lineHeight: 1.75 }}>
                      <ReactMarkdown>{result.summary}</ReactMarkdown>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Top keywords</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {result.keywords?.slice(0, 15).map((keyword) => (
                        <Chip key={keyword.word} label={`${keyword.word} · ${keyword.count}`} color="primary" variant="outlined" />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Action plan</Typography>
                    {result.actionItems?.map((item, index) => (
                      <Box key={item.id || item.title} sx={{ display: 'flex', gap: 1.5, mb: 2.2 }}>
                        <Chip label={index + 1} size="small" color={item.priority === 'high' ? 'error' : 'primary'} />
                        <Box>
                          <Typography fontWeight={750}>{item.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </MotionBox>
        )}
      </Container>
    </Box>
  );
}
