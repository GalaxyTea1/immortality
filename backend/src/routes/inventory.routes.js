import express from 'express';
import { query, withTransaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireCharacterOwner } from '../middleware/ownership.middleware.js';
import { addItemSchema, inventorySyncSchema, removeItemSchema, validate } from '../middleware/validation.js';

const router = express.Router();

router.use('/:characterId', authMiddleware, requireCharacterOwner('characterId'));

// GET /api/inventory/:characterId - Get all inventory
router.get('/:characterId', async (req, res) => {
  try {
    const { characterId } = req.params;

    const result = await query(
      'SELECT * FROM inventory WHERE character_id = $1',
      [characterId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Error fetching inventory' });
  }
});

// POST /api/inventory/:characterId/add - Add item to inventory
router.post('/:characterId/add', validate(addItemSchema), async (req, res) => {
  try {
    const { characterId } = req.params;
    const { itemId, quantity = 1, enhanceLevel = 0 } = req.body;

    const result = await query(
      `INSERT INTO inventory (character_id, item_id, quantity, enhance_level)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (character_id, item_id, enhance_level)
       DO UPDATE SET quantity = inventory.quantity + $3
       RETURNING *`,
      [characterId, itemId, quantity, enhanceLevel]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Error adding item' });
  }
});

// POST /api/inventory/:characterId/remove - Remove/reduce item
router.post('/:characterId/remove', validate(removeItemSchema), async (req, res) => {
  try {
    const { characterId } = req.params;
    const { itemId, quantity = 1, enhanceLevel = 0 } = req.body;

    const result = await withTransaction(async (client) => {
      const current = await client.query(
        'SELECT quantity FROM inventory WHERE character_id = $1 AND item_id = $2 AND enhance_level = $3 FOR UPDATE',
        [characterId, itemId, enhanceLevel]
      );

      if (current.rows.length === 0) {
        const error = new Error('Item not found');
        error.status = 404;
        throw error;
      }

      const currentQty = current.rows[0].quantity;

      if (currentQty < quantity) {
        const error = new Error('Not enough quantity');
        error.status = 400;
        throw error;
      }

      if (currentQty === quantity) {
        await client.query(
          'DELETE FROM inventory WHERE character_id = $1 AND item_id = $2 AND enhance_level = $3',
          [characterId, itemId, enhanceLevel]
        );
        return { message: 'Item removed' };
      }

      const updated = await client.query(
        `UPDATE inventory SET quantity = quantity - $4
         WHERE character_id = $1 AND item_id = $2 AND enhance_level = $3
         RETURNING *`,
        [characterId, itemId, enhanceLevel, quantity]
      );
      return updated.rows[0];
    });

    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error removing item:', error);
    res.status(500).json({ error: 'Error removing item' });
  }
});

// PUT /api/inventory/:characterId/sync - Sync entire inventory (bulk update)
router.put('/:characterId/sync', validate(inventorySyncSchema), async (req, res) => {
  try {
    const { characterId } = req.params;
    const { inventory = [] } = req.body;

    await withTransaction(async (client) => {
      await client.query('DELETE FROM inventory WHERE character_id = $1', [characterId]);

      if (inventory.length > 0) {
        const values = inventory.map((item, i) =>
          `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`
        ).join(', ');

        const params = [characterId];
        inventory.forEach(item => {
          params.push(item.itemId, item.quantity, item.enhanceLevel || 0);
        });

        await client.query(
          `INSERT INTO inventory (character_id, item_id, quantity, enhance_level) VALUES ${values}`,
          params
        );
      }
    });

    res.json({ message: 'Inventory synced', count: inventory.length });
  } catch (error) {
    console.error('Error syncing inventory:', error);
    res.status(500).json({ error: 'Error syncing inventory' });
  }
});

export default router;
