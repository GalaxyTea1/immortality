import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertEquipmentForSlot,
  assertValidInventoryEntry,
  calculateAlchemyMaxExp,
  calculateAlchemyProgress,
  buildStatIncrementFragments,
  calculateExpProgress,
  calculateLevelStatGain,
  calculateRealmBreakthroughStatGain,
  getReputationTitle,
} from '../backend/src/domain/gameCatalog.js';
import { calculateCombatPower } from '../shared/data/combatPower.js';
import { BOSS_LIST } from '../shared/data/bosses.js';
import {
  calculateJackpotAmount,
  calculateJackpotRate,
  calculatePayoutPool,
  distributeByStake,
  getTreasureRoundTiming,
} from '../backend/src/domain/treasureHouse.js';

test('validates inventory entries against known item definitions', () => {
  assert.equal(assertValidInventoryEntry({ itemId: 'thao_duoc' }).type, 'material');
  assert.equal(assertValidInventoryEntry({ itemId: 'huyet_ma_kiem', enhanceLevel: 2 }).type, 'equipment');

  assert.throws(
    () => assertValidInventoryEntry({ itemId: 'thao_duoc', enhanceLevel: 1 }),
    /Chỉ trang bị mới có cấp cường hóa/,
  );
  assert.throws(
    () => assertValidInventoryEntry({ itemId: 'missing_item' }),
    /Vật phẩm không tồn tại/,
  );
});

test('validates equipment type and slot', () => {
  assert.equal(assertEquipmentForSlot({ itemId: 'huyet_ma_kiem', slot: 'weapon' }).slot, 'weapon');

  assert.throws(
    () => assertEquipmentForSlot({ itemId: 'huyet_ma_kiem', slot: 'armor' }),
    /Vật phẩm không khớp ô trang bị/,
  );
  assert.throws(
    () => assertEquipmentForSlot({ itemId: 'tu_khi_dan', slot: 'weapon' }),
    /Vật phẩm không phải trang bị/,
  );
});

test('calculates server-side exp progression like the client mapper expects', () => {
  assert.deepEqual(
    calculateExpProgress({ realmIndex: 0, level: 1, exp: 90, maxExp: 100 }, 40),
    { level: 2, exp: 30, maxExp: 200 },
  );

  assert.deepEqual(
    calculateExpProgress({ realmIndex: 0, level: 9, exp: 950, maxExp: 900 }, 500),
    { level: 9, exp: 900, maxExp: 900 },
  );
});

test('calculates stat growth for minor level ups', () => {
  assert.deepEqual(
    calculateLevelStatGain({ realmIndex: 0, fromLevel: 1, toLevel: 3 }),
    { maxHp: 24, attack: 4, defense: 4, agility: 2, spirit: 4, cultivationSpeed: 0.02 },
  );

  assert.deepEqual(
    calculateLevelStatGain({ realmIndex: 2, fromLevel: 5, toLevel: 5 }),
    { maxHp: 0, attack: 0, defense: 0, agility: 0, spirit: 0, cultivationSpeed: 0 },
  );
});

test('calculates larger stat growth for realm breakthrough', () => {
  assert.deepEqual(
    calculateRealmBreakthroughStatGain({ toRealmIndex: 1 }),
    { maxHp: 160, attack: 24, defense: 20, agility: 14, spirit: 28, cultivationSpeed: 0.05 },
  );
});

test('builds whitelisted character stat update fragments', () => {
  const result = buildStatIncrementFragments({
    attack: 10,
    cultivationSpeed: 0.1,
    unsupported: 99,
  });

  assert.deepEqual(result.fragments, [
    'attack = attack + $2',
    'cultivation_speed = cultivation_speed + $3',
  ]);
  assert.deepEqual(result.values, [10, 0.1]);
});

test('calculates alchemy progression with level-specific max exp', () => {
  assert.equal(calculateAlchemyMaxExp(1), 50);
  assert.equal(calculateAlchemyMaxExp(3), 112);

  assert.deepEqual(
    calculateAlchemyProgress({ level: 3, exp: 90 }, 30),
    { level: 4, exp: 8, maxExp: 168 },
  );
});

test('uses the shared reputation catalog shape for fallback lookups', () => {
  const title = getReputationTitle(300);

  assert.equal(title.level, 3);
  assert.equal(title.title, title.vietnm);
  assert.equal(title.globalnm, 'Known Cultivator');
});

test('calculates combat power with realm floors above previous realm peak', () => {
  const sharedStats = { attack: 10, defense: 10, spirit: 10, agility: 5 };
  const nascentSoulPeak = calculateCombatPower({ ...sharedStats, realmIndex: 3, level: 9 });
  const soulFormationEntry = calculateCombatPower({ ...sharedStats, realmIndex: 4, level: 1 });

  assert.ok(soulFormationEntry > nascentSoulPeak);
  assert.equal(calculateCombatPower({ realmIndex: 0, level: 1 }), 100000);
});

test('boss catalog entries are ready for database seeding', () => {
  assert.ok(BOSS_LIST.length >= 1);
  for (const boss of BOSS_LIST) {
    assert.ok(boss.id);
    assert.ok(boss.name);
    assert.ok(boss.maxHp > 0);
    assert.ok(boss.respawnHours > 0);
    assert.ok(boss.rewards && typeof boss.rewards === 'object');
    assert.ok(boss.rewards.raidMinutes >= 15);
    assert.ok(boss.rewards.dailyAttackLimit >= 1);
    assert.ok(Array.isArray(boss.rewards.phases));
    assert.ok(boss.rewards.phases.length >= 1);
    assert.ok(boss.rewards.phases.every((phase) => phase.requiredParticipants >= 1));
    assert.ok(Array.isArray(boss.rewards.loot));
    assert.ok(boss.rewards.loot.some((drop) => drop.mode === 'treasury'));
  }
});

test('calculates treasure house payout limits', () => {
  assert.equal(calculateJackpotRate(2000000), 0.1);
  assert.equal(calculateJackpotRate(50000), 0.05);
  assert.equal(calculatePayoutPool({ potAmount: 1000, losingTotal: 500, winningTotal: 2000, payoutMultiplier: 1.8 }), 1500);
  assert.equal(calculateJackpotAmount({ remainingPot: 10000, jackpotTriggered: true, jackpotPayoutPercent: 0.25 }), 2500);
});

test('distributes treasure house rewards by stake', () => {
  assert.deepEqual(
    distributeByStake([{ id: 1, amount: 1 }, { id: 2, amount: 3 }], 100),
    [{ id: 1, amount: 25 }, { id: 2, amount: 75 }],
  );
});

test('keeps treasure house in settling phase after betting closes', () => {
  const timing = getTreasureRoundTiming(
    {
      status: 'betting',
      closes_at: new Date(Date.now() - 1000).toISOString(),
    },
    { settleSeconds: 10 },
  );

  assert.equal(timing.phase, 'settling');
  assert.ok(timing.settleSecondsRemaining > 0);
});
