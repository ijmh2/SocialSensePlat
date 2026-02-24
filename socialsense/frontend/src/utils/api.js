import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with longer timeouts for analysis operations
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
  timeout: 30000, // 30 second default timeout
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    // Basic session retrieval without excessive retry logic that might hang
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('[API] Request Interceptor Error:', error);
  }

  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        error.message = 'Request timed out. Please try again.';
      } else if (error.message === 'Network Error') {
        error.message = 'Network error. Please check your connection.';
      }
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.warn('[API] 401 Unauthorized received');
      // Only sign out if we are not already at the login page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        // Optionally we could redirect here, but we should be careful about loops
        // Let the component handle it or ProtectedRoute will catch the missing user
      }
    }

    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  getTokenBalance: () => api.get('/auth/token-balance'),
  getTransactions: (params) => api.get('/auth/transactions', { params }),
  getReferral: () => api.get('/auth/referral'),
  applyReferral: (code) => api.post('/auth/apply-referral', { referral_code: code }),
  checkReferral: (code) => api.get(`/auth/check-referral/${code}`),
};

// Tokens endpoints
export const tokensApi = {
  getPackages: () => api.get('/tokens/packages'),
  getCosts: () => api.get('/tokens/costs'),
  calculateCost: (data) => api.post('/tokens/calculate', data),
  createCheckout: (packageId) => api.post('/tokens/checkout', { package_id: packageId }),
  verifySession: (sessionId) => api.get(`/tokens/verify-session/${sessionId}`, {
    timeout: 15000, // 15 second timeout for verification
  }),
};

// Analysis endpoints with extended timeouts
export const analysisApi = {
  estimate: (data) => api.post('/analysis/estimate', data, {
    timeout: 45000, // 45 seconds for estimate
  }),

  analyzeComments: (formData) => api.post('/analysis/comments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000, // 10 minutes for full analysis (includes video processing)
  }),

  getHistory: (params) => api.get('/analysis/history', { params }),
  getAnalysis: (id) => api.get(`/analysis/${id}`),
  exportCsv: (id) => api.get(`/analysis/${id}/export`, {
    responseType: 'blob',
    timeout: 60000, // 1 minute for export
  }),
  getProgress: (requestId) => api.get(`/analysis/progress/${requestId}`),
  getAccountScore: () => api.get('/analysis/account-score'),
  getScoreHistory: () => api.get('/analysis/score-history'),
  updateActionItems: (id, actionItems) => api.patch(`/analysis/${id}/action-items`, { actionItems }),
  compare: (id1, id2) => api.get(`/analysis/compare/${id1}/${id2}`),
};

// Analytics endpoints
export const analyticsApi = {
  getPerformance: () => api.get('/analytics/performance'),
};

// Scheduled analysis endpoints
export const scheduledApi = {
  list: () => api.get('/scheduled'),
  create: (data) => api.post('/scheduled', data),
  update: (id, data) => api.patch(`/scheduled/${id}`, data),
  toggle: (id) => api.patch(`/scheduled/${id}/toggle`),
  remove: (id) => api.delete(`/scheduled/${id}`),
  runNow: (id) => api.post(`/scheduled/${id}/run-now`),
};

export default api;
