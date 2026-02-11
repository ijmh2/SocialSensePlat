-- Migration: Add competitor analysis and action items columns
-- Run this in Supabase SQL Editor

-- Add competitor tracking columns to analyses table
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS is_competitor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS competitor_notes TEXT,
ADD COLUMN IF NOT EXISTS competitor_analysis TEXT;

-- Add action items column for AI Action Plans
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]';

-- Add score breakdown column for detailed scoring
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS score_breakdown JSONB;

-- Add index for faster competitor filtering
CREATE INDEX IF NOT EXISTS idx_analyses_is_competitor ON public.analyses(is_competitor);

-- Verify columns exist (these may have been added previously)
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS has_video BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_my_video BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS creator_notes TEXT,
ADD COLUMN IF NOT EXISTS video_score INTEGER,
ADD COLUMN IF NOT EXISTS priority_improvement TEXT,
ADD COLUMN IF NOT EXISTS notes_assessment TEXT,
ADD COLUMN IF NOT EXISTS video_transcript TEXT;

-- Add index for my_video filtering
CREATE INDEX IF NOT EXISTS idx_analyses_is_my_video ON public.analyses(is_my_video);
