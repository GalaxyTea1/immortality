import express from 'express';
import { withTransaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { assertCharacterOwner } from '../middleware/ownership.middleware.js';

const router = express.Router();

// List of items available in shop
// (Can be moved to separate file or database later)
const SHOP_ITEMS = [
    // Pills
    { id: 'tieu_hoan_dan', name: 'Minor Restoration Pill', price: 50, category: 'pill', description: '+30 EXP' },
    { id: 'tu_khi_dan', name: 'Qi Gathering Pill', price: 100, category: 'pill', description: '+80 EXP' },
    { id: 'hoi_phuc_dan', name: 'Recovery Pill', price: 80, category: 'pill', description: '+50 HP' },
    { id: 'tram_tam_dan', name: 'Mind Calming Pill', price: 150, category: 'pill', description: '-15 Inner Demon' },

    // Materials
    { id: 'thao_duoc', name: 'Herbs', price: 20, category: 'material', description: 'Alchemy material' },
    { id: 'hoa_tam', name: 'Fire Core', price: 50, category: 'material', description: 'Alchemy material' },
    { id: 'cuong_hoa_thach', name: 'Enhancement Stone', price: 200, category: 'material', description: 'Equipment enhancement' },

    // Basic Equipment
    { id: 'moc_kiem', name: 'Wooden Sword', price: 500, category: 'equipment', description: '+5 Attack' },
    { id: 'bo_y', name: 'Cloth Armor', price: 300, category: 'equipment', description: '+3 Defense' },
];

const requireOwnedBodyCharacter = async (req, res) => {
    const { characterId } = req.body;
    if (!characterId) {
        res.status(400).json({ error: 'Missing characterId' });
        return false;
    }

    const isOwner = await assertCharacterOwner(req.user.id, characterId);
    if (!isOwner) {
        res.status(403).json({ error: 'Forbidden character access' });
        return false;
    }

    return true;
};

// GET /api/shop/items - Shop item list
router.get('/items', (req, res) => {
    const { category } = req.query;

    let items = SHOP_ITEMS;
    if (category) {
        items = items.filter(item => item.category === category);
    }

    res.json({ items });
});

// POST /api/shop/buy - Buy item
router.post('/buy', authMiddleware, async (req, res) => {
    try {
        const { characterId, itemId, quantity = 1 } = req.body;

        if (!(await requireOwnedBodyCharacter(req, res))) return;

        if (!itemId) {
            return res.status(400).json({ error: 'Missing itemId' });
        }

        if (quantity < 1 || quantity > 99) {
            return res.status(400).json({ error: 'Invalid quantity (1-99)' });
        }

        const shopItem = SHOP_ITEMS.find(item => item.id === itemId);
        if (!shopItem) {
            return res.status(404).json({ error: 'Item not found in shop' });
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
                message: `Successfully purchased ${quantity}x ${shopItem.name}!`,
                itemPurchased: {
                    id: itemId,
                    name: shopItem.name,
                    quantity,
                    totalCost
                }
            };
        });

        res.json(result);
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message, ...error.details });
        }
        console.error('Error buying item:', error);
        res.status(500).json({ error: 'Error buying item' });
    }
});

// POST /api/shop/sell - Sell item
router.post('/sell', authMiddleware, async (req, res) => {
    try {
        const { characterId, itemId, quantity = 1 } = req.body;

        if (!(await requireOwnedBodyCharacter(req, res))) return;

        if (!itemId) {
            return res.status(400).json({ error: 'Missing itemId' });
        }

        if (quantity < 1 || quantity > 99) {
            return res.status(400).json({ error: 'Invalid quantity (1-99)' });
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

            const shopItem = SHOP_ITEMS.find(item => item.id === itemId);
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

        res.json(result);
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('Error selling item:', error);
        res.status(500).json({ error: 'Error selling item' });
    }
});

export default router;
