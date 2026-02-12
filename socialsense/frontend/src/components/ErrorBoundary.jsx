import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    // Log error to console (could also send to error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #E0E5EC 0%, #F5F7FA 100%)',
            p: 3,
          }}
        >
          <Card
            sx={{
              maxWidth: 500,
              width: '100%',
              borderRadius: '24px',
              boxShadow: '8px 8px 16px #c5cad1, -8px -8px 16px #ffffff',
              textAlign: 'center',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <ErrorOutline sx={{ fontSize: 40, color: 'white' }} />
              </Box>

              <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: '#1a1a2e' }}>
                Something went wrong
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                We encountered an unexpected error. Please try refreshing the page.
              </Typography>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    borderRadius: '12px',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    textAlign: 'left',
                    maxHeight: 150,
                    overflow: 'auto',
                  }}
                >
                  <Typography
                    variant="caption"
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#991B1B',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={this.handleRefresh}
                  sx={{
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6C63FF 0%, #38B2AC 100%)',
                    px: 3,
                  }}
                >
                  Refresh Page
                </Button>
                <Button
                  variant="outlined"
                  onClick={this.handleGoHome}
                  sx={{ borderRadius: '12px' }}
                >
                  Go to Dashboard
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
