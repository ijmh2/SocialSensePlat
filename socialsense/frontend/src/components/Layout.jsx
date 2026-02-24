import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
  Token as TokenIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  AutoGraph as AnalyticsIcon,
  Timeline as PerformanceIcon,
  ChevronLeft,
  ChevronRight,
  Close,
  Schedule,
  CompareArrows,
  VerifiedUser,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '../contexts/AuthContext';
import { colors, shadows, gradients } from '../styles/theme';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED_WIDTH = 80;

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { path: '/analyze/comments', label: 'Analysis', icon: CommentIcon },
  { path: '/validate/engagement', label: 'Engagement', icon: VerifiedUser },
  { path: '/performance', label: 'Performance', icon: PerformanceIcon },
  { path: '/history', label: 'History', icon: HistoryIcon },
  { path: '/compare', label: 'Compare', icon: CompareArrows },
  { path: '/scheduled', label: 'Monitors', icon: Schedule },
  { path: '/tokens', label: 'Buy Tokens', icon: TokenIcon },
];

const Layout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { user, profile, tokenBalance, signOut } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleCollapse = () => setCollapsed(!collapsed);
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleSignOut = async () => {
    handleMenuClose();
    await signOut();
    navigate('/');
  };

  const currentDrawerWidth = isMobile ? DRAWER_WIDTH : (collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH);

  const drawer = (isCollapsed = false) => (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: colors.background,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          p: isCollapsed ? 2 : 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          minHeight: 80,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : 1.5 }}>
          <Box
            component={motion.div}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: gradients.primary,
              boxShadow: shadows.button,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AnalyticsIcon sx={{ color: 'white', fontSize: 24 }} />
          </Box>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    noWrap
                    sx={{ color: colors.textPrimary, fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                  >
                    CommentIQ
                  </Typography>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
        {!isMobile && !isCollapsed && (
          <IconButton
            size="small"
            onClick={handleCollapse}
            sx={{
              border: `1px solid ${colors.border}`,
              '&:hover': { background: colors.surface },
            }}
          >
            <ChevronLeft fontSize="small" sx={{ color: colors.textMuted }} />
          </IconButton>
        )}
      </Box>

      {/* Token Balance */}
      <Box sx={{ px: isCollapsed ? 1.5 : 2.5, py: 2 }}>
        {isCollapsed ? (
          <Tooltip title={`${tokenBalance} tokens`} placement="right">
            <Box
              sx={{
                p: 1.5,
                borderRadius: '12px',
                background: colors.primaryGlow,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                '&:hover': { background: `${colors.primary}15` },
              }}
              onClick={() => navigate('/tokens')}
            >
              <TokenIcon sx={{ color: colors.primary, fontSize: 22 }} />
              <Typography variant="caption" fontWeight={700} display="block" sx={{ color: colors.textPrimary, mt: 0.5 }}>
                {tokenBalance}
              </Typography>
            </Box>
          </Tooltip>
        ) : (
          <Box
            sx={{
              p: 2,
              borderRadius: '12px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Typography variant="caption" sx={{ color: colors.textMuted }} display="block">
              Token Balance
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="h4" fontWeight={700} className="gradient-text font-mono">
                {tokenBalance}
              </Typography>
              <Chip
                label="tokens"
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                  color: colors.textMuted,
                }}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, px: isCollapsed ? 1 : 2, py: 1 }}>
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={isCollapsed ? item.label : ''} placement="right">
                <ListItemButton
                  component={motion.div}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: '10px',
                    py: 1.5,
                    px: isCollapsed ? 1.5 : 2,
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    background: isActive ? colors.primaryGlow : 'transparent',
                    '&:hover': {
                      background: isActive ? colors.primaryGlow : colors.surface,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isActive ? gradients.primary : colors.surface,
                        border: isActive ? 'none' : `1px solid ${colors.border}`,
                      }}
                    >
                      <Icon
                        sx={{
                          fontSize: 20,
                          color: isActive ? 'white' : colors.textMuted,
                        }}
                      />
                    </Box>
                  </ListItemIcon>
                  {!isCollapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.9rem',
                        color: isActive ? colors.primary : colors.textSecondary,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* Collapse button for collapsed state */}
      {!isMobile && isCollapsed && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <IconButton
            size="small"
            onClick={handleCollapse}
            sx={{
              border: `1px solid ${colors.border}`,
              '&:hover': { background: colors.surface },
            }}
          >
            <ChevronRight fontSize="small" sx={{ color: colors.textMuted }} />
          </IconButton>
        </Box>
      )}

      {/* User info */}
      <Box sx={{ p: isCollapsed ? 1.5 : 2, borderTop: `1px solid ${colors.border}` }}>
        {isCollapsed ? (
          <Tooltip title={profile?.full_name || user?.email || 'User'} placement="right">
            <Avatar
              sx={{
                width: 40,
                height: 40,
                mx: 'auto',
                cursor: 'pointer',
                background: gradients.primary,
                fontSize: '1rem',
              }}
              onClick={handleMenuOpen}
            >
              {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
          </Tooltip>
        ) : (
          <Box
            sx={{
              p: 2,
              borderRadius: '12px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              transition: 'all 200ms ease',
              '&:hover': { boxShadow: shadows.card },
            }}
            onClick={handleMenuOpen}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                background: gradients.primary,
                fontSize: '1rem',
              }}
            >
              {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap sx={{ color: colors.textPrimary }}>
                {profile?.full_name || 'User'}
              </Typography>
              <Typography variant="caption" noWrap display="block" sx={{ color: colors.textMuted }}>
                {user?.email}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: colors.background }}>
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        sx={{
          display: { md: 'none' },
          background: colors.background,
          boxShadow: shadows.sm,
          borderBottom: `1px solid ${colors.border}`,
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              border: `1px solid ${colors.border}`,
              mr: 2,
            }}
          >
            {mobileOpen ? <Close sx={{ color: colors.textPrimary }} /> : <MenuIcon sx={{ color: colors.textPrimary }} />}
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1, color: colors.textPrimary }} fontWeight={700}>
            CommentIQ
          </Typography>
          <Chip
            icon={<TokenIcon sx={{ fontSize: 16, color: colors.primary }} />}
            label={tokenBalance}
            size="small"
            sx={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              fontWeight: 600,
              mr: 1,
            }}
          />
          <IconButton
            onClick={handleMenuOpen}
            sx={{ border: `1px solid ${colors.border}` }}
          >
            <Avatar sx={{ width: 32, height: 32, background: gradients.primary }}>
              {profile?.full_name?.[0] || 'U'}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            border: 'none',
            boxShadow: shadows.lg,
          },
        }}
      >
        {drawer(false)}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: currentDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: currentDrawerWidth,
            border: 'none',
            borderRight: `1px solid ${colors.border}`,
            transition: 'width 200ms ease-out',
            overflowX: 'hidden',
          },
        }}
        open
      >
        {drawer(collapsed)}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${currentDrawerWidth}px)` },
          minHeight: '100vh',
          background: colors.surface,
          pt: { xs: 8, md: 0 },
          transition: 'width 200ms ease-out',
        }}
      >
        {/* Desktop header */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'flex-end',
            p: 2,
            gap: 2,
            background: colors.background,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <Chip
            icon={<TokenIcon sx={{ fontSize: 18, color: colors.primary }} />}
            label={`${tokenBalance} tokens`}
            onClick={() => navigate('/tokens')}
            sx={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 200ms ease-out',
              '&:hover': {
                boxShadow: shadows.card,
                borderColor: colors.primary,
              },
            }}
          />
          <IconButton
            onClick={handleMenuOpen}
            sx={{
              border: `1px solid ${colors.border}`,
              '&:hover': { background: colors.surface },
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                background: gradients.primary,
              }}
            >
              {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
        </Box>

        {/* Page content */}
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {children}
        </Box>
      </Box>

      {/* User menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            boxShadow: shadows.lg,
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            mt: 1,
            minWidth: 200,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" fontWeight={600} sx={{ color: colors.textPrimary }}>
            {profile?.full_name || 'User'}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.textMuted }}>
            {user?.email}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: colors.border }} />
        <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }} sx={{ borderRadius: '8px', mx: 1, my: 0.5 }}>
          <ListItemIcon><PersonIcon fontSize="small" sx={{ color: colors.textMuted }} /></ListItemIcon>
          <Typography sx={{ color: colors.textPrimary }}>Profile</Typography>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }} sx={{ borderRadius: '8px', mx: 1, my: 0.5 }}>
          <ListItemIcon><SettingsIcon fontSize="small" sx={{ color: colors.textMuted }} /></ListItemIcon>
          <Typography sx={{ color: colors.textPrimary }}>Settings</Typography>
        </MenuItem>
        <Divider sx={{ borderColor: colors.border }} />
        <MenuItem onClick={handleSignOut} sx={{ borderRadius: '8px', mx: 1, my: 0.5 }}>
          <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: colors.error }} /></ListItemIcon>
          <Typography sx={{ color: colors.error }}>Sign Out</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Layout;
