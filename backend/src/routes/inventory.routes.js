import express from 'express';
import { query } from '../db/index.js';

const router = express.Router();

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
router.post('/:characterId/add', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { itemId, quantity = 1 } = req.body;

    // Upsert - add new or update quantity
    const result = await query(
      `INSERT INTO inventory (character_id, item_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (character_id, item_id)
       DO UPDATE SET quantity = inventory.quantity + $3
       RETURNING *`,
      [characterId, itemId, quantity]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Error adding item' });
  }
});

// POST /api/inventory/:characterId/remove - Remove/reduce item
router.post('/:characterId/remove', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { itemId, quantity = 1 } = req.body;

    // Check current quantity
    const current = await query(
      'SELECT quantity FROM inventory WHERE character_id = $1 AND item_id = $2',
      [characterId, itemId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const currentQty = current.rows[0].quantity;

    if (currentQty < quantity) {
      return res.status(400).json({ error: 'Not enough quantity' });
    }

    if (currentQty === quantity) {
      // Remove completely
      await query(
        'DELETE FROM inventory WHERE character_id = $1 AND item_id = $2',
        [characterId, itemId]
      );
      res.json({ message: 'Item removed' });
    } else {
      // Reduce quantity
      const result = await query(
        `UPDATE inventory SET quantity = quantity - $3
         WHERE character_id = $1 AND item_id = $2
         RETURNING *`,
        [characterId, itemId, quantity]
      );
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ error: 'Error removing item' });
  }
});

// PUT /api/inventory/:characterId/sync - Sync entire inventory (bulk update)
router.put('/:characterId/sync', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { inventory } = req.body; // Array of { itemId, quantity }

    // Clear old inventory
    await query('DELETE FROM inventory WHERE character_id = $1', [characterId]);

    // Add new inventory
    if (inventory && inventory.length > 0) {
      const values = inventory.map((item, i) =>
        `($1, $${i * 2 + 2}, $${i * 2 + 3})`
      ).join(', ');

      const params = [characterId];
      inventory.forEach(item => {
        params.push(item.itemId, item.quantity);
      });

      await query(
        `INSERT INTO inventory (character_id, item_id, quantity) VALUES ${values}`,
        params
      );
    }

    res.json({ message: 'Inventory synced', count: inventory?.length || 0 });
  } catch (error) {
    console.error('Error syncing inventory:', error);
    res.status(500).json({ error: 'Error syncing inventory' });
  }
});

export default router;
