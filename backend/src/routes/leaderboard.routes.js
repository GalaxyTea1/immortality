import express from "express";
import { query } from "../db/index.js";
import { fail, ok } from "../http/response.js";

const router = express.Router();

const EQUIPMENT_BONUS_CTE = `equipment_bonus AS (
  SELECT
    e.character_id,
    COALESCE(SUM(COALESCE((i.effect->>'attack')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_attack,
    COALESCE(SUM(COALESCE((i.effect->>'defense')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_defense,
    COALESCE(SUM(COALESCE((i.effect->>'spirit')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_spirit,
    COALESCE(SUM(COALESCE((i.effect->>'agility')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_agility
  FROM equipment e
  JOIN item_definitions i ON i.item_id = e.item_id
  GROUP BY e.character_id
)`;

const EFFECTIVE_CHARACTER_SELECT = `
  SELECT
    c.id,
    c.name,
    c.realm_index,
    c.level,
    c.exp,
    (COALESCE(c.attack, 0) + COALESCE(eb.bonus_attack, 0)) AS attack,
    (COALESCE(c.defense, 0) + COALESCE(eb.bonus_defense, 0)) AS defense,
    (COALESCE(c.spirit, 0) + COALESCE(eb.bonus_spirit, 0)) AS spirit,
    (COALESCE(c.agility, 0) + COALESCE(eb.bonus_agility, 0)) AS agility,
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
    u.username
  FROM characters c
  JOIN users u ON c.user_id = u.id
  LEFT JOIN equipment_bonus eb ON eb.character_id = c.id
  WHERE u.is_active = TRUE
`;

// GET /api/leaderboard - Get cultivation leaderboard
router.get("/", async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const result = await query(
            `WITH ${EQUIPMENT_BONUS_CTE},
         effective_characters AS (${EFFECTIVE_CHARACTER_SELECT})
         SELECT
           *,
           RANK() OVER (ORDER BY realm_index DESC, level DESC, exp DESC) AS rank
         FROM effective_characters
         ORDER BY rank
         LIMIT $1 OFFSET $2`,
            [parseInt(limit), parseInt(offset)]
        );

        ok(res, {
            leaderboard: result.rows,
            total: result.rowCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        fail(res, 500, "Error fetching leaderboard");
    }
});

// GET /api/leaderboard/power - Leaderboard by power
router.get("/power", async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const result = await query(
            `WITH ${EQUIPMENT_BONUS_CTE},
       effective_characters AS (${EFFECTIVE_CHARACTER_SELECT})
       SELECT
         id,
         name,
         realm_index,
         level,
         attack,
         defense,
         spirit,
         agility,
         power,
         username,
         RANK() OVER (ORDER BY power DESC) AS rank
       FROM effective_characters
       ORDER BY rank
       LIMIT $1`,
            [parseInt(limit)]
        );

        ok(res, { leaderboard: result.rows, total: result.rowCount, limit: parseInt(limit) });
    } catch (error) {
        console.error("Error fetching power leaderboard:", error);
        fail(res, 500, "Error fetching power leaderboard");
    }
});

// GET /api/leaderboard/reputation - Leaderboard by reputation
router.get("/reputation", async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const result = await query(
            `SELECT 
        c.id,
        c.name,
        c.reputation_points,
        c.reputation_title,
        u.username,
        RANK() OVER (ORDER BY c.reputation_points DESC) as rank
      FROM characters c
      JOIN users u ON c.user_id = u.id
      WHERE u.is_active = TRUE
      ORDER BY rank
      LIMIT $1`,
            [parseInt(limit)]
        );

        ok(res, { leaderboard: result.rows, total: result.rowCount, limit: parseInt(limit) });
    } catch (error) {
        console.error("Error fetching reputation leaderboard:", error);
        fail(res, 500, "Error fetching reputation leaderboard");
    }
});

export default router;
