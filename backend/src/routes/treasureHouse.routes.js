import express from 'express';
import { withTransaction } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { assertCharacterOwner } from '../middleware/ownership.middleware.js';
import { gameplayLimiter } from '../middleware/rateLimit.js';
import { fail, failFromError, ok } from '../http/response.js';
import {
  TREASURE_MAX_BET,
  TREASURE_MIN_BET,
  TREASURE_SETTLE_SECONDS,
  calculateJackpotAmount,
  calculateJackpotRate,
  calculatePayoutPool,
  distributeByStake,
  normalizeTreasureBet,
  normalizeTreasureRound,
  normalizeTreasureSettings,
} from '../domain/treasureHouse.js';

const router = express.Router();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const requireAdmin = (req, res, next) => {
  if (!req.user?.is_admin) {
    return fail(res, 403, 'Chỉ admin mới có quyền quản lý Tụ Bảo Trai');
  }
  return next();
};

const ensureOwnedCharacter = async (req, res, characterId) => {
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

const getSettings = async (client, { lock = false } = {}) => {
  await client.query(
    `INSERT INTO treasure_house_settings (id)
     VALUES (1)
     ON CONFLICT (id) DO NOTHING`
  );

  const result = await client.query(
    `SELECT *
     FROM treasure_house_settings
     WHERE id = 1
     ${lock ? 'FOR UPDATE' : ''}`
  );
  return result.rows[0];
};

const getActiveRound = async (client, { lock = false } = {}) => {
  const result = await client.query(
    `SELECT *
     FROM treasure_house_rounds
     WHERE status = 'betting'
     ORDER BY started_at DESC
     LIMIT 1
     ${lock ? 'FOR UPDATE' : ''}`
  );
  return result.rows[0] || null;
};

const createNextRound = async (client, settings, createdBy = null) => {
  const result = await client.query(
    `WITH next_no AS (
       SELECT COALESCE(MAX(round_no), 0) + 1 AS value
       FROM treasure_house_rounds
     )
     INSERT INTO treasure_house_rounds (round_no, closes_at, created_by)
     SELECT value, NOW() + ($1::integer * INTERVAL '1 second'), $2
     FROM next_no
     RETURNING *`,
    [normalizeTreasureSettings(settings).roundSeconds, createdBy]
  );
  return result.rows[0];
};

const insertPotTransaction = async (client, { roundId = null, characterId = null, adminUserId = null, type, amount, balanceAfter, note = '' }) => {
  await client.query(
    `INSERT INTO treasure_house_pot_transactions
       (round_id, character_id, admin_user_id, type, amount, balance_after, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [roundId, characterId, adminUserId, type, amount, balanceAfter, note]
  );
};

const resolveRound = async (client, roundId, { resolverUserId = null, allowEarly = false } = {}) => {
  const settingsRow = await getSettings(client, { lock: true });
  const settings = normalizeTreasureSettings(settingsRow);
  const roundResult = await client.query(
    `SELECT *
     FROM treasure_house_rounds
     WHERE id = $1
     FOR UPDATE`,
    [roundId]
  );
  const round = roundResult.rows[0];
  if (!round || round.status !== 'betting') return round || null;

  const resolveAt = new Date(round.closes_at).getTime() + settings.settleSeconds * 1000;
  if (!allowEarly && resolveAt > Date.now()) {
    return round;
  }

  const betsResult = await client.query(
    `SELECT thb.*, c.name AS character_name
     FROM treasure_house_bets thb
     JOIN characters c ON c.id = thb.character_id
     WHERE thb.round_id = $1
     ORDER BY thb.created_at ASC, thb.id ASC
     FOR UPDATE OF thb`,
    [roundId]
  );
  const bets = betsResult.rows;
  const resultSide = round.forced_result_side || (Math.random() < 0.5 ? 1 : 2);
  const winningBets = bets.filter((bet) => Number(bet.side) === Number(resultSide));
  const losingBets = bets.filter((bet) => Number(bet.side) !== Number(resultSide));
  const totalBet = bets.reduce((sum, bet) => sum + toNumber(bet.amount), 0);
  const totalWinningBet = winningBets.reduce((sum, bet) => sum + toNumber(bet.amount), 0);
  const totalLosingBet = losingBets.reduce((sum, bet) => sum + toNumber(bet.amount), 0);
  const jackpotRate = calculateJackpotRate(totalBet, settings.jackpotRateStoneScale, settings.maxJackpotRate);
  const payoutPool = calculatePayoutPool({
    potAmount: settings.potAmount,
    losingTotal: totalLosingBet,
    winningTotal: totalWinningBet,
    payoutMultiplier: settings.payoutMultiplier,
  });
  const jackpotTriggered = winningBets.length > 0 && Math.random() < jackpotRate;
  const jackpotAmount = calculateJackpotAmount({
    remainingPot: settings.potAmount + totalLosingBet - payoutPool,
    jackpotTriggered,
    jackpotPayoutPercent: settings.jackpotPayoutPercent,
  });
  const payoutShares = new Map(distributeByStake(winningBets, payoutPool).map((entry) => [entry.id, entry.amount]));
  const jackpotShares = new Map(distributeByStake(winningBets, jackpotAmount).map((entry) => [entry.id, entry.amount]));

  let nextPot = settings.potAmount;
  for (const bet of losingBets) {
    nextPot += toNumber(bet.amount);
    await client.query(
      `UPDATE treasure_house_bets
       SET outcome = 'lost'
       WHERE id = $1`,
      [bet.id]
    );
    await insertPotTransaction(client, {
      roundId,
      characterId: bet.character_id,
      type: 'bet_loss',
      amount: toNumber(bet.amount),
      balanceAfter: nextPot,
      note: `Thua vòng #${round.round_no}`,
    });
  }

  for (const bet of winningBets) {
    const payout = payoutShares.get(bet.id) || 0;
    const jackpotBonus = jackpotShares.get(bet.id) || 0;
    const totalPayout = payout + jackpotBonus;
    nextPot = Math.max(0, nextPot - totalPayout);

    await client.query(
      `UPDATE treasure_house_bets
       SET outcome = 'won',
           payout = $2,
           jackpot_bonus = $3
       WHERE id = $1`,
      [bet.id, payout, jackpotBonus]
    );
    if (totalPayout > 0) {
      await client.query(
        `UPDATE characters
         SET spirit_stones = spirit_stones + $2
         WHERE id = $1`,
        [bet.character_id, totalPayout]
      );
    }
    if (payout > 0) {
      await insertPotTransaction(client, {
        roundId,
        characterId: bet.character_id,
        type: 'bet_payout',
        amount: -payout,
        balanceAfter: nextPot + jackpotBonus,
        note: `Thắng vòng #${round.round_no}`,
      });
    }
    if (jackpotBonus > 0) {
      await insertPotTransaction(client, {
        roundId,
        characterId: bet.character_id,
        type: 'jackpot_payout',
        amount: -jackpotBonus,
        balanceAfter: nextPot,
        note: `Nổ hũ vòng #${round.round_no}`,
      });
    }
  }

  await client.query(
    `UPDATE treasure_house_settings
     SET pot_amount = $1
     WHERE id = 1`,
    [nextPot]
  );

  const updatedRound = await client.query(
    `UPDATE treasure_house_rounds
     SET status = 'resolved',
         resolved_at = NOW(),
         result_side = $2,
         resolved_by = $3,
         total_bet = $4,
         total_winning_bet = $5,
         total_losing_bet = $6,
         jackpot_triggered = $7,
         jackpot_rate = $8,
         jackpot_amount = $9
     WHERE id = $1
     RETURNING *`,
    [roundId, resultSide, resolverUserId, totalBet, totalWinningBet, totalLosingBet, jackpotTriggered, jackpotRate, jackpotAmount]
  );

  return updatedRound.rows[0];
};

