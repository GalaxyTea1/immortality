export const TREASURE_ROUND_SECONDS = 30;
export const TREASURE_SETTLE_SECONDS = 10;
export const TREASURE_MIN_BET = 100;
export const TREASURE_MAX_BET = 50000;
export const TREASURE_PAYOUT_MULTIPLIER = 1.8;
export const TREASURE_MAX_JACKPOT_RATE = 0.1;
export const TREASURE_JACKPOT_RATE_STONE_SCALE = 1000000;
export const TREASURE_JACKPOT_PAYOUT_PERCENT = 0.25;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const clampTreasureRate = (value) => Math.max(0, Math.min(TREASURE_MAX_JACKPOT_RATE, toNumber(value)));

export const calculateJackpotRate = (
  totalBet,
  scale = TREASURE_JACKPOT_RATE_STONE_SCALE,
  maxRate = TREASURE_MAX_JACKPOT_RATE
) => {
  const safeScale = Math.max(1, toNumber(scale, TREASURE_JACKPOT_RATE_STONE_SCALE));
  const safeRate = toNumber(totalBet) / safeScale;
  return Math.max(0, Math.min(toNumber(maxRate, TREASURE_MAX_JACKPOT_RATE), safeRate));
};

export const calculatePayoutPool = ({ potAmount = 0, losingTotal = 0, winningTotal = 0, payoutMultiplier = TREASURE_PAYOUT_MULTIPLIER } = {}) => {
  const available = Math.max(0, Math.floor(toNumber(potAmount) + toNumber(losingTotal)));
  const requested = Math.max(0, Math.floor(toNumber(winningTotal) * toNumber(payoutMultiplier, TREASURE_PAYOUT_MULTIPLIER)));
  return Math.min(available, requested);
};

export const calculateJackpotAmount = ({ remainingPot = 0, jackpotTriggered = false, jackpotPayoutPercent = TREASURE_JACKPOT_PAYOUT_PERCENT } = {}) => {
  if (!jackpotTriggered) return 0;
  return Math.max(0, Math.floor(toNumber(remainingPot) * toNumber(jackpotPayoutPercent, TREASURE_JACKPOT_PAYOUT_PERCENT)));
};

export const distributeByStake = (bets, pool) => {
  const safePool = Math.max(0, Math.floor(toNumber(pool)));
  const totalStake = bets.reduce((sum, bet) => sum + Math.max(0, toNumber(bet.amount)), 0);
  if (safePool <= 0 || totalStake <= 0) {
    return bets.map((bet) => ({ id: bet.id, amount: 0 }));
  }

  let allocated = 0;
  return bets.map((bet, index) => {
    const amount = index === bets.length - 1
      ? safePool - allocated
      : Math.floor((safePool * Math.max(0, toNumber(bet.amount))) / totalStake);
    allocated += amount;
    return { id: bet.id, amount };
  });
};

export const normalizeTreasureSettings = (row = {}) => ({
  potAmount: toNumber(row.pot_amount),
  minBet: toNumber(row.min_bet, TREASURE_MIN_BET),
  maxBet: toNumber(row.max_bet, TREASURE_MAX_BET),
  roundSeconds: toNumber(row.round_seconds, TREASURE_ROUND_SECONDS),
  settleSeconds: toNumber(row.settle_seconds, TREASURE_SETTLE_SECONDS),
  payoutMultiplier: toNumber(row.payout_multiplier, TREASURE_PAYOUT_MULTIPLIER),
  maxJackpotRate: clampTreasureRate(row.max_jackpot_rate ?? TREASURE_MAX_JACKPOT_RATE),
  jackpotRateStoneScale: toNumber(row.jackpot_rate_stone_scale, TREASURE_JACKPOT_RATE_STONE_SCALE),
  jackpotPayoutPercent: toNumber(row.jackpot_payout_percent, TREASURE_JACKPOT_PAYOUT_PERCENT),
  isActive: row.is_active !== false,
});

export const getTreasureRoundTiming = (row = null, settings = {}) => {
  if (!row || row.status !== 'betting' || !row.closes_at) {
    return {
      phase: row?.status || 'idle',
      secondsRemaining: 0,
      bettingSecondsRemaining: 0,
      settleSecondsRemaining: 0,
      resolveAt: null,
    };
  }

  const now = Date.now();
  const closesAt = new Date(row.closes_at).getTime();
  const settleSeconds = toNumber(settings.settleSeconds ?? settings.settle_seconds, TREASURE_SETTLE_SECONDS);
  const resolveAt = closesAt + settleSeconds * 1000;

  if (now < closesAt) {
    const bettingSecondsRemaining = Math.max(0, Math.floor((closesAt - now) / 1000));
    return {
      phase: 'betting',
      secondsRemaining: bettingSecondsRemaining,
      bettingSecondsRemaining,
      settleSecondsRemaining: 0,
      resolveAt: new Date(resolveAt).toISOString(),
    };
  }

  if (now < resolveAt) {
    const settleSecondsRemaining = Math.max(0, Math.floor((resolveAt - now) / 1000));
    return {
      phase: 'settling',
      secondsRemaining: settleSecondsRemaining,
      bettingSecondsRemaining: 0,
      settleSecondsRemaining,
      resolveAt: new Date(resolveAt).toISOString(),
    };
  }

  return {
    phase: 'resolving',
    secondsRemaining: 0,
    bettingSecondsRemaining: 0,
    settleSecondsRemaining: 0,
    resolveAt: new Date(resolveAt).toISOString(),
  };
};

export const normalizeTreasureRound = (row = null, settings = {}) => {
  if (!row) return null;
  const timing = getTreasureRoundTiming(row, settings);
  return {
    id: row.id,
    roundNo: toNumber(row.round_no),
    status: row.status,
    phase: timing.phase,
    startedAt: row.started_at,
    closesAt: row.closes_at,
    resolveAt: timing.resolveAt,
    resolvedAt: row.resolved_at,
    resultSide: row.result_side ? toNumber(row.result_side) : null,
    forcedResultSide: row.forced_result_side ? toNumber(row.forced_result_side) : null,
    totalBet: toNumber(row.total_bet),
    totalWinningBet: toNumber(row.total_winning_bet),
    totalLosingBet: toNumber(row.total_losing_bet),
    jackpotTriggered: Boolean(row.jackpot_triggered),
    jackpotRate: toNumber(row.jackpot_rate),
    jackpotAmount: toNumber(row.jackpot_amount),
    secondsRemaining: timing.secondsRemaining,
    bettingSecondsRemaining: timing.bettingSecondsRemaining,
    settleSecondsRemaining: timing.settleSecondsRemaining,
  };
};

export const normalizeTreasureBet = (row = null) => row && ({
  id: row.id,
  roundId: row.round_id,
  characterId: row.character_id,
  characterName: row.character_name,
  side: toNumber(row.side),
  amount: toNumber(row.amount),
  payout: toNumber(row.payout),
  jackpotBonus: toNumber(row.jackpot_bonus),
  outcome: row.outcome,
  createdAt: row.created_at,
});
