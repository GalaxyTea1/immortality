import { ITEM_DEFINITIONS } from "../../../shared/data/items.js";
import { REALMS, TRIBULATION_REQUIREMENTS } from "../../../shared/data/realms.js";
import { ALCHEMY_RECIPES } from "../../../shared/data/recipes.js";
import { WORLD_ZONES, calculateZoneRewards, canEnterZone } from "../../../shared/data/zones.js";

export const VALID_EQUIPMENT_SLOTS = new Set(["spirit", "weapon", "armor", "vip", "speed", "fashion"]);

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
export { ALCHEMY_RECIPES, REALMS, TRIBULATION_REQUIREMENTS, WORLD_ZONES, calculateZoneRewards, canEnterZone };

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
    const titles = [
        { level: 1, minPoints: 0, title: "Nameless" },
        { level: 2, minPoints: 100, title: "Newcomer" },
        { level: 3, minPoints: 300, title: "Known Cultivator" },
        { level: 4, minPoints: 600, title: "Regional Name" },
        { level: 5, minPoints: 1000, title: "Storm Figure" },
        { level: 6, minPoints: 2000, title: "Grandmaster" },
        { level: 7, minPoints: 5000, title: "Peerless" },
        { level: 8, minPoints: 10000, title: "Legendary" },
    ];

    return titles.reduce((current, title) => (points >= title.minPoints ? title : current), titles[0]);
};