const syncTreasureHouse = async (client, userId = null) => {
  const settingsRow = await getSettings(client, { lock: true });
  const settings = normalizeTreasureSettings(settingsRow);
  const expiredRounds = await client.query(
    `SELECT id
     FROM treasure_house_rounds
     WHERE status = 'betting'
       AND closes_at + ($1::integer * INTERVAL '1 second') <= NOW()
     ORDER BY started_at ASC
     FOR UPDATE`,
    [settings.settleSeconds]
  );

  for (const row of expiredRounds.rows) {
    await resolveRound(client, row.id);
  }

  const active = await getActiveRound(client);
  if (!active && settings.isActive) {
    await createNextRound(client, settingsRow, userId);
  }
};

const getStatusPayload = async (client, characterId = null) => {
  const settingsRow = await getSettings(client);
  const settings = normalizeTreasureSettings(settingsRow);
  const activeRound = await getActiveRound(client);
  const recentRounds = await client.query(
    `SELECT *
     FROM treasure_house_rounds
     WHERE status = 'resolved'
     ORDER BY resolved_at DESC
     LIMIT 10`
  );
  const winnerLeaders = await client.query(
    `WITH settled AS (
       SELECT
         thb.character_id,
         c.name AS character_name,
         SUM(CASE WHEN thb.outcome = 'won' THEN thb.payout + thb.jackpot_bonus - thb.amount ELSE 0 END) AS net_won,
         SUM(CASE WHEN thb.outcome = 'lost' THEN thb.amount ELSE 0 END) AS total_lost
       FROM treasure_house_bets thb
       JOIN characters c ON c.id = thb.character_id
       WHERE thb.outcome IN ('won', 'lost')
       GROUP BY thb.character_id, c.name
     )
     SELECT *
     FROM settled
     ORDER BY net_won DESC, total_lost ASC
     LIMIT 10`
  );
  const loserLeaders = await client.query(
    `WITH settled AS (
       SELECT
         thb.character_id,
         c.name AS character_name,
         SUM(CASE WHEN thb.outcome = 'won' THEN thb.payout + thb.jackpot_bonus - thb.amount ELSE 0 END) AS net_won,
         SUM(CASE WHEN thb.outcome = 'lost' THEN thb.amount ELSE 0 END) AS total_lost
       FROM treasure_house_bets thb
       JOIN characters c ON c.id = thb.character_id
       WHERE thb.outcome IN ('won', 'lost')
       GROUP BY thb.character_id, c.name
     )
     SELECT *
     FROM settled
     ORDER BY total_lost DESC, net_won ASC
     LIMIT 10`
  );
  const userBetResult = characterId && activeRound
    ? await client.query(
      `SELECT thb.*, c.name AS character_name
       FROM treasure_house_bets thb
       JOIN characters c ON c.id = thb.character_id
       WHERE thb.round_id = $1 AND thb.character_id = $2`,
      [activeRound.id, characterId]
    )
    : { rows: [] };
  const sideTotals = activeRound
    ? await client.query(
      `SELECT side, COALESCE(SUM(amount), 0)::bigint AS total
       FROM treasure_house_bets
       WHERE round_id = $1
       GROUP BY side`,
      [activeRound.id]
    )
    : { rows: [] };
  const activeSideTotals = sideTotals.rows.reduce((totals, row) => ({
    ...totals,
    [row.side]: toNumber(row.total),
  }), { 1: 0, 2: 0 });

  return {
    settings,
    activeRound: normalizeTreasureRound(activeRound, settings),
    activeSideTotals,
    userBet: normalizeTreasureBet(userBetResult.rows[0]),
    recentRounds: recentRounds.rows.map((round) => normalizeTreasureRound(round, settings)),
    leaderboard: {
      winners: winnerLeaders.rows.map((row) => ({
        characterId: row.character_id,
        characterName: row.character_name,
        netWon: toNumber(row.net_won),
        totalLost: toNumber(row.total_lost),
      })),
      losers: loserLeaders.rows.map((row) => ({
        characterId: row.character_id,
        characterName: row.character_name,
        netWon: toNumber(row.net_won),
        totalLost: toNumber(row.total_lost),
      })),
    },
  };
};

