-- Product item catalog tables.
-- Runtime ownership stays in inventory/equipment; this catalog is the master data
-- for item names, types, effects, shop visibility, and pricing.

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

CREATE INDEX IF NOT EXISTS idx_item_definitions_type ON item_definitions(type);
CREATE INDEX IF NOT EXISTS idx_item_definitions_active ON item_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_shop_items_category ON shop_items(category);
CREATE INDEX IF NOT EXISTS idx_shop_items_active ON shop_items(is_active);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

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

DO $$
BEGIN
    ALTER TABLE inventory
        ADD CONSTRAINT fk_inventory_item_definition
        FOREIGN KEY (item_id) REFERENCES item_definitions(item_id) NOT VALID;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE equipment
        ADD CONSTRAINT fk_equipment_item_definition
        FOREIGN KEY (item_id) REFERENCES item_definitions(item_id) NOT VALID;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
