import express from 'express';
import { query } from '../db/index.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/skills/:characterId - Get learned skills list
router.get('/:characterId', optionalAuth, async (req, res) => {
    try {
        const { characterId } = req.params;

        const result = await query(
            `SELECT skill_id, learned_at
       FROM learned_skills
       WHERE character_id = $1
       ORDER BY learned_at DESC`,
            [characterId]
        );

        res.json(result.rows.map(row => ({
            skillId: row.skill_id,
            learnedAt: row.learned_at
        })));
    } catch (error) {
        console.error('Error fetching skills:', error);
        res.status(500).json({ error: 'Error fetching skills list' });
    }
});

// POST /api/skills/:characterId/learn - Learn new skill from book
router.post('/:characterId/learn', authMiddleware, async (req, res) => {
    try {
        const { characterId } = req.params;
        const { skillId, bookItemId } = req.body;

        if (!skillId) {
            return res.status(400).json({ error: 'Missing skillId' });
        }

        // Check if skill already learned
        const existingSkill = await query(
            'SELECT * FROM learned_skills WHERE character_id = $1 AND skill_id = $2',
            [characterId, skillId]
        );

        if (existingSkill.rows.length > 0) {
            return res.status(400).json({ error: 'Skill already learned!' });
        }

        // If bookItemId exists, check and remove book from inventory
        if (bookItemId) {
            const bookResult = await query(
                'SELECT quantity FROM inventory WHERE character_id = $1 AND item_id = $2',
                [characterId, bookItemId]
            );

            if (bookResult.rows.length === 0 || bookResult.rows[0].quantity < 1) {
                return res.status(400).json({ error: 'Book not found in inventory!' });
            }

            // Remove book from inventory
            await query(
                'UPDATE inventory SET quantity = quantity - 1 WHERE character_id = $1 AND item_id = $2',
                [characterId, bookItemId]
            );

            await query(
                'DELETE FROM inventory WHERE character_id = $1 AND quantity <= 0',
                [characterId]
            );
        }

        // Add skill to learned_skills
        const result = await query(
            `INSERT INTO learned_skills (character_id, skill_id)
       VALUES ($1, $2)
       RETURNING *`,
            [characterId, skillId]
        );

        res.json({
            message: 'Skill learned successfully!',
            skill: {
                skillId: result.rows[0].skill_id,
                learnedAt: result.rows[0].learned_at
            }
        });
    } catch (error) {
        console.error('Error learning skill:', error);
        res.status(500).json({ error: 'Error learning skill' });
    }
});

export default router;
