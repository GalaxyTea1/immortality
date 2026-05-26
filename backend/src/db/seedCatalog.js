import { pathToFileURL } from 'node:url';
import { pool } from './index.js';
import { ITEM_DEFINITIONS } from '../../../shared/data/items.js';
import { REPUTATION_TITLES } from '../../../shared/data/realms.js';
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

  return {
    itemDefinitions: definitions.length,
    shopItems: SHOP_CATALOG.length,
    reputationTitles: REPUTATION_TITLES.length,
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
        `Seeded ${result.itemDefinitions} item definitions, ${result.shopItems} shop items, and ${result.reputationTitles} reputation titles.`
      );
      await pool.end();
    })
    .catch(async (error) => {
      console.error('Catalog seed failed:', error);
      await pool.end();
      process.exit(1);
    });
}
