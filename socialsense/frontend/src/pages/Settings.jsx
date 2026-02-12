import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Avatar,
  Tabs,
  Tab,
  Divider,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Person,
  Settings as SettingsIcon,
  AccountCircle,
  ContentCopy,
  CheckCircle,
  Token,
  CardGiftcard,
  People,
  Save,
  Warning,
  DeleteForever,
  LockReset,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../utils/api';
import { colors, shadows } from '../styles/theme';

const MotionBox = motion(Box);

const TabPanel = ({ children, value, index, ...other }) => (
  <div role="tabpanel" hidden={value !== index} {...other}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const Settings = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, profile, tokenBalance, signOut, resetPassword } = useAuth();

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState('');
  const [referralData, setReferralData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Preferences state
  const [harshFeedback, setHarshFeedback] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      setFullName(profile?.full_name || '');

      // Load referral data
      try {
        const { data } = await authApi.getReferral();
        setReferralData(data);
      } catch (err) {
        console.error('Failed to load referral data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await authApi.updateProfile({ full_name: fullName });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (referralData?.referral_code) {
      navigator.clipboard.writeText(referralData.referral_code);
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword(user?.email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (err) {
      toast.error('Failed to send password reset email');
    }
  };

  const handleDeleteAccount = async () => {
    // In a real implementation, you would call an API to delete the account
    toast.error('Account deletion is not yet implemented. Please contact support.');
    setDeleteDialogOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{ mb: 4 }}
      >
        <Typography variant="h4" fontWeight={700} sx={{ color: colors.textPrimary, mb: 0.5 }}>
          Settings
        </Typography>
        <Typography variant="body1" sx={{ color: colors.textSecondary }}>
          Manage your profile and preferences
        </Typography>
      </MotionBox>

      {/* Tabs */}
      <Card
        sx={{
          borderRadius: '20px',
          boxShadow: shadows.card,
          overflow: 'visible',
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 56,
              },
            }}
          >
            <Tab icon={<Person />} iconPosition="start" label="Profile" />
            <Tab icon={<SettingsIcon />} iconPosition="start" label="Preferences" />
            <Tab icon={<AccountCircle />} iconPosition="start" label="Account" />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {/* Profile Tab */}
          <TabPanel value={tabValue} index={0}>
            {loading ? (
              <Box>
                <Skeleton variant="circular" width={80} height={80} sx={{ mb: 3 }} />
                <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
                <Skeleton variant="text" width="40%" height={30} />
              </Box>
            ) : (
              <Grid container spacing={4}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar
                      sx={{
                        width: 100,
                        height: 100,
                        fontSize: 36,
                        mx: 'auto',
                        mb: 2,
                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                      }}
                    >
                      {getInitials(fullName)}
                    </Avatar>
                    <Typography variant="h6" fontWeight={600}>
                      {fullName || 'No name set'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user?.email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Member since {formatDate(user?.created_at)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Personal Information
                  </Typography>

                  <TextField
                    fullWidth
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    sx={{ mb: 3 }}
                  />

                  <TextField
                    fullWidth
                    label="Email"
                    value={user?.email || ''}
                    disabled
                    helperText="Email cannot be changed"
                    sx={{ mb: 3 }}
                  />

                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>

                  <Divider sx={{ my: 4 }} />

                  {/* Referral Section */}
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Referral Program
                  </Typography>

                  {referralData ? (
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 2,
                          borderRadius: 2,
                          background: alpha(colors.primary, 0.05),
                          mb: 2,
                        }}
                      >
                        <CardGiftcard sx={{ color: colors.primary }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Your Referral Code
                          </Typography>
                          <Typography variant="h6" fontWeight={700} fontFamily="monospace">
                            {referralData.referral_code}
                          </Typography>
                        </Box>
                        <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                          <IconButton onClick={handleCopyCode}>
                            {copied ? <CheckCircle color="success" /> : <ContentCopy />}
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <People sx={{ color: colors.success }} />
                            <Box>
                              <Typography variant="h6" fontWeight={600}>
                                {referralData.referral_count || 0}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Friends Invited
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Token sx={{ color: colors.primary }} />
                            <Box>
                              <Typography variant="h6" fontWeight={600}>
                                {referralData.total_tokens_earned || 0}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Tokens Earned
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Referral data not available
                    </Typography>
                  )}
                </Grid>
              </Grid>
            )}
          </TabPanel>

          {/* Preferences Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3 }}>
              Analysis Preferences
            </Typography>

            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={harshFeedback}
                    onChange={(e) => setHarshFeedback(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Default to Harsh Feedback Mode</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Enable brutally honest criticism by default for all analyses
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              You can override this setting for individual analyses.
            </Alert>

            <Divider sx={{ my: 4 }} />

            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3 }}>
              Notifications
            </Typography>

            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    color="primary"
                    disabled
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Email Notifications</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Receive email when scheduled analyses complete (coming soon)
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Button variant="outlined" disabled>
              Save Preferences (Coming Soon)
            </Button>
          </TabPanel>

          {/* Account Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3 }}>
              Token Balance
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 3,
                borderRadius: 2,
                background: alpha(colors.primary, 0.05),
                mb: 2,
              }}
            >
              <Token sx={{ fontSize: 40, color: colors.primary }} />
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  {tokenBalance}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tokens Available
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto' }}>
                <Button variant="contained" onClick={() => navigate('/tokens')}>
                  Buy More
                </Button>
              </Box>
            </Box>

            <Button
              variant="text"
              onClick={() => navigate('/history')}
              sx={{ mb: 4 }}
            >
              View Transaction History
            </Button>

            <Divider sx={{ my: 4 }} />

            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3 }}>
              Security
            </Typography>

            <Button
              variant="outlined"
              startIcon={<LockReset />}
              onClick={handleResetPassword}
              sx={{ mb: 4 }}
            >
              Change Password
            </Button>

            <Divider sx={{ my: 4 }} />

            {/* Danger Zone */}
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                background: alpha(theme.palette.error.main, 0.05),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Warning sx={{ color: 'error.main' }} />
                <Typography variant="subtitle1" fontWeight={600} color="error">
                  Danger Zone
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Once you delete your account, there is no going back. All your data,
                analyses, and remaining tokens will be permanently deleted.
              </Typography>

              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteForever />}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Account
              </Button>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="error" />
          Delete Account
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your account? This action cannot be undone.
            All your data, analyses, and {tokenBalance} remaining tokens will be permanently deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained">
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
