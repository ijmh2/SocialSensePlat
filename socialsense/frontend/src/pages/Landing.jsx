import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import {
  AutoGraph,
  Psychology,
  Speed,
  Security,
  YouTube,
  MusicNote,
  ArrowForward,
  CheckCircle,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const features = [
  {
    icon: YouTube,
    title: 'YouTube Analysis',
    description: 'Deep dive into YouTube comments with AI-powered sentiment analysis and theme extraction.',
  },
  {
    icon: MusicNote,
    title: 'TikTok Insights',
    description: 'Understand your TikTok audience with comprehensive comment analysis and trends.',
  },
  {
    icon: Psychology,
    title: 'AI Intelligence',
    description: 'GPT-4 powered analysis provides actionable insights and marketing recommendations.',
  },
  {
    icon: Speed,
    title: 'Fast Processing',
    description: 'Analyze thousands of comments in minutes with our optimized processing pipeline.',
  },
];

const pricing = [
  {
    name: '100 Tokens',
    price: '$4.99',
    description: 'Perfect for trying out',
    features: ['10K YouTube comments', '1K TikTok comments', 'Basic analysis'],
  },
  {
    name: '500 Tokens',
    price: '$19.99',
    description: 'Best for creators',
    features: ['50K YouTube comments', '5K TikTok comments', 'Full AI analysis', 'Marketing insights'],
    popular: true,
  },
  {
    name: '1000 Tokens',
    price: '$34.99',
    description: 'For agencies',
    features: ['100K YouTube comments', '10K TikTok comments', 'Full AI analysis', 'Priority support'],
  },
];

const Landing = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `radial-gradient(ellipse at top, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 50%),
                     radial-gradient(ellipse at bottom right, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%),
                     ${theme.palette.background.default}`,
      }}
    >
      {/* Hero Section */}
      <Container maxWidth="lg">
        <Box
          sx={{
            pt: { xs: 8, md: 16 },
            pb: { xs: 8, md: 12 },
            textAlign: 'center',
          }}
        >
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Chip
              label="AI-Powered Social Analytics"
              sx={{
                mb: 4,
                background: alpha(theme.palette.primary.main, 0.1),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                fontWeight: 600,
              }}
            />
            
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                fontWeight: 800,
                lineHeight: 1.1,
                mb: 3,
              }}
            >
              Understand Your{' '}
              <Box
                component="span"
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Audience
              </Box>
              <br />
              Like Never Before
            </Typography>
            
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{
                maxWidth: 600,
                mx: 'auto',
                mb: 5,
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              Transform social media comments into actionable insights with 
              AI-powered analysis for YouTube and TikTok.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/signup')}
                endIcon={<ArrowForward />}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.35)}`,
                  '&:hover': {
                    boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.45)}`,
                  },
                }}
              >
                Get Started Free
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{ px: 4, py: 1.5 }}
              >
                Sign In
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
              10 free tokens on signup • No credit card required
            </Typography>
          </MotionBox>
        </Box>

        {/* Features Section */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Typography
            variant="h3"
            textAlign="center"
            sx={{ mb: 2, fontWeight: 700 }}
          >
            Powerful Features
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            textAlign="center"
            sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}
          >
            Everything you need to analyze and understand your social media audience
          </Typography>

          <Grid container spacing={3}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={feature.title}>
                <MotionCard
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  sx={{
                    height: '100%',
                    background: alpha(theme.palette.background.paper, 0.6),
                    backdropFilter: 'blur(10px)',
                    cursor: 'default',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`,
                        mb: 2,
                      }}
                    >
                      <feature.icon sx={{ fontSize: 28, color: theme.palette.primary.main }} />
                    </Box>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Pricing Section */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Typography
            variant="h3"
            textAlign="center"
            sx={{ mb: 2, fontWeight: 700 }}
          >
            Simple Token Pricing
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            textAlign="center"
            sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}
          >
            Purchase tokens and use them as you go. No subscriptions, no commitments.
          </Typography>

          <Grid container spacing={3} justifyContent="center">
            {pricing.map((plan, index) => (
              <Grid item xs={12} sm={6} md={4} key={plan.name}>
                <MotionCard
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  sx={{
                    height: '100%',
                    position: 'relative',
                    overflow: 'visible',
                    background: plan.popular
                      ? `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`
                      : alpha(theme.palette.background.paper, 0.6),
                    border: plan.popular
                      ? `2px solid ${theme.palette.primary.main}`
                      : `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  {plan.popular && (
                    <Chip
                      label="Most Popular"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        fontWeight: 600,
                      }}
                    />
                  )}
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" fontWeight={600}>
                      {plan.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {plan.description}
                    </Typography>
                    <Typography
                      variant="h3"
                      fontWeight={800}
                      sx={{ my: 3 }}
                      className="gradient-text"
                    >
                      {plan.price}
                    </Typography>
                    <Box sx={{ mb: 3 }}>
                      {plan.features.map((feature) => (
                        <Box
                          key={feature}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                        >
                          <CheckCircle
                            sx={{ fontSize: 18, color: theme.palette.success.main }}
                          />
                          <Typography variant="body2">{feature}</Typography>
                        </Box>
                      ))}
                    </Box>
                    <Button
                      fullWidth
                      variant={plan.popular ? 'contained' : 'outlined'}
                      onClick={() => navigate('/signup')}
                    >
                      Get Started
                    </Button>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CTA Section */}
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            textAlign: 'center',
          }}
        >
          <MotionBox
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            sx={{
              p: { xs: 4, md: 8 },
              borderRadius: 4,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Typography variant="h3" fontWeight={700} sx={{ mb: 2 }}>
              Ready to Get Started?
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}
            >
              Join thousands of creators and marketers who use SocialSense to 
              understand their audience better.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/signup')}
              endIcon={<ArrowForward />}
              sx={{
                px: 5,
                py: 1.5,
                fontSize: '1.1rem',
              }}
            >
              Start Free Trial
            </Button>
          </MotionBox>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © 2024 SocialSense Platinum. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Landing;
