import express from 'express';
import { SHOP_CATALOG, findShopCatalogItem } from '../../../shared/shopCatalog.js';
import { withTransaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { assertCharacterOwner } from '../middleware/ownership.middleware.js';
import { fail, failFromError, ok } from '../http/response.js';

const router = express.Router();

const requireOwnedBodyCharacter = async (req, res) => {
    const { characterId } = req.body;
    if (!characterId) {
        fail(res, 400, 'Missing characterId');
        return false;
    }

    const isOwner = await assertCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
        fail(res, 403, 'Forbidden character access');
        return false;
    }

    return true;
};

// GET /api/shop/items - Shop item list
router.get('/items', (req, res) => {
    const { category } = req.query;

    let items = SHOP_CATALOG.map((item) => ({
        ...item,
        id: item.itemId,
        name: item.itemId,
        description: '',
    }));

    if (category) {
        items = items.filter(item => item.category === category);
    }

    ok(res, { items });
});

// POST /api/shop/buy - Buy item
router.post('/buy', authMiddleware, async (req, res) => {
    try {
        const { characterId, itemId, quantity = 1 } = req.body;

        if (!(await requireOwnedBodyCharacter(req, res))) return;

        if (!itemId) {
            return fail(res, 400, 'Missing itemId');
        }

        if (quantity < 1 || quantity > 99) {
            return fail(res, 400, 'Invalid quantity (1-99)');
        }

        const shopItem = findShopCatalogItem(itemId);
        if (!shopItem) {
            return fail(res, 404, 'Item not found in shop');
        }

        const result = await withTransaction(async (client) => {
            const totalCost = shopItem.price * quantity;
            const charResult = await client.query(
                'SELECT spirit_stones FROM characters WHERE id = $1 FOR UPDATE',
                [characterId]
            );

            if (charResult.rows.length === 0) {
                const error = new Error('Character not found');
                error.status = 404;
                throw error;
            }

            if (charResult.rows[0].spirit_stones < totalCost) {
                const error = new Error('Not enough Spirit Stones!');
                error.status = 400;
                error.details = {
                    required: totalCost,
                    current: charResult.rows[0].spirit_stones
                };
                throw error;
            }

            await client.query(
                'UPDATE characters SET spirit_stones = spirit_stones - $2 WHERE id = $1',
                [characterId, totalCost]
            );

            await client.query(
                `INSERT INTO inventory (character_id, item_id, quantity, enhance_level)
                 VALUES ($1, $2, $3, 0)
                 ON CONFLICT (character_id, item_id, enhance_level)
                 DO UPDATE SET quantity = inventory.quantity + $3`,
                [characterId, itemId, quantity]
            );

            return {
                message: `Successfully purchased ${quantity}x ${shopItem.itemId}!`,
                itemPurchased: {
                    id: itemId,
                    name: shopItem.itemId,
                    itemId: shopItem.itemId,
                    quantity,
                    totalCost
                }
            };
        });

        ok(res, result);
    } catch (error) {
        if (error.status) {
            return failFromError(res, error, 'Error buying item');
        }
        console.error('Error buying item:', error);
        fail(res, 500, 'Error buying item');
    }
});

// POST /api/shop/sell - Sell item
router.post('/sell', authMiddleware, async (req, res) => {
    try {
        const { characterId, itemId, quantity = 1 } = req.body;

        if (!(await requireOwnedBodyCharacter(req, res))) return;

        if (!itemId) {
            return fail(res, 400, 'Missing itemId');
        }

        if (quantity < 1 || quantity > 99) {
            return fail(res, 400, 'Invalid quantity (1-99)');
        }

        const result = await withTransaction(async (client) => {
            const invResult = await client.query(
                `SELECT id, quantity FROM inventory
                 WHERE character_id = $1 AND item_id = $2 AND enhance_level = 0
                 FOR UPDATE`,
                [characterId, itemId]
            );

            if (invResult.rows.length === 0 || invResult.rows[0].quantity < quantity) {
                const error = new Error('Not enough items to sell!');
                error.status = 400;
                throw error;
            }

            const shopItem = findShopCatalogItem(itemId);
            const sellPrice = shopItem ? Math.floor(shopItem.price * 0.5) : 10;
            const totalEarn = sellPrice * quantity;

            await client.query(
                'UPDATE inventory SET quantity = quantity - $2 WHERE id = $1',
                [invResult.rows[0].id, quantity]
            );

            await client.query(
                'DELETE FROM inventory WHERE character_id = $1 AND quantity <= 0',
                [characterId]
            );

            await client.query(
                'UPDATE characters SET spirit_stones = spirit_stones + $2 WHERE id = $1',
                [characterId, totalEarn]
            );

            return {
                message: `Sold successfully! +${totalEarn} Spirit Stones`,
                spiritStonesEarned: totalEarn
            };
        });

        ok(res, result);
    } catch (error) {
        if (error.status) {
            return failFromError(res, error, 'Error selling item');
        }
        console.error('Error selling item:', error);
        fail(res, 500, 'Error selling item');
    }
});

export default router;
