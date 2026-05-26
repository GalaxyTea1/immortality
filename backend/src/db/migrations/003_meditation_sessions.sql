-- Migration: server-managed meditation sessions

ALTER TABLE characters ADD COLUMN IF NOT EXISTS meditation_started_at TIMESTAMP;
