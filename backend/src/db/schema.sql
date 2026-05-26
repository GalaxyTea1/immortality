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
    name VARCHAR(100) NOT NULL DEFAULT 'Đạo Hữu',
    
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
    reputation_title VARCHAR(100) DEFAULT 'Vô Danh',
    
    -- Alchemy
    alchemy_level INTEGER DEFAULT 1,
    alchemy_exp INTEGER DEFAULT 0,
    
    -- Exploration
    exploration_count INTEGER DEFAULT 0,
    exploration_last_reset DATE DEFAULT CURRENT_DATE,
    last_meditation_time TIMESTAMP,
    meditation_started_at TIMESTAMP,
    last_hp_regen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Item Definitions Table (Product Catalog)
-- ===========================
CREATE TABLE IF NOT EXISTS item_definitions (
    item_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    type VARCHAR(50) NOT NULL CHECK (type IN ('pill', 'material', 'equipment', 'book')),
    rarity VARCHAR(50) DEFAULT 'common',
    slot VARCHAR(50),
    effect JSONB NOT NULL DEFAULT '{}'::jsonb,
    price INTEGER DEFAULT 0 CHECK (price >= 0),
    image TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_equipment_slot_required CHECK (type <> 'equipment' OR slot IS NOT NULL)
);

-- ===========================
-- Shop Items Table (Sellable Catalog)
-- ===========================
CREATE TABLE IF NOT EXISTS shop_items (
    item_id VARCHAR(100) PRIMARY KEY REFERENCES item_definitions(item_id) ON UPDATE CASCADE,
    category VARCHAR(50) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Reputation Titles Table (Reputation Catalog)
-- ===========================
CREATE TABLE IF NOT EXISTS reputation_titles (
    level INTEGER PRIMARY KEY,
    min_points INTEGER NOT NULL UNIQUE CHECK (min_points >= 0),
    vietnm VARCHAR(100) NOT NULL,
    globalnm VARCHAR(100) NOT NULL,
    color VARCHAR(30) DEFAULT 'gray',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Inventory Table
-- ===========================
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL REFERENCES item_definitions(item_id) ON UPDATE CASCADE,
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
    item_id VARCHAR(100) NOT NULL REFERENCES item_definitions(item_id) ON UPDATE CASCADE,
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
-- Sects Table
-- ===========================
CREATE TABLE IF NOT EXISTS sects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    owner_character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    exp BIGINT NOT NULL DEFAULT 0 CHECK (exp >= 0),
    spirit_stones BIGINT NOT NULL DEFAULT 0 CHECK (spirit_stones >= 0),
    max_members INTEGER NOT NULL DEFAULT 30 CHECK (max_members > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Sect Members Table
-- ===========================
CREATE TABLE IF NOT EXISTS sect_members (
    id SERIAL PRIMARY KEY,
    sect_id INTEGER NOT NULL REFERENCES sects(id) ON DELETE CASCADE,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'elder', 'member')),
    contribution BIGINT NOT NULL DEFAULT 0 CHECK (contribution >= 0),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sect_id, character_id),
    UNIQUE(character_id)
);

