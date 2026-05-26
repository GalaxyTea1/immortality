import express from 'express';
import { calculateExpProgress } from '../domain/gameCatalog.js';
import { withTransaction } from '../db/index.js';
import { ok, fail, failFromError } from '../http/response.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireCharacterOwner } from '../middleware/ownership.middleware.js';
import { gameplayLimiter } from '../middleware/rateLimit.js';
import { getOrCreateDailyQuest, getQuestDefinition, normalizeQuestRow } from '../services/questTracker.js';

const router = express.Router();

router.use('/:characterId', authMiddleware, requireCharacterOwner('characterId'));

router.get('/:characterId/active', async (req, res) => {
  try {
    const quest = await getOrCreateDailyQuest(req.params.characterId);
    ok(res, { quest });
  } catch (error) {
    console.error('Không thể tải nhiệm vụ:', error);
    fail(res, 500, 'Không thể tải nhiệm vụ');
  }
});

router.post('/:characterId/claim', gameplayLimiter, async (req, res) => {
  try {
    const { characterId } = req.params;

    const result = await withTransaction(async (client) => {
      const questResult = await client.query(
        `SELECT id, quest_id, progress, status
         FROM character_quests
         WHERE character_id = $1
           AND status = 'active'
           AND assigned_at::date = CURRENT_DATE
         FOR UPDATE`,
        [characterId]
      );

      if (questResult.rows.length === 0) {
        const error = new Error('Không có nhiệm vụ đang hoạt động');
        error.status = 404;
        throw error;
      }

      const questRow = questResult.rows[0];
      const questDef = getQuestDefinition(questRow.quest_id);
      if (!questDef) {
        const error = new Error('Nhiệm vụ không tồn tại');
        error.status = 400;
        throw error;
      }

      if (Number(questRow.progress) < questDef.target) {
        const error = new Error('Nhiệm vụ chưa hoàn thành');
        error.status = 400;
        error.details = { progress: Number(questRow.progress), target: questDef.target };
        throw error;
      }

      const characterResult = await client.query(
        `SELECT realm_index, level, exp, max_exp
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

      const rewards = questDef.rewards;
      const character = characterResult.rows[0];
      const nextProgress = calculateExpProgress({
        realmIndex: character.realm_index,
        level: character.level,
        exp: character.exp,
        maxExp: character.max_exp,
      }, rewards.exp);

      await client.query(
        `UPDATE characters
         SET exp = $2, level = $3, max_exp = $4,
             spirit_stones = spirit_stones + $5
         WHERE id = $1`,
        [characterId, nextProgress.exp, nextProgress.level, nextProgress.maxExp, rewards.spiritStones]
      );

      await client.query(
        `UPDATE character_quests
         SET status = 'completed', completed_at = NOW()
         WHERE id = $1`,
        [questRow.id]
      );

      await client.query(
        `INSERT INTO event_logs (character_id, event_type, message)
         VALUES ($1, 'quest', $2)`,
        [characterId, `Hoàn thành ${questDef.name}`]
      );

      return {
        success: true,
        quest: normalizeQuestRow({ ...questRow, status: 'completed' }),
        rewards,
        progress: nextProgress,
        message: `Hoàn thành nhiệm vụ +${rewards.spiritStones} linh thạch, +${rewards.exp} EXP`,
      };
    });

    ok(res, result);
  } catch (error) {
    if (error.status) return failFromError(res, error, 'Không thể nhận thưởng nhiệm vụ');
    console.error('Không thể nhận thưởng nhiệm vụ:', error);
    fail(res, 500, 'Không thể nhận thưởng nhiệm vụ');
  }
});

export default router;
