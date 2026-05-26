import { useCallback } from 'react';
import { ITEM_DEFINITIONS as FALLBACK_ITEM_DEFINITIONS } from '../data/items.js';

const getEnhancedStatValue = (value, enhanceLevel = 0) => {
  const level = Number(enhanceLevel) || 0;
  return Number.isInteger(value)
    ? Math.floor(value * level) + value
    : parseFloat((value + value * level).toFixed(2));
};

export const buildStatsWithEquipment = (
  baseStats,
  equipment,
  itemDefinitions = FALLBACK_ITEM_DEFINITIONS,
  currentHp = baseStats?.hp
) => {
  const newStats = { ...baseStats };

  for (const equipped of Object.values(equipment || {})) {
    if (!equipped?.itemId) continue;

    const itemDef = itemDefinitions[equipped.itemId];
    if (!itemDef?.effect) continue;

    for (const [stat, value] of Object.entries(itemDef.effect)) {
      if (stat !== 'hp' && newStats[stat] !== undefined && typeof value === 'number') {
        newStats[stat] += getEnhancedStatValue(value, equipped.enhanceLevel);
      }
    }
  }

  const maxHp = Math.max(Number(newStats.maxHp) || 1, 1);
  newStats.hp = Math.min(Math.max(0, Number(currentHp) || 0), maxHp);
  return newStats;
};

export function useGameInventoryEquipment({
  gameState,
  itemDefinitions = FALLBACK_ITEM_DEFINITIONS,
}) {
  const getInventoryWithDetails = useCallback(() => {
    return gameState.inventory.map((item) => ({
      ...item,
      ...itemDefinitions[item.itemId],
    }));
  }, [gameState.inventory, itemDefinitions]);

  return {
    getInventoryWithDetails,
  };
}
