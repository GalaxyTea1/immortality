import test from 'node:test';
import assert from 'node:assert/strict';

import { ITEM_DEFINITIONS } from '../src/data/items.js';
import { SHOP_CATALOG, findShopCatalogItem } from '../shared/shopCatalog.js';

const VALID_CATEGORIES = new Set(['pill', 'material', 'equipment', 'book']);
const VALID_TIERS = new Set(['yellow', 'black', 'earth', 'heaven']);

test('shop catalog has unique purchasable item ids', () => {
  const ids = SHOP_CATALOG.map((item) => item.itemId);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length > 0);
});

test('shop catalog entries point to defined frontend items', () => {
  for (const item of SHOP_CATALOG) {
    const definition = ITEM_DEFINITIONS[item.itemId];

    assert.ok(definition, `Missing ITEM_DEFINITIONS entry for ${item.itemId}`);
    assert.equal(item.category, definition.type, `${item.itemId} category should match definition type`);
    assert.ok(VALID_CATEGORIES.has(item.category), `${item.itemId} has invalid category`);
    assert.ok(VALID_TIERS.has(item.tier), `${item.itemId} has invalid tier`);
    assert.equal(typeof item.price, 'number');
    assert.ok(item.price > 0, `${item.itemId} price should be positive`);
  }
});

test('findShopCatalogItem resolves by itemId', () => {
  const firstItem = SHOP_CATALOG[0];
  assert.deepEqual(findShopCatalogItem(firstItem.itemId), firstItem);
  assert.equal(findShopCatalogItem('missing_item'), undefined);
});
