import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  useTheme,
  alpha,
  Alert,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Token,
  ArrowForward,
  Refresh,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

import { useAuth } from '../contexts/AuthContext';
import { tokensApi } from '../utils/api';

const MotionBox = motion(Box);

const TokenSuccess = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshTokenBalance } = useAuth();
  const hasVerified = useRef(false);

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    // Safety timeout for the entire verification process
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[TOKEN_SUCCESS] Verification safety timeout triggered');
        setError('Verification is taking longer than expected. Please refresh the page or check your balance in the dashboard.');
        setLoading(false);
      }
    }, 15000);

    if (sessionId && !hasVerified.current) {
      hasVerified.current = true;
      verifySession(sessionId).finally(() => {
        clearTimeout(safetyTimeout);
      });
    } else if (!sessionId) {
      clearTimeout(safetyTimeout);
      setError('No session ID found. Please try purchasing tokens again.');
      setLoading(false);
    }

    return () => clearTimeout(safetyTimeout);
  }, [searchParams]);

  const verifySession = async (sessionId, retry = 0) => {
    let shouldRetry = false;

    try {
      console.log(`[TOKEN_SUCCESS] Verifying session: ${sessionId}, attempt: ${retry + 1}`);
      setLoading(true);

      const { data } = await tokensApi.verifySession(sessionId);
      console.log('[TOKEN_SUCCESS] Verification success:', data);

      setResult(data);
      await refreshTokenBalance();
      setError('');
    } catch (err) {
      console.error('[TOKEN_SUCCESS] Verification error:', err.message);

      const status = err.response?.data?.status;
      if ((err.response?.status === 400 && status !== 'paid') && retry < 5) {
        console.log('[TOKEN_SUCCESS] Payment not marked as paid yet, retrying...');
        setRetryCount(retry + 1);
        shouldRetry = true;
        setTimeout(() => verifySession(sessionId, retry + 1), 2000);
        return; // Important: we stay in loading state because retry is scheduled
      }

      const errorMsg = err.response?.data?.error || 'Failed to verify payment';
      setError(errorMsg);

      try {
        await refreshTokenBalance();
      } catch (e) {
        console.warn('[TOKEN_SUCCESS] Balance refresh failed:', e.message);
      }
    } finally {
      // Only set loading false if we aren't planning to retry
      if (!shouldRetry) {
        setLoading(false);
      }
    }
  };

  const handleRetry = () => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      hasVerified.current = false;
      verifySession(sessionId);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          {retryCount > 0 ? `Verifying payment (attempt ${retryCount + 1})...` : 'Verifying your payment...'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This usually takes just a moment
        </Typography>
      </Box>
    );
  }

  if (error && !result) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <ErrorIcon sx={{ fontSize: 80, color: theme.palette.warning.main, mb: 2 }} />
        <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
          Verification Issue
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, textAlign: 'center', maxWidth: 400 }}>
          {error}
        </Typography>
        <Alert severity="info" sx={{ mb: 4, maxWidth: 500 }}>
          If you were charged, your tokens may take a few minutes to appear.
          Please check your token balance or contact support if the issue persists.
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleRetry}
            startIcon={<Refresh />}
          >
            Try Again
          </Button>
          <Button variant="contained" onClick={() => navigate('/tokens')}>
            Go to Tokens Page
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <MotionBox
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        sx={{ textAlign: 'center' }}
      >
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            mx: 'auto',
            mb: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.success.main, 0.4)}`,
          }}
        >
          <CheckCircle sx={{ fontSize: 60, color: 'white' }} />
        </Box>

        <Typography variant="h3" fontWeight={800} sx={{ mb: 2 }}>
          Payment Successful!
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Your tokens have been added to your account
        </Typography>

        <Card
          sx={{
            maxWidth: 400,
            mx: 'auto',
            mb: 4,
            background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 3 }}>
              <Token sx={{ fontSize: 40, color: theme.palette.primary.main }} />
              <Typography variant="h2" fontWeight={800} className="gradient-text">
                +{result?.tokens_added || 0}
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              tokens added to your account
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                background: alpha(theme.palette.success.main, 0.1),
              }}
            >
              <Typography variant="body2" color="text.secondary">
                New Balance
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {result?.new_balance || 0} tokens
              </Typography>
            </Box>

            {result?.already_processed && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                This purchase was already processed.
              </Typography>
            )}
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/analyze/comments')}
            endIcon={<ArrowForward />}
          >
            Start Analyzing
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
        </Box>
      </MotionBox>
    </Box>
  );
};

export default TokenSuccess;
