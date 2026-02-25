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
  Tabs,
  Tab,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  Star,
  Token,
  Refresh,
  CreditCard,
  Autorenew,
  Cancel,
  Schedule,
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

const FALLBACK_SUBSCRIPTION_PLANS = [
  {
    id: 'sub_starter',
    name: 'Starter',
    tokens_per_month: 150,
    price: 1499,
    description: 'Perfect for content creators',
    features: ['150 tokens/month', 'Rollover unused tokens (max 300)', 'Priority support'],
    popular: false,
  },
  {
    id: 'sub_pro',
    name: 'Pro',
    tokens_per_month: 500,
    price: 3999,
    description: 'For agencies and power users',
    features: ['500 tokens/month', 'Rollover unused tokens (max 1000)', 'Priority support', '20% bonus on token purchases'],
    popular: true,
  },
  {
    id: 'sub_enterprise',
    name: 'Enterprise',
    tokens_per_month: 1500,
    price: 9999,
    description: 'Unlimited power for large teams',
    features: ['1500 tokens/month', 'Unlimited token rollover', 'Dedicated support', '30% bonus on token purchases', 'API access (coming soon)'],
    popular: false,
  },
];

const Tokens = () => {
  const { tokenBalance } = useAuth();

  const [tab, setTab] = useState(0);
  const [packages, setPackages] = useState(FALLBACK_PACKAGES);
  const [subscriptionPlans, setSubscriptionPlans] = useState(FALLBACK_SUBSCRIPTION_PLANS);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [subscribing, setSubscribing] = useState(null);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load packages
      try {
        const packagesRes = await tokensApi.getPackages();
        if (packagesRes.data?.packages?.length > 0) {
          setPackages(packagesRes.data.packages);
        }
      } catch (pkgError) {
        console.warn('Failed to load packages, using defaults:', pkgError);
      }

      // Load subscription plans
      try {
        const plansRes = await tokensApi.getSubscriptionPlans();
        if (plansRes.data?.plans?.length > 0) {
          setSubscriptionPlans(plansRes.data.plans);
        }
      } catch (planError) {
        console.warn('Failed to load subscription plans, using defaults:', planError);
      }

      // Load current subscription
      try {
        const subRes = await tokensApi.getSubscription();
        setCurrentSubscription(subRes.data);
      } catch (subError) {
        console.warn('Failed to load subscription:', subError);
        setCurrentSubscription({ active: false });
      }

      // Load transactions
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

  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    try {
      const { data } = await tokensApi.subscribe(planId);
      if (data.url) {
        if (!data.url.startsWith('https://checkout.stripe.com/')) {
          throw new Error('Invalid checkout URL');
        }
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Subscribe error:', err);
      toast.error(err.response?.data?.error || 'Failed to start subscription. Please try again.');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will keep access until the end of your billing period.')) {
      return;
    }

    setCancelingSubscription(true);
    try {
      await tokensApi.cancelSubscription();
      toast.success('Subscription will be canceled at the end of your billing period');
      loadData();
    } catch (err) {
      console.error('Cancel subscription error:', err);
      toast.error(err.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setCancelingSubscription(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setCancelingSubscription(true);
    try {
      await tokensApi.reactivateSubscription();
      toast.success('Subscription reactivated!');
      loadData();
    } catch (err) {
      console.error('Reactivate subscription error:', err);
      toast.error(err.response?.data?.error || 'Failed to reactivate subscription');
    } finally {
      setCancelingSubscription(false);
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
        Tokens & Subscriptions
      </Typography>
      <Typography variant="body1" sx={{ color: colors.textSecondary, mb: 4 }}>
        Purchase tokens one-time or subscribe for monthly credits
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
          flexWrap: 'wrap',
          gap: 2,
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

        {currentSubscription?.active && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={<Autorenew sx={{ fontSize: 18 }} />}
              label={`${currentSubscription.plan?.name || 'Active'} Subscription`}
              color="primary"
              sx={{ fontWeight: 600 }}
            />
            {currentSubscription.period_end && (
              <Typography variant="caption" sx={{ color: colors.textMuted }}>
                {currentSubscription.status === 'canceling' ? 'Ends' : 'Renews'}: {formatDate(currentSubscription.period_end)}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{ mb: 4, borderBottom: `1px solid ${colors.border}` }}
      >
        <Tab icon={<CreditCard sx={{ fontSize: 20 }} />} iconPosition="start" label="One-Time Packs" />
        <Tab icon={<Autorenew sx={{ fontSize: 20 }} />} iconPosition="start" label="Subscriptions" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* One-Time Token Packages */}
          {tab === 0 && (
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

          {/* Subscription Plans */}
          {tab === 1 && (
            <>
              {/* Current Subscription Status */}
              {currentSubscription?.active && (
                <Card sx={{ mb: 4, border: `2px solid ${colors.primary}`, borderRadius: '16px' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={700} sx={{ color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Autorenew sx={{ color: colors.primary }} />
                          {currentSubscription.plan?.name || 'Active'} Subscription
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 0.5 }}>
                          {currentSubscription.plan?.tokens_per_month || 0} tokens/month
                          {currentSubscription.period_end && (
                            <> &bull; {currentSubscription.status === 'canceling' ? 'Ends' : 'Renews'} on {formatDate(currentSubscription.period_end)}</>
                          )}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        {currentSubscription.status === 'canceling' ? (
                          <Button
                            variant="contained"
                            onClick={handleReactivateSubscription}
                            disabled={cancelingSubscription}
                            startIcon={cancelingSubscription ? <CircularProgress size={18} /> : <Autorenew />}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={handleCancelSubscription}
                            disabled={cancelingSubscription}
                            startIcon={cancelingSubscription ? <CircularProgress size={18} /> : <Cancel />}
                          >
                            Cancel
                          </Button>
                        )}
                      </Box>
                    </Box>
                    {currentSubscription.status === 'canceling' && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        Your subscription is set to cancel at the end of your billing period. You will keep access until then.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              <Grid container spacing={3} sx={{ mb: 4 }}>
                {subscriptionPlans.map((plan, index) => {
                  const isCurrentPlan = currentSubscription?.plan_id === plan.id;

                  return (
                    <Grid item xs={12} md={4} key={plan.id}>
                      <MotionBox
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        sx={{
                          height: '100%',
                          position: 'relative',
                          background: colors.background,
                          border: plan.popular ? `2px solid ${colors.primary}` : isCurrentPlan ? `2px solid ${colors.success}` : `1px solid ${colors.border}`,
                          borderRadius: '16px',
                          boxShadow: plan.popular ? shadows.md : shadows.card,
                          overflow: 'visible',
                        }}
                      >
                        {plan.popular && !isCurrentPlan && (
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
                        {isCurrentPlan && (
                          <Chip
                            icon={<CheckCircle sx={{ fontSize: 16, color: 'white' }} />}
                            label="Current Plan"
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: -12,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: colors.success,
                              color: 'white',
                              fontWeight: 600,
                              '.MuiChip-icon': { color: 'white' },
                            }}
                          />
                        )}
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: colors.textPrimary }}>
                            {plan.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', mb: 1 }}>
                            <Typography variant="h3" fontWeight={700} className="gradient-text font-mono">
                              ${(plan.price / 100).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: colors.textMuted, ml: 0.5 }}>/month</Typography>
                          </Box>
                          <Chip
                            label={`${plan.tokens_per_month} tokens/month`}
                            size="small"
                            sx={{
                              mb: 2,
                              background: alpha(colors.primary, 0.1),
                              color: colors.primary,
                              fontWeight: 600,
                            }}
                          />
                          <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 3 }}>
                            {plan.description}
                          </Typography>

                          <Divider sx={{ my: 2, borderColor: colors.border }} />

                          <Box sx={{ textAlign: 'left', mb: 3 }}>
                            {plan.features.map((feature) => (
                              <Box key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <CheckCircle sx={{ fontSize: 18, color: colors.success }} />
                                <Typography variant="body2" sx={{ color: colors.textPrimary }}>{feature}</Typography>
                              </Box>
                            ))}
                          </Box>

                          <Button
                            fullWidth
                            variant={plan.popular && !isCurrentPlan ? 'contained' : 'outlined'}
                            size="large"
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={subscribing === plan.id || isCurrentPlan || currentSubscription?.active}
                            sx={{
                              py: 1.5,
                              ...(plan.popular && !isCurrentPlan ? {} : {
                                background: colors.background,
                                borderColor: isCurrentPlan ? colors.success : colors.border,
                                color: isCurrentPlan ? colors.success : colors.textPrimary,
                                '&:hover': {
                                  borderColor: colors.primary,
                                  background: colors.surface,
                                },
                              }),
                            }}
                          >
                            {subscribing === plan.id ? (
                              <CircularProgress size={24} color="inherit" />
                            ) : isCurrentPlan ? (
                              'Current Plan'
                            ) : currentSubscription?.active ? (
                              'Cancel current first'
                            ) : (
                              'Subscribe'
                            )}
                          </Button>
                        </Box>
                      </MotionBox>
                    </Grid>
                  );
                })}
              </Grid>

              {/* Subscription Benefits */}
              <Card sx={{ mb: 4, borderRadius: '16px', background: alpha(colors.primary, 0.03), border: `1px solid ${colors.border}` }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: colors.textPrimary }}>
                    Why Subscribe?
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Schedule sx={{ color: colors.primary, mt: 0.5 }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600} sx={{ color: colors.textPrimary }}>Save up to 30%</Typography>
                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            Monthly tokens are more cost-effective than one-time purchases
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Autorenew sx={{ color: colors.primary, mt: 0.5 }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600} sx={{ color: colors.textPrimary }}>Rollover Tokens</Typography>
                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            Unused tokens roll over to next month (limits apply per plan)
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Star sx={{ color: colors.primary, mt: 0.5 }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600} sx={{ color: colors.textPrimary }}>Priority Support</Typography>
                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            Get faster responses and dedicated help when you need it
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </>
          )}
        </>
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
          <Grid item xs={12} md={3}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: colors.textPrimary }}>
              YouTube Comments
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              1 token per 1,000 comments scraped
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: colors.textPrimary }}>
              TikTok Comments
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              1 token per 100 comments scraped
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: colors.textPrimary }}>
              AI Analysis
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              +5 tokens for text analysis, +5 for marketing insights
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: colors.textPrimary }}>
              Engagement Check
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              +20 tokens for influencer authenticity validation
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Tokens;
