-- Store how many comments were originally requested so partial fetches can be detected.
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS comments_requested INTEGER;