router.use(authMiddleware);

router.get('/status', async (req, res) => {
  try {
    const { characterId } = req.query;
    if (characterId && !(await ensureOwnedCharacter(req, res, characterId))) return;

    const payload = await withTransaction(async (client) => {
      await syncTreasureHouse(client, req.user.id);
      return getStatusPayload(client, characterId || null);
    });
    ok(res, payload);
  } catch (error) {
    console.error('Không thể tải Tụ Bảo Trai:', error);
    fail(res, 500, 'Không thể tải Tụ Bảo Trai');
  }
});

router.post('/bets', gameplayLimiter, async (req, res) => {
  try {
    const { characterId, roundId, side, amount } = req.body;
    if (!(await ensureOwnedCharacter(req, res, characterId))) return;

    const betSide = Number(side);
    const betAmount = Number(amount);
    if (![1, 2].includes(betSide)) {
      return fail(res, 400, 'Lựa chọn phải là 1 hoặc 2');
    }
    if (!Number.isInteger(betAmount) || betAmount < 1) {
      return fail(res, 400, 'Số linh thạch đặt không hợp lệ');
    }

    const payload = await withTransaction(async (client) => {
      await syncTreasureHouse(client, req.user.id);
      const settingsRow = await getSettings(client, { lock: true });
      const settings = normalizeTreasureSettings(settingsRow);
      if (betAmount < settings.minBet || betAmount > settings.maxBet) {
        const error = new Error(`Mức đặt hợp lệ từ ${settings.minBet} đến ${settings.maxBet} linh thạch`);
        error.status = 400;
        throw error;
      }

      const activeRound = await getActiveRound(client, { lock: true });
      if (!activeRound || Number(activeRound.id) !== Number(roundId) || new Date(activeRound.closes_at).getTime() <= Date.now()) {
        const error = new Error('Lượt đặt cược đã kết thúc');
        error.status = 400;
        throw error;
      }

      const character = await client.query(
        `SELECT spirit_stones
         FROM characters
         WHERE id = $1
         FOR UPDATE`,
        [characterId]
      );
      if (character.rows.length === 0) {
        const error = new Error('Không tìm thấy nhân vật');
        error.status = 404;
        throw error;
      }
      if (toNumber(character.rows[0].spirit_stones) < betAmount) {
        const error = new Error('Không đủ linh thạch để đặt cược');
        error.status = 400;
        error.details = { required: betAmount, current: toNumber(character.rows[0].spirit_stones) };
        throw error;
      }

      await client.query(
        `UPDATE characters
         SET spirit_stones = spirit_stones - $2
         WHERE id = $1`,
        [characterId, betAmount]
      );
      await client.query(
        `INSERT INTO treasure_house_bets (round_id, character_id, side, amount)
         VALUES ($1, $2, $3, $4)`,
        [activeRound.id, characterId, betSide, betAmount]
      );
      await client.query(
        `UPDATE treasure_house_rounds
         SET total_bet = total_bet + $2
         WHERE id = $1`,
        [activeRound.id, betAmount]
      );

      return {
        ...(await getStatusPayload(client, characterId)),
        message: `Đã đặt ${betAmount} linh thạch vào cửa ${betSide}`,
      };
    });

    ok(res, payload);
  } catch (error) {
    if (error.code === '23505') {
      return fail(res, 400, 'Mỗi nhân vật chỉ được đặt một lần trong mỗi lượt');
    }
    if (error.status) return failFromError(res, error, 'Không thể đặt cược');
    console.error('Không thể đặt cược Tụ Bảo Trai:', error);
    fail(res, 500, 'Không thể đặt cược');
  }
});

