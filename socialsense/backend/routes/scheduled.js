import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// Max schedules per user (prevent abuse)
const MAX_SCHEDULES_PER_USER = 10;

/**
 * Calculate next run time from a frequency
 */
function calculateNextRun(frequency, fromDate = new Date()) {
    const next = new Date(fromDate);
    switch (frequency) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'biweekly':
            next.setDate(next.getDate() + 14);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
        default:
            next.setDate(next.getDate() + 7); // fallback to weekly
    }
    return next.toISOString();
}

/**
 * GET /api/scheduled
 * List all scheduled analyses for the user
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('scheduled_analyses')
            .select('*, last_analysis:last_analysis_id(id, status, video_score, created_at)')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Scheduled list error:', error);
            return res.status(500).json({ error: 'Failed to fetch scheduled analyses' });
        }

        res.json({ schedules: data || [] });
    } catch (error) {
        console.error('Scheduled list error:', error);
        res.status(500).json({ error: 'Failed to fetch scheduled analyses' });
    }
});

/**
 * POST /api/scheduled
 * Create a new scheduled analysis
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            platform,
            video_url,
            video_title,
            frequency,
            max_comments = 1000,
            include_text_analysis = true,
            include_marketing = false,
            product_description,
            is_my_video = false,
            is_competitor = false,
            creator_notes,
            competitor_notes,
        } = req.body;

        // Validate
        if (!platform || !video_url || !frequency) {
            return res.status(400).json({ error: 'platform, video_url, and frequency are required' });
        }

        if (!['youtube', 'tiktok'].includes(platform)) {
            return res.status(400).json({ error: 'Platform must be youtube or tiktok' });
        }

        if (!['daily', 'weekly', 'biweekly', 'monthly'].includes(frequency)) {
            return res.status(400).json({ error: 'Frequency must be daily, weekly, biweekly, or monthly' });
        }

        // Check limit
        const { count, error: countError } = await supabaseAdmin
            .from('scheduled_analyses')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', req.user.id);

        if (countError) {
            return res.status(500).json({ error: 'Failed to check schedule limit' });
        }

        if (count >= MAX_SCHEDULES_PER_USER) {
            return res.status(400).json({
                error: `Maximum ${MAX_SCHEDULES_PER_USER} scheduled analyses allowed. Deactivate or delete one to add another.`,
            });
        }

        // Check for duplicate URL
        const { data: existing } = await supabaseAdmin
            .from('scheduled_analyses')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('video_url', video_url)
            .eq('is_active', true)
            .single();

        if (existing) {
            return res.status(400).json({ error: 'You already have an active schedule for this video URL' });
        }

        const next_run_at = calculateNextRun(frequency);

        const { data, error } = await supabaseAdmin
            .from('scheduled_analyses')
            .insert({
                user_id: req.user.id,
                platform,
                video_url,
                video_title: video_title || null,
                frequency,
                max_comments,
                include_text_analysis,
                include_marketing,
                product_description: product_description || null,
                is_my_video,
                is_competitor,
                creator_notes: creator_notes || null,
                competitor_notes: competitor_notes || null,
                next_run_at,
                is_active: true,
            })
            .select()
            .single();

        if (error) {
            console.error('Create schedule error:', error);
            return res.status(500).json({ error: 'Failed to create scheduled analysis' });
        }

        res.status(201).json({ schedule: data });
    } catch (error) {
        console.error('Create schedule error:', error);
        res.status(500).json({ error: 'Failed to create scheduled analysis' });
    }
});

/**
 * PATCH /api/scheduled/:id
 * Update a scheduled analysis (frequency, active status, etc.)
 */
router.patch('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = {};

        const allowedFields = [
            'frequency', 'is_active', 'max_comments',
            'include_text_analysis', 'include_marketing', 'product_description',
            'is_my_video', 'is_competitor', 'creator_notes', 'competitor_notes',
        ];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        // If frequency changed, recalculate next run
        if (updates.frequency) {
            updates.next_run_at = calculateNextRun(updates.frequency);
        }

        // If reactivating, recalculate next run
        if (updates.is_active === true) {
            const freq = updates.frequency || 'weekly';
            updates.next_run_at = calculateNextRun(freq);
        }

        const { data, error } = await supabaseAdmin
            .from('scheduled_analyses')
            .update(updates)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) {
            console.error('Update schedule error:', error);
            return res.status(500).json({ error: 'Failed to update schedule' });
        }

        if (!data) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        res.json({ schedule: data });
    } catch (error) {
        console.error('Update schedule error:', error);
        res.status(500).json({ error: 'Failed to update schedule' });
    }
});

/**
 * PATCH /api/scheduled/:id/toggle
 * Toggle active status of a scheduled analysis
 */
router.patch('/:id/toggle', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Get current state
        const { data: current, error: fetchError } = await supabaseAdmin
            .from('scheduled_analyses')
            .select('is_active, frequency')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchError || !current) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        const newActive = !current.is_active;
        const updates = { is_active: newActive };

        // If reactivating, recalculate next run
        if (newActive) {
            updates.next_run_at = calculateNextRun(current.frequency);
        }

        const { data, error } = await supabaseAdmin
            .from('scheduled_analyses')
            .update(updates)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) {
            console.error('Toggle schedule error:', error);
            return res.status(500).json({ error: 'Failed to toggle schedule' });
        }

        res.json({ schedule: data });
    } catch (error) {
        console.error('Toggle schedule error:', error);
        res.status(500).json({ error: 'Failed to toggle schedule' });
    }
});

/**
 * DELETE /api/scheduled/:id
 * Delete a scheduled analysis
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('scheduled_analyses')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) {
            console.error('Delete schedule error:', error);
            return res.status(500).json({ error: 'Failed to delete schedule' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});

/**
 * POST /api/scheduled/:id/run-now
 * Manually trigger a scheduled analysis immediately
 * (This re-uses the existing analysis flow - deducts tokens, creates analysis, etc.)
 */
router.post('/:id/run-now', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: schedule, error: fetchError } = await supabaseAdmin
            .from('scheduled_analyses')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchError || !schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Return the schedule config so the frontend can call the existing analysis endpoint
        res.json({
            schedule,
            message: 'Use the analysis endpoint to run this analysis with the returned config',
        });
    } catch (error) {
        console.error('Run now error:', error);
        res.status(500).json({ error: 'Failed to run schedule' });
    }
});

export default router;
