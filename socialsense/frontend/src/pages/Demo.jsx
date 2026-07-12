import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  YouTube,
  ArrowForward,
  ArrowBack,
  Download,
  FilterAlt,
  CheckCircle,
  Cancel,
  RemoveCircle,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { shadows } from '../styles/theme';

const MotionBox = motion(Box);

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_KEYWORDS = [
  { word: 'quality', count: 312 },
  { word: 'shipping', count: 241 },
  { word: 'packaging', count: 187 },
  { word: 'price', count: 164 },
  { word: 'restock', count: 143 },
  { word: 'colour', count: 128 },
  { word: 'recommend', count: 97 },
  { word: 'material', count: 84 },
  { word: 'sizing', count: 76 },
  { word: 'fast', count: 63 },
  { word: 'worth', count: 58 },
  { word: 'love', count: 54 },
  { word: 'durable', count: 47 },
  { word: 'beautiful', count: 41 },
  { word: 'lightweight', count: 38 },
];

const MOCK_THEMES = [
  { theme: 'great quality', count: 198 },
  { theme: 'fast shipping', count: 156 },
  { theme: 'good packaging', count: 112 },
  { theme: 'worth the price', count: 89 },
  { theme: 'love the colour', count: 76 },
  { theme: 'restock blue version', count: 67 },
  { theme: 'highly recommend', count: 54 },
  { theme: 'well made', count: 43 },
];

const MOCK_COMMENTS = [
  { text: "Love the quality of this, been using it for 3 months now and it still looks brand new. Definitely worth the price.", sentiment: 'positive', likes: 142, author: 'sarah_m' },
  { text: "When will you restock the blue version? I've been waiting for weeks and keep checking back.", sentiment: 'neutral', likes: 89, author: 'techreview99' },
  { text: "Shipping took way longer than expected and the packaging was a bit damaged when it arrived. Product itself is fine though.", sentiment: 'negative', likes: 67, author: 'honest_buyer' },
  { text: "Absolutely obsessed with this. Bought one for myself and one as a gift - both were perfect.", sentiment: 'positive', likes: 203, author: 'gifting_queen' },
  { text: "Is this available in a larger size? The medium is slightly too small for me.", sentiment: 'neutral', likes: 34, author: 'user_82' },
  { text: "Third time ordering and the quality just keeps getting better. You guys have really nailed the material.", sentiment: 'positive', likes: 178, author: 'loyal_customer' },
  { text: "Not sure how I feel about the new colour options, prefer the original range personally.", sentiment: 'neutral', likes: 21, author: 'vintage_fan' },
  { text: "Received the wrong item and customer service was slow to respond. Bit disappointed honestly.", sentiment: 'negative', likes: 45, author: 'disappointed_buyer' },
  { text: "Lightweight and durable - exactly what I needed. Using it every day at work.", sentiment: 'positive', likes: 94, author: 'office_worker' },
  { text: "Price went up since I last bought. Still good quality but the value isn't what it was.", sentiment: 'neutral', likes: 57, author: 'price_watcher' },
];

const SENTIMENT_POSITIVE = 2841;
const SENTIMENT_NEUTRAL  = 1104;
const SENTIMENT_NEGATIVE  = 512;
const SENTIMENT_TOTAL = SENTIMENT_POSITIVE + SENTIMENT_NEUTRAL + SENTIMENT_NEGATIVE;

const FILTER_STATS = {
  original: 6200,
  after_hard_filters: 4457,
  emoji_only: 412,
  spam_promo: 287,
  duplicates: 1044,
  generic_praise: 198,
  off_topic: 87,
};

const CHIP_COLORS = ['#1E40AF', '#0891B2', '#16A34A', '#D97706', '#7C3AED', '#DB2777', '#14B8A6', '#F59E0B', '#8B5CF6'];

// ─── Component ───────────────────────────────────────────────────────────────

