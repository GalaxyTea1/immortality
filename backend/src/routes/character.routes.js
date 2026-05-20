import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { saveCharacterMetadataSchema, validate } from '../middleware/validation.js';
import { saveLimiter } from '../middleware/rateLimit.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { assertCharacterOwner, requireCharacterOwner } from '../middleware/ownership.middleware.js';
import { JWT_SECRET } from '../config.js';

const router = express.Router();

// GET /api/characters/:id - Get character info
router.get('/:id', authMiddleware, requireCharacterOwner('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM characters WHERE id = $1',
      [id]
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
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    const result = await query(
      `INSERT INTO characters (user_id, name)
       VALUES ($1, $2)
       RETURNING *`,
      [req.user.id, name || 'Daoist']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ error: 'Error creating character' });
  }
});

// PUT /api/characters/:id - Save safe character metadata
router.put('/:id', authMiddleware, requireCharacterOwner('id'), saveLimiter, validate(saveCharacterMetadataSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const result = await query(
      `UPDATE characters SET
        name = COALESCE($1, name),
        updated_at = NOW()
      WHERE id = $2
      RETURNING *`,
      [name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ error: 'Error updating character' });
  }
});

// POST /api/characters/:id/beacon-save
// Special endpoint for navigator.sendBeacon() on page unload.
router.post('/:id/beacon-save', async (req, res) => {
  try {
    const characterId = req.params.id;
    const { token, name } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const isOwner = await assertCharacterOwner(decoded.userId, characterId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden character access' });
    }

    if (name !== undefined) {
      const { error } = saveCharacterMetadataSchema.validate({ name });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await query(
        'UPDATE characters SET name = $1, updated_at = NOW() WHERE id = $2',
        [name, characterId]
      );
    }

    res.json({ saved: true, metadataOnly: true });
  } catch (error) {
    console.error('Beacon save error:', error);
    res.status(500).json({ error: 'Beacon save failed' });
  }
});

export default router;
