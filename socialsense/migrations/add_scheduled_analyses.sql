-- Migration: Add Scheduled/Recurring Analysis
-- Run this in Supabase SQL Editor

-- ========================================================
-- SCHEDULED ANALYSES: Monitors that re-run analysis on a schedule
-- ========================================================
CREATE TABLE IF NOT EXISTS public.scheduled_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Video info
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok')),
    video_url TEXT NOT NULL,
    video_title TEXT,

    -- Schedule config
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
    is_active BOOLEAN DEFAULT TRUE,

    -- Analysis config
    max_comments INTEGER DEFAULT 1000,
    include_text_analysis BOOLEAN DEFAULT TRUE,
    include_marketing BOOLEAN DEFAULT FALSE,
    product_description TEXT,
    is_my_video BOOLEAN DEFAULT FALSE,
    is_competitor BOOLEAN DEFAULT FALSE,
    creator_notes TEXT,
    competitor_notes TEXT,

    -- Execution tracking
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    run_count INTEGER DEFAULT 0,
    last_analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
    last_error TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_analyses_user_id ON public.scheduled_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_analyses_next_run ON public.scheduled_analyses(next_run_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_scheduled_analyses_active ON public.scheduled_analyses(is_active);

-- RLS
ALTER TABLE public.scheduled_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled analyses"
    ON public.scheduled_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own scheduled analyses"
    ON public.scheduled_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scheduled analyses"
    ON public.scheduled_analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scheduled analyses"
    ON public.scheduled_analyses FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_analyses_updated_at
    BEFORE UPDATE ON public.scheduled_analyses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Grant access to service role
GRANT ALL ON public.scheduled_analyses TO service_role;
