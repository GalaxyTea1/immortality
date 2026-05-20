import express from 'express';
import {
  assertValidInventoryEntry,
  buildStatIncrementFragments,
  calculateExpProgress,
} from '../domain/gameCatalog.js';
import { query, withTransaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireCharacterOwner } from '../middleware/ownership.middleware.js';
import { addItemSchema, inventorySyncSchema, removeItemSchema, useItemSchema, validate } from '../middleware/validation.js';

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
    assertValidInventoryEntry({ itemId, enhanceLevel });

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
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Error adding item' });
  }
});

// POST /api/inventory/:characterId/remove - Remove/reduce item
router.post('/:characterId/remove', validate(removeItemSchema), async (req, res) => {
  try {
    const { characterId } = req.params;
    const { itemId, quantity = 1, enhanceLevel = 0 } = req.body;
    assertValidInventoryEntry({ itemId, enhanceLevel });

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
    inventory.forEach(assertValidInventoryEntry);

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
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error syncing inventory:', error);
    res.status(500).json({ error: 'Error syncing inventory' });
  }
});

// POST /api/inventory/:characterId/use - Use pill/book item with server authority
router.post('/:characterId/use', validate(useItemSchema), async (req, res) => {
  try {
    const { characterId } = req.params;
    const { itemId, quantity = 1, enhanceLevel = 0 } = req.body;
    const itemDef = assertValidInventoryEntry({ itemId, enhanceLevel });

    if (!['pill', 'book'].includes(itemDef.type)) {
      return res.status(400).json({ error: 'Item cannot be used directly' });
    }

    if (itemDef.type === 'book' && quantity !== 1) {
      return res.status(400).json({ error: 'Books can only be used one at a time' });
    }

    const result = await withTransaction(async (client) => {
      const inventoryResult = await client.query(
        `SELECT id, quantity FROM inventory
         WHERE character_id = $1 AND item_id = $2 AND enhance_level = $3
         FOR UPDATE`,
        [characterId, itemId, enhanceLevel]
      );

      if (inventoryResult.rows.length === 0 || inventoryResult.rows[0].quantity < quantity) {
        const error = new Error('Not enough items in inventory');
        error.status = 400;
        throw error;
      }

      if (itemDef.type === 'book') {
        const existingSkill = await client.query(
          'SELECT id FROM learned_skills WHERE character_id = $1 AND skill_id = $2',
          [characterId, itemId]
        );

        if (existingSkill.rows.length > 0) {
          const error = new Error('Skill already learned');
          error.status = 400;
          throw error;
        }
      }

      await client.query(
        'UPDATE inventory SET quantity = quantity - $2 WHERE id = $1',
        [inventoryResult.rows[0].id, itemDef.type === 'book' ? 1 : quantity]
      );

      await client.query(
        'DELETE FROM inventory WHERE character_id = $1 AND quantity <= 0',
        [characterId]
      );

      if (itemDef.type === 'pill') {
        const characterResult = await client.query(
          `SELECT realm_index, level, exp, max_exp, hp, max_hp, inner_demon_value
           FROM characters
           WHERE id = $1
           FOR UPDATE`,
          [characterId]
        );

        if (characterResult.rows.length === 0) {
          const error = new Error('Character not found');
          error.status = 404;
          throw error;
        }

        const character = characterResult.rows[0];
        const effect = itemDef.effect || {};
        const messages = [];

        if (effect.type === 'exp' || effect.exp) {
          const expGain = (effect.value || effect.exp) * quantity;
          const nextProgress = calculateExpProgress({
            realmIndex: character.realm_index,
            level: character.level,
            exp: character.exp,
            maxExp: character.max_exp,
          }, expGain);

          await client.query(
            `UPDATE characters
             SET exp = $2, level = $3, max_exp = $4
             WHERE id = $1`,
            [characterId, nextProgress.exp, nextProgress.level, nextProgress.maxExp]
          );
          messages.push(`+${expGain} EXP`);
        }

        if (effect.type === 'heal' || effect.hp) {
          const hpGain = (effect.value || effect.hp) * quantity;
          await client.query(
            'UPDATE characters SET hp = LEAST(max_hp, hp + $2) WHERE id = $1',
            [characterId, hpGain]
          );
          messages.push(`+${hpGain} HP`);
        }

        if (effect.type === 'suppress_demon') {
          const demonReduction = effect.value * quantity;
          await client.query(
            'UPDATE characters SET inner_demon_value = GREATEST(0, inner_demon_value - $2) WHERE id = $1',
            [characterId, demonReduction]
          );
          messages.push(`-${demonReduction} Inner Demon`);
        }

        return {
          message: `Used ${quantity}x ${itemDef.name}: ${messages.join(', ')}`,
          itemId,
          quantityUsed: quantity,
        };
      }

      const { fragments, values } = buildStatIncrementFragments(itemDef.effect);
      if (fragments.length > 0) {
        await client.query(
          `UPDATE characters SET ${fragments.join(', ')} WHERE id = $1`,
          [characterId, ...values]
        );
      }

      const skillResult = await client.query(
        `INSERT INTO learned_skills (character_id, skill_id)
         VALUES ($1, $2)
         RETURNING skill_id, learned_at`,
        [characterId, itemId]
      );

      return {
        message: `Learned ${itemDef.name}`,
        skill: {
          skillId: skillResult.rows[0].skill_id,
          learnedAt: skillResult.rows[0].learned_at,
        },
      };
    });

    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error using item:', error);
    res.status(500).json({ error: 'Error using item' });
  }
});

export default router;
