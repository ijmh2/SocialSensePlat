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
  VideoLibrary as VideoIcon,
  History as HistoryIcon,
  Token as TokenIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  AutoGraph as AnalyticsIcon,
  ChevronLeft,
  ChevronRight,
  Close,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '../contexts/AuthContext';
import { neumorphShadows, neumorphColors } from '../styles/theme';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED_WIDTH = 80;

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { path: '/analyze/comments', label: 'Analysis', icon: CommentIcon },
  { path: '/history', label: 'History', icon: HistoryIcon },
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
        background: '#E0E5EC',
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
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6C63FF 0%, #8B84FF 100%)',
              boxShadow: neumorphShadows.extrudedSmall,
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
                    sx={{ color: '#3D4852', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                  >
                    SocialSense
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6B7280' }} noWrap>
                    Platinum
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
              boxShadow: neumorphShadows.extrudedSmall,
              background: '#E0E5EC',
              '&:hover': { boxShadow: neumorphShadows.extruded },
            }}
          >
            <ChevronLeft fontSize="small" sx={{ color: '#6B7280' }} />
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
                borderRadius: '14px',
                boxShadow: neumorphShadows.inset,
                background: '#E0E5EC',
                textAlign: 'center',
                cursor: 'pointer',
              }}
              onClick={() => navigate('/tokens')}
            >
              <TokenIcon sx={{ color: '#6C63FF', fontSize: 22 }} />
              <Typography variant="caption" fontWeight={700} display="block" sx={{ color: '#3D4852', mt: 0.5 }}>
                {tokenBalance}
              </Typography>
            </Box>
          </Tooltip>
        ) : (
          <Box
            sx={{
              p: 2,
              borderRadius: '16px',
              boxShadow: neumorphShadows.inset,
              background: '#E0E5EC',
            }}
          >
            <Typography variant="caption" sx={{ color: '#6B7280' }} display="block">
              Token Balance
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="h4" fontWeight={700} className="gradient-text">
                {tokenBalance}
              </Typography>
              <Chip
                label="tokens"
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  boxShadow: neumorphShadows.extrudedSmall,
                  background: '#E0E5EC',
                  color: '#6B7280',
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
            <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
              <Tooltip title={isCollapsed ? item.label : ''} placement="right">
                <ListItemButton
                  component={motion.div}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: '14px',
                    py: 1.5,
                    px: isCollapsed ? 1.5 : 2,
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    boxShadow: isActive ? neumorphShadows.inset : 'none',
                    background: '#E0E5EC',
                    '&:hover': {
                      boxShadow: isActive ? neumorphShadows.inset : neumorphShadows.extrudedSmall,
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
                        boxShadow: isActive ? neumorphShadows.extrudedSmall : neumorphShadows.insetSmall,
                        background: isActive ? 'linear-gradient(135deg, #6C63FF 0%, #8B84FF 100%)' : '#E0E5EC',
                      }}
                    >
                      <Icon
                        sx={{
                          fontSize: 20,
                          color: isActive ? 'white' : '#6B7280',
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
                        color: isActive ? '#3D4852' : '#6B7280',
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
              boxShadow: neumorphShadows.extrudedSmall,
              background: '#E0E5EC',
              '&:hover': { boxShadow: neumorphShadows.extruded },
            }}
          >
            <ChevronRight fontSize="small" sx={{ color: '#6B7280' }} />
          </IconButton>
        </Box>
      )}

      {/* User info */}
      <Box sx={{ p: isCollapsed ? 1.5 : 2 }}>
        {isCollapsed ? (
          <Tooltip title={profile?.full_name || user?.email || 'User'} placement="right">
            <Avatar
              sx={{
                width: 40,
                height: 40,
                mx: 'auto',
                cursor: 'pointer',
                boxShadow: neumorphShadows.extrudedSmall,
                background: 'linear-gradient(135deg, #6C63FF 0%, #8B84FF 100%)',
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
              borderRadius: '16px',
              boxShadow: neumorphShadows.extrudedSmall,
              background: '#E0E5EC',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
            }}
            onClick={handleMenuOpen}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                boxShadow: neumorphShadows.insetSmall,
                background: 'linear-gradient(135deg, #6C63FF 0%, #8B84FF 100%)',
                fontSize: '1rem',
              }}
            >
              {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap sx={{ color: '#3D4852' }}>
                {profile?.full_name || 'User'}
              </Typography>
              <Typography variant="caption" noWrap display="block" sx={{ color: '#6B7280' }}>
                {user?.email}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#E0E5EC' }}>
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        sx={{
          display: { md: 'none' },
          background: '#E0E5EC',
          boxShadow: neumorphShadows.extrudedSmall,
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton 
            edge="start" 
            onClick={handleDrawerToggle}
            sx={{
              boxShadow: neumorphShadows.extrudedSmall,
              background: '#E0E5EC',
              mr: 2,
            }}
          >
            {mobileOpen ? <Close sx={{ color: '#3D4852' }} /> : <MenuIcon sx={{ color: '#3D4852' }} />}
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1, color: '#3D4852' }} fontWeight={700}>
            SocialSense
          </Typography>
          <Chip
            icon={<TokenIcon sx={{ fontSize: 16, color: '#6C63FF' }} />}
            label={tokenBalance}
            size="small"
            sx={{
              boxShadow: neumorphShadows.extrudedSmall,
              background: '#E0E5EC',
              color: '#3D4852',
              fontWeight: 600,
              mr: 1,
            }}
          />
          <IconButton 
            onClick={handleMenuOpen}
            sx={{
              boxShadow: neumorphShadows.extrudedSmall,
              background: '#E0E5EC',
            }}
          >
            <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6C63FF 0%, #8B84FF 100%)' }}>
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
            boxShadow: neumorphShadows.extruded,
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
            boxShadow: neumorphShadows.extrudedSmall,
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
          background: '#E0E5EC',
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
          }}
        >
          <Chip
            icon={<TokenIcon sx={{ fontSize: 18, color: '#6C63FF' }} />}
            label={`${tokenBalance} tokens`}
            onClick={() => navigate('/tokens')}
            sx={{
              boxShadow: neumorphShadows.extrudedSmall,
              background: '#E0E5EC',
              color: '#3D4852',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 300ms ease-out',
              '&:hover': { 
                boxShadow: neumorphShadows.extruded,
                transform: 'translateY(-1px)',
              },
            }}
          />
          <IconButton 
            onClick={handleMenuOpen}
            sx={{
              boxShadow: neumorphShadows.extrudedSmall,
              background: '#E0E5EC',
              '&:hover': { boxShadow: neumorphShadows.extruded },
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, #6C63FF 0%, #8B84FF 100%)',
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
            boxShadow: neumorphShadows.extruded,
            background: '#E0E5EC',
            borderRadius: '16px',
            mt: 1,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" fontWeight={600} sx={{ color: '#3D4852' }}>
            {profile?.full_name || 'User'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#6B7280' }}>
            {user?.email}
          </Typography>
        </Box>
        <Divider sx={{ my: 1, opacity: 0.2 }} />
        <MenuItem onClick={handleMenuClose} sx={{ borderRadius: '8px', mx: 1 }}>
          <ListItemIcon><PersonIcon fontSize="small" sx={{ color: '#6B7280' }} /></ListItemIcon>
          <Typography sx={{ color: '#3D4852' }}>Profile</Typography>
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ borderRadius: '8px', mx: 1 }}>
          <ListItemIcon><SettingsIcon fontSize="small" sx={{ color: '#6B7280' }} /></ListItemIcon>
          <Typography sx={{ color: '#3D4852' }}>Settings</Typography>
        </MenuItem>
        <Divider sx={{ my: 1, opacity: 0.2 }} />
        <MenuItem onClick={handleSignOut} sx={{ borderRadius: '8px', mx: 1 }}>
          <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: '#E53E3E' }} /></ListItemIcon>
          <Typography sx={{ color: '#E53E3E' }}>Sign Out</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Layout;
