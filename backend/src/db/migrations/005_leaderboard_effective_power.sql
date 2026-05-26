-- Leaderboard power should include equipped item stat bonuses.

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
        (
            COALESCE(c.attack, 0) + COALESCE(eb.bonus_attack, 0) +
            COALESCE(c.defense, 0) + COALESCE(eb.bonus_defense, 0) +
            COALESCE(c.spirit, 0) + COALESCE(eb.bonus_spirit, 0) +
            COALESCE(c.agility, 0) + COALESCE(eb.bonus_agility, 0)
        ) *
        (COALESCE(c.realm_index, 0) + 1) *
        COALESCE(c.level, 1)
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