const Demo = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const sentimentColor = (s) => {
    if (s === 'positive') return theme.palette.success.main;
    if (s === 'negative') return theme.palette.error.main;
    return theme.palette.grey[400];
  };

  const sentimentIcon = (s) => {
    if (s === 'positive') return <CheckCircle sx={{ fontSize: 14, color: theme.palette.success.main }} />;
    if (s === 'negative') return <Cancel sx={{ fontSize: 14, color: theme.palette.error.main }} />;
    return <RemoveCircle sx={{ fontSize: 14, color: theme.palette.grey[400] }} />;
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFF' }}>
      {/* Demo banner */}
      <Box sx={{
        background: theme.palette.primary.main,
        py: 1.25, px: 2,
        textAlign: 'center',
        position: 'sticky', top: 0, zIndex: 200,
      }}>
        <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
          This is a live preview with sample data.{' '}
          <Typography
            component={RouterLink}
            to="/signup"
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, textDecoration: 'underline' }}
          >
            Sign up free
          </Typography>
          {' '}to analyse your own videos.
        </Typography>
      </Box>

      {/* Mini nav */}
      <Box sx={{
        background: 'rgba(248,250,255,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
        px: { xs: 2, sm: 4 }, py: 1.5,
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Button
          startIcon={<ArrowBack />}
          variant="text"
          size="small"
          onClick={() => navigate('/')}
          sx={{ color: theme.palette.text.secondary }}
        >
          Back
        </Button>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          CommentIQ &rsaquo; Example Analysis
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          size="small"
          endIcon={<ArrowForward />}
          onClick={() => navigate('/signup')}
        >
          Try with your video
        </Button>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>

        {/* Analysis header */}
        <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                <YouTube sx={{ color: '#FF0000', fontSize: 22 }} />
                <Typography variant="h5" fontWeight={700} noWrap>
                  My New Product Launch - Full Review & Unboxing
                </Typography>
                <Chip label="completed" size="small" sx={{
                  background: alpha(theme.palette.success.main, 0.1),
                  color: theme.palette.success.main, fontWeight: 600,
                }} />
                <Chip label="My Video" size="small" sx={{
                  background: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main, fontWeight: 600,
                }} />
              </Box>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                12 Jul 2026 · 57 tokens used
              </Typography>
            </Box>
            <Button variant="outlined" size="small" startIcon={<Download />} disabled>
              CSV
            </Button>
          </Box>

          {/* Stats strip */}
          <Box sx={{
            display: 'flex', mb: 4,
            background: 'white',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            borderRadius: '16px', overflow: 'hidden',
          }}>
            {[
              { label: 'Comments fetched', value: '6,200', color: theme.palette.primary.main },
              { label: 'After filtering', value: '4,457', color: theme.palette.info.main },
              { label: 'Keywords', value: MOCK_KEYWORDS.length, color: theme.palette.success.main },
              { label: 'Themes', value: MOCK_THEMES.length, color: theme.palette.warning.main },
            ].map((s, i, arr) => (
              <Box key={s.label} sx={{
                flex: 1, p: { xs: 2, sm: 3 }, textAlign: 'center',
                borderRight: i < arr.length - 1 ? `1px solid ${alpha(theme.palette.primary.main, 0.08)}` : 'none',
              }}>
                <Typography sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, fontWeight: 800, color: s.color, lineHeight: 1, mb: 0.5 }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Sentiment bar */}
          <Box sx={{
            mb: 4, p: 3,
            background: 'white',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            borderRadius: '16px',
          }}>
            <Typography variant="body2" fontWeight={700} sx={{
              color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, mb: 2,
            }}>
              Sentiment breakdown
            </Typography>
            <Box sx={{ display: 'flex', height: 10, borderRadius: '99px', overflow: 'hidden', gap: '2px', mb: 2 }}>
              <Box sx={{ flex: SENTIMENT_POSITIVE, background: theme.palette.success.main }} />
              <Box sx={{ flex: SENTIMENT_NEUTRAL, background: theme.palette.grey[300] }} />
              <Box sx={{ flex: SENTIMENT_NEGATIVE, background: theme.palette.error.main }} />
            </Box>
            <Box sx={{ display: 'flex', gap: { xs: 3, sm: 5 } }}>
              {[
                [SENTIMENT_POSITIVE, 'Positive', theme.palette.success.main],
                [SENTIMENT_NEUTRAL, 'Neutral', theme.palette.grey[500]],
                [SENTIMENT_NEGATIVE, 'Negative', theme.palette.error.main],
              ].map(([count, label, color]) => (
                <Box key={label}>
                  <Typography variant="h5" fontWeight={800} sx={{ color, lineHeight: 1 }}>
                    {Math.round((count / SENTIMENT_TOTAL) * 100)}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                    {label} · {count.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Tabs */}
          <Card sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Keywords & Themes" />
              <Tab label="Comments" />
              <Tab label="Filter Stats" />
            </Tabs>
          </Card>

          {/* Tab 0 — Keywords & Themes */}
          {activeTab === 0 && (
            <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Top Keywords</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                        {MOCK_KEYWORDS.map((k, i) => (
                          <Chip
                            key={k.word}
                            label={`${k.word} · ${k.count}`}
                            size={i < 5 ? 'medium' : 'small'}
                            sx={{
                              background: alpha(CHIP_COLORS[i % CHIP_COLORS.length], i < 5 ? 0.12 : 0.08),
                              color: CHIP_COLORS[i % CHIP_COLORS.length],
                              fontWeight: i < 5 ? 700 : 500,
                              fontSize: i < 3 ? '0.85rem' : '0.75rem',
                              border: `1px solid ${alpha(CHIP_COLORS[i % CHIP_COLORS.length], 0.2)}`,
                            }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Recurring Themes</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {MOCK_THEMES.map((t, i) => (
                          <Box key={t.theme}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                                {t.theme}
                              </Typography>
                              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                {t.count}
                              </Typography>
                            </Box>
                            <Box sx={{ height: 4, borderRadius: '99px', background: alpha(theme.palette.primary.main, 0.08) }}>
                              <Box sx={{
                                height: '100%', borderRadius: '99px',
                                width: `${(t.count / MOCK_THEMES[0].count) * 100}%`,
                                background: CHIP_COLORS[i % CHIP_COLORS.length],
                                transition: 'width 600ms ease',
                              }} />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </MotionBox>
          )}

          {/* Tab 1 — Comments */}
          {activeTab === 1 && (
            <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                    {[
                      ['All', theme.palette.primary.main],
                      ['Positive', theme.palette.success.main],
                      ['Neutral', theme.palette.grey[500]],
                      ['Negative', theme.palette.error.main],
                    ].map(([label, color], i) => (
                      <Chip
                        key={label}
                        label={label}
                        size="small"
                        variant={i === 0 ? 'filled' : 'outlined'}
                        sx={i === 0 ? {
                          background: alpha(color, 0.12), color, fontWeight: 600, border: `1px solid ${alpha(color, 0.3)}`,
                        } : {
                          color, borderColor: alpha(color, 0.3), fontWeight: 500,
                        }}
                      />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {MOCK_COMMENTS.map((c) => (
                      <Box key={c.text} sx={{
                        p: 2, borderRadius: '12px',
                        background: alpha(sentimentColor(c.sentiment), 0.04),
                        border: `1px solid ${alpha(sentimentColor(c.sentiment), 0.15)}`,
                        display: 'flex', gap: 1.5, alignItems: 'flex-start',
                      }}>
                        {sentimentIcon(c.sentiment)}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ color: theme.palette.text.primary, lineHeight: 1.6 }}>
                            {c.text}
                          </Typography>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                            @{c.author}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, flexShrink: 0 }}>
                          👍 {c.likes}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: theme.palette.text.secondary }}>
                    Showing 10 of 4,457 filtered comments
                  </Typography>
                </CardContent>
              </Card>
            </MotionBox>
          )}

          {/* Tab 2 — Filter Stats */}
          {activeTab === 2 && (
            <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>Comment Filter Breakdown</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[
                      { label: 'Original comments fetched', value: FILTER_STATS.original, color: theme.palette.primary.main, bold: true },
                      { label: 'Emoji-only removed', value: FILTER_STATS.emoji_only, color: theme.palette.error.main },
                      { label: 'Spam & promotional removed', value: FILTER_STATS.spam_promo, color: theme.palette.error.main },
                      { label: 'Exact duplicates removed', value: FILTER_STATS.duplicates, color: theme.palette.error.main },
                      { label: 'After filtering (analyzed)', value: FILTER_STATS.after_hard_filters, color: theme.palette.success.main, bold: true },
                      { label: 'Generic praise (flagged, kept)', value: FILTER_STATS.generic_praise, color: theme.palette.warning.main },
                      { label: 'Off-topic noise (flagged, kept)', value: FILTER_STATS.off_topic, color: theme.palette.warning.main },
                    ].map((row, i, arr) => (
                      <Box key={row.label}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                          <Typography variant="body2" fontWeight={row.bold ? 700 : 400} sx={{ color: row.bold ? theme.palette.text.primary : theme.palette.text.secondary }}>
                            {row.label}
                          </Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: row.color }}>
                            {row.value.toLocaleString()}
                          </Typography>
                        </Box>
                        {i < arr.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </MotionBox>
          )}
        </MotionBox>

        {/* Bottom CTA */}
        <Box sx={{
          mt: 8, p: { xs: 4, md: 6 }, borderRadius: '20px', textAlign: 'center',
          background: theme.palette.primary.main,
          boxShadow: `0 24px 48px ${alpha(theme.palette.primary.main, 0.25)}`,
        }}>
          <Typography variant="h4" fontWeight={800} sx={{ color: 'white', mb: 1.5 }}>
            Ready to analyse your own content?
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.75)', mb: 4 }}>
            Start with 10 free tokens. No credit card required.
          </Typography>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/signup')}
            endIcon={<ArrowForward />}
            sx={{
              px: 5, py: 1.5, fontSize: '1rem',
              borderColor: 'rgba(255,255,255,0.5)', color: 'white',
              '&:hover': { borderColor: 'white', background: 'rgba(255,255,255,0.1)', boxShadow: 'none' },
            }}
          >
            Get started free
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Demo;
