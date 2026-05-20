import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertEquipmentForSlot,
  assertValidInventoryEntry,
  buildStatIncrementFragments,
  calculateExpProgress,
} from '../backend/src/domain/gameCatalog.js';

test('validates inventory entries against known item definitions', () => {
  assert.equal(assertValidInventoryEntry({ itemId: 'thao_duoc' }).type, 'material');
  assert.equal(assertValidInventoryEntry({ itemId: 'huyet_ma_kiem', enhanceLevel: 2 }).type, 'equipment');

  assert.throws(
    () => assertValidInventoryEntry({ itemId: 'thao_duoc', enhanceLevel: 1 }),
    /Only equipment can have enhanceLevel/,
  );
  assert.throws(
    () => assertValidInventoryEntry({ itemId: 'missing_item' }),
    /Unknown item/,
  );
});

test('validates equipment type and slot', () => {
  assert.equal(assertEquipmentForSlot({ itemId: 'huyet_ma_kiem', slot: 'weapon' }).slot, 'weapon');

  assert.throws(
    () => assertEquipmentForSlot({ itemId: 'huyet_ma_kiem', slot: 'armor' }),
    /Item does not match equipment slot/,
  );
  assert.throws(
    () => assertEquipmentForSlot({ itemId: 'tu_khi_dan', slot: 'weapon' }),
    /Item is not equipment/,
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
