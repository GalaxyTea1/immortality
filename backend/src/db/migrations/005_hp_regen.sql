-- Passive HP regeneration bookkeeping.
-- HP recovers over time from the last regeneration checkpoint.

ALTER TABLE characters
    ADD COLUMN IF NOT EXISTS last_hp_regen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE characters
SET last_hp_regen_at = COALESCE(last_hp_regen_at, updated_at, CURRENT_TIMESTAMP);
