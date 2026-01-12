import express from 'express';
import { query } from '../db/index.js';

const router = express.Router();

// GET /api/inventory/:characterId - Lấy toàn bộ inventory
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
    res.status(500).json({ error: 'Lỗi khi lấy inventory' });
  }
});

// POST /api/inventory/:characterId/add - Thêm item vào inventory
router.post('/:characterId/add', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { itemId, quantity = 1 } = req.body;
    
    // Upsert - thêm mới hoặc cập nhật số lượng
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
    res.status(500).json({ error: 'Lỗi khi thêm vật phẩm' });
  }
});

// POST /api/inventory/:characterId/remove - Xóa/giảm item
router.post('/:characterId/remove', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { itemId, quantity = 1 } = req.body;
    
    // Kiểm tra số lượng hiện tại
    const current = await query(
      'SELECT quantity FROM inventory WHERE character_id = $1 AND item_id = $2',
      [characterId, itemId]
    );
    
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy vật phẩm' });
    }
    
    const currentQty = current.rows[0].quantity;
    
    if (currentQty < quantity) {
      return res.status(400).json({ error: 'Không đủ số lượng' });
    }
    
    if (currentQty === quantity) {
      // Xóa hoàn toàn
      await query(
        'DELETE FROM inventory WHERE character_id = $1 AND item_id = $2',
        [characterId, itemId]
      );
      res.json({ message: 'Đã xóa vật phẩm' });
    } else {
      // Giảm số lượng
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
    res.status(500).json({ error: 'Lỗi khi xóa vật phẩm' });
  }
});

// PUT /api/inventory/:characterId/sync - Đồng bộ toàn bộ inventory (bulk update)
router.put('/:characterId/sync', async (req, res) => {
  try {
    const { characterId } = req.params;
    const { inventory } = req.body; // Array of { itemId, quantity }
    
    // Xóa inventory cũ
    await query('DELETE FROM inventory WHERE character_id = $1', [characterId]);
    
    // Thêm inventory mới
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
    
    res.json({ message: 'Đã đồng bộ inventory', count: inventory?.length || 0 });
  } catch (error) {
    console.error('Error syncing inventory:', error);
    res.status(500).json({ error: 'Lỗi khi đồng bộ inventory' });
  }
});

export default router;
