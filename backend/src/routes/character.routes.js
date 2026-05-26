import express from 'express';
import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../db/index.js';
import { applyHpRegeneration } from '../domain/gameCatalog.js';
import { saveCharacterMetadataSchema, validate } from '../middleware/validation.js';
import { saveLimiter } from '../middleware/rateLimit.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { assertCharacterOwner, requireCharacterOwner } from '../middleware/ownership.middleware.js';
import { JWT_SECRET } from '../config.js';
import { created, fail, ok } from '../http/response.js';

const router = express.Router();

// GET /api/characters/:id - Get character info
router.get('/:id', authMiddleware, requireCharacterOwner('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const character = await withTransaction(async (client) => {
      await applyHpRegeneration(id, client);
      const result = await client.query(
        `SELECT *, exploration_last_reset::text AS exploration_last_reset
         FROM characters
         WHERE id = $1`,
        [id]
      );

      return result.rows[0] || null;
    });

    if (!character) {
      return fail(res, 404, 'Character not found');
    }

    ok(res, character);
  } catch (error) {
    console.error('Error fetching character:', error);
    fail(res, 500, 'Error fetching character info');
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

    created(res, result.rows[0]);
  } catch (error) {
    console.error('Error creating character:', error);
    fail(res, 500, 'Error creating character');
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
      return fail(res, 404, 'Character not found');
    }

    ok(res, result.rows[0]);
  } catch (error) {
    console.error('Error updating character:', error);
    fail(res, 500, 'Error updating character');
  }
});

// POST /api/characters/:id/beacon-save
// Special endpoint for navigator.sendBeacon() on page unload.
router.post('/:id/beacon-save', async (req, res) => {
  try {
    const characterId = req.params.id;
    const { token, name } = req.body;

    if (!token) {
      return fail(res, 401, 'Token required');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return fail(res, 403, 'Invalid token');
    }

    const isOwner = await assertCharacterOwner(decoded.userId, characterId);
    if (!isOwner) {
      return fail(res, 403, 'Forbidden character access');
    }

    if (name !== undefined) {
      const { error } = saveCharacterMetadataSchema.validate({ name });
      if (error) {
        return fail(res, 400, error.details[0].message);
      }

      await query(
        'UPDATE characters SET name = $1, updated_at = NOW() WHERE id = $2',
        [name, characterId]
      );
    }

    ok(res, { saved: true, metadataOnly: true });
  } catch (error) {
    console.error('Beacon save error:', error);
    fail(res, 500, 'Beacon save failed');
  }
});

export default router;
