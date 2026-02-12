import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
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
  Collapse,
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
  CardGiftcard,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../utils/api';

const MotionBox = motion(Box);

const SignUp = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Referral code state
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [referralValid, setReferralValid] = useState(null);
  const [referrerName, setReferrerName] = useState('');
  const [showReferralField, setShowReferralField] = useState(!!searchParams.get('ref'));

  // Check referral code validity
  useEffect(() => {
    const checkCode = async () => {
      if (referralCode.length >= 6) {
        try {
          const { data } = await authApi.checkReferral(referralCode);
          setReferralValid(data.valid);
          setReferrerName(data.referrer_name || '');
        } catch {
          setReferralValid(false);
        }
      } else {
        setReferralValid(null);
      }
    };
    const timer = setTimeout(checkCode, 300);
    return () => clearTimeout(timer);
  }, [referralCode]);

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

      // Apply referral code if valid
      if (referralCode && referralValid) {
        try {
          await authApi.applyReferral(referralCode);
          toast.success('Referral bonus applied! You received 10 extra tokens.');
        } catch (refErr) {
          console.error('Referral apply error:', refErr);
          // Don't block signup if referral fails
        }
      }

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
                sx={{ mb: 2 }}
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

              {/* Referral Code */}
              {!showReferralField ? (
                <Button
                  size="small"
                  onClick={() => setShowReferralField(true)}
                  sx={{ mb: 2, color: 'text.secondary' }}
                  startIcon={<CardGiftcard />}
                >
                  Have a referral code?
                </Button>
              ) : (
                <Collapse in={showReferralField}>
                  <TextField
                    fullWidth
                    label="Referral Code (optional)"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXX"
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CardGiftcard sx={{ color: referralValid ? 'success.main' : 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: referralValid !== null && (
                        <InputAdornment position="end">
                          {referralValid ? (
                            <CheckCircle sx={{ color: 'success.main' }} />
                          ) : (
                            <Typography variant="caption" color="error">Invalid</Typography>
                          )}
                        </InputAdornment>
                      ),
                    }}
                    helperText={
                      referralValid
                        ? `Referred by ${referrerName}! You'll both get 10 bonus tokens.`
                        : referralCode.length >= 6 && referralValid === false
                          ? 'This code is not valid'
                          : 'Enter a 6-character code from a friend'
                    }
                    error={referralCode.length >= 6 && referralValid === false}
                    color={referralValid ? 'success' : undefined}
                  />
                </Collapse>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  mt: 1,
                }}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" textAlign="center" display="block" sx={{ mt: 2 }}>
              By signing up, you agree to our{' '}
              <Link component={RouterLink} to="/terms" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link component={RouterLink} to="/privacy" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                Privacy Policy
              </Link>
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
