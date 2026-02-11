import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormControlLabel,
    Checkbox,
    Alert,
    Skeleton,
    Tooltip,
    Switch,
    useTheme,
    alpha,
} from '@mui/material';
import {
    Add,
    Schedule,
    PlayArrow,
    Pause,
    Delete,
    YouTube,
    VideoLibrary,
    Refresh,
    AccessTime,
    TrendingUp,
    Close,
    Edit,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { scheduledApi, analysisApi } from '../utils/api';
import { colors, shadows } from '../styles/theme';
import TikTokIcon from '../components/icons/TikTokIcon';

const MotionBox = motion(Box);

const frequencyLabels = {
    daily: 'Every Day',
    weekly: 'Every Week',
    biweekly: 'Every 2 Weeks',
    monthly: 'Every Month',
};

const frequencyColors = {
    daily: '#EF4444',
    weekly: '#3B82F6',
    biweekly: '#8B5CF6',
    monthly: '#10B981',
};

const ScheduledAnalyses = () => {
    const navigate = useNavigate();
    const theme = useTheme();

    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);

    // Form state
    const [formPlatform, setFormPlatform] = useState('youtube');
    const [formUrl, setFormUrl] = useState('');
    const [formTitle, setFormTitle] = useState('');
    const [formFrequency, setFormFrequency] = useState('weekly');
    const [formMaxComments, setFormMaxComments] = useState(1000);
    const [formTextAnalysis, setFormTextAnalysis] = useState(true);
    const [formMarketing, setFormMarketing] = useState(false);
    const [formIsMyVideo, setFormIsMyVideo] = useState(false);
    const [formIsCompetitor, setFormIsCompetitor] = useState(false);
    const [formSaving, setFormSaving] = useState(false);

    useEffect(() => {
        loadSchedules();
    }, []);

    const loadSchedules = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await scheduledApi.list();
            setSchedules(data.schedules || []);
        } catch (err) {
            console.error('Failed to load schedules:', err);
            setError('Failed to load scheduled analyses');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formUrl.trim()) {
            toast.error('Please enter a video URL');
            return;
        }

        setFormSaving(true);
        try {
            const { data } = await scheduledApi.create({
                platform: formPlatform,
                video_url: formUrl,
                video_title: formTitle || null,
                frequency: formFrequency,
                max_comments: formMaxComments,
                include_text_analysis: formTextAnalysis,
                include_marketing: formMarketing,
                is_my_video: formIsMyVideo,
                is_competitor: formIsCompetitor,
            });

            toast.success('Scheduled analysis created!');
            setSchedules(prev => [data.schedule, ...prev]);
            handleCloseDialog();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create schedule');
        } finally {
            setFormSaving(false);
        }
    };

    const handleToggle = async (id) => {
        try {
            const { data } = await scheduledApi.toggle(id);
            setSchedules(prev =>
                prev.map(s => (s.id === id ? data.schedule : s))
            );
            toast.success(data.schedule.is_active ? 'Monitor activated' : 'Monitor paused');
        } catch (err) {
            toast.error('Failed to toggle schedule');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this scheduled analysis? This cannot be undone.')) return;

        try {
            await scheduledApi.remove(id);
            setSchedules(prev => prev.filter(s => s.id !== id));
            toast.success('Schedule deleted');
        } catch (err) {
            toast.error('Failed to delete schedule');
        }
    };

    const handleRunNow = (schedule) => {
        // Navigate to comment analysis with pre-filled data
        navigate('/analyze/comments', {
            state: {
                prefill: {
                    platform: schedule.platform,
                    url: schedule.video_url,
                    maxComments: schedule.max_comments,
                    includeTextAnalysis: schedule.include_text_analysis,
                    includeMarketing: schedule.include_marketing,
                    isMyVideo: schedule.is_my_video,
                    isCompetitor: schedule.is_competitor,
                },
            },
        });
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setFormUrl('');
        setFormTitle('');
        setFormPlatform('youtube');
        setFormFrequency('weekly');
        setFormMaxComments(1000);
        setFormTextAnalysis(true);
        setFormMarketing(false);
        setFormIsMyVideo(false);
        setFormIsCompetitor(false);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
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
        } catch {
            return 'N/A';
        }
    };

    const getTimeUntilNextRun = (dateString) => {
        if (!dateString) return '';
        const now = new Date();
        const next = new Date(dateString);
        const diff = next - now;

        if (diff < 0) return 'Overdue';
        if (diff < 3600000) return `${Math.round(diff / 60000)} min`;
        if (diff < 86400000) return `${Math.round(diff / 3600000)} hours`;
        return `${Math.round(diff / 86400000)} days`;
    };

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <MotionBox
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 4,
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Box>
                    <Typography
                        variant="h4"
                        sx={{ fontWeight: 700, color: colors.textPrimary, mb: 0.5 }}
                    >
                        Scheduled Analyses
                    </Typography>
                    <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                        Set up recurring monitors to automatically re-analyze videos
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={loadSchedules}
                        sx={{ background: colors.background, border: 'none', boxShadow: shadows.sm }}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setDialogOpen(true)}
                        sx={{ px: 3, py: 1.5, boxShadow: shadows.button }}
                    >
                        New Monitor
                    </Button>
                </Box>
            </MotionBox>

            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: '16px' }}>
                    {error}
                </Alert>
            )}

            {/* Empty state */}
            {!loading && schedules.length === 0 && (
                <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card
                        sx={{
                            borderRadius: '24px',
                            boxShadow: shadows.card,
                            textAlign: 'center',
                            py: 8,
                            px: 4,
                        }}
                    >
                        <Box
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: alpha(colors.primary, 0.1),
                                mx: 'auto',
                                mb: 3,
                            }}
                        >
                            <Schedule sx={{ fontSize: 40, color: colors.primary }} />
                        </Box>
                        <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: colors.textPrimary }}>
                            No scheduled analyses yet
                        </Typography>
                        <Typography variant="body1" sx={{ color: colors.textSecondary, mb: 3, maxWidth: 460, mx: 'auto' }}>
                            Create a monitor to automatically re-analyze a video's comments at regular intervals.
                            Stay on top of audience sentiment shifts.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setDialogOpen(true)}
                            sx={{ px: 4, py: 1.5 }}
                        >
                            Create Your First Monitor
                        </Button>
                    </Card>
                </MotionBox>
            )}

            {/* Loading skeletons */}
            {loading && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[1, 2, 3].map(i => (
                        <Skeleton
                            key={i}
                            variant="rounded"
                            height={140}
                            sx={{ borderRadius: '20px' }}
                        />
                    ))}
                </Box>
            )}

            {/* Schedule Cards */}
            <AnimatePresence>
                {schedules.map((schedule, idx) => (
                    <MotionBox
                        key={schedule.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: idx * 0.05 }}
                        sx={{ mb: 2 }}
                    >
                        <Card
                            sx={{
                                borderRadius: '20px',
                                boxShadow: shadows.card,
                                border: schedule.is_active
                                    ? `1px solid ${alpha(colors.primary, 0.3)}`
                                    : `1px solid ${colors.border}`,
                                opacity: schedule.is_active ? 1 : 0.7,
                                transition: 'all 200ms ease-out',
                                '&:hover': {
                                    boxShadow: shadows.cardHover,
                                },
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                    {/* Platform Icon */}
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: schedule.platform === 'youtube'
                                                ? '#FF0000'
                                                : '#000000',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {schedule.platform === 'youtube' ? (
                                            <YouTube sx={{ color: 'white', fontSize: 24 }} />
                                        ) : (
                                            <TikTokIcon sx={{ color: 'white', fontSize: 24 }} />
                                        )}
                                    </Box>

                                    {/* Info */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="h6"
                                            fontWeight={600}
                                            noWrap
                                            sx={{ color: colors.textPrimary }}
                                        >
                                            {schedule.video_title || 'Untitled Video'}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                            <Chip
                                                size="small"
                                                label={frequencyLabels[schedule.frequency]}
                                                sx={{
                                                    background: alpha(frequencyColors[schedule.frequency], 0.1),
                                                    color: frequencyColors[schedule.frequency],
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                }}
                                            />
                                            <Chip
                                                size="small"
                                                label={schedule.is_active ? 'Active' : 'Paused'}
                                                sx={{
                                                    background: schedule.is_active
                                                        ? alpha(colors.success, 0.1)
                                                        : alpha(colors.textMuted, 0.1),
                                                    color: schedule.is_active ? colors.success : colors.textMuted,
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                }}
                                            />
                                            {schedule.is_my_video && (
                                                <Chip size="small" label="My Video" sx={{
                                                    background: alpha(colors.primary, 0.1),
                                                    color: colors.primary,
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                }} />
                                            )}
                                            {schedule.is_competitor && (
                                                <Chip size="small" label="Competitor" sx={{
                                                    background: alpha('#E53E3E', 0.1),
                                                    color: '#E53E3E',
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                }} />
                                            )}
                                            {schedule.run_count > 0 && (
                                                <Chip
                                                    size="small"
                                                    icon={<TrendingUp sx={{ fontSize: 14 }} />}
                                                    label={`${schedule.run_count} runs`}
                                                    sx={{
                                                        background: alpha(colors.textMuted, 0.1),
                                                        color: colors.textSecondary,
                                                        fontSize: '0.75rem',
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* Timing info */}
                                    <Box sx={{ textAlign: 'right', minWidth: 140, flexShrink: 0 }}>
                                        {schedule.is_active && schedule.next_run_at && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end', mb: 0.5 }}>
                                                <AccessTime sx={{ fontSize: 14, color: colors.primary }} />
                                                <Typography variant="caption" fontWeight={600} sx={{ color: colors.primary }}>
                                                    Next: {getTimeUntilNextRun(schedule.next_run_at)}
                                                </Typography>
                                            </Box>
                                        )}
                                        {schedule.last_run_at && (
                                            <Typography variant="caption" sx={{ color: colors.textMuted, display: 'block' }}>
                                                Last: {formatDate(schedule.last_run_at)}
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Actions */}
                                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                                        <Tooltip title="Run Now">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRunNow(schedule)}
                                                sx={{
                                                    border: `1px solid ${colors.border}`,
                                                    '&:hover': { background: alpha(colors.success, 0.1), borderColor: colors.success },
                                                }}
                                            >
                                                <PlayArrow sx={{ fontSize: 18, color: colors.success }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={schedule.is_active ? 'Pause' : 'Activate'}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleToggle(schedule.id)}
                                                sx={{
                                                    border: `1px solid ${colors.border}`,
                                                    '&:hover': { background: alpha(colors.warning, 0.1), borderColor: colors.warning },
                                                }}
                                            >
                                                {schedule.is_active ? (
                                                    <Pause sx={{ fontSize: 18, color: colors.warning }} />
                                                ) : (
                                                    <PlayArrow sx={{ fontSize: 18, color: colors.primary }} />
                                                )}
                                            </IconButton>
                                        </Tooltip>
                                        {schedule.last_analysis_id && (
                                            <Tooltip title="View Last Analysis">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => navigate(`/analysis/${schedule.last_analysis_id}`)}
                                                    sx={{
                                                        border: `1px solid ${colors.border}`,
                                                        '&:hover': { background: alpha(colors.primary, 0.1) },
                                                    }}
                                                >
                                                    <VideoLibrary sx={{ fontSize: 18, color: colors.primary }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(schedule.id)}
                                                sx={{
                                                    border: `1px solid ${colors.border}`,
                                                    '&:hover': { background: alpha(colors.error, 0.1), borderColor: colors.error },
                                                }}
                                            >
                                                <Delete sx={{ fontSize: 18, color: colors.error }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                {/* URL */}
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: colors.textMuted,
                                        mt: 1.5,
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {schedule.video_url}
                                </Typography>

                                {/* Last error */}
                                {schedule.last_error && (
                                    <Alert severity="warning" sx={{ mt: 1.5, borderRadius: '10px', py: 0 }}>
                                        <Typography variant="caption">Last run failed: {schedule.last_error}</Typography>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </MotionBox>
                ))}
            </AnimatePresence>

            {/* Create Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '20px',
                        boxShadow: shadows.xl,
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        pb: 1,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                            sx={{
                                width: 40, height: 40, borderRadius: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: alpha(colors.primary, 0.1),
                            }}
                        >
                            <Schedule sx={{ color: colors.primary, fontSize: 22 }} />
                        </Box>
                        <Typography variant="h6" fontWeight={700}>
                            New Monitoring Schedule
                        </Typography>
                    </Box>
                    <IconButton onClick={handleCloseDialog} size="small">
                        <Close />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ pt: 2 }}>
                    {/* Platform */}
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                        <Card
                            onClick={() => setFormPlatform('youtube')}
                            sx={{
                                flex: 1, cursor: 'pointer', borderRadius: '14px', p: 2,
                                textAlign: 'center',
                                border: formPlatform === 'youtube' ? '2px solid #FF0000' : `1px solid ${colors.border}`,
                                transition: 'all 200ms',
                            }}
                        >
                            <YouTube sx={{ fontSize: 28, color: '#FF0000', mb: 0.5 }} />
                            <Typography variant="body2" fontWeight={600}>YouTube</Typography>
                        </Card>
                        <Card
                            onClick={() => setFormPlatform('tiktok')}
                            sx={{
                                flex: 1, cursor: 'pointer', borderRadius: '14px', p: 2,
                                textAlign: 'center',
                                border: formPlatform === 'tiktok' ? '2px solid #000' : `1px solid ${colors.border}`,
                                transition: 'all 200ms',
                            }}
                        >
                            <TikTokIcon sx={{ fontSize: 28, color: '#000', mb: 0.5 }} />
                            <Typography variant="body2" fontWeight={600}>TikTok</Typography>
                        </Card>
                    </Box>

                    {/* URL */}
                    <TextField
                        fullWidth
                        label="Video URL"
                        placeholder={formPlatform === 'youtube'
                            ? 'https://www.youtube.com/watch?v=...'
                            : 'https://www.tiktok.com/@user/video/...'
                        }
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    {/* Title (optional) */}
                    <TextField
                        fullWidth
                        label="Title (optional)"
                        placeholder="e.g., Main channel video #42"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        sx={{ mb: 3 }}
                    />

                    {/* Frequency */}
                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <InputLabel>Check Frequency</InputLabel>
                        <Select
                            value={formFrequency}
                            label="Check Frequency"
                            onChange={(e) => setFormFrequency(e.target.value)}
                        >
                            <MenuItem value="daily">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: frequencyColors.daily }} />
                                    Every Day
                                </Box>
                            </MenuItem>
                            <MenuItem value="weekly">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: frequencyColors.weekly }} />
                                    Every Week
                                </Box>
                            </MenuItem>
                            <MenuItem value="biweekly">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: frequencyColors.biweekly }} />
                                    Every 2 Weeks
                                </Box>
                            </MenuItem>
                            <MenuItem value="monthly">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: frequencyColors.monthly }} />
                                    Every Month
                                </Box>
                            </MenuItem>
                        </Select>
                    </FormControl>

                    {/* Max Comments */}
                    <TextField
                        fullWidth
                        type="number"
                        label="Max Comments"
                        value={formMaxComments}
                        onChange={(e) => setFormMaxComments(Math.max(1, parseInt(e.target.value) || 100))}
                        helperText="How many comments to analyze each run"
                        sx={{ mb: 2 }}
                        inputProps={{ min: 1, max: 50000 }}
                    />

                    {/* Options */}
                    <Box sx={{ mb: 2 }}>
                        <FormControlLabel
                            control={<Checkbox checked={formTextAnalysis} onChange={(e) => setFormTextAnalysis(e.target.checked)} />}
                            label={<Typography variant="body2">AI Text Analysis (+5 tokens)</Typography>}
                        />
                        <FormControlLabel
                            control={<Checkbox checked={formMarketing} onChange={(e) => setFormMarketing(e.target.checked)} />}
                            label={<Typography variant="body2">Marketing Analysis (+5 tokens)</Typography>}
                        />
                    </Box>

                    {/* Video ownership */}
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                        <Card
                            onClick={() => { setFormIsMyVideo(true); setFormIsCompetitor(false); }}
                            sx={{
                                flex: 1, cursor: 'pointer', p: 1.5, borderRadius: '12px',
                                border: formIsMyVideo ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                                transition: 'all 200ms',
                            }}
                        >
                            <Typography variant="body2" fontWeight={600}>My Video</Typography>
                        </Card>
                        <Card
                            onClick={() => { setFormIsCompetitor(true); setFormIsMyVideo(false); }}
                            sx={{
                                flex: 1, cursor: 'pointer', p: 1.5, borderRadius: '12px',
                                border: formIsCompetitor ? '2px solid #E53E3E' : `1px solid ${colors.border}`,
                                transition: 'all 200ms',
                            }}
                        >
                            <Typography variant="body2" fontWeight={600}>Competitor</Typography>
                        </Card>
                        <Card
                            onClick={() => { setFormIsMyVideo(false); setFormIsCompetitor(false); }}
                            sx={{
                                flex: 1, cursor: 'pointer', p: 1.5, borderRadius: '12px',
                                border: (!formIsMyVideo && !formIsCompetitor) ? `2px solid ${colors.textMuted}` : `1px solid ${colors.border}`,
                                transition: 'all 200ms',
                            }}
                        >
                            <Typography variant="body2" fontWeight={600}>Neither</Typography>
                        </Card>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={handleCloseDialog} variant="text">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        variant="contained"
                        disabled={formSaving || !formUrl.trim()}
                        startIcon={<Schedule />}
                        sx={{ px: 3 }}
                    >
                        {formSaving ? 'Creating...' : 'Create Monitor'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ScheduledAnalyses;
