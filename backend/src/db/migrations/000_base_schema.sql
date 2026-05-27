-- Base schema required before feature migrations.
-- This migration makes `npm run db:migrate` usable on a blank database.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS characters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Đạo Hữu',
    realm_index INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    exp BIGINT DEFAULT 0,
    max_exp BIGINT DEFAULT 100,
    spirit_stones BIGINT DEFAULT 1000,
    hp INTEGER DEFAULT 100,
    max_hp INTEGER DEFAULT 100,
    attack INTEGER DEFAULT 10,
    defense INTEGER DEFAULT 5,
    agility INTEGER DEFAULT 10,
    spirit INTEGER DEFAULT 10,
    cultivation_speed DECIMAL(5,2) DEFAULT 1.0,
    progression_stat_version INTEGER NOT NULL DEFAULT 1,
    foundation_value INTEGER DEFAULT 100,
    foundation_max INTEGER DEFAULT 100,
    inner_demon_value INTEGER DEFAULT 0,
    inner_demon_max INTEGER DEFAULT 100,
    reputation_points INTEGER DEFAULT 0,
    reputation_level INTEGER DEFAULT 1,
    reputation_title VARCHAR(100) DEFAULT 'Vô Danh',
    alchemy_level INTEGER DEFAULT 1,
    alchemy_exp INTEGER DEFAULT 0,
    exploration_count INTEGER DEFAULT 0,
    exploration_last_reset DATE DEFAULT CURRENT_DATE,
    last_meditation_time TIMESTAMP,
    meditation_started_at TIMESTAMP,
    last_hp_regen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 1,
    enhance_level INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, item_id, enhance_level)
);

CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    slot VARCHAR(50) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    enhance_level INTEGER DEFAULT 0,
    UNIQUE(character_id, slot)
);

CREATE TABLE IF NOT EXISTS learned_skills (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL,
    learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, skill_id)
);

CREATE TABLE IF NOT EXISTS event_logs (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_character_id ON inventory(character_id);
CREATE INDEX IF NOT EXISTS idx_equipment_character_id ON equipment(character_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_character_id ON event_logs(character_id);
CREATE INDEX IF NOT EXISTS idx_characters_realm_level ON characters(realm_index DESC, level DESC);

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
