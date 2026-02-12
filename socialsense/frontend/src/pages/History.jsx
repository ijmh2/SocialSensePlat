import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Visibility,
  Download,
  YouTube,
  VideoLibrary,
  Refresh,
  CompareArrows,
} from '@mui/icons-material';
import TikTokIcon from '../components/icons/TikTokIcon';
import toast from 'react-hot-toast';

import { analysisApi } from '../utils/api';
import { colors, shadows } from '../styles/theme';

/**
 * Get score color based on value
 */
const getScoreColor = (score) => {
  if (score >= 75) return colors.success;
  if (score >= 60) return colors.primary;
  if (score >= 40) return colors.warning;
  return colors.error;
};

const History = () => {
  const navigate = useNavigate();

  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [myVideosOnly, setMyVideosOnly] = useState(false);

  useEffect(() => {
    loadAnalyses();
  }, [page, rowsPerPage, statusFilter, myVideosOnly]);

  const loadAnalyses = async () => {
    try {
      setLoading(true);
      const params = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (myVideosOnly) {
        params.my_videos = true;
      }

      const { data } = await analysisApi.getHistory(params);
      setAnalyses(data.analyses || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('Failed to load analysis history');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (analysisId) => {
    try {
      const response = await analysisApi.exportCsv(analysisId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analysis-${analysisId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url); // Prevent memory leak
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'youtube':
        return <YouTube sx={{ fontSize: 20, color: '#FF0000' }} />;
      case 'tiktok':
        return <TikTokIcon sx={{ fontSize: 20, color: '#000000' }} />;
      default:
        return <VideoLibrary sx={{ fontSize: 20, color: colors.textMuted }} />;
    }
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'completed':
        return { bg: '#F0FDF4', color: colors.success };
      case 'processing':
        return { bg: '#FFFBEB', color: colors.warning };
      case 'failed':
        return { bg: '#FEF2F2', color: colors.error };
      default:
        return { bg: colors.surface, color: colors.textSecondary };
    }
  };

  const getAnalysisTypeLabel = (type) => {
    switch (type) {
      case 'youtube_comments':
        return 'YouTube Comments';
      case 'tiktok_comments':
        return 'TikTok Comments';
      case 'video_analysis':
        return 'Video Analysis';
      default:
        return type;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1, color: colors.textPrimary }}>
        Analysis History
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: colors.textSecondary }}>
        View and manage your past analyses
      </Typography>

      {/* Filters */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          background: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Videos</InputLabel>
          <Select
            value={myVideosOnly ? 'my' : 'all'}
            label="Videos"
            onChange={(e) => {
              setMyVideosOnly(e.target.value === 'my');
              setPage(0);
            }}
          >
            <MenuItem value="all">All Videos</MenuItem>
            <MenuItem value="my">My Videos Only</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="outlined"
          startIcon={<CompareArrows />}
          onClick={() => navigate('/compare')}
          sx={{ borderColor: colors.border }}
        >
          Compare
        </Button>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadAnalyses}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Table */}
      <Box
        sx={{
          background: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: shadows.card,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : analyses.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: colors.textSecondary }}>
              No analyses found
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: colors.textMuted }}>
              Start by analyzing a video to see your history here
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/analyze/comments')}
            >
              Start Analysis
            </Button>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Platform</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="center">Comments</TableCell>
                    <TableCell align="center">Tokens</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Score</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyses.map((analysis) => {
                    const statusStyles = getStatusStyles(analysis.status);
                    return (
                      <TableRow
                        key={analysis.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { background: colors.surface },
                        }}
                        onClick={() => navigate(`/analysis/${analysis.id}`)}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getPlatformIcon(analysis.platform)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 200, color: colors.textPrimary }}>
                            {analysis.video_title || 'Untitled'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                            {getAnalysisTypeLabel(analysis.analysis_type)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" className="font-mono" sx={{ color: colors.textPrimary }}>
                            {analysis.comment_count?.toLocaleString() || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" className="font-mono" sx={{ color: colors.textPrimary }}>
                            {analysis.tokens_used}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={analysis.status}
                            size="small"
                            sx={{
                              background: statusStyles.bg,
                              color: statusStyles.color,
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              border: 'none',
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {analysis.is_my_video && analysis.video_score != null ? (
                            <Tooltip
                              title={analysis.priority_improvement || 'Video score'}
                              arrow
                              placement="top"
                            >
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: '8px',
                                  background: `${getScoreColor(analysis.video_score)}15`,
                                  border: `1px solid ${getScoreColor(analysis.video_score)}40`,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  className="font-mono"
                                  sx={{
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: getScoreColor(analysis.video_score),
                                  }}
                                >
                                  {analysis.video_score}
                                </Typography>
                              </Box>
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" sx={{ color: colors.textMuted }}>
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: colors.textMuted }}>
                            {formatDate(analysis.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/analysis/${analysis.id}`);
                              }}
                              sx={{
                                color: colors.primary,
                                '&:hover': { background: colors.primaryGlow },
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                            {analysis.status === 'completed' && analysis.analysis_type !== 'video_analysis' && (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExport(analysis.id);
                                }}
                                sx={{
                                  color: colors.textSecondary,
                                  '&:hover': { background: colors.surface },
                                }}
                              >
                                <Download fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{
                borderTop: `1px solid ${colors.border}`,
                '.MuiTablePagination-select': { color: colors.textPrimary },
              }}
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default History;
