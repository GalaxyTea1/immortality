// Central export file for all game data
export { ITEM_DEFINITIONS, getItemsByType, getItemsBySlot, getRarityColor } from './items.js';
export { REALMS, TRIBULATION_REQUIREMENTS, REPUTATION_TITLES, getReputationTitleByPoints } from './realms.js';
export { ALCHEMY_RECIPES, ALCHEMY_BASE_MAX_EXP, calculateAlchemyMaxExp, calculateAlchemyProgress } from './recipes.js';
export { WORLD_ZONES, getZonesByDanger, canEnterZone, calculateZoneRewards } from './zones.js';
export { COMBAT_POWER_LEVEL_STEP, COMBAT_POWER_REALM_STEP, COMBAT_POWER_STAT_WEIGHT, calculateCombatPower, getCombatStatSum } from './combatPower.js';
