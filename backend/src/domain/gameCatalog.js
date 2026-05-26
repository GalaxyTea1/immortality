import { ITEM_DEFINITIONS } from "../../../shared/data/items.js";
import { REALMS, REPUTATION_TITLES, TRIBULATION_REQUIREMENTS, getReputationTitleByPoints } from "../../../shared/data/realms.js";
import { ALCHEMY_RECIPES, calculateAlchemyMaxExp, calculateAlchemyProgress } from "../../../shared/data/recipes.js";
import { WORLD_ZONES, calculateZoneRewards, canEnterZone } from "../../../shared/data/zones.js";

export const VALID_EQUIPMENT_SLOTS = new Set(["spirit", "weapon", "armor", "vip", "speed", "fashion"]);
export const HP_REGEN_INTERVAL_SECONDS = 60;
export const HP_REGEN_PERCENT_PER_INTERVAL = 0.01;

const STAT_COLUMNS = {
    hp: "hp",
    maxHp: "max_hp",
    attack: "attack",
    defense: "defense",
    agility: "agility",
    spirit: "spirit",
    cultivationSpeed: "cultivation_speed",
};

export const getItemDefinition = (itemId) => ITEM_DEFINITIONS[itemId] || null;
export {
    ALCHEMY_RECIPES,
    calculateAlchemyMaxExp,
    calculateAlchemyProgress,
    REALMS,
    REPUTATION_TITLES,
    TRIBULATION_REQUIREMENTS,
    WORLD_ZONES,
    calculateZoneRewards,
    canEnterZone,
};

const runCatalogQuery = async (executor, text, params = []) => {
    if (executor?.query) {
        return executor.query(text, params);
    }

    const { query } = await import("../db/index.js");
    return query(text, params);
};

export const mapItemDefinitionRow = (row) => ({
    id: row.item_id,
    itemId: row.item_id,
    name: row.name,
    description: row.description || "",
    type: row.type,
    rarity: row.rarity || "common",
    slot: row.slot || undefined,
    effect: row.effect || {},
    price: Number(row.price) || 0,
    image: row.image || "",
    metadata: row.metadata || {},
});

const mapShopItemRow = (row) => ({
    ...mapItemDefinitionRow({
        ...row,
        price: row.shop_price ?? row.base_price ?? row.price,
    }),
    category: row.category,
    tier: row.tier,
    sortOrder: Number(row.sort_order) || 0,
});

const mapReputationTitleRow = (row) => ({
    level: Number(row.level) || 1,
    minPoints: Number(row.min_points) || 0,
    vietnm: row.vietnm,
    globalnm: row.globalnm,
    title: row.vietnm,
    color: row.color || "gray",
});

export const applyHpRegeneration = async (characterId, executor = null) => {
    const result = await runCatalogQuery(
        executor,
        `WITH equipment_bonus AS (
             SELECT
                 e.character_id,
                 COALESCE(SUM(COALESCE((i.effect->>'maxHp')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_max_hp
             FROM equipment e
             JOIN item_definitions i ON i.item_id = e.item_id
             WHERE e.character_id = $1
             GROUP BY e.character_id
         ),
         target AS (
             SELECT
                 c.id,
                 COALESCE(c.hp, 1) AS hp,
                 (COALESCE(c.max_hp, 1) + COALESCE(eb.bonus_max_hp, 0))::integer AS effective_max_hp,
                 COALESCE(c.last_hp_regen_at, c.updated_at, NOW()) AS regen_at,
                 GREATEST(
                     0,
                     FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(c.last_hp_regen_at, c.updated_at, NOW()))) / $2::numeric)
                 )::integer AS regen_ticks
             FROM characters c
             LEFT JOIN equipment_bonus eb ON eb.character_id = c.id
             WHERE c.id = $1
             FOR UPDATE OF c
         ),
         next_values AS (
             SELECT
                 *,
                 GREATEST(1, CEIL(effective_max_hp * $3::numeric))::integer AS hp_per_tick
             FROM target
         )
         UPDATE characters c
         SET hp = LEAST(
                 next_values.effective_max_hp,
                 next_values.hp + next_values.regen_ticks * next_values.hp_per_tick
             ),
             last_hp_regen_at = CASE
                 WHEN LEAST(
                     next_values.effective_max_hp,
                     next_values.hp + next_values.regen_ticks * next_values.hp_per_tick
                 ) >= next_values.effective_max_hp THEN NOW()
                 WHEN next_values.regen_ticks > 0 THEN next_values.regen_at + (next_values.regen_ticks * ($2::integer * INTERVAL '1 second'))
                 ELSE next_values.regen_at
             END
         FROM next_values
         WHERE c.id = next_values.id
         RETURNING c.*`,
        [characterId, HP_REGEN_INTERVAL_SECONDS, HP_REGEN_PERCENT_PER_INTERVAL]
    );

    return result.rows[0] || null;
};

