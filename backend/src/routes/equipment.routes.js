import express from 'express';
import { query } from '../db/index.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/equipment/:characterId - Get equipped items
router.get('/:characterId', optionalAuth, async (req, res) => {
    try {
        const { characterId } = req.params;

        const result = await query(
            `SELECT e.*, 
              e.slot, 
              e.item_id, 
              e.enhance_level
       FROM equipment e
       WHERE e.character_id = $1`,
            [characterId]
        );

        // Convert to object with slot as key
        const equipment = {};
        result.rows.forEach(row => {
            equipment[row.slot] = {
                itemId: row.item_id,
                enhanceLevel: row.enhance_level
            };
        });

        res.json(equipment);
    } catch (error) {
        console.error('Error fetching equipment:', error);
        res.status(500).json({ error: 'Error fetching equipment' });
    }
});

// POST /api/equipment/:characterId/equip - Equip item
router.post('/:characterId/equip', authMiddleware, async (req, res) => {
    try {
        const { characterId } = req.params;
        const { slot, itemId, enhanceLevel = 0 } = req.body;

        if (!slot || !itemId) {
            return res.status(400).json({ error: 'Missing slot or itemId' });
        }

        // Check if slot has existing equipment
        const existingEquip = await query(
            'SELECT * FROM equipment WHERE character_id = $1 AND slot = $2',
            [characterId, slot]
        );

        let oldEquipment = null;

        if (existingEquip.rows.length > 0) {
            // Save old equipment to return to inventory
            oldEquipment = existingEquip.rows[0];

            // Return old equipment to inventory
            await query(
                `INSERT INTO inventory (character_id, item_id, quantity)
         VALUES ($1, $2, 1)
         ON CONFLICT (character_id, item_id)
         DO UPDATE SET quantity = inventory.quantity + 1`,
                [characterId, oldEquipment.item_id]
            );

            // Remove old equipment
            await query(
                'DELETE FROM equipment WHERE character_id = $1 AND slot = $2',
                [characterId, slot]
            );
        }

        // Remove item from inventory
        await query(
            `UPDATE inventory 
       SET quantity = quantity - 1 
       WHERE character_id = $1 AND item_id = $2 AND quantity > 0`,
            [characterId, itemId]
        );

        // Remove if quantity = 0
        await query(
            'DELETE FROM inventory WHERE character_id = $1 AND quantity <= 0',
            [characterId]
        );

        // Add new equipment
        const result = await query(
            `INSERT INTO equipment (character_id, slot, item_id, enhance_level)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (character_id, slot)
       DO UPDATE SET item_id = $3, enhance_level = $4
       RETURNING *`,
            [characterId, slot, itemId, enhanceLevel]
        );

        res.json({
            message: 'Equipped successfully!',
            equipment: result.rows[0],
            oldEquipment: oldEquipment ? {
                itemId: oldEquipment.item_id,
                enhanceLevel: oldEquipment.enhance_level
            } : null
        });
    } catch (error) {
        console.error('Error equipping item:', error);
        res.status(500).json({ error: 'Error equipping item' });
    }
});

// POST /api/equipment/:characterId/unequip - Unequip item
router.post('/:characterId/unequip', authMiddleware, async (req, res) => {
    try {
        const { characterId } = req.params;
        const { slot } = req.body;

        if (!slot) {
            return res.status(400).json({ error: 'Missing slot information' });
        }

        // Get current equipment
        const existingEquip = await query(
            'SELECT * FROM equipment WHERE character_id = $1 AND slot = $2',
            [characterId, slot]
        );

        if (existingEquip.rows.length === 0) {
            return res.status(404).json({ error: 'Slot is empty' });
        }

        const equipment = existingEquip.rows[0];

        // Return item to inventory
        await query(
            `INSERT INTO inventory (character_id, item_id, quantity)
       VALUES ($1, $2, 1)
       ON CONFLICT (character_id, item_id)
       DO UPDATE SET quantity = inventory.quantity + 1`,
            [characterId, equipment.item_id]
        );

        // Remove equipment
        await query(
            'DELETE FROM equipment WHERE character_id = $1 AND slot = $2',
            [characterId, slot]
        );

        res.json({
            message: 'Unequipped item!',
            unequippedItem: {
                itemId: equipment.item_id,
                enhanceLevel: equipment.enhance_level
            }
        });
    } catch (error) {
        console.error('Error unequipping item:', error);
        res.status(500).json({ error: 'Error unequipping item' });
    }
});

// POST /api/equipment/:characterId/upgrade - Upgrade equipment
router.post('/:characterId/upgrade', authMiddleware, async (req, res) => {
    try {
        const { characterId } = req.params;
        const { slot } = req.body;

        if (!slot) {
            return res.status(400).json({ error: 'Missing slot' });
        }

        // Get current equipment
        const equipResult = await query(
            'SELECT * FROM equipment WHERE character_id = $1 AND slot = $2',
            [characterId, slot]
        );

        if (equipResult.rows.length === 0) {
            return res.status(404).json({ error: 'No equipment in this slot' });
        }

        const equipment = equipResult.rows[0];
        const requiredStones = Math.max(1, equipment.enhance_level + 1);

        // Check enhancement stones
        const stoneResult = await query(
            'SELECT quantity FROM inventory WHERE character_id = $1 AND item_id = $2',
            [characterId, 'cuong_hoa_thach']
        );

        if (stoneResult.rows.length === 0 || stoneResult.rows[0].quantity < requiredStones) {
            return res.status(400).json({
                error: `Need ${requiredStones}x Enhancement Stones!`,
                required: requiredStones,
                current: stoneResult.rows[0]?.quantity || 0
            });
        }

        // Check for duplicate item as material
        const materialResult = await query(
            'SELECT quantity FROM inventory WHERE character_id = $1 AND item_id = $2 AND quantity > 0',
            [characterId, equipment.item_id]
        );

        if (materialResult.rows.length === 0) {
            return res.status(400).json({
                error: 'Need 1 duplicate item for enhancement!'
            });
        }

        // Deduct enhancement stones
        await query(
            'UPDATE inventory SET quantity = quantity - $2 WHERE character_id = $1 AND item_id = $3',
            [characterId, requiredStones, 'cuong_hoa_thach']
        );

        // Deduct material item
        await query(
            'UPDATE inventory SET quantity = quantity - 1 WHERE character_id = $1 AND item_id = $2',
            [characterId, equipment.item_id]
        );

        // Remove items with quantity <= 0
        await query(
            'DELETE FROM inventory WHERE character_id = $1 AND quantity <= 0',
            [characterId]
        );

        // Increase enhance level
        const newLevel = equipment.enhance_level + 1;
        await query(
            'UPDATE equipment SET enhance_level = $2 WHERE character_id = $1 AND slot = $3',
            [characterId, newLevel, slot]
        );

        res.json({
            message: `Upgrade successful! Now +${newLevel}`,
            newEnhanceLevel: newLevel,
            stonesUsed: requiredStones
        });
    } catch (error) {
        console.error('Error upgrading equipment:', error);
        res.status(500).json({ error: 'Error upgrading equipment' });
    }
});

export default router;
