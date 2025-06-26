-- Add new columns to bots table for enhanced trading logic
ALTER TABLE bots ADD COLUMN IF NOT EXISTS global_peak_value FLOAT DEFAULT 0.0;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS min_acceptable_value FLOAT DEFAULT 0.0;
