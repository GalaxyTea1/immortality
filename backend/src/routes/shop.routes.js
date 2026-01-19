import express from 'express';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

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

// GET /api/shop/items - Shop item list
router.get('/items', (req, res) => {
    const { category } = req.query;

    let items = SHOP_ITEMS;
    if (category) {
        items = items.filter(item => item.category === category);
    }

    res.json(items);
});

// POST /api/shop/buy - Buy item
router.post('/buy', authMiddleware, async (req, res) => {
    try {
        const { characterId, itemId, quantity = 1 } = req.body;

        if (!characterId || !itemId) {
            return res.status(400).json({ error: 'Missing characterId or itemId' });
        }

        if (quantity < 1 || quantity > 99) {
            return res.status(400).json({ error: 'Invalid quantity (1-99)' });
        }

        // Find item in shop
        const shopItem = SHOP_ITEMS.find(item => item.id === itemId);
        if (!shopItem) {
            return res.status(404).json({ error: 'Item not found in shop' });
        }

        const totalCost = shopItem.price * quantity;

        // Check Spirit Stones
        const charResult = await query(
            'SELECT spirit_stones FROM characters WHERE id = $1',
            [characterId]
        );

        if (charResult.rows.length === 0) {
            return res.status(404).json({ error: 'Character not found' });
        }

        if (charResult.rows[0].spirit_stones < totalCost) {
            return res.status(400).json({
                error: 'Not enough Spirit Stones!',
                required: totalCost,
                current: charResult.rows[0].spirit_stones
            });
        }

        // Deduct Spirit Stones
        await query(
            'UPDATE characters SET spirit_stones = spirit_stones - $2 WHERE id = $1',
            [characterId, totalCost]
        );

        // Add item to inventory
        await query(
            `INSERT INTO inventory (character_id, item_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (character_id, item_id)
       DO UPDATE SET quantity = inventory.quantity + $3`,
            [characterId, itemId, quantity]
        );

        res.json({
            message: `Successfully purchased ${quantity}x ${shopItem.name}!`,
            itemPurchased: {
                id: itemId,
                name: shopItem.name,
                quantity,
                totalCost
            }
        });
    } catch (error) {
        console.error('Error buying item:', error);
        res.status(500).json({ error: 'Error buying item' });
    }
});

// POST /api/shop/sell - Sell item
router.post('/sell', authMiddleware, async (req, res) => {
    try {
        const { characterId, itemId, quantity = 1 } = req.body;

        if (!characterId || !itemId) {
            return res.status(400).json({ error: 'Missing characterId or itemId' });
        }

        // Check item in inventory
        const invResult = await query(
            'SELECT quantity FROM inventory WHERE character_id = $1 AND item_id = $2',
            [characterId, itemId]
        );

        if (invResult.rows.length === 0 || invResult.rows[0].quantity < quantity) {
            return res.status(400).json({ error: 'Not enough items to sell!' });
        }

        // Find base price (sell back 50%)
        const shopItem = SHOP_ITEMS.find(item => item.id === itemId);
        const sellPrice = shopItem ? Math.floor(shopItem.price * 0.5) : 10; // Default 10 if not in shop
        const totalEarn = sellPrice * quantity;

        // Decrease quantity in inventory
        await query(
            'UPDATE inventory SET quantity = quantity - $3 WHERE character_id = $1 AND item_id = $2',
            [characterId, itemId, quantity]
        );

        // Remove if empty
        await query(
            'DELETE FROM inventory WHERE character_id = $1 AND quantity <= 0',
            [characterId]
        );

        // Add Spirit Stones
        await query(
            'UPDATE characters SET spirit_stones = spirit_stones + $2 WHERE id = $1',
            [characterId, totalEarn]
        );

        res.json({
            message: `Sold successfully! +${totalEarn} Spirit Stones`,
            spiritStonesEarned: totalEarn
        });
    } catch (error) {
        console.error('Error selling item:', error);
        res.status(500).json({ error: 'Error selling item' });
    }
});

export default router;
