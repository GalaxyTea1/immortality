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

CREATE TABLE IF NOT EXISTS boss_attacks (
    id SERIAL PRIMARY KEY,
    boss_instance_id INTEGER NOT NULL REFERENCES boss_instances(id) ON DELETE CASCADE,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    damage BIGINT NOT NULL CHECK (damage >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sect_members_sect_id ON sect_members(sect_id);
CREATE INDEX IF NOT EXISTS idx_sect_members_character_id ON sect_members(character_id);
CREATE INDEX IF NOT EXISTS idx_boss_instances_sect_status ON boss_instances(sect_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_boss_per_sect ON boss_instances(sect_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_boss_attacks_instance_id ON boss_attacks(boss_instance_id);
CREATE INDEX IF NOT EXISTS idx_boss_attacks_character_id ON boss_attacks(character_id);

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
