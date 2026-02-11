import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Chip,
    Grid,
    Divider,
    useTheme,
    alpha,
    CircularProgress,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
} from '@mui/material';
import {
    ArrowBack,
    CompareArrows,
    YouTube,
    VideoLibrary,
    TrendingUp,
    TrendingDown,
    SentimentSatisfied,
    SentimentDissatisfied,
    SentimentNeutral,
    Comment,
    Lightbulb,
    EmojiEvents,
    Warning,
    Star,
    SwapHoriz,
} from '@mui/icons-material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Legend,
} from 'recharts';
import { motion } from 'framer-motion';

import { analysisApi } from '../utils/api';
import { colors, shadows } from '../styles/theme';
import TikTokIcon from '../components/icons/TikTokIcon';

const MotionBox = motion(Box);

const Compare = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const id1 = searchParams.get('a');
    const id2 = searchParams.get('b');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [comparisonData, setComparisonData] = useState(null);

    // For analysis picker
    const [allAnalyses, setAllAnalyses] = useState([]);
    const [selectedA, setSelectedA] = useState(id1 || '');
    const [selectedB, setSelectedB] = useState(id2 || '');
    const [pickersLoading, setPickersLoading] = useState(false);

    useEffect(() => {
        loadAnalysesList();
    }, []);

    useEffect(() => {
        if (id1 && id2) {
            loadComparison(id1, id2);
        } else {
            setLoading(false);
        }
    }, [id1, id2]);

    const loadAnalysesList = async () => {
        try {
            setPickersLoading(true);
            const { data } = await analysisApi.getHistory({ limit: 50, status: 'completed' });
            setAllAnalyses(data.analyses || []);
        } catch (err) {
            console.error('Failed to load analyses:', err);
        } finally {
            setPickersLoading(false);
        }
    };

    const loadComparison = async (a, b) => {
        try {
            setLoading(true);
            setError('');
            const { data } = await analysisApi.compare(a, b);
            setComparisonData(data);
        } catch (err) {
            console.error('Compare error:', err);
            setError(err.response?.data?.error || 'Failed to load comparison');
        } finally {
            setLoading(false);
        }
    };

    const handleCompare = () => {
        if (selectedA && selectedB && selectedA !== selectedB) {
            setSearchParams({ a: selectedA, b: selectedB });
        }
    };

    const handleSwap = () => {
        const tempA = selectedA;
        setSelectedA(selectedB);
        setSelectedB(tempA);
        if (id1 && id2) {
            setSearchParams({ a: id2, b: id1 });
        }
    };

    const getPlatformIcon = (platform) => {
        switch (platform) {
            case 'youtube': return <YouTube sx={{ fontSize: 20, color: '#FF0000' }} />;
            case 'tiktok': return <TikTokIcon sx={{ fontSize: 20, color: '#000' }} />;
            default: return <VideoLibrary sx={{ fontSize: 20 }} />;
        }
    };

    const getScoreColor = (score) => {
        if (score >= 75) return theme.palette.success.main;
        if (score >= 60) return theme.palette.primary.main;
        if (score >= 40) return theme.palette.warning.main;
        return theme.palette.error.main;
    };

    const getScoreLabel = (score) => {
        if (score >= 90) return 'Exceptional';
        if (score >= 75) return 'Strong';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Needs Work';
        return 'Poor';
    };

    const parseSentiment = (s) => {
        if (!s) return { positive: 0, neutral: 0, negative: 0 };
        if (typeof s === 'string') { try { return JSON.parse(s); } catch { return { positive: 0, neutral: 0, negative: 0 }; } }
        return s;
    };

    const parseArray = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
        return [];
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
            });
        } catch { return 'N/A'; }
    };

    const DeltaChip = ({ value, suffix = '', invert = false }) => {
        if (value == null || value === 0) return <Chip size="small" label="Same" sx={{ fontSize: '0.7rem', background: alpha(colors.textMuted, 0.1), color: colors.textMuted }} />;
        const isPositive = invert ? value < 0 : value > 0;
        return (
            <Chip
                size="small"
                icon={isPositive ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />}
                label={`${value > 0 ? '+' : ''}${typeof value === 'number' ? Math.round(value * 10) / 10 : value}${suffix}`}
                sx={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: alpha(isPositive ? colors.success : colors.error, 0.1),
                    color: isPositive ? colors.success : colors.error,
                    '& .MuiChip-icon': { color: 'inherit' },
                }}
            />
        );
    };

    // Render the picker if no comparison is loaded
    if (!id1 || !id2 || !comparisonData) {
        return (
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
                <MotionBox
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    sx={{ mb: 4 }}
                >
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/history')}
                        variant="outlined"
                        sx={{ mb: 2, background: colors.background, border: 'none', boxShadow: shadows.sm }}
                    >
                        Back to History
                    </Button>
                    <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5, color: colors.textPrimary }}>
                        Compare Analyses
                    </Typography>
                    <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                        Select two analyses to compare side-by-side
                    </Typography>
                </MotionBox>

                {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 8 }} />}

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {!loading && (
                    <MotionBox
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card sx={{ borderRadius: '20px', boxShadow: shadows.card }}>
                            <CardContent sx={{ p: 4 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                    <Box sx={{
                                        width: 48, height: 48, borderRadius: '14px', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        background: alpha(colors.primary, 0.1),
                                    }}>
                                        <CompareArrows sx={{ color: colors.primary, fontSize: 24 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight={700}>
                                            Pick Two Analyses
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                                            Choose analyses from your history to compare
                                        </Typography>
                                    </Box>
                                </Box>

                                <Grid container spacing={3} alignItems="center">
                                    <Grid item xs={12} md={5}>
                                        <FormControl fullWidth>
                                            <InputLabel>Analysis A</InputLabel>
                                            <Select
                                                value={selectedA}
                                                label="Analysis A"
                                                onChange={(e) => setSelectedA(e.target.value)}
                                            >
                                                {allAnalyses.map(a => (
                                                    <MenuItem key={a.id} value={a.id} disabled={a.id === selectedB}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            {getPlatformIcon(a.platform)}
                                                            <Box sx={{ minWidth: 0 }}>
                                                                <Typography variant="body2" fontWeight={600} noWrap>
                                                                    {a.video_title || 'Untitled'}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: colors.textMuted }}>
                                                                    {formatDate(a.created_at)} • {a.comment_count || 0} comments
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={12} md={2} sx={{ textAlign: 'center' }}>
                                        <IconButton onClick={handleSwap} sx={{ border: `1px solid ${colors.border}` }}>
                                            <SwapHoriz sx={{ color: colors.primary }} />
                                        </IconButton>
                                    </Grid>

                                    <Grid item xs={12} md={5}>
                                        <FormControl fullWidth>
                                            <InputLabel>Analysis B</InputLabel>
                                            <Select
                                                value={selectedB}
                                                label="Analysis B"
                                                onChange={(e) => setSelectedB(e.target.value)}
                                            >
                                                {allAnalyses.map(a => (
                                                    <MenuItem key={a.id} value={a.id} disabled={a.id === selectedA}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            {getPlatformIcon(a.platform)}
                                                            <Box sx={{ minWidth: 0 }}>
                                                                <Typography variant="body2" fontWeight={600} noWrap>
                                                                    {a.video_title || 'Untitled'}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: colors.textMuted }}>
                                                                    {formatDate(a.created_at)} • {a.comment_count || 0} comments
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>

                                <Box sx={{ mt: 4, textAlign: 'center' }}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={<CompareArrows />}
                                        onClick={handleCompare}
                                        disabled={!selectedA || !selectedB || selectedA === selectedB}
                                        sx={{ px: 5, py: 1.5 }}
                                    >
                                        Compare
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </MotionBox>
                )}
            </Box>
        );
    }

    // ===== COMPARISON VIEW =====
    const { analysis_a: a, analysis_b: b, comparison } = comparisonData;

    const sentA = parseSentiment(a.sentiment_scores);
    const sentB = parseSentiment(b.sentiment_scores);

    const kwA = parseArray(a.keywords).filter(k => k && typeof k === 'object').slice(0, 8);
    const kwB = parseArray(b.keywords).filter(k => k && typeof k === 'object').slice(0, 8);

    // Sentiment comparison bar chart data
    const sentimentChartData = [
        { name: 'Positive', A: sentA.positive || 0, B: sentB.positive || 0 },
        { name: 'Neutral', A: sentA.neutral || 0, B: sentB.neutral || 0 },
        { name: 'Negative', A: sentA.negative || 0, B: sentB.negative || 0 },
    ];

    // Radar chart for scores + sentiment comparison
    const radarData = [
        { subject: 'Positive %', A: sentA.positive || 0, B: sentB.positive || 0 },
        { subject: 'Comments', A: Math.min(100, ((a.comment_count || 0) / Math.max(a.comment_count || 1, b.comment_count || 1)) * 100), B: Math.min(100, ((b.comment_count || 0) / Math.max(a.comment_count || 1, b.comment_count || 1)) * 100) },
        { subject: 'Keywords', A: Math.min(100, (parseArray(a.keywords).length / Math.max(parseArray(a.keywords).length, parseArray(b.keywords).length, 1)) * 100), B: Math.min(100, (parseArray(b.keywords).length / Math.max(parseArray(a.keywords).length, parseArray(b.keywords).length, 1)) * 100) },
        { subject: 'Themes', A: Math.min(100, (parseArray(a.themes).length / Math.max(parseArray(a.themes).length, parseArray(b.themes).length, 1)) * 100), B: Math.min(100, (parseArray(b.themes).length / Math.max(parseArray(a.themes).length, parseArray(b.themes).length, 1)) * 100) },
        { subject: 'Negative %', A: sentA.negative || 0, B: sentB.negative || 0 },
    ];

    if (a.video_score != null || b.video_score != null) {
        radarData.unshift({ subject: 'Score', A: a.video_score || 0, B: b.video_score || 0 });
    }

    const AnalysisHeader = ({ analysis, label, color }) => (
        <Card
            sx={{
                borderRadius: '16px',
                boxShadow: shadows.card,
                border: `2px solid ${alpha(color, 0.3)}`,
                background: alpha(color, 0.02),
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Chip
                        label={label}
                        size="small"
                        sx={{
                            background: alpha(color, 0.1),
                            color: color,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                        }}
                    />
                    {getPlatformIcon(analysis.platform)}
                    {analysis.is_competitor && (
                        <Chip label="Competitor" size="small" sx={{ background: alpha('#E53E3E', 0.1), color: '#E53E3E', fontSize: '0.7rem' }} />
                    )}
                    {analysis.is_my_video && (
                        <Chip label="My Video" size="small" sx={{ background: alpha(colors.primary, 0.1), color: colors.primary, fontSize: '0.7rem' }} />
                    )}
                </Box>
                <Typography variant="body1" fontWeight={700} noWrap sx={{ color: colors.textPrimary }}>
                    {analysis.video_title || 'Untitled'}
                </Typography>
                <Typography variant="caption" sx={{ color: colors.textMuted }}>
                    {formatDate(analysis.created_at)} • {analysis.comment_count?.toLocaleString() || 0} comments
                </Typography>
            </CardContent>
        </Card>
    );

    const MetricRow = ({ label, valueA, valueB, format = 'number', invert = false }) => {
        const fmtValue = (v) => {
            if (v == null) return '—';
            if (format === 'percent') return `${Math.round(v)}%`;
            if (format === 'number') return typeof v === 'number' ? v.toLocaleString() : v;
            return v;
        };
        const delta = (typeof valueA === 'number' && typeof valueB === 'number') ? valueA - valueB : null;

        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    py: 1.5,
                    borderBottom: `1px solid ${colors.border}`,
                    '&:last-child': { borderBottom: 'none' },
                }}
            >
                <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ flex: 1, color: colors.textPrimary, minWidth: 80 }}
                >
                    {label}
                </Typography>
                <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                        flex: 1,
                        textAlign: 'center',
                        color: '#1E40AF',
                    }}
                >
                    {fmtValue(valueA)}
                </Typography>
                <Box sx={{ flex: 0.6, display: 'flex', justifyContent: 'center' }}>
                    <DeltaChip value={delta} suffix={format === 'percent' ? '%' : ''} invert={invert} />
                </Box>
                <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                        flex: 1,
                        textAlign: 'center',
                        color: '#7C3AED',
                    }}
                >
                    {fmtValue(valueB)}
                </Typography>
            </Box>
        );
    };

    return (
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <MotionBox
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}
            >
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/history')}
                    variant="outlined"
                    sx={{ background: colors.background, border: 'none', boxShadow: shadows.sm }}
                >
                    Back
                </Button>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" fontWeight={700} sx={{ color: colors.textPrimary }}>
                        Head-to-Head Comparison
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                        Side-by-side analysis of two videos
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<SwapHoriz />}
                    onClick={handleSwap}
                    sx={{ background: colors.background, border: 'none', boxShadow: shadows.sm }}
                >
                    Swap
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => { setSearchParams({}); setComparisonData(null); }}
                    sx={{ background: colors.background, border: 'none', boxShadow: shadows.sm }}
                >
                    New Comparison
                </Button>
            </MotionBox>

            {/* Analysis Headers */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                    <MotionBox initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <AnalysisHeader analysis={a} label="A" color="#1E40AF" />
                    </MotionBox>
                </Grid>
                <Grid item xs={12} md={6}>
                    <MotionBox initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <AnalysisHeader analysis={b} label="B" color="#7C3AED" />
                    </MotionBox>
                </Grid>
            </Grid>

            {/* Score Comparison (if both have scores) */}
            {(a.video_score != null || b.video_score != null) && (
                <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    sx={{ mb: 4 }}
                >
                    <Card sx={{ borderRadius: '20px', boxShadow: shadows.card }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: colors.textPrimary }}>
                                Video Scores
                            </Typography>
                            <Grid container spacing={4} alignItems="center">
                                <Grid item xs={5} sx={{ textAlign: 'center' }}>
                                    <Box
                                        sx={{
                                            width: 100, height: 100, borderRadius: '50%', mx: 'auto', mb: 1,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: a.video_score != null ? alpha(getScoreColor(a.video_score), 0.1) : alpha(colors.textMuted, 0.1),
                                            border: `3px solid ${a.video_score != null ? getScoreColor(a.video_score) : colors.textMuted}`,
                                        }}
                                    >
                                        <Typography variant="h3" fontWeight={800} sx={{ color: a.video_score != null ? getScoreColor(a.video_score) : colors.textMuted }}>
                                            {a.video_score ?? '—'}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" fontWeight={600} sx={{ color: colors.textSecondary }}>
                                        {a.video_score != null ? getScoreLabel(a.video_score) : 'No Score'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={2} sx={{ textAlign: 'center' }}>
                                    <DeltaChip value={comparison.score_delta} />
                                </Grid>
                                <Grid item xs={5} sx={{ textAlign: 'center' }}>
                                    <Box
                                        sx={{
                                            width: 100, height: 100, borderRadius: '50%', mx: 'auto', mb: 1,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: b.video_score != null ? alpha(getScoreColor(b.video_score), 0.1) : alpha(colors.textMuted, 0.1),
                                            border: `3px solid ${b.video_score != null ? getScoreColor(b.video_score) : colors.textMuted}`,
                                        }}
                                    >
                                        <Typography variant="h3" fontWeight={800} sx={{ color: b.video_score != null ? getScoreColor(b.video_score) : colors.textMuted }}>
                                            {b.video_score ?? '—'}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" fontWeight={600} sx={{ color: colors.textSecondary }}>
                                        {b.video_score != null ? getScoreLabel(b.video_score) : 'No Score'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </MotionBox>
            )}

            {/* Key Metrics Table */}
            <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                sx={{ mb: 4 }}
            >
                <Card sx={{ borderRadius: '20px', boxShadow: shadows.card }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: colors.textPrimary }}>
                            Key Metrics
                        </Typography>

                        {/* Table header */}
                        <Box
                            sx={{
                                display: 'flex', alignItems: 'center', py: 1, mb: 1,
                                borderBottom: `2px solid ${colors.border}`,
                            }}
                        >
                            <Typography variant="caption" fontWeight={700} sx={{ flex: 1, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Metric
                            </Typography>
                            <Typography variant="caption" fontWeight={700} sx={{ flex: 1, textAlign: 'center', color: '#1E40AF', textTransform: 'uppercase', letterSpacing: 1 }}>
                                Analysis A
                            </Typography>
                            <Typography variant="caption" fontWeight={700} sx={{ flex: 0.6, textAlign: 'center', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Delta
                            </Typography>
                            <Typography variant="caption" fontWeight={700} sx={{ flex: 1, textAlign: 'center', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 1 }}>
                                Analysis B
                            </Typography>
                        </Box>

                        <MetricRow label="Comments" valueA={a.comment_count} valueB={b.comment_count} />
                        <MetricRow label="Tokens Used" valueA={a.tokens_used} valueB={b.tokens_used} />
                        <MetricRow label="Positive %" valueA={sentA.positive} valueB={sentB.positive} format="percent" />
                        <MetricRow label="Neutral %" valueA={sentA.neutral} valueB={sentB.neutral} format="percent" />
                        <MetricRow label="Negative %" valueA={sentA.negative} valueB={sentB.negative} format="percent" invert />
                        <MetricRow label="Keywords" valueA={parseArray(a.keywords).length} valueB={parseArray(b.keywords).length} />
                        <MetricRow label="Themes" valueA={parseArray(a.themes).length} valueB={parseArray(b.themes).length} />
                    </CardContent>
                </Card>
            </MotionBox>

            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Sentiment Bar Chart */}
                <Grid item xs={12} md={6}>
                    <MotionBox
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card sx={{ borderRadius: '20px', boxShadow: shadows.card, height: '100%' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: colors.textPrimary }}>
                                    Sentiment Comparison
                                </Typography>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={sentimentChartData} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                                        <XAxis dataKey="name" stroke={theme.palette.text.secondary} tick={{ fontSize: 12 }} />
                                        <YAxis stroke={theme.palette.text.secondary} tick={{ fontSize: 12 }} unit="%" />
                                        <Tooltip
                                            contentStyle={{
                                                background: theme.palette.background.paper,
                                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                                borderRadius: 8,
                                                boxShadow: shadows.md,
                                            }}
                                            formatter={(value) => [`${Math.round(value)}%`]}
                                        />
                                        <Bar dataKey="A" name="Analysis A" fill="#1E40AF" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="B" name="Analysis B" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                                        <Legend />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </MotionBox>
                </Grid>

                {/* Radar Chart */}
                <Grid item xs={12} md={6}>
                    <MotionBox
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <Card sx={{ borderRadius: '20px', boxShadow: shadows.card, height: '100%' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: colors.textPrimary }}>
                                    Overall Comparison
                                </Typography>
                                <ResponsiveContainer width="100%" height={280}>
                                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                                        <PolarGrid stroke={alpha(theme.palette.text.primary, 0.1)} />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                                        <Radar name="Analysis A" dataKey="A" stroke="#1E40AF" fill="#1E40AF" fillOpacity={0.15} strokeWidth={2} />
                                        <Radar name="Analysis B" dataKey="B" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.15} strokeWidth={2} />
                                        <Legend />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </MotionBox>
                </Grid>
            </Grid>

            {/* Keywords Comparison */}
            <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                sx={{ mb: 4 }}
            >
                <Card sx={{ borderRadius: '20px', boxShadow: shadows.card }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: colors.textPrimary }}>
                            Keyword Analysis
                        </Typography>
                        <Grid container spacing={3}>
                            {/* Shared keywords */}
                            <Grid item xs={12} md={4}>
                                <Box sx={{
                                    p: 2, borderRadius: '14px',
                                    background: alpha(colors.success, 0.05),
                                    border: `1px solid ${alpha(colors.success, 0.2)}`,
                                }}>
                                    <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5, color: colors.success }}>
                                        Shared Keywords ({comparison.shared_keywords.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                        {comparison.shared_keywords.length > 0 ? (
                                            comparison.shared_keywords.map((kw, i) => (
                                                <Chip
                                                    key={i}
                                                    label={kw}
                                                    size="small"
                                                    sx={{
                                                        background: alpha(colors.success, 0.1),
                                                        color: colors.success,
                                                        fontWeight: 500,
                                                        fontSize: '0.75rem',
                                                    }}
                                                />
                                            ))
                                        ) : (
                                            <Typography variant="caption" sx={{ color: colors.textMuted }}>
                                                No common keywords
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Unique to A */}
                            <Grid item xs={12} md={4}>
                                <Box sx={{
                                    p: 2, borderRadius: '14px',
                                    background: alpha('#1E40AF', 0.03),
                                    border: `1px solid ${alpha('#1E40AF', 0.2)}`,
                                }}>
                                    <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5, color: '#1E40AF' }}>
                                        Unique to A ({comparison.unique_to_a.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                        {comparison.unique_to_a.length > 0 ? (
                                            comparison.unique_to_a.map((kw, i) => (
                                                <Chip
                                                    key={i}
                                                    label={kw}
                                                    size="small"
                                                    sx={{
                                                        background: alpha('#1E40AF', 0.1),
                                                        color: '#1E40AF',
                                                        fontWeight: 500,
                                                        fontSize: '0.75rem',
                                                    }}
                                                />
                                            ))
                                        ) : (
                                            <Typography variant="caption" sx={{ color: colors.textMuted }}>
                                                All keywords shared
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Unique to B */}
                            <Grid item xs={12} md={4}>
                                <Box sx={{
                                    p: 2, borderRadius: '14px',
                                    background: alpha('#7C3AED', 0.03),
                                    border: `1px solid ${alpha('#7C3AED', 0.2)}`,
                                }}>
                                    <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5, color: '#7C3AED' }}>
                                        Unique to B ({comparison.unique_to_b.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                        {comparison.unique_to_b.length > 0 ? (
                                            comparison.unique_to_b.map((kw, i) => (
                                                <Chip
                                                    key={i}
                                                    label={kw}
                                                    size="small"
                                                    sx={{
                                                        background: alpha('#7C3AED', 0.1),
                                                        color: '#7C3AED',
                                                        fontWeight: 500,
                                                        fontSize: '0.75rem',
                                                    }}
                                                />
                                            ))
                                        ) : (
                                            <Typography variant="caption" sx={{ color: colors.textMuted }}>
                                                All keywords shared
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </MotionBox>

            {/* View Full Analysis Links */}
            <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => navigate(`/analysis/${a.id}`)}
                            sx={{
                                py: 2, borderRadius: '16px',
                                background: colors.background, border: `1px solid ${alpha('#1E40AF', 0.3)}`,
                                boxShadow: shadows.sm,
                                color: '#1E40AF', fontWeight: 600,
                                '&:hover': { background: alpha('#1E40AF', 0.05), borderColor: '#1E40AF' },
                            }}
                        >
                            View Full Analysis A →
                        </Button>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => navigate(`/analysis/${b.id}`)}
                            sx={{
                                py: 2, borderRadius: '16px',
                                background: colors.background, border: `1px solid ${alpha('#7C3AED', 0.3)}`,
                                boxShadow: shadows.sm,
                                color: '#7C3AED', fontWeight: 600,
                                '&:hover': { background: alpha('#7C3AED', 0.05), borderColor: '#7C3AED' },
                            }}
                        >
                            View Full Analysis B →
                        </Button>
                    </Grid>
                </Grid>
            </MotionBox>
        </Box>
    );
};

export default Compare;
