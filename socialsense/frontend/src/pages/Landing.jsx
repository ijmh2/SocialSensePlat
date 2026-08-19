import React from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import { ArrowForward, YouTube, CheckCircle } from '@mui/icons-material';
import TikTokIcon from '../components/icons/TikTokIcon';
import { motion } from 'framer-motion';
import { shadows } from '../styles/theme';

const MotionBox = motion(Box);

const PREVIEW_COMMENTS = [
  { text: 'Love the quality, been using it for 3 months now', sentiment: 'positive', likes: 142 },
  { text: 'When will you restock the blue version?', sentiment: 'neutral', likes: 38 },
  { text: 'Shipping took way longer than expected', sentiment: 'negative', likes: 21 },
];

const PREVIEW_KEYWORDS = ['quality', 'shipping', 'restock', 'packaging', 'price', 'colour'];

const pricing = [
  {
    name: 'Starter',
    tokens: '100 tokens',
    price: '$4.99',
    description: 'Try it out',
    features: ['100K YouTube comments', '10K TikTok comments', 'Sentiment & keywords', 'CSV export'],
  },
  {
    name: 'Creator',
    tokens: '500 tokens',
    price: '$19.99',
    description: 'Best for creators',
    features: ['500K YouTube comments', '50K TikTok comments', 'Sentiment & keywords', 'Structured LLM analysis'],
    popular: true,
  },
  {
    name: 'Agency',
    tokens: '1,000 tokens',
    price: '$34.99',
    description: 'For teams',
    features: ['1M YouTube comments', '100K TikTok comments', 'Sentiment & keywords', 'Structured LLM analysis'],
  },
];

