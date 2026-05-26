import express from 'express';
import {
  applyHpRegeneration,
  assertValidInventoryEntryFromDb,
  buildStatIncrementFragments,
  calculateExpProgress,
} from '../domain/gameCatalog.js';
import { query, withTransaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireCharacterOwner } from '../middleware/ownership.middleware.js';
import { gameplayLimiter } from '../middleware/rateLimit.js';
import { removeItemSchema, useItemSchema, validate } from '../middleware/validation.js';
import { fail, failFromError, ok } from '../http/response.js';

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

    ok(res, result.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    fail(res, 500, 'Error fetching inventory');
  }
});

// POST /api/inventory/:characterId/remove - Remove/reduce item
router.post('/:characterId/remove', gameplayLimiter, validate(removeItemSchema), async (req, res) => {
  try {
    const { characterId } = req.params;
    const { itemId, quantity = 1, enhanceLevel = 0 } = req.body;
    await assertValidInventoryEntryFromDb({ itemId, enhanceLevel });

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

    ok(res, result);
  } catch (error) {
    if (error.status) {
      return failFromError(res, error, 'Error removing item');
    }
    console.error('Error removing item:', error);
    fail(res, 500, 'Error removing item');
  }
});

// POST /api/inventory/:characterId/use - Use pill/book item with server authority
router.post('/:characterId/use', gameplayLimiter, validate(useItemSchema), async (req, res) => {
  try {
    const { characterId } = req.params;
    const { itemId, quantity = 1, enhanceLevel = 0 } = req.body;
    const itemDef = await assertValidInventoryEntryFromDb({ itemId, enhanceLevel });

    if (!['pill', 'book'].includes(itemDef.type)) {
      return fail(res, 400, 'Item cannot be used directly');
    }

    if (itemDef.type === 'book' && quantity !== 1) {
      return fail(res, 400, 'Books can only be used one at a time');
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
        await applyHpRegeneration(characterId, client);
        const characterResult = await client.query(
          `WITH equipment_bonus AS (
             SELECT
               e.character_id,
               COALESCE(SUM(COALESCE((i.effect->>'maxHp')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_max_hp
             FROM equipment e
             JOIN item_definitions i ON i.item_id = e.item_id
             WHERE e.character_id = $1
             GROUP BY e.character_id
           )
           SELECT
             c.realm_index,
             c.level,
             c.exp,
             c.max_exp,
             c.hp,
             c.max_hp,
             (COALESCE(c.max_hp, 1) + COALESCE(eb.bonus_max_hp, 0))::integer AS effective_max_hp,
             c.inner_demon_value
           FROM characters c
           LEFT JOIN equipment_bonus eb ON eb.character_id = c.id
           WHERE c.id = $1
           FOR UPDATE OF c`,
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
            `UPDATE characters
             SET hp = LEAST($3, hp + $2),
                 last_hp_regen_at = NOW()
             WHERE id = $1`,
            [characterId, hpGain, character.effective_max_hp]
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

    ok(res, result);
  } catch (error) {
    if (error.status) {
      return failFromError(res, error, 'Error using item');
    }
    console.error('Error using item:', error);
    fail(res, 500, 'Error using item');
  }
});

export default router;
