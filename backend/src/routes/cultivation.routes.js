import express from 'express';
import {
  calculateExpProgress,
  REALMS,
  TRIBULATION_REQUIREMENTS,
} from '../domain/gameCatalog.js';
import { withTransaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireCharacterOwner } from '../middleware/ownership.middleware.js';
import { gameplayLimiter } from '../middleware/rateLimit.js';
import { fail, failFromError, ok } from '../http/response.js';
import {
  cultivateBatchSchema,
  breakthroughSchema,
  cultivateSchema,
  validate,
} from '../middleware/validation.js';
import { trackQuestProgress } from '../services/questTracker.js';

const router = express.Router();

router.use('/:characterId', authMiddleware, requireCharacterOwner('characterId'));

const getFoundationExpMultiplier = (foundationValue) => {
  if (foundationValue >= 80) return 1.05;
  if (foundationValue >= 50) return 1;
  if (foundationValue >= 20) return 0.95;
  return 0.85;
};

const applyCultivationTicks = async (client, characterId, { mode = 'manual', ticks = 1 }) => {
  const characterResult = await client.query(
    `SELECT realm_index, level, exp, max_exp, foundation_value, cultivation_speed
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
  const foundationMultiplier = getFoundationExpMultiplier(character.foundation_value);
  const speedMultiplier = Number(character.cultivation_speed) || 1;
  let expGain = 0;

  for (let tick = 0; tick < ticks; tick += 1) {
    const baseExp = mode === 'meditation'
      ? Math.floor(Math.random() * 3) + 1
      : Math.floor(Math.random() * 5) + 3;
    expGain += Math.max(1, Math.floor(baseExp * foundationMultiplier * speedMultiplier));
  }

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

  return {
    ticks,
    expGain,
    progress: nextProgress,
    message: ticks === 1
      ? `Cultivated successfully! +${expGain} EXP`
      : `Cultivated ${ticks} times! +${expGain} EXP`,
  };
};

const applyMeditationTicks = async (client, characterId, ticks) => {
  const characterResult = await client.query(
    `SELECT realm_index, level, exp, max_exp, foundation_value, foundation_max,
            inner_demon_value, inner_demon_max, cultivation_speed
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
  const speedMultiplier = Number(character.cultivation_speed) || 1;
  let expGain = 0;
  let foundationRecovered = 0;
  let demonSuppressed = 0;

  for (let i = 0; i < ticks; i += 1) {
    expGain += Math.max(1, Math.floor((Math.floor(Math.random() * 3) + 1) * speedMultiplier));
    if (Math.random() < 0.2) foundationRecovered += 1;
    if (Math.random() < 0.1) demonSuppressed += 1;
  }

  const nextProgress = calculateExpProgress({
    realmIndex: character.realm_index,
    level: character.level,
    exp: character.exp,
    maxExp: character.max_exp,
  }, expGain);

  const nextFoundation = Math.min(
    Number(character.foundation_max) || 100,
    Number(character.foundation_value) + foundationRecovered
  );
  const nextDemon = Math.max(0, Number(character.inner_demon_value) - demonSuppressed);

  await client.query(
    `UPDATE characters
     SET exp = $2, level = $3, max_exp = $4,
         foundation_value = $5, inner_demon_value = $6,
         last_meditation_time = NOW(),
         meditation_started_at = NULL
     WHERE id = $1`,
    [characterId, nextProgress.exp, nextProgress.level, nextProgress.maxExp, nextFoundation, nextDemon]
  );

  return {
    ticks,
    expGain,
    foundationRecovered,
    demonSuppressed,
    progress: nextProgress,
    message: `Meditation completed! +${expGain} EXP`,
  };
};

router.post('/:characterId/cultivate', gameplayLimiter, validate(cultivateSchema), async (req, res) => {
  try {
    const { characterId } = req.params;
    const { mode } = req.body;

    const result = await withTransaction((client) => applyCultivationTicks(client, characterId, { mode, ticks: 1 }));

    ok(res, result);
  } catch (error) {
    if (error.status) {
      return failFromError(res, error, 'Error cultivating');
    }
    console.error('Error cultivating:', error);
    fail(res, 500, 'Error cultivating');
  }
});

router.post('/:characterId/cultivate/batch', gameplayLimiter, validate(cultivateBatchSchema), async (req, res) => {
  try {
    const { characterId } = req.params;
    const { mode, ticks } = req.body;

    const result = await withTransaction((client) => applyCultivationTicks(client, characterId, { mode, ticks }));
    ok(res, result);
  } catch (error) {
    if (error.status) {
      return failFromError(res, error, 'Error cultivating');
    }
    console.error('Error cultivating:', error);
    fail(res, 500, 'Error cultivating');
  }
});

router.post('/:characterId/meditation/start', gameplayLimiter, async (req, res) => {
  try {
    const { characterId } = req.params;
    const result = await withTransaction(async (client) => {
      const active = await client.query(
        `SELECT meditation_started_at
         FROM characters
         WHERE id = $1
         FOR UPDATE`,
        [characterId]
      );

      if (active.rows.length === 0) {
        const error = new Error('Character not found');
        error.status = 404;
        throw error;
      }

      if (active.rows[0].meditation_started_at) {
        const error = new Error('Meditation session already started');
        error.status = 400;
        throw error;
      }

      const updated = await client.query(
        `UPDATE characters
         SET meditation_started_at = NOW()
         WHERE id = $1
         RETURNING meditation_started_at`,
        [characterId]
      );

      return {
        startedAt: updated.rows[0].meditation_started_at,
        message: 'Meditation session started',
      };
    });

    ok(res, result);
  } catch (error) {
    if (error.status) return failFromError(res, error, 'Error starting meditation session');
    console.error('Error starting meditation session:', error);
    fail(res, 500, 'Error starting meditation session');
  }
});

router.post('/:characterId/meditation/finish', gameplayLimiter, async (req, res) => {
  try {
    const { characterId } = req.params;

    const result = await withTransaction(async (client) => {
      const session = await client.query(
        `SELECT meditation_started_at,
                GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (NOW() - meditation_started_at))))::int AS duration_seconds
         FROM characters
         WHERE id = $1
         FOR UPDATE`,
        [characterId]
      );

      if (session.rows.length === 0) {
        const error = new Error('Character not found');
        error.status = 404;
        throw error;
      }

      if (!session.rows[0].meditation_started_at) {
        const error = new Error('No active meditation session');
        error.status = 400;
        throw error;
      }

      const durationSeconds = Number(session.rows[0].duration_seconds) || 1;
      const ticks = Math.min(300, Math.max(1, durationSeconds));
      const meditationResult = await applyMeditationTicks(client, characterId, ticks);
      return { ...meditationResult, durationSeconds };
    });

    const questUpdate = await trackQuestProgress(characterId, 'meditate');
    ok(res, { ...result, questUpdate });
  } catch (error) {
    if (error.status) return failFromError(res, error, 'Error finishing meditation session');
    console.error('Error finishing meditation session:', error);
    fail(res, 500, 'Error finishing meditation session');
  }
});

router.post('/:characterId/meditate', gameplayLimiter, async (req, res) => {
  try {
    const { characterId } = req.params;
    const cooldownMs = 5 * 60 * 1000;

    const result = await withTransaction(async (client) => {
      const characterResult = await client.query(
        `SELECT hp, max_hp, last_meditation_time
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
      if (character.last_meditation_time) {
        const elapsedMs = Date.now() - new Date(character.last_meditation_time).getTime();
        if (elapsedMs < cooldownMs) {
          const error = new Error('Meditation is on cooldown');
          error.status = 400;
          error.details = { cooldownRemaining: Math.ceil((cooldownMs - elapsedMs) / 1000) };
          throw error;
        }
      }

      const healAmount = Math.min(20, Number(character.max_hp) - Number(character.hp));
      await client.query(
        `UPDATE characters
         SET hp = LEAST(max_hp, hp + 20),
             last_meditation_time = NOW()
         WHERE id = $1`,
        [characterId]
      );

      return {
        success: true,
        healAmount,
        message: `Meditation completed! +${healAmount} HP`,
      };
    });

    ok(res, result);
  } catch (error) {
    if (error.status) return failFromError(res, error, 'Error meditating');
    console.error('Error meditating:', error);
    fail(res, 500, 'Error meditating');
  }
});

router.post('/:characterId/breakthrough', gameplayLimiter, validate(breakthroughSchema), async (req, res) => {
  try {
    const { characterId } = req.params;
    const { usePill } = req.body;

    const result = await withTransaction(async (client) => {
      const characterResult = await client.query(
        `SELECT realm_index, level, exp, max_exp, spirit_stones, inner_demon_value, inner_demon_max
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
      const realm = REALMS[character.realm_index];
      const tribInfo = TRIBULATION_REQUIREMENTS[character.realm_index];

      if (!realm || !tribInfo) {
        const error = new Error('No breakthrough information for this realm');
        error.status = 400;
        throw error;
      }

      if (character.level < realm.levels || Number(character.exp) < Number(character.max_exp) * 0.9) {
        const error = new Error('Breakthrough requirements are not met');
        error.status = 400;
        throw error;
      }

      if (character.realm_index >= REALMS.length - 1) {
        const error = new Error('Highest realm already reached');
        error.status = 400;
        throw error;
      }

      if (Number(character.spirit_stones) < tribInfo.spiritStonesCost) {
        const error = new Error('Not enough Spirit Stones');
        error.status = 400;
        error.details = {
          required: tribInfo.spiritStonesCost,
          current: Number(character.spirit_stones),
        };
        throw error;
      }

      let successRate = tribInfo.baseSuccessRate;
      let pillUsed = false;

      if (usePill && tribInfo.requiredPill) {
        const pillResult = await client.query(
          `SELECT id, quantity FROM inventory
           WHERE character_id = $1 AND item_id = $2 AND enhance_level = 0
           FOR UPDATE`,
          [characterId, tribInfo.requiredPill]
        );

        if (pillResult.rows.length > 0 && pillResult.rows[0].quantity > 0) {
          await client.query(
            'UPDATE inventory SET quantity = quantity - 1 WHERE id = $1',
            [pillResult.rows[0].id]
          );
          await client.query(
            'DELETE FROM inventory WHERE character_id = $1 AND quantity <= 0',
            [characterId]
          );
          successRate += tribInfo.pillBonus;
          pillUsed = true;
        }
      }

      await client.query(
        'UPDATE characters SET spirit_stones = spirit_stones - $2 WHERE id = $1',
        [characterId, tribInfo.spiritStonesCost]
      );

      const isSuccess = Math.random() < successRate;
      if (isSuccess) {
        const nextRealmIndex = character.realm_index + 1;
        await client.query(
          `UPDATE characters
           SET realm_index = $2, level = 1, exp = 0, max_exp = $3
           WHERE id = $1`,
          [characterId, nextRealmIndex, REALMS[nextRealmIndex].expPerLevel]
        );

        return {
          success: true,
          pillUsed,
          successRate,
          newRealm: REALMS[nextRealmIndex].name,
          message: `Breakthrough successful! New realm: ${REALMS[nextRealmIndex].name}`,
        };
      }

      const penalty = tribInfo.failurePenalty;
      const nextExp = Math.floor(Number(character.exp) * (1 - penalty.exp));
      const nextDemon = Math.min(
        character.inner_demon_max || 100,
        Number(character.inner_demon_value) + penalty.innerDemon
      );

      await client.query(
        `UPDATE characters
         SET exp = $2, inner_demon_value = $3
         WHERE id = $1`,
        [characterId, nextExp, nextDemon]
      );

      return {
        success: false,
        pillUsed,
        successRate,
        message: `Breakthrough failed! Lost ${Math.floor(penalty.exp * 100)}% EXP and gained ${penalty.innerDemon} Inner Demon.`,
      };
    });

    ok(res, result);
  } catch (error) {
    if (error.status) {
      return failFromError(res, error, 'Error during breakthrough');
    }
    console.error('Error during breakthrough:', error);
    fail(res, 500, 'Error during breakthrough');
  }
});

export default router;
