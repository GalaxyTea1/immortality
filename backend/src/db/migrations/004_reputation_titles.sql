-- Product reputation catalog.
-- Characters keep a denormalized snapshot of points/level/title, while this table
-- is the master data for threshold names and display colors.

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

ALTER TABLE characters ALTER COLUMN reputation_title SET DEFAULT 'Vô Danh';

UPDATE characters
SET reputation_title = 'Vô Danh'
WHERE reputation_points = 0 AND reputation_title = 'Nameless';

CREATE INDEX IF NOT EXISTS idx_reputation_titles_min_points ON reputation_titles(min_points);
CREATE INDEX IF NOT EXISTS idx_reputation_titles_active ON reputation_titles(is_active);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reputation_titles_updated_at ON reputation_titles;
CREATE TRIGGER update_reputation_titles_updated_at
    BEFORE UPDATE ON reputation_titles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
