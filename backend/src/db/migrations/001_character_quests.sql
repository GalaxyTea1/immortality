-- Migration: character_quests table for server-authoritative daily quests

CREATE TABLE IF NOT EXISTS character_quests (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    quest_id VARCHAR(100) NOT NULL,
    progress INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    assigned_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_character_quests_daily
    ON character_quests (character_id, quest_id, (assigned_at::date));

CREATE INDEX IF NOT EXISTS idx_character_quests_active
    ON character_quests(character_id, status)
    WHERE status = 'active';
