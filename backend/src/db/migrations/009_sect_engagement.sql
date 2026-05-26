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

CREATE TABLE IF NOT EXISTS sect_quest_claims (
    id SERIAL PRIMARY KEY,
    sect_id INTEGER NOT NULL REFERENCES sects(id) ON DELETE CASCADE,
    quest_id VARCHAR(100) NOT NULL,
    quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    claimed_by INTEGER REFERENCES characters(id) ON DELETE SET NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sect_id, quest_id, quest_date)
);

CREATE INDEX IF NOT EXISTS idx_sect_treasury_items_sect_id ON sect_treasury_items(sect_id);
CREATE INDEX IF NOT EXISTS idx_sect_quest_claims_sect_date ON sect_quest_claims(sect_id, quest_date);

DROP TRIGGER IF EXISTS update_sect_treasury_items_updated_at ON sect_treasury_items;
CREATE TRIGGER update_sect_treasury_items_updated_at
    BEFORE UPDATE ON sect_treasury_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
