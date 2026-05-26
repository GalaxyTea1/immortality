import express from 'express';
import { query, withTransaction } from '../db/index.js';
import { applyHpRegeneration } from '../domain/gameCatalog.js';
import { saveCharacterMetadataSchema, validate } from '../middleware/validation.js';
import { saveLimiter } from '../middleware/rateLimit.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireCharacterOwner } from '../middleware/ownership.middleware.js';
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

export default router;