export const clampHpToEffectiveMax = async (characterId, executor = null) => {
    const result = await runCatalogQuery(
        executor,
        `WITH equipment_bonus AS (
             SELECT
                 e.character_id,
                 COALESCE(SUM(COALESCE((i.effect->>'maxHp')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_max_hp
             FROM equipment e
             JOIN item_definitions i ON i.item_id = e.item_id
             WHERE e.character_id = $1
             GROUP BY e.character_id
         ),
         effective_stats AS (
             SELECT
                 c.id,
                 (COALESCE(c.max_hp, 1) + COALESCE(eb.bonus_max_hp, 0))::integer AS effective_max_hp
             FROM characters c
             LEFT JOIN equipment_bonus eb ON eb.character_id = c.id
             WHERE c.id = $1
             FOR UPDATE OF c
         )
         UPDATE characters c
         SET hp = LEAST(c.hp, effective_stats.effective_max_hp),
             last_hp_regen_at = NOW()
         FROM effective_stats
         WHERE c.id = effective_stats.id
         RETURNING c.*`,
        [characterId]
    );

    return result.rows[0] || null;
};

export const listItemDefinitionsFromDb = async ({ type } = {}, executor = null) => {
    const params = [];
    const filters = ["is_active = TRUE"];

    if (type) {
        params.push(type);
        filters.push(`type = $${params.length}`);
    }

    const result = await runCatalogQuery(
        executor,
        `SELECT item_id, name, description, type, rarity, slot, effect, price, image, metadata
         FROM item_definitions
         WHERE ${filters.join(" AND ")}
         ORDER BY type ASC, rarity ASC, name ASC`,
        params
    );

    return result.rows.map(mapItemDefinitionRow);
};

export const getItemDefinitionFromDb = async (itemId, executor = null) => {
    const result = await runCatalogQuery(
        executor,
        `SELECT item_id, name, description, type, rarity, slot, effect, price, image, metadata
         FROM item_definitions
         WHERE item_id = $1 AND is_active = TRUE`,
        [itemId]
    );

    return result.rows[0] ? mapItemDefinitionRow(result.rows[0]) : null;
};

export const assertKnownItemFromDb = async (itemId, executor = null) => {
    const itemDef = await getItemDefinitionFromDb(itemId, executor);
    if (!itemDef) {
        const error = new Error("Unknown item");
        error.status = 400;
        throw error;
    }
    return itemDef;
};

export const assertValidInventoryEntryFromDb = async ({ itemId, enhanceLevel = 0 }, executor = null) => {
    const itemDef = await assertKnownItemFromDb(itemId, executor);
    if (itemDef.type !== "equipment" && enhanceLevel !== 0) {
        const error = new Error("Only equipment can have enhanceLevel");
        error.status = 400;
        throw error;
    }
    return itemDef;
};

export const assertEquipmentForSlotFromDb = async ({ itemId, slot }, executor = null) => {
    const itemDef = await assertKnownItemFromDb(itemId, executor);

    if (!VALID_EQUIPMENT_SLOTS.has(slot)) {
        const error = new Error("Invalid equipment slot");
        error.status = 400;
        throw error;
    }

    if (itemDef.type !== "equipment") {
        const error = new Error("Item is not equipment");
        error.status = 400;
        throw error;
    }

    if (itemDef.slot !== slot) {
        const error = new Error("Item does not match equipment slot");
        error.status = 400;
        throw error;
    }

    return itemDef;
};

export const listShopCatalogItemsFromDb = async ({ category } = {}, executor = null) => {
    const params = [];
    const filters = ["s.is_active = TRUE", "i.is_active = TRUE"];

    if (category) {
        params.push(category);
        filters.push(`s.category = $${params.length}`);
    }

    const result = await runCatalogQuery(
        executor,
        `SELECT
             i.item_id,
             i.name,
             i.description,
             i.type,
             i.rarity,
             i.slot,
             i.effect,
             i.price AS base_price,
             i.image,
             i.metadata,
             s.category,
             s.tier,
             s.price AS shop_price,
             s.sort_order
         FROM shop_items s
         JOIN item_definitions i ON i.item_id = s.item_id
         WHERE ${filters.join(" AND ")}
         ORDER BY s.sort_order ASC, i.name ASC`,
        params
    );

    return result.rows.map(mapShopItemRow);
};

