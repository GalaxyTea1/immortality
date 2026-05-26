import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Import dữ liệu từ các file riêng biệt
import { ITEM_DEFINITIONS } from '../data/items.js';
import { REALMS, TRIBULATION_REQUIREMENTS, REPUTATION_TITLES } from '../data/realms.js';
import { ALCHEMY_RECIPES, calculateAlchemyMaxExp } from '../data/recipes.js';
import { WORLD_ZONES } from '../data/zones.js';
import { createGameStateMappers } from './gameStateMappers.js';
import { useGameInventoryEquipment } from './useGameInventoryEquipment.js';
import { useGameProgression } from './useGameProgression.js';
import { useGameServerSync } from './useGameServerSync.js';
import { useGameWorldSystems } from './useGameWorldSystems.js';
import { items as itemCatalogApi } from '../services/api.js';

// Trạng thái ban đầu của game
const initialState = {
  player: {
    name: 'Đạo Hữu',
    realmIndex: 0, // Index trong REALMS
    level: 1,      // Tầng trong cảnh giới (1-9)
    exp: 0,
    maxExp: 100,
  },
  resources: {
    spiritStones: 1000,  // Linh Thạch
    pills: 10,           // Đan Dược (legacy, sẽ dùng inventory)
  },
  // Inventory: mảng các { itemId, quantity, uid? (for equipment), enhanceLevel? }
  inventory: [
    { itemId: 'tieu_hoan_dan', quantity: 5 },
    { itemId: 'tu_khi_dan', quantity: 3 },
    { itemId: 'thao_duoc', quantity: 20 },
  ],
  // Trang bị đang đeo - 6 slots
  equipment: {
    spirit: null,
    weapon: null,
    armor: null,
    vip: null,
    speed: null,
    fashion: null,
  },
  // Chỉ số cơ bản (không tính trang bị)
  baseStats: {
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 5,
    agility: 10,
    spirit: 10,
    cultivationSpeed: 1.0,
  },
  // Stats tổng hợp
  stats: {
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 5,
    agility: 10,
    spirit: 10,
    cultivationSpeed: 1.0,
  },
  learnedSkills: [],

  // ===== HỆ THỐNG CĂN CƠ =====
  foundation: {
    value: 100,
    maxValue: 100,
    danUsedCount: 0,
    expBonus: 0.05,
    lastRecovery: Date.now(),
  },

  // ===== HỆ THỐNG TÂM MA =====
  innerDemon: {
    value: 0,
    maxValue: 100,
    threshold: 70,
    suppressCount: 0,
  },

  // ===== HỆ THỐNG DANH VỌNG =====
  reputation: {
    value: 0,
    level: 1,
    title: 'Vô Danh',
    explorationPoints: 0,
    questPoints: 0,
    cultivationPoints: 0,
  },

  // ===== HỆ THỐNG LUYỆN ĐAN =====
  alchemy: {
    level: 1,
    exp: 0,
    maxExp: calculateAlchemyMaxExp(1),
    successRate: 0.6,
    craftCount: 0,
  },

  // ===== HỆ THỐNG THIỀN ĐỊNH =====
  lastMeditationTime: null, // Timestamp of last meditation
  meditation: {
    isMeditating: false,
    startedAt: null,
  },

  // Exploration system
  exploration: {
    currentLocation: null,
    isExploring: false,
    explorationCount: 0,
    maxExplorationPerDay: 10,
  },
  // Quest system
  quests: {
    active: {
      id: 'daily_gather',
      name: 'Thu Thập Thảo Dược',
      description: 'Thu thập 10 Thảo Dược từ các vùng đất.',
      type: 'daily',
      progress: 0,
      target: 10,
      rewards: { spiritStones: 100, exp: 50 },
    },
    completed: [],
  },
  // Event log
  events: [
    { id: 1, type: 'info', message: 'Chào mừng đến với Tu Tiên Giới!', time: Date.now() },
  ],
};

