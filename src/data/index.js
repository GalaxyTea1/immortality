// Central export file for all game data
export { ITEM_DEFINITIONS, getItemsByType, getItemsBySlot, getRarityColor } from './items.js';
export { REALMS, TRIBULATION_REQUIREMENTS, REPUTATION_TITLES, getReputationTitleByPoints } from './realms.js';
export { ALCHEMY_RECIPES, ALCHEMY_BASE_MAX_EXP, calculateAlchemyMaxExp, calculateAlchemyProgress } from './recipes.js';
export { WORLD_ZONES, getZonesByDanger, canEnterZone, calculateZoneRewards } from './zones.js';
