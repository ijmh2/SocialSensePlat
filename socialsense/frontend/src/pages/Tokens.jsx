import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Divider,
  Alert,
} from '@mui/material';
import {
  CheckCircle,
  Star,
  Token,
  Refresh,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';
import { tokensApi, authApi } from '../utils/api';
import { colors, shadows, gradients } from '../styles/theme';

const MotionBox = motion(Box);

// Fallback packages if API fails
const FALLBACK_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    tokens: 100,
    price: 499,
    description: '100 tokens to get started',
    popular: false,
  },
  {
    id: 'creator',
    name: 'Creator',
    tokens: 500,
    price: 1999,
    description: '500 tokens - 20% savings',
    popular: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    tokens: 1000,
    price: 3499,
    description: '1000 tokens - 30% savings',
    popular: false,
  },
];

const Tokens = () => {
  const { tokenBalance } = useAuth();

  const [packages, setPackages] = useState(FALLBACK_PACKAGES);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      try {
        const packagesRes = await tokensApi.getPackages();
        if (packagesRes.data?.packages?.length > 0) {
          setPackages(packagesRes.data.packages);
        }
      } catch (pkgError) {
        console.warn('Failed to load packages, using defaults:', pkgError);
      }

      try {
        const transactionsRes = await authApi.getTransactions({ limit: 10 });
        setTransactions(transactionsRes.data?.transactions || []);
      } catch (txError) {
        console.warn('Failed to load transactions:', txError);
      }

    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load some data. You can still purchase tokens.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId) => {
    setPurchasing(packageId);
    try {
      const { data } = await tokensApi.createCheckout(packageId);
      if (data.url) {
        // Validate URL is from Stripe before redirecting (security)
        if (!data.url.startsWith('https://checkout.stripe.com/')) {
          throw new Error('Invalid checkout URL');
        }
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err.response?.data?.error || 'Failed to start checkout. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'purchase':
      case 'bonus':
        return colors.success;
      case 'usage':
        return colors.error;
      case 'refund':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getPackageFeatures = (tokens) => {
    const ytComments = tokens * 1000;
    const ttComments = tokens * 100;

    return [
      `${ytComments.toLocaleString()} YouTube comments`,
      `${ttComments.toLocaleString()} TikTok comments`,
      `${Math.floor(tokens / 10)} AI analyses`,
      'CSV exports included',
      'No expiration',
    ];
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1, color: colors.textPrimary }}>
        Token Packages
      </Typography>
      <Typography variant="body1" sx={{ color: colors.textSecondary, mb: 4 }}>
        Purchase tokens to run analyses. No subscriptions, pay as you go.
      </Typography>

      {error && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={loadData} startIcon={<Refresh />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Current Balance */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          background: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          boxShadow: shadows.card,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: colors.primaryGlow,
            }}
          >
            <Token sx={{ fontSize: 28, color: colors.primary }} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: colors.textMuted }}>Current Balance</Typography>
            <Typography variant="h3" fontWeight={700} className="gradient-text font-mono">{tokenBalance}</Typography>
          </Box>
        </Box>
        <Typography variant="body2" sx={{ color: colors.textMuted }}>tokens</Typography>
      </Box>

      {/* Token Packages */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {packages.map((pkg, index) => (
            <Grid item xs={12} md={4} key={pkg.id}>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                sx={{
                  height: '100%',
                  position: 'relative',
                  background: colors.background,
                  border: pkg.popular ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                  borderRadius: '16px',
                  boxShadow: pkg.popular ? shadows.md : shadows.card,
                  overflow: 'visible',
                }}
              >
                {pkg.popular && (
                  <Chip
                    icon={<Star sx={{ fontSize: 16, color: 'white' }} />}
                    label="Most Popular"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: gradients.primary,
                      color: 'white',
                      fontWeight: 600,
                      '.MuiChip-icon': { color: 'white' },
                    }}
                  />
                )}
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: colors.textPrimary }}>
                    {pkg.name}
                  </Typography>
                  <Typography variant="h3" fontWeight={700} className="gradient-text font-mono" sx={{ mb: 2 }}>
                    ${(pkg.price / 100).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 3 }}>
                    {pkg.description}
                  </Typography>

                  <Divider sx={{ my: 2, borderColor: colors.border }} />

                  <Box sx={{ textAlign: 'left', mb: 3 }}>
                    {getPackageFeatures(pkg.tokens).map((feature) => (
                      <Box key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CheckCircle sx={{ fontSize: 18, color: colors.success }} />
                        <Typography variant="body2" sx={{ color: colors.textPrimary }}>{feature}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Button
                    fullWidth
                    variant={pkg.popular ? 'contained' : 'outlined'}
                    size="large"
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasing === pkg.id}
                    sx={{
                      py: 1.5,
                      ...(pkg.popular ? {} : {
                        background: colors.background,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                        '&:hover': {
                          borderColor: colors.primary,
                          background: colors.surface,
                        },
                      }),
                    }}
                  >
                    {purchasing === pkg.id ? <CircularProgress size={24} color="inherit" /> : 'Purchase'}
                  </Button>
                </Box>
              </MotionBox>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Transaction History */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: colors.textPrimary }}>
        Recent Transactions
      </Typography>
      <Box
        sx={{
          background: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: shadows.card,
        }}
      >
        {transactions.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: colors.textMuted }}>No transactions yet</Typography>
          </Box>
        ) : (
          <Box>
            {transactions.map((transaction, index) => (
              <Box
                key={transaction.id}
                sx={{
                  p: 2.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: index < transactions.length - 1 ? `1px solid ${colors.border}` : 'none',
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ color: colors.textPrimary }}>
                    {transaction.description}
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.textMuted }}>
                    {formatDate(transaction.created_at)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body1" fontWeight={600} className="font-mono" sx={{ color: getTransactionColor(transaction.transaction_type) }}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.textMuted }}>
                    Balance: {transaction.balance_after}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Token Usage Info */}
      <Box
        sx={{
          mt: 4,
          p: 3,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
        }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: colors.textPrimary }}>
          Token Usage Guide
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: colors.textPrimary }}>
              YouTube Comments
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              1 token per 1,000 comments scraped
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: colors.textPrimary }}>
              TikTok Comments
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              1 token per 100 comments scraped
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: colors.textPrimary }}>
              AI Analysis
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              +5 tokens for text analysis, +5 for marketing insights
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Tokens;
