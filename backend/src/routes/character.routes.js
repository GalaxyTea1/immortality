import express from 'express';
import { query } from '../db/index.js';

const router = express.Router();

// GET /api/characters/:userId - Lấy thông tin nhân vật của user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query(
      'SELECT * FROM characters WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân vật' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin nhân vật' });
  }
});

// POST /api/characters - Tạo nhân vật mới
router.post('/', async (req, res) => {
  try {
    const { userId, name } = req.body;
    
    const result = await query(
      `INSERT INTO characters (user_id, name) 
       VALUES ($1, $2) 
       RETURNING *`,
      [userId, name || 'Đạo Hữu']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ error: 'Lỗi khi tạo nhân vật' });
  }
});

// PUT /api/characters/:id - Cập nhật nhân vật (save game)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
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
      alchemy_exp
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
        alchemy_exp = COALESCE($20, alchemy_exp)
      WHERE id = $21
      RETURNING *`,
      [
        name, realm_index, level, exp, max_exp, spirit_stones,
        hp, max_hp, attack, defense, agility, spirit, cultivation_speed,
        foundation_value, inner_demon_value, reputation_points,
        reputation_level, reputation_title, alchemy_level, alchemy_exp, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân vật' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật nhân vật' });
  }
});

export default router;
