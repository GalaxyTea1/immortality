import { ITEM_DEFINITIONS } from '../../../src/data/items.js';
import { REALMS } from '../../../src/data/realms.js';

export const VALID_EQUIPMENT_SLOTS = new Set([
  'spirit',
  'weapon',
  'armor',
  'vip',
  'speed',
  'fashion',
]);

const STAT_COLUMNS = {
  hp: 'hp',
  maxHp: 'max_hp',
  attack: 'attack',
  defense: 'defense',
  agility: 'agility',
  spirit: 'spirit',
  cultivationSpeed: 'cultivation_speed',
};

export const getItemDefinition = (itemId) => ITEM_DEFINITIONS[itemId] || null;

export const assertKnownItem = (itemId) => {
  const itemDef = getItemDefinition(itemId);
  if (!itemDef) {
    const error = new Error('Unknown item');
    error.status = 400;
    throw error;
  }
  return itemDef;
};

export const assertValidInventoryEntry = ({ itemId, enhanceLevel = 0 }) => {
  const itemDef = assertKnownItem(itemId);
  if (itemDef.type !== 'equipment' && enhanceLevel !== 0) {
    const error = new Error('Only equipment can have enhanceLevel');
    error.status = 400;
    throw error;
  }
  return itemDef;
};

export const assertEquipmentForSlot = ({ itemId, slot }) => {
  const itemDef = assertKnownItem(itemId);

  if (!VALID_EQUIPMENT_SLOTS.has(slot)) {
    const error = new Error('Invalid equipment slot');
    error.status = 400;
    throw error;
  }

  if (itemDef.type !== 'equipment') {
    const error = new Error('Item is not equipment');
    error.status = 400;
    throw error;
  }

  if (itemDef.slot !== slot) {
    const error = new Error('Item does not match equipment slot');
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
    if (!column || typeof amount !== 'number') continue;
    fragments.push(`${column} = ${column} + $${values.length + 2}`);
    values.push(amount);
  }

  return { fragments, values };
};
