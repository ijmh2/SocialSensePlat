import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Skeleton,
  alpha,
} from '@mui/material';
import {
  CardGiftcard,
  ContentCopy,
  CheckCircle,
  Share,
  People,
  Token,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

import { authApi } from '../utils/api';
import { colors, shadows } from '../styles/theme';

const ReferralCard = () => {
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    loadReferralData();
    return () => {
      // Cleanup timeout on unmount
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const loadReferralData = async () => {
    try {
      const { data } = await authApi.getReferral();
      setReferralData(data);
    } catch (err) {
      console.error('Failed to load referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (referralData?.referral_code) {
      navigator.clipboard.writeText(referralData.referral_code);
      setCopied(true);
      toast.success('Referral code copied!');
      // Clear any existing timeout before setting a new one
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (referralData?.referral_code) {
      const link = `${window.location.origin}/signup?ref=${referralData.referral_code}`;
      navigator.clipboard.writeText(link);
      toast.success('Referral link copied!');
    }
  };

  const handleShare = async () => {
    if (referralData?.referral_code) {
      const link = `${window.location.origin}/signup?ref=${referralData.referral_code}`;
      const text = `Join me on CommentIQ and get 10 free tokens! Use my referral code: ${referralData.referral_code}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: 'CommentIQ Referral', text, url: link });
        } catch (err) {
          if (err.name !== 'AbortError') {
            handleCopyLink();
          }
        }
      } else {
        handleCopyLink();
      }
    }
  };

  if (loading) {
    return (
      <Card sx={{ borderRadius: '20px', boxShadow: shadows.card }}>
        <CardContent sx={{ p: 3 }}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="rectangular" height={60} sx={{ mt: 2, borderRadius: 2 }} />
          <Skeleton variant="text" width="40%" height={24} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  if (!referralData) return null;

  return (
    <Card
      sx={{
        borderRadius: '20px',
        boxShadow: shadows.card,
        background: `linear-gradient(135deg, ${alpha(colors.primary, 0.05)} 0%, ${alpha(colors.secondary, 0.05)} 100%)`,
        border: `1px solid ${alpha(colors.primary, 0.1)}`,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            }}
          >
            <CardGiftcard sx={{ color: 'white', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: colors.textPrimary }}>
              Invite Friends
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              You both get 10 tokens!
            </Typography>
          </Box>
        </Box>

        {/* Referral Code Box */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderRadius: '14px',
            background: colors.background,
            boxShadow: shadows.sm,
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
              Your Code
            </Typography>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{
                color: colors.primary,
                fontFamily: 'monospace',
                letterSpacing: 2,
              }}
            >
              {referralData.referral_code}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
              <IconButton
                onClick={handleCopyCode}
                sx={{
                  background: alpha(colors.primary, 0.1),
                  '&:hover': { background: alpha(colors.primary, 0.2) },
                }}
              >
                {copied ? <CheckCircle sx={{ color: colors.success }} /> : <ContentCopy sx={{ color: colors.primary }} />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Share">
              <IconButton
                onClick={handleShare}
                sx={{
                  background: alpha(colors.secondary, 0.1),
                  '&:hover': { background: alpha(colors.secondary, 0.2) },
                }}
              >
                <Share sx={{ color: colors.secondary }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: '12px',
              background: alpha(colors.success, 0.05),
              textAlign: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
              <People sx={{ fontSize: 18, color: colors.success }} />
              <Typography variant="h5" fontWeight={700} sx={{ color: colors.success }}>
                {referralData.referral_count}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: colors.textMuted }}>
              Friends Invited
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: '12px',
              background: alpha(colors.primary, 0.05),
              textAlign: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
              <Token sx={{ fontSize: 18, color: colors.primary }} />
              <Typography variant="h5" fontWeight={700} sx={{ color: colors.primary }}>
                {referralData.total_tokens_earned}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: colors.textMuted }}>
              Tokens Earned
            </Typography>
          </Box>
        </Box>

        {/* Copy Link Button */}
        <Button
          fullWidth
          variant="outlined"
          onClick={handleCopyLink}
          startIcon={<ContentCopy />}
          sx={{
            mt: 3,
            borderRadius: '12px',
            borderColor: alpha(colors.primary, 0.3),
            color: colors.primary,
            '&:hover': {
              borderColor: colors.primary,
              background: alpha(colors.primary, 0.05),
            },
          }}
        >
          Copy Invite Link
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
