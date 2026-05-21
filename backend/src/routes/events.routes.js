import express from 'express';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireCharacterOwner } from '../middleware/ownership.middleware.js';
import { created, fail, ok } from '../http/response.js';

const router = express.Router();

router.use('/:characterId', authMiddleware, requireCharacterOwner('characterId'));

// GET /api/events/:characterId - Get event logs
router.get('/:characterId', async (req, res) => {
    try {
        const { characterId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const result = await query(
            `SELECT id, event_type, message, created_at
       FROM event_logs
       WHERE character_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
            [characterId, parseInt(limit), parseInt(offset)]
        );

        const events = result.rows.map(row => ({
            id: row.id,
            type: row.event_type,
            message: row.message,
            time: row.created_at
        }));

        ok(res, { events });
    } catch (error) {
        console.error('Error fetching events:', error);
        fail(res, 500, 'Error fetching event logs');
    }
});

// POST /api/events/:characterId - Add event log
router.post('/:characterId', async (req, res) => {
    try {
        const { characterId } = req.params;
        const { type: bodyType, eventType, message } = req.body;
        const type = bodyType || eventType;

        if (!type || !message) {
            return fail(res, 400, 'Missing type or message');
        }

        const validTypes = ['info', 'warning', 'success', 'danger', 'quest', 'heal'];
        if (!validTypes.includes(type)) {
            return fail(res, 400, 'Invalid type', { validTypes });
        }

        const result = await query(
            `INSERT INTO event_logs (character_id, event_type, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [characterId, type, message]
        );

        created(res, {
            id: result.rows[0].id,
            type: result.rows[0].event_type,
            message: result.rows[0].message,
            time: result.rows[0].created_at
        });
    } catch (error) {
        console.error('Error adding event:', error);
        fail(res, 500, 'Error adding event');
    }
});

// DELETE /api/events/:characterId/clear - Clear old logs (keep latest 100)
router.delete('/:characterId/clear', async (req, res) => {
    try {
        const { characterId } = req.params;

        // Delete all except latest 100 events
        await query(
            `DELETE FROM event_logs
       WHERE character_id = $1
       AND id NOT IN (
         SELECT id FROM event_logs 
         WHERE character_id = $1 
         ORDER BY created_at DESC 
         LIMIT 100
       )`,
            [characterId]
        );

        ok(res, { message: 'Event logs cleared' });
    } catch (error) {
        console.error('Error clearing events:', error);
        fail(res, 500, 'Error clearing logs');
    }
});

export default router;
