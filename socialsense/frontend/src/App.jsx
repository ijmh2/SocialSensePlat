import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';

// Lazy load pages for better performance
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const SignUp = lazy(() => import('./pages/SignUp'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CommentAnalysis = lazy(() => import('./pages/CommentAnalysis'));
const Tokens = lazy(() => import('./pages/Tokens'));
const TokenSuccess = lazy(() => import('./pages/TokenSuccess'));
const History = lazy(() => import('./pages/History'));
const AnalysisDetail = lazy(() => import('./pages/AnalysisDetail'));

// Loading fallback
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#FFFFFF',
    }}
  >
    <CircularProgress size={48} sx={{ color: '#1E40AF' }} />
  </Box>
);

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public route wrapper (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignUp />
            </PublicRoute>
          }
        />

        {/* Protected routes with layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyze/comments"
          element={
            <ProtectedRoute>
              <Layout>
                <CommentAnalysis />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Redirect old video route to unified analysis */}
        <Route
          path="/analyze/video"
          element={<Navigate to="/analyze/comments" replace />}
        />
        <Route
          path="/tokens"
          element={
            <ProtectedRoute>
              <Layout>
                <Tokens />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tokens/success"
          element={
            <ProtectedRoute>
              <Layout>
                <TokenSuccess />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <Layout>
                <History />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <AnalysisDetail />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to dashboard or landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