export const findShopCatalogItemFromDb = async (itemId, executor = null) => {
    const result = await runCatalogQuery(
        executor,
        `SELECT
             i.item_id,
             i.name,
             i.description,
             i.type,
             i.rarity,
             i.slot,
             i.effect,
             i.price AS base_price,
             i.image,
             i.metadata,
             s.category,
             s.tier,
             s.price AS shop_price,
             s.sort_order
         FROM shop_items s
         JOIN item_definitions i ON i.item_id = s.item_id
         WHERE s.item_id = $1 AND s.is_active = TRUE AND i.is_active = TRUE`,
        [itemId]
    );

    return result.rows[0] ? mapShopItemRow(result.rows[0]) : null;
};

export const assertKnownItem = (itemId) => {
    const itemDef = getItemDefinition(itemId);
    if (!itemDef) {
        const error = new Error("Unknown item");
        error.status = 400;
        throw error;
    }
    return itemDef;
};

export const assertValidInventoryEntry = ({ itemId, enhanceLevel = 0 }) => {
    const itemDef = assertKnownItem(itemId);
    if (itemDef.type !== "equipment" && enhanceLevel !== 0) {
        const error = new Error("Only equipment can have enhanceLevel");
        error.status = 400;
        throw error;
    }
    return itemDef;
};

export const assertEquipmentForSlot = ({ itemId, slot }) => {
    const itemDef = assertKnownItem(itemId);

    if (!VALID_EQUIPMENT_SLOTS.has(slot)) {
        const error = new Error("Invalid equipment slot");
        error.status = 400;
        throw error;
    }

    if (itemDef.type !== "equipment") {
        const error = new Error("Item is not equipment");
        error.status = 400;
        throw error;
    }

    if (itemDef.slot !== slot) {
        const error = new Error("Item does not match equipment slot");
        error.status = 400;
        throw error;
    }

    return itemDef;
};

export const calculateExpProgress = ({ realmIndex, level, exp, maxExp }, expGain) => {
    let nextExp = Number(exp) + expGain;
    let nextLevel = Number(level);
    let nextMaxExp = Number(maxExp);
    const realm = REALMS[realmIndex] || REALMS[0];

    while (nextExp >= nextMaxExp && nextLevel < realm.levels) {
        nextExp -= nextMaxExp;
        nextLevel += 1;
        nextMaxExp = realm.expPerLevel * nextLevel;
    }

    if (nextLevel >= realm.levels && nextExp > nextMaxExp) {
        nextExp = nextMaxExp;
    }

    return {
        exp: nextExp,
        level: nextLevel,
        maxExp: nextMaxExp,
    };
};

export const buildStatIncrementFragments = (effect = {}) => {
    const fragments = [];
    const values = [];

    for (const [stat, amount] of Object.entries(effect)) {
        const column = STAT_COLUMNS[stat];
        if (!column || typeof amount !== "number") continue;
        fragments.push(`${column} = ${column} + $${values.length + 2}`);
        values.push(amount);
    }

    return { fragments, values };
};

export const getReputationTitle = (points) => {
    const title = getReputationTitleByPoints(points);
    return {
        ...title,
        title: title.vietnm || title.title,
    };
};

export const listReputationTitlesFromDb = async (executor = null) => {
    const result = await runCatalogQuery(
        executor,
        `SELECT level, min_points, vietnm, globalnm, color
         FROM reputation_titles
         WHERE is_active = TRUE
         ORDER BY min_points ASC`
    );

    return result.rows.map(mapReputationTitleRow);
};

export const getReputationTitleFromDb = async (points, executor = null) => {
    const safePoints = Math.max(0, Number(points) || 0);
    const result = await runCatalogQuery(
        executor,
        `SELECT level, min_points, vietnm, globalnm, color
         FROM reputation_titles
         WHERE is_active = TRUE AND min_points <= $1
         ORDER BY min_points DESC
         LIMIT 1`,
        [safePoints]
    );

    return result.rows[0] ? mapReputationTitleRow(result.rows[0]) : getReputationTitle(safePoints);
};
