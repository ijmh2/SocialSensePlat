import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Link,
  Divider,
  Alert,
  useTheme,
  alpha,
  InputAdornment,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Google as GoogleIcon,
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  AutoGraph,
  CheckCircle,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';

const MotionBox = motion(Box);

const SignUp = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, fullName);
      toast.success('Account created! Check your email for verification.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  const benefits = [
    '10 free tokens on signup',
    'No credit card required',
    'Analyze YouTube & TikTok',
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: 4,
        background: `radial-gradient(ellipse at top right, ${alpha(theme.palette.secondary.main, 0.15)} 0%, transparent 50%),
                     radial-gradient(ellipse at bottom left, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
                     ${theme.palette.background.default}`,
      }}
    >
      <Container maxWidth="sm">
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              component={RouterLink}
              to="/"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AutoGraph sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Typography variant="h5" fontWeight={700}>
                SocialSense
              </Typography>
            </Box>
          </Box>

          {/* SignUp Card */}
          <Box
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 4,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Typography variant="h4" fontWeight={700} textAlign="center" sx={{ mb: 1 }}>
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
              Start analyzing your social media audience today
            </Typography>

            {/* Benefits */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 4, flexWrap: 'wrap' }}>
              {benefits.map((benefit) => (
                <Chip
                  key={benefit}
                  icon={<CheckCircle sx={{ fontSize: 16 }} />}
                  label={benefit}
                  size="small"
                  sx={{
                    background: alpha(theme.palette.success.main, 0.1),
                    borderColor: alpha(theme.palette.success.main, 0.3),
                    '& .MuiChip-icon': {
                      color: theme.palette.success.main,
                    },
                  }}
                  variant="outlined"
                />
              ))}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Google Sign In */}
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              sx={{
                mb: 3,
                py: 1.5,
                borderColor: alpha(theme.palette.text.primary, 0.2),
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  background: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              Continue with Google
            </Button>

            <Divider sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary">
                or sign up with email
              </Typography>
            </Divider>

            {/* Email/Password Form */}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                helperText="Must be at least 6 characters"
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                }}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" textAlign="center" display="block" sx={{ mt: 2 }}>
              By signing up, you agree to our Terms of Service and Privacy Policy
            </Typography>

            <Typography variant="body2" textAlign="center" sx={{ mt: 3 }}>
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" fontWeight={600}>
                Sign in
              </Link>
            </Typography>
          </Box>
        </MotionBox>
      </Container>
    </Box>
  );
};

export default SignUp;
