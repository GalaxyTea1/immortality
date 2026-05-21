import express from 'express';
import { assertEquipmentForSlot, VALID_EQUIPMENT_SLOTS } from '../domain/gameCatalog.js';
import { query, withTransaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireCharacterOwner } from '../middleware/ownership.middleware.js';
import { gameplayLimiter } from '../middleware/rateLimit.js';
import { fail, failFromError, ok } from '../http/response.js';

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

        ok(res, equipment);
    } catch (error) {
        console.error('Error fetching equipment:', error);
        fail(res, 500, 'Error fetching equipment');
    }
});

// POST /api/equipment/:characterId/equip - Equip item
router.post('/:characterId/equip', gameplayLimiter, async (req, res) => {
    try {
        const { characterId } = req.params;
        const { slot, itemId, enhanceLevel = 0 } = req.body;

        if (!slot || !itemId) {
            return fail(res, 400, 'Missing slot or itemId');
        }

        assertEquipmentForSlot({ itemId, slot });

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

        ok(res, result);
    } catch (error) {
        if (error.status) {
            return failFromError(res, error, 'Error equipping item');
        }
        console.error('Error equipping item:', error);
        fail(res, 500, 'Error equipping item');
    }
});

// POST /api/equipment/:characterId/unequip - Unequip item
router.post('/:characterId/unequip', gameplayLimiter, async (req, res) => {
    try {
        const { characterId } = req.params;
        const { slot } = req.body;

        if (!slot) {
            return fail(res, 400, 'Missing slot information');
        }

        if (!VALID_EQUIPMENT_SLOTS.has(slot)) {
            return fail(res, 400, 'Invalid equipment slot');
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

        ok(res, result);
    } catch (error) {
        if (error.status) {
            return failFromError(res, error, 'Error unequipping item');
        }
        console.error('Error unequipping item:', error);
        fail(res, 500, 'Error unequipping item');
    }
});

// POST /api/equipment/:characterId/upgrade - Upgrade equipment
router.post('/:characterId/upgrade', gameplayLimiter, async (req, res) => {
    try {
        const { characterId } = req.params;
        const { slot } = req.body;

        if (!slot) {
            return fail(res, 400, 'Missing slot');
        }

        if (!VALID_EQUIPMENT_SLOTS.has(slot)) {
            return fail(res, 400, 'Invalid equipment slot');
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
            assertEquipmentForSlot({ itemId: equipment.item_id, slot });
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

        ok(res, result);
    } catch (error) {
        if (error.status) {
            return failFromError(res, error, 'Error upgrading equipment');
        }
        console.error('Error upgrading equipment:', error);
        fail(res, 500, 'Error upgrading equipment');
    }
});

export default router;
