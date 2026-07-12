import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'commentiq_cookie_consent';

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <Box
          component={motion.div}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          sx={{
            position: 'fixed',
            bottom: { xs: 16, sm: 24 },
            left: { xs: 16, sm: '50%' },
            right: { xs: 16, sm: 'auto' },
            transform: { xs: 'none', sm: 'translateX(-50%)' },
            width: { sm: 'auto' },
            maxWidth: 560,
            zIndex: 9999,
            background: '#1A1A2E',
            borderRadius: '16px',
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', flex: 1, minWidth: 200 }}>
            We use essential cookies for authentication and session management only — no tracking or advertising cookies.{' '}
            <Link component={RouterLink} to="/privacy" sx={{ color: 'rgba(255,255,255,0.6)', textDecorationColor: 'rgba(255,255,255,0.3)' }}>
              Privacy Policy
            </Link>
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={accept}
            sx={{
              flexShrink: 0,
              px: 3,
              background: '#6C63FF',
              '&:hover': { background: '#5a52d5' },
              boxShadow: 'none',
            }}
          >
            Got it
          </Button>
        </Box>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;
