ALTER TABLE boss_definitions
ADD COLUMN IF NOT EXISTS image TEXT;

ALTER TABLE sect_quest_claims
DROP CONSTRAINT IF EXISTS sect_quest_claims_sect_id_quest_id_quest_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sect_quest_claims_character_daily
ON sect_quest_claims (sect_id, quest_id, quest_date, claimed_by);

CREATE INDEX IF NOT EXISTS idx_sect_quest_claims_character_date
ON sect_quest_claims (claimed_by, quest_date);
