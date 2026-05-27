import express from 'express';
import {
  applyCharacterStatGain,
  assertValidInventoryEntryFromDb,
  applyHpRegeneration,
  calculateExpProgress,
  calculateLevelStatGain,
  calculateZoneRewards,
  canEnterZone,
  REALMS,
  WORLD_ZONES,
} from '../domain/gameCatalog.js';
import { withTransaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireCharacterOwner } from '../middleware/ownership.middleware.js';
import { gameplayLimiter } from '../middleware/rateLimit.js';
import { exploreSchema, validate } from '../middleware/validation.js';
import { fail, failFromError, ok } from '../http/response.js';
import { trackQuestProgress } from '../services/questTracker.js';

const router = express.Router();

router.use('/:characterId', authMiddleware, requireCharacterOwner('characterId'));

router.post('/:characterId/explore', gameplayLimiter, validate(exploreSchema), async (req, res) => {
  try {
    const { characterId } = req.params;
    const { zoneId } = req.body;
    const zone = WORLD_ZONES[zoneId];

    if (!zone) {
      return fail(res, 404, 'Không tìm thấy khu vực');
    }

    const result = await withTransaction(async (client) => {
      const characterResult = await client.query(
        `SELECT id FROM characters WHERE id = $1 FOR UPDATE`,
        [characterId]
      );

      if (characterResult.rows.length === 0) {
        const error = new Error('Không tìm thấy nhân vật');
        error.status = 404;
        throw error;
      }

      await applyHpRegeneration(characterId, client);

      const refreshedCharacterResult = await client.query(
        `SELECT realm_index, level, exp, max_exp, hp, max_hp,
                spirit_stones, exploration_count,
                exploration_last_reset::text AS exploration_last_reset,
                CURRENT_DATE::text AS current_date
         FROM characters
         WHERE id = $1`,
        [characterId]
      );

      const character = refreshedCharacterResult.rows[0];
      const today = character.current_date;
      const resetDate = character.exploration_last_reset || today;
      const currentCount = resetDate === today ? Number(character.exploration_count) : 0;
      const currentHp = Number(character.hp) || 0;
      const explorationHpCost = 1;

      if (currentHp <= explorationHpCost) {
        const error = new Error('Không đủ HP để thám hiểm');
        error.status = 400;
        error.details = { requiredHp: explorationHpCost + 1, currentHp };
        throw error;
      }

      if (currentCount >= 10) {
        const error = new Error('Đã hết lượt thám hiểm hôm nay');
        error.status = 400;
        throw error;
      }

      if (!canEnterZone(zone, character.realm_index, character.level)) {
        const error = new Error(`Cần ${REALMS[zone.minRealm].name} tầng ${zone.minLevel}`);
        error.status = 400;
        throw error;
      }

      const baseRewards = calculateZoneRewards(zone, character.realm_index, character.level);
      const rewards = { exp: 0, spiritStones: 0, items: [] };
      const isSafe = Math.random() > zone.encounterChance;
      let hpLoss = explorationHpCost;

      if (isSafe) {
        rewards.exp = baseRewards.exp + Math.floor(Math.random() * baseRewards.exp * 0.5);
        rewards.spiritStones = baseRewards.spiritStones + Math.floor(Math.random() * baseRewards.spiritStones * 0.3);

        for (const drop of zone.drops) {
          if (Math.random() < drop.chance) {
            const quantity = Math.floor(Math.random() * (drop.maxQty - drop.minQty + 1)) + drop.minQty;
            await assertValidInventoryEntryFromDb({ itemId: drop.itemId }, client);
            rewards.items.push({ itemId: drop.itemId, quantity });
          }
        }
      } else {
        hpLoss = zone.encounterDamage || 10;
        rewards.exp = Math.floor(baseRewards.exp * 0.3);
      }

      const hpAfterDamage = Math.max(1, currentHp - hpLoss);
      const actualHpLoss = currentHp - hpAfterDamage;

      const nextProgress = calculateExpProgress({
        realmIndex: character.realm_index,
        level: character.level,
        exp: character.exp,
        maxExp: character.max_exp,
      }, rewards.exp);
      const statGain = calculateLevelStatGain({
        realmIndex: character.realm_index,
        fromLevel: character.level,
        toLevel: nextProgress.level,
      });

      await client.query(
        `UPDATE characters
         SET exp = $2, level = $3, max_exp = $4,
             spirit_stones = spirit_stones + $5,
             hp = GREATEST(1, hp - $6),
             last_hp_regen_at = NOW(),
             exploration_count = $7,
             exploration_last_reset = CURRENT_DATE
         WHERE id = $1`,
        [
          characterId,
          nextProgress.exp,
          nextProgress.level,
          nextProgress.maxExp,
          rewards.spiritStones,
          hpLoss,
          currentCount + 1,
        ]
      );
      await applyCharacterStatGain(characterId, statGain, client);

      for (const item of rewards.items) {
        await client.query(
          `INSERT INTO inventory (character_id, item_id, quantity, enhance_level)
           VALUES ($1, $2, $3, 0)
           ON CONFLICT (character_id, item_id, enhance_level)
           DO UPDATE SET quantity = inventory.quantity + $3`,
          [characterId, item.itemId, item.quantity]
        );
      }

      const message = isSafe
        ? `Khám phá ${zone.name}: -${actualHpLoss} HP, +${rewards.exp} EXP, +${rewards.spiritStones} linh thạch`
        : `Gặp nguy hiểm ${zone.name}: chịu ${hpLoss} sát thương, còn ${hpAfterDamage} HP, +${rewards.exp} EXP`;

      await client.query(
        `INSERT INTO event_logs (character_id, event_type, message)
         VALUES ($1, $2, $3)`,
        [characterId, isSafe ? 'success' : 'danger', message]
      );

      const questUpdate = await trackQuestProgress(characterId, 'explore', client);

      return {
        success: true,
        message,
        rewards,
        statGain,
        hpLoss: actualHpLoss,
        incomingDamage: hpLoss,
        hp: hpAfterDamage + (Number(statGain.maxHp) || 0),
        explorationCount: currentCount + 1,
        questUpdate,
      };
    });

    ok(res, result);
  } catch (error) {
    if (error.status) {
      return failFromError(res, error, 'Không thể thám hiểm khu vực');
    }
    console.error('Không thể thám hiểm khu vực:', error);
    fail(res, 500, 'Không thể thám hiểm khu vực');
  }
});

