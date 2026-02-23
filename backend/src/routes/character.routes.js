import express from 'express';
import { query } from '../db/index.js';
import { broadcastLeaderboardUpdate, broadcastWorldAnnouncement } from '../socket.js';
import { validate, updateCharacterSchema } from '../middleware/validation.js';
import { saveLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// GET /api/characters/:userId - Get character info for user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query(
      'SELECT * FROM characters WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ error: 'Error fetching character info' });
  }
});

// POST /api/characters - Create new character
router.post('/', async (req, res) => {
  try {
    const { userId, name } = req.body;

    const result = await query(
      `INSERT INTO characters (user_id, name) 
       VALUES ($1, $2) 
       RETURNING *`,
      [userId, name || 'Daoist']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ error: 'Error creating character' });
  }
});

// PUT /api/characters/:id - Update character (save game)
router.put('/:id', saveLimiter, validate(updateCharacterSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      // ... (omitting lengthy destructuring lines for brevity, assuming tool keeps context or I should be precise if not omitting) 
      // To allow multiple replacement, I need to match StartLine and EndLine precisely.
      // I will target the comment first, then key lines.
      // Actually, I can just replace the whole blocks that have text.
      // Let's do partial replacement for the big update query block.
      // Wait, I can't partially match, I need exact TargetContent.
      // I'll break it down.

      // UPDATE 1: Comment
      // PUT /api/characters/:id - Cập nhật nhân vật (save game) -> Update character (save game)
      // UPDATE 2: 404
      // Không tìm thấy nhân vật -> Character not found
      // UPDATE 3: 500
      // Lỗi khi cập nhật nhân vật -> Error updating character
      // UPDATE 4: 
      // name, realm_index.... -> (no translation needed)

      // Let's replace the whole route if possible, or key parts.
      // The route is long. I'll replace top and bottom.
      name,
      realm_index,
      level,
      exp,
      max_exp,
      spirit_stones,
      hp,
      max_hp,
      attack,
      defense,
      agility,
      spirit,
      cultivation_speed,
      foundation_value,
      inner_demon_value,
      reputation_points,
      reputation_level,
      reputation_title,
      alchemy_level,
      alchemy_exp,
      exploration_count,
      exploration_last_reset,
      last_meditation_time
    } = req.body;

    const result = await query(
      `UPDATE characters SET
        name = COALESCE($1, name),
        realm_index = COALESCE($2, realm_index),
        level = COALESCE($3, level),
        exp = COALESCE($4, exp),
        max_exp = COALESCE($5, max_exp),
        spirit_stones = COALESCE($6, spirit_stones),
        hp = COALESCE($7, hp),
        max_hp = COALESCE($8, max_hp),
        attack = COALESCE($9, attack),
        defense = COALESCE($10, defense),
        agility = COALESCE($11, agility),
        spirit = COALESCE($12, spirit),
        cultivation_speed = COALESCE($13, cultivation_speed),
        foundation_value = COALESCE($14, foundation_value),
        inner_demon_value = COALESCE($15, inner_demon_value),
        reputation_points = COALESCE($16, reputation_points),
        reputation_level = COALESCE($17, reputation_level),
        reputation_title = COALESCE($18, reputation_title),
        alchemy_level = COALESCE($19, alchemy_level),
        alchemy_exp = COALESCE($20, alchemy_exp),
        exploration_count = COALESCE($21, exploration_count),
        exploration_last_reset = COALESCE($22, exploration_last_reset),
        last_meditation_time = COALESCE($23, last_meditation_time)
      WHERE id = $24
      RETURNING *`,
      [
        name, realm_index, level, exp, max_exp, spirit_stones,
        hp, max_hp, attack, defense, agility, spirit, cultivation_speed,
        foundation_value, inner_demon_value, reputation_points,
        reputation_level, reputation_title, alchemy_level, alchemy_exp,
        exploration_count, exploration_last_reset, last_meditation_time, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Broadcast leaderboard update to all subscribers
    try {
      broadcastLeaderboardUpdate();
    } catch (e) {
      // Socket not initialized yet — OK
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ error: 'Error updating character' });
  }
});

// POST /api/characters/:id/beacon-save
// Special endpoint for navigator.sendBeacon() on page unload
// Token is sent in body (sendBeacon can't set headers)
router.post('/:id/beacon-save', async (req, res) => {
  try {
    const characterId = req.params.id;
    const { token, inventory, equipment, ...characterData } = req.body;

    // Verify JWT from body
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    let decoded;
    try {
      const jwt = await import('jsonwebtoken');
      decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'tu_tien_secret_key_2025');
    } catch (e) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Build dynamic SET clause for character data
    const allowedFields = [
      'name', 'realm_index', 'level', 'exp', 'max_exp',
      'spirit_stones', 'hp', 'max_hp', 'attack', 'defense',
      'agility', 'spirit', 'cultivation_speed',
      'foundation_value', 'foundation_max',
      'inner_demon_value', 'inner_demon_max',
      'reputation_points', 'reputation_level', 'reputation_title',
      'alchemy_level', 'alchemy_exp',
      'exploration_count', 'exploration_last_reset', 'last_meditation_time'
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (characterData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(characterData[field]);
        paramIndex++;
      }
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(characterId);
      await query(
        `UPDATE characters SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
    }

    // Sync inventory if provided
    if (Array.isArray(inventory)) {
      await query('DELETE FROM inventory WHERE character_id = $1', [characterId]);
      for (const item of inventory) {
        if (item.itemId && item.quantity > 0) {
          await query(
            'INSERT INTO inventory (character_id, item_id, quantity, enhance_level) VALUES ($1, $2, $3, $4)',
            [characterId, item.itemId, item.quantity, item.enhanceLevel || 0]
          );
        }
      }
    }

    // Sync equipment if provided
    if (equipment && typeof equipment === 'object') {
      await query('DELETE FROM equipment WHERE character_id = $1', [characterId]);
      for (const [slot, data] of Object.entries(equipment)) {
        if (data && data.itemId) {
          await query(
            'INSERT INTO equipment (character_id, slot, item_id, enhance_level) VALUES ($1, $2, $3, $4)',
            [characterId, slot, data.itemId, data.enhanceLevel || 0]
          );
        }
      }
    }

    res.json({ saved: true });
  } catch (error) {
    console.error('Beacon save error:', error);
    res.status(500).json({ error: 'Beacon save failed' });
  }
});

export default router;
