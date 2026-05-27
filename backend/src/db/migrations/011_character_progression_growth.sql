ALTER TABLE characters
ADD COLUMN IF NOT EXISTS progression_stat_version INTEGER NOT NULL DEFAULT 0;

WITH minor_growth AS (
    SELECT
        c.id,
        COALESCE(SUM(level_count.levels_gained * (8 + (realms.realm_idx + 1) * 4)), 0)::integer AS max_hp,
        COALESCE(SUM(level_count.levels_gained * (1 + (realms.realm_idx + 1))), 0)::integer AS attack,
        COALESCE(SUM(level_count.levels_gained * (1 + CEIL((realms.realm_idx + 1)::numeric / 2))), 0)::integer AS defense,
        COALESCE(SUM(level_count.levels_gained * (1 + FLOOR((realms.realm_idx + 1)::numeric / 2))), 0)::integer AS agility,
        COALESCE(SUM(level_count.levels_gained * (1 + (realms.realm_idx + 1))), 0)::integer AS spirit,
        COALESCE(SUM(level_count.levels_gained * 0.01), 0)::numeric(5, 2) AS cultivation_speed
    FROM characters c
    CROSS JOIN LATERAL generate_series(0, GREATEST(COALESCE(c.realm_index, 0), 0)) AS realms(realm_idx)
    CROSS JOIN LATERAL (
        SELECT CASE
            WHEN realms.realm_idx < COALESCE(c.realm_index, 0) THEN 8
            WHEN realms.realm_idx = COALESCE(c.realm_index, 0) THEN GREATEST(COALESCE(c.level, 1) - 1, 0)
            ELSE 0
        END AS levels_gained
    ) AS level_count
    WHERE c.progression_stat_version = 0
    GROUP BY c.id
),
breakthrough_growth AS (
    SELECT
        c.id,
        COALESCE(SUM(80 + (breakthroughs.to_realm_idx + 1) * 40), 0)::integer AS max_hp,
        COALESCE(SUM(12 + (breakthroughs.to_realm_idx + 1) * 6), 0)::integer AS attack,
        COALESCE(SUM(10 + (breakthroughs.to_realm_idx + 1) * 5), 0)::integer AS defense,
        COALESCE(SUM(8 + (breakthroughs.to_realm_idx + 1) * 3), 0)::integer AS agility,
        COALESCE(SUM(14 + (breakthroughs.to_realm_idx + 1) * 7), 0)::integer AS spirit,
        COALESCE(SUM(0.03 + (breakthroughs.to_realm_idx + 1) * 0.01), 0)::numeric(5, 2) AS cultivation_speed
    FROM characters c
    LEFT JOIN LATERAL generate_series(1, GREATEST(COALESCE(c.realm_index, 0), 0)) AS breakthroughs(to_realm_idx) ON TRUE
    WHERE c.progression_stat_version = 0
    GROUP BY c.id
),
total_growth AS (
    SELECT
        c.id,
        COALESCE(m.max_hp, 0) + COALESCE(b.max_hp, 0) AS max_hp,
        COALESCE(m.attack, 0) + COALESCE(b.attack, 0) AS attack,
        COALESCE(m.defense, 0) + COALESCE(b.defense, 0) AS defense,
        COALESCE(m.agility, 0) + COALESCE(b.agility, 0) AS agility,
        COALESCE(m.spirit, 0) + COALESCE(b.spirit, 0) AS spirit,
        COALESCE(m.cultivation_speed, 0) + COALESCE(b.cultivation_speed, 0) AS cultivation_speed
    FROM characters c
    LEFT JOIN minor_growth m ON m.id = c.id
    LEFT JOIN breakthrough_growth b ON b.id = c.id
    WHERE c.progression_stat_version = 0
)
UPDATE characters c
SET max_hp = c.max_hp + total_growth.max_hp,
    hp = c.hp + total_growth.max_hp,
    attack = c.attack + total_growth.attack,
    defense = c.defense + total_growth.defense,
    agility = c.agility + total_growth.agility,
    spirit = c.spirit + total_growth.spirit,
    cultivation_speed = c.cultivation_speed + total_growth.cultivation_speed,
    progression_stat_version = 1
FROM total_growth
WHERE c.id = total_growth.id
  AND c.progression_stat_version = 0;

ALTER TABLE characters
ALTER COLUMN progression_stat_version SET DEFAULT 1;