router.post('/admin/deposit', gameplayLimiter, requireAdmin, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      return fail(res, 400, 'Số linh thạch nạp hũ không hợp lệ');
    }

    const payload = await withTransaction(async (client) => {
      const settings = await getSettings(client, { lock: true });
      const nextPot = toNumber(settings.pot_amount) + amount;
      await client.query(
        `UPDATE treasure_house_settings
         SET pot_amount = $1
         WHERE id = 1`,
        [nextPot]
      );
      await insertPotTransaction(client, {
        adminUserId: req.user.id,
        type: 'admin_deposit',
        amount,
        balanceAfter: nextPot,
        note: 'Admin nạp hũ',
      });
      await syncTreasureHouse(client, req.user.id);
      return {
        ...(await getStatusPayload(client)),
        message: `Đã nạp ${amount} linh thạch vào hũ`,
      };
    });
    ok(res, payload);
  } catch (error) {
    console.error('Không thể nạp hũ Tụ Bảo Trai:', error);
    fail(res, 500, 'Không thể nạp hũ');
  }
});

router.put('/admin/settings', gameplayLimiter, requireAdmin, async (req, res) => {
  try {
    const minBet = Math.max(1, Number(req.body.minBet ?? TREASURE_MIN_BET));
    const maxBet = Math.max(minBet, Number(req.body.maxBet ?? TREASURE_MAX_BET));
    const roundSeconds = Math.max(10, Math.min(300, Number(req.body.roundSeconds ?? 30)));
    const settleSeconds = Math.max(3, Math.min(120, Number(req.body.settleSeconds ?? TREASURE_SETTLE_SECONDS)));
    const payoutMultiplier = Math.max(1, Number(req.body.payoutMultiplier ?? 1.8));

    const payload = await withTransaction(async (client) => {
      await getSettings(client, { lock: true });
      await client.query(
        `UPDATE treasure_house_settings
         SET min_bet = $1,
             max_bet = $2,
             round_seconds = $3,
             settle_seconds = $4,
             payout_multiplier = $5
         WHERE id = 1`,
        [minBet, maxBet, roundSeconds, settleSeconds, payoutMultiplier]
      );
      await syncTreasureHouse(client, req.user.id);
      return {
        ...(await getStatusPayload(client)),
        message: 'Đã cập nhật cấu hình Tụ Bảo Trai',
      };
    });
    ok(res, payload);
  } catch (error) {
    console.error('Không thể cập nhật cấu hình Tụ Bảo Trai:', error);
    fail(res, 500, 'Không thể cập nhật cấu hình');
  }
});

