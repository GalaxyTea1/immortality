import { pathToFileURL } from 'node:url';
import { pool } from './index.js';
import { ITEM_DEFINITIONS } from '../../../shared/data/items.js';
import { REPUTATION_TITLES } from '../../../shared/data/realms.js';
import { BOSS_LIST } from '../../../shared/data/bosses.js';
import { SHOP_CATALOG } from '../../../shared/shopCatalog.js';

const toJson = (value) => JSON.stringify(value || {});

const toNonNegativeInteger = (value, fallback = 0) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return fallback;
  return Math.floor(numberValue);
};

const splitCatalogItem = (itemId, item) => {
  const {
    id,
    name,
    description = '',
    type,
    rarity = 'common',
    slot = null,
    effect = {},
    price = 0,
    image = '',
    ...metadata
  } = item;

  void id;

  return {
    itemId,
    name: name || itemId,
    description,
    type,
    rarity,
    slot,
    effect,
    price: toNonNegativeInteger(price),
    image,
    metadata,
  };
};

const upsertItemDefinition = async (client, itemId, item) => {
  const normalized = splitCatalogItem(itemId, item);

  await client.query(
    `INSERT INTO item_definitions (
       item_id, name, description, type, rarity, slot, effect, price, image, metadata, is_active
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb, TRUE)
     ON CONFLICT (item_id)
     DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       type = EXCLUDED.type,
       rarity = EXCLUDED.rarity,
       slot = EXCLUDED.slot,
       effect = EXCLUDED.effect,
       price = EXCLUDED.price,
       image = EXCLUDED.image,
       metadata = EXCLUDED.metadata,
       is_active = TRUE`,
    [
      normalized.itemId,
      normalized.name,
      normalized.description,
      normalized.type,
      normalized.rarity,
      normalized.slot,
      toJson(normalized.effect),
      normalized.price,
      normalized.image,
      toJson(normalized.metadata),
    ]
  );
};

const upsertShopItem = async (client, item, sortOrder) => {
  const itemDef = ITEM_DEFINITIONS[item.itemId];
  if (!itemDef) {
    throw new Error(`Shop item "${item.itemId}" is missing from ITEM_DEFINITIONS`);
  }

  await client.query(
    `INSERT INTO shop_items (item_id, category, tier, price, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (item_id)
     DO UPDATE SET
       category = EXCLUDED.category,
       tier = EXCLUDED.tier,
       price = EXCLUDED.price,
       sort_order = EXCLUDED.sort_order,
       is_active = TRUE`,
    [
      item.itemId,
      item.category || itemDef.type,
      item.tier || itemDef.rarity || 'common',
      toNonNegativeInteger(item.price, itemDef.price || 0),
      sortOrder,
    ]
  );
};

const upsertReputationTitle = async (client, title) => {
  await client.query(
    `INSERT INTO reputation_titles (level, min_points, vietnm, globalnm, color, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (level)
     DO UPDATE SET
       min_points = EXCLUDED.min_points,
       vietnm = EXCLUDED.vietnm,
       globalnm = EXCLUDED.globalnm,
       color = EXCLUDED.color,
       is_active = TRUE`,
    [
      title.level,
      toNonNegativeInteger(title.minPoints),
      title.vietnm || title.title,
      title.globalnm || title.title,
      title.color || 'gray',
    ]
  );
};

const upsertBossDefinition = async (client, boss) => {
  await client.query(
    `INSERT INTO boss_definitions (
       boss_id, name, description, realm_index, level, max_hp, attack, defense, rewards, image, respawn_hours, is_active
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, TRUE)
     ON CONFLICT (boss_id)
     DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       realm_index = EXCLUDED.realm_index,
       level = EXCLUDED.level,
       max_hp = EXCLUDED.max_hp,
       attack = EXCLUDED.attack,
       defense = EXCLUDED.defense,
       rewards = EXCLUDED.rewards,
       image = EXCLUDED.image,
       respawn_hours = EXCLUDED.respawn_hours,
       is_active = TRUE`,
    [
      boss.id,
      boss.name,
      boss.description || '',
      toNonNegativeInteger(boss.realmIndex),
      toNonNegativeInteger(boss.level, 1),
      toNonNegativeInteger(boss.maxHp, 1),
      toNonNegativeInteger(boss.attack),
      toNonNegativeInteger(boss.defense),
      toJson(boss.rewards),
      boss.image || '',
      toNonNegativeInteger(boss.respawnHours, 24),
    ]
  );
};

const seedCatalogWithClient = async (client) => {
  const definitions = Object.entries(ITEM_DEFINITIONS);

  for (const [itemId, item] of definitions) {
    await upsertItemDefinition(client, itemId, item);
  }

  for (const [index, item] of SHOP_CATALOG.entries()) {
    await upsertShopItem(client, item, index);
  }

  for (const title of REPUTATION_TITLES) {
    await upsertReputationTitle(client, title);
  }

  for (const boss of BOSS_LIST) {
    await upsertBossDefinition(client, boss);
  }

  return {
    itemDefinitions: definitions.length,
    shopItems: SHOP_CATALOG.length,
    reputationTitles: REPUTATION_TITLES.length,
    bossDefinitions: BOSS_LIST.length,
  };
};

export const seedCatalog = async (client = null) => {
  if (client) {
    return seedCatalogWithClient(client);
  }

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    const result = await seedCatalogWithClient(dbClient);
    await dbClient.query('COMMIT');
    return result;
  } catch (error) {
    await dbClient.query('ROLLBACK');
    throw error;
  } finally {
    dbClient.release();
  }
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  seedCatalog()
    .then(async (result) => {
      console.log(
        `Seeded ${result.itemDefinitions} item definitions, ${result.shopItems} shop items, ${result.reputationTitles} reputation titles, and ${result.bossDefinitions} boss definitions.`
      );
      await pool.end();
    })
    .catch(async (error) => {
      console.error('Catalog seed failed:', error);
      await pool.end();
      process.exit(1);
    });
}
