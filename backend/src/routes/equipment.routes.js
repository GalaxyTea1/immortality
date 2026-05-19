import express from 'express';
import { query, withTransaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireCharacterOwner } from '../middleware/ownership.middleware.js';

const router = express.Router();

router.use('/:characterId', authMiddleware, requireCharacterOwner('characterId'));

// GET /api/equipment/:characterId - Get equipped items
router.get('/:characterId', async (req, res) => {
    try {
        const { characterId } = req.params;

        const result = await query(
            `SELECT slot, item_id, enhance_level
             FROM equipment
             WHERE character_id = $1`,
            [characterId]
        );

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
router.post('/:characterId/equip', async (req, res) => {
    try {
        const { characterId } = req.params;
        const { slot, itemId, enhanceLevel = 0 } = req.body;

        if (!slot || !itemId) {
            return res.status(400).json({ error: 'Missing slot or itemId' });
        }

        const result = await withTransaction(async (client) => {
            const invItem = await client.query(
                `SELECT quantity FROM inventory
                 WHERE character_id = $1 AND item_id = $2 AND enhance_level = $3
                 FOR UPDATE`,
                [characterId, itemId, enhanceLevel]
            );

            if (invItem.rows.length === 0 || invItem.rows[0].quantity < 1) {
                const error = new Error('Item not found in inventory');
                error.status = 400;
                throw error;
            }

            const existingEquip = await client.query(
                'SELECT * FROM equipment WHERE character_id = $1 AND slot = $2 FOR UPDATE',
                [characterId, slot]
            );

            let oldEquipment = null;
            if (existingEquip.rows.length > 0) {
                oldEquipment = existingEquip.rows[0];
                await client.query(
                    `INSERT INTO inventory (character_id, item_id, quantity, enhance_level)
                     VALUES ($1, $2, 1, $3)
                     ON CONFLICT (character_id, item_id, enhance_level)
                     DO UPDATE SET quantity = inventory.quantity + 1`,
                    [characterId, oldEquipment.item_id, oldEquipment.enhance_level || 0]
                );
            }

            await client.query(
                `UPDATE inventory
                 SET quantity = quantity - 1
                 WHERE character_id = $1 AND item_id = $2 AND enhance_level = $3`,
                [characterId, itemId, enhanceLevel]
            );

            await client.query(
                'DELETE FROM inventory WHERE character_id = $1 AND quantity <= 0',
                [characterId]
            );

            const equipped = await client.query(
                `INSERT INTO equipment (character_id, slot, item_id, enhance_level)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (character_id, slot)
                 DO UPDATE SET item_id = $3, enhance_level = $4
                 RETURNING *`,
                [characterId, slot, itemId, enhanceLevel]
            );

            return {
                message: 'Equipped successfully!',
                equipment: equipped.rows[0],
                oldEquipment: oldEquipment ? {
                    itemId: oldEquipment.item_id,
                    enhanceLevel: oldEquipment.enhance_level
                } : null
            };
        });

        res.json(result);
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Error equipping item:', error);
        res.status(500).json({ error: 'Error equipping item' });
    }
});

// POST /api/equipment/:characterId/unequip - Unequip item
router.post('/:characterId/unequip', async (req, res) => {
    try {
        const { characterId } = req.params;
        const { slot } = req.body;

        if (!slot) {
            return res.status(400).json({ error: 'Missing slot information' });
        }

        const result = await withTransaction(async (client) => {
            const existingEquip = await client.query(
                'SELECT * FROM equipment WHERE character_id = $1 AND slot = $2 FOR UPDATE',
                [characterId, slot]
            );

            if (existingEquip.rows.length === 0) {
                const error = new Error('Slot is empty');
                error.status = 404;
                throw error;
            }

            const equipment = existingEquip.rows[0];
            await client.query(
                `INSERT INTO inventory (character_id, item_id, quantity, enhance_level)
                 VALUES ($1, $2, 1, $3)
                 ON CONFLICT (character_id, item_id, enhance_level)
                 DO UPDATE SET quantity = inventory.quantity + 1`,
                [characterId, equipment.item_id, equipment.enhance_level || 0]
            );

            await client.query(
                'DELETE FROM equipment WHERE character_id = $1 AND slot = $2',
                [characterId, slot]
            );

            return {
                message: 'Unequipped item!',
                unequippedItem: {
                    itemId: equipment.item_id,
                    enhanceLevel: equipment.enhance_level
                }
            };
        });

        res.json(result);
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Error unequipping item:', error);
        res.status(500).json({ error: 'Error unequipping item' });
    }
});

// POST /api/equipment/:characterId/upgrade - Upgrade equipment
router.post('/:characterId/upgrade', async (req, res) => {
    try {
        const { characterId } = req.params;
        const { slot } = req.body;

        if (!slot) {
            return res.status(400).json({ error: 'Missing slot' });
        }

        const result = await withTransaction(async (client) => {
            const equipResult = await client.query(
                'SELECT * FROM equipment WHERE character_id = $1 AND slot = $2 FOR UPDATE',
                [characterId, slot]
            );

            if (equipResult.rows.length === 0) {
                const error = new Error('No equipment in this slot');
                error.status = 404;
                throw error;
            }

            const equipment = equipResult.rows[0];
            const requiredStones = Math.max(1, equipment.enhance_level + 1);

            const stoneResult = await client.query(
                `SELECT quantity FROM inventory
                 WHERE character_id = $1 AND item_id = $2 AND enhance_level = 0
                 FOR UPDATE`,
                [characterId, 'cuong_hoa_thach']
            );

            if (stoneResult.rows.length === 0 || stoneResult.rows[0].quantity < requiredStones) {
                const error = new Error(`Need ${requiredStones}x Enhancement Stones!`);
                error.status = 400;
                error.details = {
                    required: requiredStones,
                    current: stoneResult.rows[0]?.quantity || 0
                };
                throw error;
            }

            const materialResult = await client.query(
                `SELECT id, quantity FROM inventory
                 WHERE character_id = $1 AND item_id = $2 AND quantity > 0
                 ORDER BY enhance_level ASC
                 LIMIT 1
                 FOR UPDATE`,
                [characterId, equipment.item_id]
            );

            if (materialResult.rows.length === 0) {
                const error = new Error('Need 1 duplicate item for enhancement!');
                error.status = 400;
                throw error;
            }

            await client.query(
                `UPDATE inventory
                 SET quantity = quantity - $2
                 WHERE character_id = $1 AND item_id = $3 AND enhance_level = 0`,
                [characterId, requiredStones, 'cuong_hoa_thach']
            );

            await client.query(
                'UPDATE inventory SET quantity = quantity - 1 WHERE id = $1',
                [materialResult.rows[0].id]
            );

            await client.query(
                'DELETE FROM inventory WHERE character_id = $1 AND quantity <= 0',
                [characterId]
            );

            const newLevel = equipment.enhance_level + 1;
            await client.query(
                'UPDATE equipment SET enhance_level = $2 WHERE character_id = $1 AND slot = $3',
                [characterId, newLevel, slot]
            );

            return {
                message: `Upgrade successful! Now +${newLevel}`,
                newEnhanceLevel: newLevel,
                stonesUsed: requiredStones
            };
        });

        res.json(result);
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message, ...error.details });
        }
        console.error('Error upgrading equipment:', error);
        res.status(500).json({ error: 'Error upgrading equipment' });
    }
});

// PUT /api/equipment/:characterId/sync - Sync entire equipment (bulk update)
router.put('/:characterId/sync', async (req, res) => {
    try {
        const { characterId } = req.params;
        const { equipment: equipmentData } = req.body;

        await withTransaction(async (client) => {
            await client.query('DELETE FROM equipment WHERE character_id = $1', [characterId]);

            if (equipmentData && typeof equipmentData === 'object') {
                const entries = Object.entries(equipmentData).filter(([, data]) => data && data.itemId);

                for (const [slot, data] of entries) {
                    await client.query(
                        `INSERT INTO equipment (character_id, slot, item_id, enhance_level)
                         VALUES ($1, $2, $3, $4)`,
                        [characterId, slot, data.itemId, data.enhanceLevel || 0]
                    );
                }
            }
        });

        res.json({ message: 'Equipment synced' });
    } catch (error) {
        console.error('Error syncing equipment:', error);
        res.status(500).json({ error: 'Error syncing equipment' });
    }
});

export default router;