router.post('/admin/rounds/:roundId/force', gameplayLimiter, requireAdmin, async (req, res) => {
  try {
    const side = req.body.side === null || req.body.side === '' ? null : Number(req.body.side);
    if (side !== null && ![1, 2].includes(side)) {
      return fail(res, 400, 'Kết quả điều chỉnh phải là 1 hoặc 2');
    }

    const payload = await withTransaction(async (client) => {
      const round = await client.query(
        `UPDATE treasure_house_rounds
         SET forced_result_side = $2
         WHERE id = $1 AND status = 'betting'
         RETURNING *`,
        [req.params.roundId, side]
      );
      if (round.rows.length === 0) {
        const error = new Error('Không tìm thấy lượt đang mở');
        error.status = 404;
        throw error;
      }
      return {
        ...(await getStatusPayload(client)),
        message: side ? `Đã chỉnh lượt này ra ${side}` : 'Đã bỏ chỉnh kết quả lượt này',
      };
    });
    ok(res, payload);
  } catch (error) {
    if (error.status) return failFromError(res, error, 'Không thể chỉnh kết quả');
    console.error('Không thể chỉnh kết quả Tụ Bảo Trai:', error);
    fail(res, 500, 'Không thể chỉnh kết quả');
  }
});

router.post('/admin/rounds/:roundId/resolve', gameplayLimiter, requireAdmin, async (req, res) => {
  try {
    const payload = await withTransaction(async (client) => {
      await resolveRound(client, req.params.roundId, { resolverUserId: req.user.id, allowEarly: true });
      await syncTreasureHouse(client, req.user.id);
      return {
        ...(await getStatusPayload(client)),
        message: 'Đã chốt lượt Tụ Bảo Trai',
      };
    });
    ok(res, payload);
  } catch (error) {
    console.error('Không thể chốt lượt Tụ Bảo Trai:', error);
    fail(res, 500, 'Không thể chốt lượt');
  }
});

export default router;
