import test from 'node:test';
import assert from 'node:assert/strict';

import { createGameStateMappers } from '../src/context/gameStateMappers.js';

const createInitialState = () => ({
  player: {
    name: 'Dao Huu',
    realmIndex: 0,
    level: 1,
    exp: 0,
    maxExp: 100,
  },
  resources: {
    spiritStones: 0,
    pills: 0,
  },
  baseStats: {
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 10,
    agility: 10,
    spirit: 10,
    cultivationSpeed: 1,
  },
  stats: {
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 10,
    agility: 10,
    spirit: 10,
    cultivationSpeed: 1,
  },
  foundation: {
    value: 100,
    maxValue: 100,
  },
  innerDemon: {
    value: 0,
    threshold: 60,
  },
  reputation: {
    value: 0,
    level: 0,
    title: 'Vo Danh',
  },
  alchemy: {
    level: 1,
    exp: 0,
  },
  exploration: {
    explorationCount: 0,
    lastResetDate: null,
  },
  inventory: [],
  equipment: {
    weapon: null,
    armor: null,
  },
  learnedSkills: [],
  lastMeditationTime: null,
});

test('maps server character payload into game state and recalculates equipment stats', () => {
  const initialState = createInitialState();
  const { mapServerToGameState } = createGameStateMappers(initialState);

  const mapped = mapServerToGameState(
    {
      name: 'Thanh Van',
      realm_index: 1,
      level: 3,
      exp: '45',
      max_exp: '120',
      spirit_stones: '900',
      hp: 80,
      max_hp: 120,
      attack: 15,
      defense: 12,
      agility: 11,
      spirit: 18,
      cultivation_speed: '1.25',
      foundation_value: 88,
      inner_demon_value: 7,
      reputation_points: 20,
      reputation_level: 1,
      reputation_title: 'Tan Tu',
      alchemy_level: 2,
      alchemy_exp: 30,
      exploration_count: 4,
      exploration_last_reset: new Date().toISOString(),
      last_meditation_time: '2026-01-01T00:00:00.000Z',
    },
    [{ item_id: 'huyen_thiet_giap', quantity: 2, enhance_level: 1 }],
    { armor: { itemId: 'huyen_thiet_giap', enhanceLevel: 1 } },
    [{ skill_id: 'tu_ha_bi_dien' }],
  );

  assert.equal(mapped.player.name, 'Thanh Van');
  assert.equal(mapped.player.realmIndex, 1);
  assert.equal(mapped.resources.spiritStones, 900);
  assert.equal(mapped.baseStats.cultivationSpeed, 1.25);
  assert.equal(mapped.inventory[0].itemId, 'huyen_thiet_giap');
  assert.ok(mapped.inventory[0].uid);
  assert.equal(mapped.equipment.armor.itemId, 'huyen_thiet_giap');
  assert.ok(mapped.equipment.armor.uid);
  assert.equal(mapped.stats.defense, 52);
  assert.deepEqual(mapped.learnedSkills, ['tu_ha_bi_dien']);
});

test('maps game state back to server payload', () => {
  const state = createInitialState();
  const { mapGameStateToServer } = createGameStateMappers(state);
  const meditationTime = Date.UTC(2026, 0, 2, 3, 4, 5);

  const payload = mapGameStateToServer({
    ...state,
    player: { ...state.player, name: 'Linh', exp: 75 },
    resources: { ...state.resources, spiritStones: 1234 },
    exploration: { ...state.exploration, explorationCount: 2, lastResetDate: '2026-05-19' },
    lastMeditationTime: meditationTime,
  });

  assert.equal(payload.name, 'Linh');
  assert.equal(payload.exp, 75);
  assert.equal(payload.spirit_stones, 1234);
  assert.equal(payload.exploration_count, 2);
  assert.equal(payload.exploration_last_reset, '2026-05-19');
  assert.equal(payload.last_meditation_time, new Date(meditationTime).toISOString());
});

test('maps inventory and excludes equipped item copies from server sync', () => {
  const state = createInitialState();
  const { mapInventoryToServer, mapEquipmentToServer } = createGameStateMappers(state);

  const inventoryPayload = mapInventoryToServer(
    [
      { itemId: 'huyen_thiet_giap', quantity: 2, enhanceLevel: 1 },
      { itemId: 'thao_duoc', quantity: 5 },
    ],
    {
      armor: { itemId: 'huyen_thiet_giap', enhanceLevel: 1 },
    },
  );

  assert.deepEqual(inventoryPayload, [
    { itemId: 'huyen_thiet_giap', quantity: 1, enhanceLevel: 1 },
    { itemId: 'thao_duoc', quantity: 5, enhanceLevel: 0 },
  ]);
  assert.deepEqual(mapEquipmentToServer({ weapon: null, armor: { itemId: 'huyen_thiet_giap', enhanceLevel: 1 } }), {
    armor: { itemId: 'huyen_thiet_giap', enhanceLevel: 1 },
  });
});