const GameContext = createContext(null);
const HP_REGEN_INTERVAL_MS = 60 * 1000;
const HP_REGEN_PERCENT_PER_INTERVAL = 0.01;

const getHpRegenAmount = (maxHp) => Math.max(1, Math.ceil((Number(maxHp) || 1) * HP_REGEN_PERCENT_PER_INTERVAL));

const normalizeItemCatalog = (items = []) => (
  items.reduce((catalog, item) => {
    const itemId = item.itemId || item.id;
    if (!itemId) return catalog;

    catalog[itemId] = {
      ...item,
      id: itemId,
      itemId,
      effect: item.effect || {},
      metadata: item.metadata || {},
    };
    return catalog;
  }, {})
);

// ==================== SERVER SYNC HELPERS ====================

const {
  mapServerToGameState,
  mapGameStateToServer,
  mapInventoryToServer,
  mapEquipmentToServer,
} = createGameStateMappers(initialState);

export const gameStateTestUtils = {
  initialState,
  mapServerToGameState,
  mapGameStateToServer,
  mapInventoryToServer,
  mapEquipmentToServer,
};

export function GameProvider({ children, characterId }) {
  const [gameState, setGameStateRaw] = useState(initialState);
  const [itemDefinitions, setItemDefinitions] = useState(ITEM_DEFINITIONS);
  const characterIdRef = useRef(characterId);
  const activeMappers = useMemo(
    () => createGameStateMappers(initialState, itemDefinitions),
    [itemDefinitions]
  );

  useEffect(() => {
    let isMounted = true;

    itemCatalogApi.getAll()
      .then((items) => {
        if (!isMounted || !Array.isArray(items) || items.length === 0) return;
        setItemDefinitions({
          ...ITEM_DEFINITIONS,
          ...normalizeItemCatalog(items),
        });
      })
      .catch((error) => {
        console.warn('Load item catalog failed, using bundled fallback:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setGameState = useCallback((updater) => {
    setGameStateRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setGameState(prev => {
        const currentHp = Number(prev.stats.hp) || 0;
        const maxHp = Math.max(Number(prev.stats.maxHp) || 1, 1);
        if (currentHp >= maxHp) return prev;

        const regenAmount = getHpRegenAmount(maxHp);
        const nextHp = Math.min(maxHp, currentHp + regenAmount);
        const nextBaseHp = Math.min(
          Number(prev.baseStats.maxHp) || maxHp,
          (Number(prev.baseStats.hp) || 0) + regenAmount
        );

        return {
          ...prev,
          baseStats: {
            ...prev.baseStats,
            hp: nextBaseHp,
          },
          stats: {
            ...prev.stats,
            hp: nextHp,
          },
        };
      });
    }, HP_REGEN_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [setGameState]);

  const { isServerLoading, loadFromServer } = useGameServerSync({
    characterId,
    setGameState,
    characterIdRef,
    mapServerToGameState: activeMappers.mapServerToGameState,
  });

  const {
    formatNumber,
    canBreakthrough,
  } = useGameProgression({ gameState });

  const {
    getInventoryWithDetails,
  } = useGameInventoryEquipment({ gameState, itemDefinitions });

  const {
    addEvent,
    getFoundationStatus,
    getInnerDemonStatus,
  } = useGameWorldSystems({
    gameState,
    setGameState,
  });


  const value = {
    gameState,
    setGameState,
    characterId,
    formatNumber,
    canBreakthrough,
    getInventoryWithDetails,
    addEvent,
    getFoundationStatus,
    getInnerDemonStatus,
    loadFromServer,
    isServerLoading,
    ITEM_DEFINITIONS: itemDefinitions,
    ALCHEMY_RECIPES,
    REPUTATION_TITLES,
    REALMS,
    TRIBULATION_REQUIREMENTS,
    WORLD_ZONES,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
}

export default GameContext;