router.post('/:characterId/refresh-exploration', gameplayLimiter, async (req, res) => {
  try {
    const { characterId } = req.params;
    const refreshCost = 5000;

    const result = await withTransaction(async (client) => {
      const characterResult = await client.query(
        `SELECT spirit_stones
         FROM characters
         WHERE id = $1
         FOR UPDATE`,
        [characterId]
      );

      if (characterResult.rows.length === 0) {
        const error = new Error('Không tìm thấy nhân vật');
        error.status = 404;
        throw error;
      }

      if (Number(characterResult.rows[0].spirit_stones) < refreshCost) {
        const error = new Error('Không đủ linh thạch');
        error.status = 400;
        error.details = { required: refreshCost, current: Number(characterResult.rows[0].spirit_stones) };
        throw error;
      }

      await client.query(
        `UPDATE characters
         SET spirit_stones = spirit_stones - $2,
             exploration_count = 0,
             exploration_last_reset = CURRENT_DATE
         WHERE id = $1`,
        [characterId, refreshCost]
      );

      await client.query(
        `INSERT INTO event_logs (character_id, event_type, message)
         VALUES ($1, 'info', $2)`,
        [characterId, `Làm mới lượt thám hiểm với ${refreshCost} linh thạch`]
      );

      return {
        success: true,
        cost: refreshCost,
        explorationCount: 0,
        message: `Đã làm mới lượt thám hiểm! -${refreshCost} linh thạch`,
      };
    });

    ok(res, result);
  } catch (error) {
    if (error.status) return failFromError(res, error, 'Không thể làm mới lượt thám hiểm');
    console.error('Không thể làm mới lượt thám hiểm:', error);
    fail(res, 500, 'Không thể làm mới lượt thám hiểm');
  }
});

export default router;