-- ===========================
-- Boss Definitions Table
-- ===========================
CREATE TABLE IF NOT EXISTS boss_definitions (
    boss_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    realm_index INTEGER NOT NULL DEFAULT 0 CHECK (realm_index >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    max_hp BIGINT NOT NULL CHECK (max_hp > 0),
    attack INTEGER NOT NULL DEFAULT 0 CHECK (attack >= 0),
    defense INTEGER NOT NULL DEFAULT 0 CHECK (defense >= 0),
    rewards JSONB NOT NULL DEFAULT '{}'::jsonb,
    respawn_hours INTEGER NOT NULL DEFAULT 24 CHECK (respawn_hours > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Boss Instances Table
-- ===========================
CREATE TABLE IF NOT EXISTS boss_instances (
    id SERIAL PRIMARY KEY,
    sect_id INTEGER NOT NULL REFERENCES sects(id) ON DELETE CASCADE,
    boss_id VARCHAR(100) NOT NULL REFERENCES boss_definitions(boss_id) ON UPDATE CASCADE,
    current_hp BIGINT NOT NULL CHECK (current_hp >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'defeated', 'expired')),
    spawned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    defeated_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- ===========================
-- Boss Attacks Table
-- ===========================
CREATE TABLE IF NOT EXISTS boss_attacks (
    id SERIAL PRIMARY KEY,
    boss_instance_id INTEGER NOT NULL REFERENCES boss_instances(id) ON DELETE CASCADE,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    damage BIGINT NOT NULL CHECK (damage >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Sect Treasury Table
-- ===========================
CREATE TABLE IF NOT EXISTS sect_treasury_items (
    id SERIAL PRIMARY KEY,
    sect_id INTEGER NOT NULL REFERENCES sects(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL REFERENCES item_definitions(item_id) ON UPDATE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    enhance_level INTEGER NOT NULL DEFAULT 0 CHECK (enhance_level >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sect_id, item_id, enhance_level)
);

-- ===========================
-- Sect Daily Quest Claims Table
-- ===========================
CREATE TABLE IF NOT EXISTS sect_quest_claims (
    id SERIAL PRIMARY KEY,
    sect_id INTEGER NOT NULL REFERENCES sects(id) ON DELETE CASCADE,
    quest_id VARCHAR(100) NOT NULL,
    quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    claimed_by INTEGER REFERENCES characters(id) ON DELETE SET NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sect_id, quest_id, quest_date)
);

-- ===========================
-- Leaderboard View (For Rankings)
-- ===========================
DROP VIEW IF EXISTS leaderboard_cultivation;

CREATE VIEW leaderboard_cultivation AS
WITH equipment_bonus AS (
    SELECT
        e.character_id,
        COALESCE(SUM(COALESCE((i.effect->>'attack')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_attack,
        COALESCE(SUM(COALESCE((i.effect->>'defense')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_defense,
        COALESCE(SUM(COALESCE((i.effect->>'spirit')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_spirit,
        COALESCE(SUM(COALESCE((i.effect->>'agility')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_agility
    FROM equipment e
    JOIN item_definitions i ON i.item_id = e.item_id
    GROUP BY e.character_id
)
SELECT
    c.id,
    c.name,
    c.realm_index,
    c.level,
    c.exp,
    ROUND(
        (GREATEST(COALESCE(c.realm_index, 0), 0) * 1000000) +
        (GREATEST(COALESCE(c.level, 1), 1) * 100000) +
        (
            COALESCE(c.attack, 0) + COALESCE(eb.bonus_attack, 0) +
            COALESCE(c.defense, 0) + COALESCE(eb.bonus_defense, 0) +
            COALESCE(c.spirit, 0) + COALESCE(eb.bonus_spirit, 0) +
            COALESCE(c.agility, 0) + COALESCE(eb.bonus_agility, 0)
        ) * 10
    ) AS power,
    c.reputation_points,
    c.reputation_title,
    u.username,
    RANK() OVER (ORDER BY c.realm_index DESC, c.level DESC, c.exp DESC) as rank
FROM characters c
JOIN users u ON c.user_id = u.id
LEFT JOIN equipment_bonus eb ON eb.character_id = c.id
WHERE u.is_active = TRUE
ORDER BY rank
LIMIT 100;

-- ===========================
-- Indexes for Performance
-- ===========================
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_item_definitions_type ON item_definitions(type);
CREATE INDEX IF NOT EXISTS idx_item_definitions_active ON item_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_shop_items_category ON shop_items(category);
CREATE INDEX IF NOT EXISTS idx_shop_items_active ON shop_items(is_active);
CREATE INDEX IF NOT EXISTS idx_reputation_titles_min_points ON reputation_titles(min_points);
CREATE INDEX IF NOT EXISTS idx_reputation_titles_active ON reputation_titles(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_character_id ON inventory(character_id);
CREATE INDEX IF NOT EXISTS idx_equipment_character_id ON equipment(character_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_character_id ON event_logs(character_id);
CREATE INDEX IF NOT EXISTS idx_characters_realm_level ON characters(realm_index DESC, level DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_character_quests_daily ON character_quests (character_id, quest_id, (assigned_at::date));
CREATE INDEX IF NOT EXISTS idx_character_quests_active ON character_quests(character_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sect_members_sect_id ON sect_members(sect_id);
CREATE INDEX IF NOT EXISTS idx_sect_members_character_id ON sect_members(character_id);
CREATE INDEX IF NOT EXISTS idx_boss_instances_sect_status ON boss_instances(sect_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_boss_per_sect ON boss_instances(sect_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_boss_attacks_instance_id ON boss_attacks(boss_instance_id);
CREATE INDEX IF NOT EXISTS idx_boss_attacks_character_id ON boss_attacks(character_id);
CREATE INDEX IF NOT EXISTS idx_sect_treasury_items_sect_id ON sect_treasury_items(sect_id);
CREATE INDEX IF NOT EXISTS idx_sect_quest_claims_sect_date ON sect_quest_claims(sect_id, quest_date);

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

DROP TRIGGER IF EXISTS update_item_definitions_updated_at ON item_definitions;
CREATE TRIGGER update_item_definitions_updated_at
    BEFORE UPDATE ON item_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shop_items_updated_at ON shop_items;
CREATE TRIGGER update_shop_items_updated_at
    BEFORE UPDATE ON shop_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reputation_titles_updated_at ON reputation_titles;
CREATE TRIGGER update_reputation_titles_updated_at
    BEFORE UPDATE ON reputation_titles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sects_updated_at ON sects;
CREATE TRIGGER update_sects_updated_at
    BEFORE UPDATE ON sects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_boss_definitions_updated_at ON boss_definitions;
CREATE TRIGGER update_boss_definitions_updated_at
    BEFORE UPDATE ON boss_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sect_treasury_items_updated_at ON sect_treasury_items;
CREATE TRIGGER update_sect_treasury_items_updated_at
    BEFORE UPDATE ON sect_treasury_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