const Landing = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const sentimentColor = (s) => {
    if (s === 'positive') return theme.palette.success.main;
    if (s === 'negative') return theme.palette.error.main;
    return theme.palette.grey[400];
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFF' }}>
      {/* Sticky nav */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(248,250,255,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
      }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
              <Box sx={{
                width: 34, height: 34, borderRadius: '9px',
                background: theme.palette.primary.main,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <YouTube sx={{ color: 'white', fontSize: 18 }} />
              </Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.text.primary, fontSize: '1rem' }}>
                CommentIQ
              </Typography>
            </Box>
            <Button variant="text" size="small" onClick={() => navigate('/login')}
              sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
              Sign in
            </Button>
            <Button variant="contained" size="small" onClick={() => navigate('/signup')}>
              Get started free
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Hero */}
        <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center"
          sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 6, md: 10 } }}>
          <Grid item xs={12} md={6}>
            <MotionBox initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 4 }}>
                <Chip
                  icon={<YouTube sx={{ fontSize: 14, color: '#FF0000' }} />}
                  label="YouTube"
                  size="small"
                  sx={{ fontWeight: 600, background: 'white', border: `1px solid ${alpha('#FF0000', 0.2)}`, color: theme.palette.text.primary }}
                />
                <Chip
                  icon={<TikTokIcon sx={{ fontSize: 14 }} />}
                  label="TikTok"
                  size="small"
                  sx={{ fontWeight: 600, background: 'white', border: `1px solid ${alpha(theme.palette.text.primary, 0.15)}`, color: theme.palette.text.primary }}
                />
              </Box>
              <Typography variant="h1" sx={{
                fontSize: { xs: '2.6rem', sm: '3.2rem', md: '3.8rem' },
                fontWeight: 800, lineHeight: 1.1, mb: 3,
              }}>
                Know what your audience{' '}
                <Box component="span" sx={{ color: theme.palette.primary.main }}>actually thinks</Box>
              </Typography>
              <Typography sx={{
                fontSize: '1.15rem', fontWeight: 400, lineHeight: 1.75,
                color: theme.palette.text.secondary, mb: 5, maxWidth: 460,
              }}>
                Filter the noise, map sentiment and themes, then use an evidence-grounded LLM to turn audience comments into clear next actions.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
                <Button
                  variant="contained" size="large"
                  onClick={() => navigate('/demo')}
                  endIcon={<ArrowForward />}
                  sx={{ px: 4, py: 1.5, fontSize: '1rem' }}
                >
                  Try the live LLM demo
                </Button>
                <Button
                  variant="outlined" size="large"
                  onClick={() => navigate('/demo')}
                  sx={{ px: 4, py: 1.5 }}
                >
                  View sample report
                </Button>
              </Box>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                10 free tokens on signup &nbsp;·&nbsp; No credit card required
              </Typography>
            </MotionBox>
          </Grid>

          {/* Product preview */}
          <Grid item xs={12} md={6}>
            <MotionBox initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
              <Box sx={{
                background: 'white',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                borderRadius: '20px',
                boxShadow: `0 32px 64px ${alpha(theme.palette.primary.main, 0.1)}`,
                p: { xs: 2.5, sm: 3 },
              }}>
                {/* Video header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <YouTube sx={{ color: '#FF0000', fontSize: 22 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>My Product Launch Video</Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>4,821 comments scraped</Typography>
                  </Box>
                  <Chip label="completed" size="small" sx={{
                    background: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main, fontWeight: 600, fontSize: '0.7rem',
                  }} />
                </Box>

                {/* Sentiment bar */}
                <Typography variant="caption" fontWeight={700} sx={{
                  color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8,
                }}>
                  Sentiment
                </Typography>
                <Box sx={{ display: 'flex', height: 8, borderRadius: '99px', overflow: 'hidden', mt: 1.5, mb: 1, gap: '2px' }}>
                  <Box sx={{ flex: 62, background: theme.palette.success.main }} />
                  <Box sx={{ flex: 24, background: theme.palette.grey[300] }} />
                  <Box sx={{ flex: 14, background: theme.palette.error.main }} />
                </Box>
                <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                  {[['62%', 'Positive', theme.palette.success.main], ['24%', 'Neutral', theme.palette.grey[500]], ['14%', 'Negative', theme.palette.error.main]].map(([pct, label, color]) => (
                    <Box key={label}>
                      <Typography variant="body2" fontWeight={700} sx={{ color }}>{pct}</Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>

                {/* Keywords */}
                <Typography variant="caption" fontWeight={700} sx={{
                  color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8,
                }}>
                  Top Keywords
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5, mb: 3 }}>
                  {PREVIEW_KEYWORDS.map((kw, i) => (
                    <Chip key={kw} label={kw} size="small" sx={{
                      background: alpha(theme.palette.primary.main, 0.06 + i * 0.012),
                      color: theme.palette.primary.main,
                      fontWeight: 500, fontSize: '0.75rem', border: 'none',
                    }} />
                  ))}
                </Box>

                {/* Comments */}
                <Typography variant="caption" fontWeight={700} sx={{
                  color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8,
                }}>
                  Comments
                </Typography>
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {PREVIEW_COMMENTS.map((c) => (
                    <Box key={c.text} sx={{
                      p: 1.5, borderRadius: '10px',
                      background: alpha(sentimentColor(c.sentiment), 0.05),
                      border: `1px solid ${alpha(sentimentColor(c.sentiment), 0.15)}`,
                      display: 'flex', alignItems: 'center', gap: 1.5,
                    }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: sentimentColor(c.sentiment), flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ color: theme.palette.text.primary, flex: 1, lineHeight: 1.4 }}>{c.text}</Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, flexShrink: 0 }}>👍 {c.likes}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </MotionBox>
          </Grid>
        </Grid>

        {/* How it works */}
        <Box sx={{ py: { xs: 8, md: 12 }, borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.08)}` }}>
          <Typography variant="overline" sx={{
            display: 'block', textAlign: 'center',
            color: theme.palette.primary.main, fontWeight: 700, letterSpacing: 2, mb: 1.5,
          }}>
            How it works
          </Typography>
          <Typography variant="h3" textAlign="center" fontWeight={700} sx={{ mb: 10 }}>
            From URL to insight in minutes
          </Typography>
          <Grid container spacing={6}>
            {[
              { n: '01', title: 'Paste a URL', body: "Drop in any YouTube or TikTok video URL. We'll fetch the comment count and metadata instantly." },
              { n: '02', title: 'We scrape & filter', body: 'Up to 1M YouTube or 100K TikTok comments fetched. Spam, duplicates, and emoji-only noise removed automatically.' },
              { n: '03', title: 'Decide what to do', body: 'A structured LLM turns the evidence into a score, key findings, and a prioritized action plan.' },
            ].map((step, i) => (
              <Grid item xs={12} md={4} key={step.n}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Typography sx={{
                    fontSize: '5rem', fontWeight: 800, lineHeight: 1,
                    color: alpha(theme.palette.primary.main, 0.07),
                    fontFamily: '"Plus Jakarta Sans", sans-serif', mb: -1,
                  }}>
                    {step.n}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 1.5 }}>{step.title}</Typography>
                  <Typography sx={{ color: theme.palette.text.secondary, lineHeight: 1.75 }}>{step.body}</Typography>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Pricing */}
        <Box sx={{ py: { xs: 8, md: 12 }, borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.08)}` }}>
          <Typography variant="overline" sx={{
            display: 'block', textAlign: 'center',
            color: theme.palette.primary.main, fontWeight: 700, letterSpacing: 2, mb: 1.5,
          }}>
            Pricing
          </Typography>
          <Typography variant="h3" textAlign="center" fontWeight={700} sx={{ mb: 1.5 }}>
            Pay for what you use
          </Typography>
          <Typography textAlign="center" sx={{ color: theme.palette.text.secondary, mb: 10 }}>
            Tokens never expire. Subscribe for up to 33% off.
          </Typography>
          <Grid container spacing={3} justifyContent="center">
            {pricing.map((plan, index) => (
              <Grid item xs={12} sm={6} md={4} key={plan.name}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  sx={{
                    height: '100%', position: 'relative',
                    background: plan.popular ? theme.palette.primary.main : 'white',
                    border: `1px solid ${plan.popular ? 'transparent' : alpha(theme.palette.primary.main, 0.1)}`,
                    borderRadius: '20px',
                    boxShadow: plan.popular ? `0 24px 48px ${alpha(theme.palette.primary.main, 0.22)}` : shadows.card,
                    p: 4, display: 'flex', flexDirection: 'column',
                  }}
                >
                  {plan.popular && (
                    <Chip label="Most Popular" size="small" sx={{
                      position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                      background: 'white', color: theme.palette.primary.main, fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    }} />
                  )}
                  <Typography variant="body2" fontWeight={600} sx={{
                    color: plan.popular ? 'rgba(255,255,255,0.65)' : theme.palette.text.secondary, mb: 0.5,
                  }}>
                    {plan.description}
                  </Typography>
                  <Typography variant="h3" fontWeight={800} sx={{
                    color: plan.popular ? 'white' : theme.palette.text.primary, mb: 0.5,
                  }}>
                    {plan.price}
                  </Typography>
                  <Typography variant="body2" sx={{
                    color: plan.popular ? 'rgba(255,255,255,0.55)' : theme.palette.text.secondary, mb: 3,
                  }}>
                    {plan.tokens}
                  </Typography>
                  <Box sx={{ flex: 1, mb: 3 }}>
                    {plan.features.map((feature) => (
                      <Box key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <CheckCircle sx={{ fontSize: 16, color: plan.popular ? 'rgba(255,255,255,0.65)' : theme.palette.success.main, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: plan.popular ? 'rgba(255,255,255,0.9)' : theme.palette.text.primary }}>
                          {feature}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Button
                    fullWidth
                    variant={plan.popular ? 'outlined' : 'contained'}
                    onClick={() => navigate('/signup')}
                    sx={plan.popular ? {
                      borderColor: 'rgba(255,255,255,0.4)', color: 'white',
                      '&:hover': { borderColor: 'white', background: 'rgba(255,255,255,0.1)', boxShadow: 'none' },
                    } : {}}
                  >
                    Get started
                  </Button>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CTA */}
        <Box sx={{ py: { xs: 8, md: 12 }, textAlign: 'center', borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.08)}` }}>
          <Typography variant="h3" fontWeight={700} sx={{ mb: 2 }}>
            Start understanding your audience today
          </Typography>
          <Typography sx={{ color: theme.palette.text.secondary, mb: 5 }}>
            10 free tokens on signup. No credit card required.
          </Typography>
          <Button
            variant="contained" size="large"
            onClick={() => navigate('/signup')}
            endIcon={<ArrowForward />}
            sx={{ px: 5, py: 1.5, fontSize: '1rem' }}
          >
            Get started free
          </Button>
        </Box>

        {/* Footer */}
        <Box sx={{ py: 4, textAlign: 'center', borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.08)}` }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            © 2026 CommentIQ. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
            {[['Terms of Service', '/terms'], ['Privacy Policy', '/privacy']].map(([label, to]) => (
              <Typography key={to} component={RouterLink} to={to} variant="body2" sx={{
                color: 'text.secondary', textDecoration: 'none',
                '&:hover': { color: 'primary.main' },
              }}>
                {label}
              </Typography>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Landing;
