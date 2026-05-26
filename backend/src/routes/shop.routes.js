import express from 'express';
import { findShopCatalogItemFromDb, listShopCatalogItemsFromDb } from '../domain/gameCatalog.js';
import { withTransaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { assertCharacterOwner } from '../middleware/ownership.middleware.js';
import { gameplayLimiter } from '../middleware/rateLimit.js';
import { fail, failFromError, ok } from '../http/response.js';

const router = express.Router();
const MAX_BUY_QUANTITY = 999;

const requireOwnedBodyCharacter = async (req, res) => {
    const { characterId } = req.body;
    if (!characterId) {
        fail(res, 400, 'Thiếu nhân vật');
        return false;
    }

    const isOwner = await assertCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
        fail(res, 403, 'Không có quyền truy cập nhân vật này');
        return false;
    }

    return true;
};

// GET /api/shop/items - Shop item list
router.get('/items', async (req, res) => {
    try {
        const { category } = req.query;
        const items = await listShopCatalogItemsFromDb({ category });
        ok(res, { items });
    } catch (error) {
        console.error('Không thể tải cửa hàng:', error);
        fail(res, 500, 'Không thể tải cửa hàng');
    }
});

// POST /api/shop/buy - Buy item
router.post('/buy', authMiddleware, gameplayLimiter, async (req, res) => {
    try {
        const { characterId, itemId, quantity = 1 } = req.body;

        if (!(await requireOwnedBodyCharacter(req, res))) return;

        if (!itemId) {
            return fail(res, 400, 'Thiếu vật phẩm');
        }

        const buyQuantity = Number(quantity);
        if (!Number.isInteger(buyQuantity) || buyQuantity < 1 || buyQuantity > MAX_BUY_QUANTITY) {
            return fail(res, 400, `Số lượng không hợp lệ (1-${MAX_BUY_QUANTITY})`);
        }

        const shopItem = await findShopCatalogItemFromDb(itemId);
        if (!shopItem) {
            return fail(res, 404, 'Không tìm thấy vật phẩm trong cửa hàng');
        }

        const result = await withTransaction(async (client) => {
            const totalCost = shopItem.price * buyQuantity;
            const charResult = await client.query(
                'SELECT spirit_stones FROM characters WHERE id = $1 FOR UPDATE',
                [characterId]
            );

            if (charResult.rows.length === 0) {
                const error = new Error('Không tìm thấy nhân vật');
                error.status = 404;
                throw error;
            }

            if (charResult.rows[0].spirit_stones < totalCost) {
                const error = new Error('Không đủ linh thạch!');
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
                [characterId, itemId, buyQuantity]
            );

            return {
                message: `Mua thành công ${buyQuantity}x ${shopItem.name}!`,
                itemPurchased: {
                    id: itemId,
                    name: shopItem.name,
                    itemId: shopItem.itemId,
                    quantity: buyQuantity,
                    totalCost
                }
            };
        });

        ok(res, result);
    } catch (error) {
        if (error.status) {
            return failFromError(res, error, 'Không thể mua vật phẩm');
        }
        console.error('Không thể mua vật phẩm:', error);
        fail(res, 500, 'Không thể mua vật phẩm');
    }
});

// POST /api/shop/sell - Sell item
router.post('/sell', authMiddleware, gameplayLimiter, async (req, res) => {
    try {
        const { characterId, itemId, quantity = 1 } = req.body;

        if (!(await requireOwnedBodyCharacter(req, res))) return;

        if (!itemId) {
            return fail(res, 400, 'Thiếu vật phẩm');
        }

        if (quantity < 1 || quantity > 99) {
            return fail(res, 400, 'Số lượng không hợp lệ (1-99)');
        }

        const result = await withTransaction(async (client) => {
            const invResult = await client.query(
                `SELECT id, quantity FROM inventory
                 WHERE character_id = $1 AND item_id = $2 AND enhance_level = 0
                 FOR UPDATE`,
                [characterId, itemId]
            );

            if (invResult.rows.length === 0 || invResult.rows[0].quantity < quantity) {
                const error = new Error('Không đủ vật phẩm để bán!');
                error.status = 400;
                throw error;
            }

            const shopItem = await findShopCatalogItemFromDb(itemId, client);
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
                message: `Bán thành công! +${totalEarn} linh thạch`,
                spiritStonesEarned: totalEarn
            };
        });

        ok(res, result);
    } catch (error) {
        if (error.status) {
            return failFromError(res, error, 'Không thể bán vật phẩm');
        }
        console.error('Không thể bán vật phẩm:', error);
        fail(res, 500, 'Không thể bán vật phẩm');
    }
});

export default router;
