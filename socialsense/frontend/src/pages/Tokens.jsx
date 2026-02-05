import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { neumorphShadows } from '../styles/theme';

const MotionCard = motion(Card);

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
  const navigate = useNavigate();
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
        return '#38B2AC';
      case 'usage':
        return '#E53E3E';
      case 'refund':
        return '#DD6B20';
      default:
        return '#6B7280';
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
    <Box>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 1, color: '#3D4852' }}>
        Token Packages
      </Typography>
      <Typography variant="body1" sx={{ color: '#6B7280', mb: 4 }}>
        Purchase tokens to run analyses. No subscriptions, pay as you go.
      </Typography>

      {error && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3, borderRadius: '16px', boxShadow: neumorphShadows.extrudedSmall }}
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
      <Card sx={{ mb: 4, borderRadius: '24px', boxShadow: neumorphShadows.extruded, background: '#E0E5EC' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: neumorphShadows.insetDeep,
                background: '#E0E5EC',
              }}
            >
              <Token sx={{ fontSize: 28, color: '#6C63FF' }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#6B7280' }}>Current Balance</Typography>
              <Typography variant="h3" fontWeight={800} className="gradient-text">{tokenBalance}</Typography>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>tokens</Typography>
        </CardContent>
      </Card>

      {/* Token Packages */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {packages.map((pkg, index) => (
            <Grid item xs={12} md={4} key={pkg.id}>
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                sx={{
                  height: '100%',
                  position: 'relative',
                  borderRadius: '24px',
                  boxShadow: pkg.popular ? neumorphShadows.extrudedHover : neumorphShadows.extruded,
                  background: '#E0E5EC',
                  border: pkg.popular ? '2px solid #6C63FF' : 'none',
                }}
              >
                {pkg.popular && (
                  <Chip
                    icon={<Star sx={{ fontSize: 16 }} />}
                    label="Most Popular"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(90deg, #6C63FF 0%, #8B84FF 100%)',
                      color: 'white',
                      fontWeight: 600,
                      boxShadow: neumorphShadows.extrudedSmall,
                    }}
                  />
                )}
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: '#3D4852' }}>
                    {pkg.name}
                  </Typography>
                  <Typography variant="h3" fontWeight={800} className="gradient-text" sx={{ mb: 2 }}>
                    ${(pkg.price / 100).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
                    {pkg.description}
                  </Typography>
                  
                  <Divider sx={{ my: 2, opacity: 0.2 }} />
                  
                  <Box sx={{ textAlign: 'left', mb: 3 }}>
                    {getPackageFeatures(pkg.tokens).map((feature) => (
                      <Box key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CheckCircle sx={{ fontSize: 18, color: '#38B2AC' }} />
                        <Typography variant="body2" sx={{ color: '#3D4852' }}>{feature}</Typography>
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
                      borderRadius: '16px',
                      py: 1.5,
                      boxShadow: neumorphShadows.extrudedSmall,
                      background: pkg.popular ? 'linear-gradient(135deg, #6C63FF 0%, #8B84FF 100%)' : '#E0E5EC',
                      color: pkg.popular ? 'white' : '#3D4852',
                      border: 'none',
                      '&:hover': {
                        boxShadow: neumorphShadows.extruded,
                        background: pkg.popular ? 'linear-gradient(135deg, #8B84FF 0%, #6C63FF 100%)' : '#E0E5EC',
                        border: 'none',
                      },
                    }}
                  >
                    {purchasing === pkg.id ? <CircularProgress size={24} color="inherit" /> : 'Purchase'}
                  </Button>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Transaction History */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#3D4852' }}>
        Recent Transactions
      </Typography>
      <Card sx={{ borderRadius: '24px', boxShadow: neumorphShadows.extruded, background: '#E0E5EC' }}>
        <CardContent sx={{ p: 0 }}>
          {transactions.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#6B7280' }}>No transactions yet</Typography>
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
                    borderBottom: index < transactions.length - 1 ? '1px solid rgba(163, 177, 198, 0.3)' : 'none',
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#3D4852' }}>
                      {transaction.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      {formatDate(transaction.created_at)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body1" fontWeight={600} sx={{ color: getTransactionColor(transaction.transaction_type) }}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      Balance: {transaction.balance_after}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Token Usage Info */}
      <Card sx={{ mt: 4, borderRadius: '24px', boxShadow: neumorphShadows.extruded, background: '#E0E5EC' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#3D4852' }}>
            Token Usage Guide
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#3D4852' }}>
                YouTube Comments
              </Typography>
              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                1 token per 1,000 comments scraped
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#3D4852' }}>
                TikTok Comments
              </Typography>
              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                1 token per 100 comments scraped
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#3D4852' }}>
                AI Analysis
              </Typography>
              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                +5 tokens for text analysis, +5 for marketing insights
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Tokens;
