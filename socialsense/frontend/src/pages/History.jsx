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
  useTheme,
  alpha,
  CircularProgress,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Visibility,
  Download,
  Search,
  YouTube,
  MusicNote,
  VideoLibrary,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

import { analysisApi } from '../utils/api';

const History = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadAnalyses();
  }, [page, rowsPerPage, statusFilter]);

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
        return <MusicNote sx={{ fontSize: 20, color: '#00F2EA' }} />;
      default:
        return <VideoLibrary sx={{ fontSize: 20 }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'processing':
        return theme.palette.warning.main;
      case 'failed':
        return theme.palette.error.main;
      default:
        return theme.palette.text.secondary;
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
      // Check if date is valid
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
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
        Analysis History
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        View and manage your past analyses
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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

          <Box sx={{ flex: 1 }} />

          <Button
            variant="outlined"
            onClick={loadAnalyses}
            disabled={loading}
          >
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : analyses.length === 0 ? (
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              No analyses found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start by analyzing a video to see your history here
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/analyze/comments')}
            >
              Start Analysis
            </Button>
          </CardContent>
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
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyses.map((analysis) => (
                    <TableRow
                      key={analysis.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/analysis/${analysis.id}`)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getPlatformIcon(analysis.platform)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 200 }}>
                          {analysis.video_title || 'Untitled'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {getAnalysisTypeLabel(analysis.analysis_type)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {analysis.comment_count?.toLocaleString() || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {analysis.tokens_used}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={analysis.status}
                          size="small"
                          sx={{
                            background: alpha(getStatusColor(analysis.status), 0.15),
                            color: getStatusColor(analysis.status),
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
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
                            >
                              <Download fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
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
            />
          </>
        )}
      </Card>
    </Box>
  );
};

export default History;
