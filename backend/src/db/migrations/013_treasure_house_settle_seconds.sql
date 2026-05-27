ALTER TABLE treasure_house_settings
ADD COLUMN IF NOT EXISTS settle_seconds INTEGER NOT NULL DEFAULT 10 CHECK (settle_seconds BETWEEN 3 AND 120);

UPDATE treasure_house_settings
SET settle_seconds = 10
WHERE settle_seconds IS NULL;
