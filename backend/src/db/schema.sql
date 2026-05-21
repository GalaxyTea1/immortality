-- Immortality Game Database Schema
-- Run this script to create all required tables

-- ===========================
-- Users Table (Authentication)
-- ===========================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ===========================
-- Characters Table (Game Data)
-- ===========================
CREATE TABLE IF NOT EXISTS characters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Daoist',
    
    -- Cultivation Progress
    realm_index INTEGER DEFAULT 0,           -- Index in REALMS
    level INTEGER DEFAULT 1,                 -- Level in realm (1-9)
    exp BIGINT DEFAULT 0,
    max_exp BIGINT DEFAULT 100,
    
    -- Resources
    spirit_stones BIGINT DEFAULT 1000,       -- Spirit Stones
    
    -- Base Stats
    hp INTEGER DEFAULT 100,
    max_hp INTEGER DEFAULT 100,
    attack INTEGER DEFAULT 10,
    defense INTEGER DEFAULT 5,
    agility INTEGER DEFAULT 10,
    spirit INTEGER DEFAULT 10,
    cultivation_speed DECIMAL(5,2) DEFAULT 1.0,
    
    -- Foundation & Inner Demon
    foundation_value INTEGER DEFAULT 100,
    foundation_max INTEGER DEFAULT 100,
    inner_demon_value INTEGER DEFAULT 0,
    inner_demon_max INTEGER DEFAULT 100,
    
    -- Reputation
    reputation_points INTEGER DEFAULT 0,
    reputation_level INTEGER DEFAULT 1,
    reputation_title VARCHAR(100) DEFAULT 'Nameless',
    
    -- Alchemy
    alchemy_level INTEGER DEFAULT 1,
    alchemy_exp INTEGER DEFAULT 0,
    
    -- Exploration
    exploration_count INTEGER DEFAULT 0,
    exploration_last_reset DATE DEFAULT CURRENT_DATE,
    last_meditation_time TIMESTAMP,
    meditation_started_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Inventory Table
-- ===========================
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,           -- Item ID (e.g., 'small_recovery_pill')
    quantity INTEGER DEFAULT 1,
    enhance_level INTEGER DEFAULT 0,         -- Equipment enhance level (0 for non-equipment)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, item_id, enhance_level)
);

-- ===========================
-- Equipment Table (Equipped Items)
-- ===========================
CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    slot VARCHAR(50) NOT NULL,               -- 'weapon', 'armor', 'spirit', etc.
    item_id VARCHAR(100) NOT NULL,
    enhance_level INTEGER DEFAULT 0,
    UNIQUE(character_id, slot)
);

-- ===========================
-- Learned Skills Table
-- ===========================
CREATE TABLE IF NOT EXISTS learned_skills (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL,
    learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, skill_id)
);

-- ===========================
-- Event Logs Table
-- ===========================
CREATE TABLE IF NOT EXISTS event_logs (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,         -- 'info', 'warning', 'success', 'danger'
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Character Quests Table
-- ===========================
CREATE TABLE IF NOT EXISTS character_quests (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    quest_id VARCHAR(100) NOT NULL,
    progress INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    assigned_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- ===========================
-- Leaderboard View (For Rankings)
-- ===========================
CREATE OR REPLACE VIEW leaderboard_cultivation AS
SELECT 
    c.id,
    c.name,
    c.realm_index,
    c.level,
    c.exp,
    c.reputation_points,
    c.reputation_title,
    u.username,
    RANK() OVER (ORDER BY c.realm_index DESC, c.level DESC, c.exp DESC) as rank
FROM characters c
JOIN users u ON c.user_id = u.id
WHERE u.is_active = TRUE
ORDER BY rank
LIMIT 100;

-- ===========================
-- Indexes for Performance
-- ===========================
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_character_id ON inventory(character_id);
CREATE INDEX IF NOT EXISTS idx_equipment_character_id ON equipment(character_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_character_id ON event_logs(character_id);
CREATE INDEX IF NOT EXISTS idx_characters_realm_level ON characters(realm_index DESC, level DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_character_quests_daily ON character_quests (character_id, quest_id, (assigned_at::date));
CREATE INDEX IF NOT EXISTS idx_character_quests_active ON character_quests(character_id, status) WHERE status = 'active';

-- ===========================
-- Trigger for updated_at
-- ===========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_characters_updated_at ON characters;
CREATE TRIGGER update_characters_updated_at
    BEFORE UPDATE ON characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
