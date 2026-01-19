import express from 'express';
import { query } from '../db/index.js';

const router = express.Router();

// GET /api/leaderboard - Get cultivation leaderboard
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(
      `SELECT 
        c.id,
        c.name,
        c.realm_index,
        c.level,
        c.exp,
        c.reputation_points,
        c.reputation_title,
        u.username,
        RANK() OVER (ORDER BY c.realm_index DESC, c.level DESC, c.exp DESC) as rank
      FROM characters c
      JOIN users u ON c.user_id = u.id
      WHERE u.is_active = TRUE
      ORDER BY rank
      LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );

    res.json({
      data: result.rows,
      total: result.rowCount,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Error fetching leaderboard' });
  }
});

// GET /api/leaderboard/power - Leaderboard by power
router.get('/power', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const result = await query(
      `SELECT 
        c.id,
        c.name,
        c.realm_index,
        c.level,
        c.attack,
        c.defense,
        c.spirit,
        (c.attack + c.defense + c.spirit + c.agility) * (c.realm_index + 1) * c.level as power,
        u.username,
        RANK() OVER (ORDER BY (c.attack + c.defense + c.spirit + c.agility) * (c.realm_index + 1) * c.level DESC) as rank
      FROM characters c
      JOIN users u ON c.user_id = u.id
      WHERE u.is_active = TRUE
      ORDER BY rank
      LIMIT $1`,
      [parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching power leaderboard:', error);
    res.status(500).json({ error: 'Error fetching power leaderboard' });
  }
});

// GET /api/leaderboard/reputation - Leaderboard by reputation
router.get('/reputation', async (req, res) => {
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

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reputation leaderboard:', error);
    res.status(500).json({ error: 'Error fetching reputation leaderboard' });
  }
});

export default router;
