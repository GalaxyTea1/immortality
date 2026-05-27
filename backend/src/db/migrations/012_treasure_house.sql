ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS treasure_house_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    pot_amount BIGINT NOT NULL DEFAULT 0 CHECK (pot_amount >= 0),
    min_bet BIGINT NOT NULL DEFAULT 100 CHECK (min_bet > 0),
    max_bet BIGINT NOT NULL DEFAULT 50000 CHECK (max_bet >= min_bet),
    round_seconds INTEGER NOT NULL DEFAULT 30 CHECK (round_seconds BETWEEN 10 AND 300),
    settle_seconds INTEGER NOT NULL DEFAULT 10 CHECK (settle_seconds BETWEEN 3 AND 120),
    payout_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.80 CHECK (payout_multiplier >= 1),
    max_jackpot_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1000 CHECK (max_jackpot_rate >= 0 AND max_jackpot_rate <= 0.1000),
    jackpot_rate_stone_scale BIGINT NOT NULL DEFAULT 1000000 CHECK (jackpot_rate_stone_scale > 0),
    jackpot_payout_percent NUMERIC(5,4) NOT NULL DEFAULT 0.2500 CHECK (jackpot_payout_percent >= 0 AND jackpot_payout_percent <= 1),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO treasure_house_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS treasure_house_rounds (
    id SERIAL PRIMARY KEY,
    round_no INTEGER NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'betting' CHECK (status IN ('betting', 'resolved', 'cancelled')),
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closes_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP,
    result_side INTEGER CHECK (result_side IN (1, 2)),
    forced_result_side INTEGER CHECK (forced_result_side IN (1, 2)),
    total_bet BIGINT NOT NULL DEFAULT 0 CHECK (total_bet >= 0),
    total_winning_bet BIGINT NOT NULL DEFAULT 0 CHECK (total_winning_bet >= 0),
    total_losing_bet BIGINT NOT NULL DEFAULT 0 CHECK (total_losing_bet >= 0),
    jackpot_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    jackpot_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    jackpot_amount BIGINT NOT NULL DEFAULT 0 CHECK (jackpot_amount >= 0),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS treasure_house_bets (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES treasure_house_rounds(id) ON DELETE CASCADE,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    side INTEGER NOT NULL CHECK (side IN (1, 2)),
    amount BIGINT NOT NULL CHECK (amount > 0),
    payout BIGINT NOT NULL DEFAULT 0 CHECK (payout >= 0),
    jackpot_bonus BIGINT NOT NULL DEFAULT 0 CHECK (jackpot_bonus >= 0),
    outcome VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'won', 'lost', 'refunded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, character_id)
);

CREATE TABLE IF NOT EXISTS treasure_house_pot_transactions (
    id SERIAL PRIMARY KEY,
    round_id INTEGER REFERENCES treasure_house_rounds(id) ON DELETE SET NULL,
    character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
    admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(40) NOT NULL CHECK (type IN ('admin_deposit', 'bet_loss', 'bet_payout', 'jackpot_payout', 'refund')),
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
    note TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_treasure_rounds_status ON treasure_house_rounds(status, closes_at);
CREATE INDEX IF NOT EXISTS idx_treasure_bets_character ON treasure_house_bets(character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_treasure_bets_round ON treasure_house_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_treasure_transactions_character ON treasure_house_pot_transactions(character_id, created_at DESC);

DROP TRIGGER IF EXISTS update_treasure_house_settings_updated_at ON treasure_house_settings;
CREATE TRIGGER update_treasure_house_settings_updated_at
    BEFORE UPDATE ON treasure_house_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
