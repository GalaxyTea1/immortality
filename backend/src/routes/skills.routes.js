import express from 'express';
import { assertKnownItemFromDb, buildStatIncrementFragments } from '../domain/gameCatalog.js';
import { query, withTransaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireCharacterOwner } from '../middleware/ownership.middleware.js';
import { gameplayLimiter } from '../middleware/rateLimit.js';
import { fail, failFromError, ok } from '../http/response.js';

const router = express.Router();

router.use('/:characterId', authMiddleware, requireCharacterOwner('characterId'));

// GET /api/skills/:characterId - Get learned skills list
router.get('/:characterId', async (req, res) => {
    try {
        const { characterId } = req.params;

        const result = await query(
            `SELECT skill_id, learned_at
       FROM learned_skills
       WHERE character_id = $1
       ORDER BY learned_at DESC`,
            [characterId]
        );

        ok(res, result.rows.map(row => ({
            skillId: row.skill_id,
            learnedAt: row.learned_at
        })));
    } catch (error) {
        console.error('Error fetching skills:', error);
        fail(res, 500, 'Error fetching skills list');
    }
});

// POST /api/skills/:characterId/learn - Learn new skill from book
router.post('/:characterId/learn', gameplayLimiter, async (req, res) => {
    try {
        const { characterId } = req.params;
        const { skillId, bookItemId } = req.body;

        if (!skillId || !bookItemId) {
            return fail(res, 400, 'Missing skillId or bookItemId');
        }

        const bookDef = await assertKnownItemFromDb(bookItemId);
        if (bookDef.type !== 'book' || skillId !== bookItemId) {
            return fail(res, 400, 'Invalid skill book');
        }

        const result = await withTransaction(async (client) => {
            const existingSkill = await client.query(
                'SELECT * FROM learned_skills WHERE character_id = $1 AND skill_id = $2',
                [characterId, skillId]
            );

            if (existingSkill.rows.length > 0) {
                const error = new Error('Skill already learned!');
                error.status = 400;
                throw error;
            }

            const bookResult = await client.query(
                `SELECT id, quantity FROM inventory
                 WHERE character_id = $1 AND item_id = $2 AND enhance_level = 0
                 FOR UPDATE`,
                [characterId, bookItemId]
            );

            if (bookResult.rows.length === 0 || bookResult.rows[0].quantity < 1) {
                const error = new Error('Book not found in inventory!');
                error.status = 400;
                throw error;
            }

            await client.query(
                'UPDATE inventory SET quantity = quantity - 1 WHERE id = $1',
                [bookResult.rows[0].id]
            );

            await client.query(
                'DELETE FROM inventory WHERE character_id = $1 AND quantity <= 0',
                [characterId]
            );

            const { fragments, values } = buildStatIncrementFragments(bookDef.effect);
            if (fragments.length > 0) {
                await client.query(
                    `UPDATE characters SET ${fragments.join(', ')} WHERE id = $1`,
                    [characterId, ...values]
                );
            }

            return client.query(
                `INSERT INTO learned_skills (character_id, skill_id)
                 VALUES ($1, $2)
                 RETURNING *`,
                [characterId, skillId]
            );
        });

        ok(res, {
            message: 'Skill learned successfully!',
            skill: {
                skillId: result.rows[0].skill_id,
                learnedAt: result.rows[0].learned_at
            }
        });
    } catch (error) {
        if (error.status) {
            return failFromError(res, error, 'Error learning skill');
        }
        console.error('Error learning skill:', error);
        fail(res, 500, 'Error learning skill');
    }
});

export default router;
