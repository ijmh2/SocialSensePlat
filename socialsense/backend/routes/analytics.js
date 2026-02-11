import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/analytics/performance
 * Get comprehensive performance data for the user's "my video" analyses
 */
router.get('/performance', authenticate, async (req, res) => {
  try {
    // Fetch all scored videos
    const { data: scoredVideos, error } = await supabaseAdmin
      .from('analyses')
      .select('id, video_title, video_score, priority_improvement, platform, comment_count, created_at')
      .eq('user_id', req.user.id)
      .eq('is_my_video', true)
      .eq('status', 'completed')
      .not('video_score', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Performance analytics error:', error);
      return res.status(500).json({ error: 'Failed to fetch performance data' });
    }

    const videos = scoredVideos || [];

    if (videos.length === 0) {
      return res.json({
        hasData: false,
        totalVideos: 0,
        averageScore: null,
        bestVideo: null,
        worstVideo: null,
        recentTrend: null,
        monthlyAverages: [],
        scoreDistribution: { exceptional: 0, strong: 0, average: 0, belowAverage: 0, poor: 0 },
        videos: [],
      });
    }

    // Calculate stats
    const scores = videos.map(v => v.video_score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Best and worst videos
    const sortedByScore = [...videos].sort((a, b) => b.video_score - a.video_score);
    const bestVideo = sortedByScore[0];
    const worstVideo = sortedByScore[sortedByScore.length - 1];

    // Recent trend (compare last 3 vs previous 3)
    let recentTrend = null;
    if (videos.length >= 6) {
      const recent3 = videos.slice(0, 3).map(v => v.video_score);
      const previous3 = videos.slice(3, 6).map(v => v.video_score);
      const recentAvg = recent3.reduce((a, b) => a + b, 0) / 3;
      const previousAvg = previous3.reduce((a, b) => a + b, 0) / 3;
      recentTrend = {
        direction: recentAvg > previousAvg ? 'up' : recentAvg < previousAvg ? 'down' : 'stable',
        change: Math.round((recentAvg - previousAvg) * 10) / 10,
        recentAvg: Math.round(recentAvg * 10) / 10,
        previousAvg: Math.round(previousAvg * 10) / 10,
      };
    }

    // Monthly averages (last 6 months)
    const monthlyMap = new Map();
    videos.forEach(v => {
      const date = new Date(v.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { scores: [], month: key });
      }
      monthlyMap.get(key).scores.push(v.video_score);
    });

    const monthlyAverages = Array.from(monthlyMap.values())
      .map(m => ({
        month: m.month,
        average: Math.round((m.scores.reduce((a, b) => a + b, 0) / m.scores.length) * 10) / 10,
        count: m.scores.length,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    // Score distribution
    const scoreDistribution = {
      exceptional: scores.filter(s => s >= 85).length,
      strong: scores.filter(s => s >= 70 && s < 85).length,
      average: scores.filter(s => s >= 55 && s < 70).length,
      belowAverage: scores.filter(s => s >= 40 && s < 55).length,
      poor: scores.filter(s => s < 40).length,
    };

    res.json({
      hasData: true,
      totalVideos: videos.length,
      averageScore: Math.round(averageScore * 10) / 10,
      bestVideo: {
        id: bestVideo.id,
        title: bestVideo.video_title || 'Untitled',
        score: bestVideo.video_score,
        platform: bestVideo.platform,
        date: bestVideo.created_at,
      },
      worstVideo: {
        id: worstVideo.id,
        title: worstVideo.video_title || 'Untitled',
        score: worstVideo.video_score,
        platform: worstVideo.platform,
        improvement: worstVideo.priority_improvement,
        date: worstVideo.created_at,
      },
      recentTrend,
      monthlyAverages,
      scoreDistribution,
      videos: videos.slice(0, 20).map(v => ({
        id: v.id,
        title: v.video_title || 'Untitled',
        score: v.video_score,
        platform: v.platform,
        comments: v.comment_count,
        improvement: v.priority_improvement,
        date: v.created_at,
      })),
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

export default router;
