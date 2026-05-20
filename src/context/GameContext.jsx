import { createContext, useContext, useState, useCallback, useRef } from 'react';

// Import dữ liệu từ các file riêng biệt
import { ITEM_DEFINITIONS } from '../data/items.js';
import { REALMS, TRIBULATION_REQUIREMENTS, REPUTATION_TITLES } from '../data/realms.js';
import { ALCHEMY_RECIPES } from '../data/recipes.js';
import { WORLD_ZONES } from '../data/zones.js';
import { createGameStateMappers } from './gameStateMappers.js';
import { useGameInventoryEquipment } from './useGameInventoryEquipment.js';
import { useGameProgression } from './useGameProgression.js';
import { useGameServerSync } from './useGameServerSync.js';
import { useGameWorldSystems } from './useGameWorldSystems.js';

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
    maxExp: 50,
    successRate: 0.6,
    craftCount: 0,
  },

  // ===== HỆ THỐNG THIỀN ĐỊNH =====
  lastMeditationTime: null, // Timestamp of last meditation

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
const STORAGE_KEY = 'immortality_save';


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
  const gameStateRef = useRef(gameState);
  const characterIdRef = useRef(characterId);

  // Wrapper: sync gameStateRef immediately (before React renders)
  const setGameState = useCallback((updater) => {
    setGameStateRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      gameStateRef.current = next; // sync ref immediately
      return next;
    });
  }, []);

  const { cancelPendingSave, isServerLoading, loadFromServer, saveToServer } = useGameServerSync({
    characterId,
    setGameState,
    gameStateRef,
    characterIdRef,
    mapServerToGameState,
  });

  const {
    addSpiritStones,
    spendSpiritStones,
    addPills,
    spendPills,
    addExp,
    getRealmName,
    formatNumber,
    canBreakthrough,
    attemptBreakthrough,
    meditate,
  } = useGameProgression({ gameState, setGameState });

  const {
    getItemInfo,
    addItem,
    removeItem,
    useItem,
    recalculateStats,
    unequipItem,
    upgradeEquipment,
    getEquippedItems,
    getInventoryWithDetails,
    buyItem,
  } = useGameInventoryEquipment({ gameState, setGameState, addExp });

  const {
    addEvent,
    exploreLocation,
    claimQuestReward,
    restoreHp,
    reduceFoundation,
    recoverFoundation,
    getFoundationStatus,
    addInnerDemon,
    suppressInnerDemon,
    getInnerDemonStatus,
    addReputation,
    craftPill,
  } = useGameWorldSystems({
    gameState,
    setGameState,
    addExp,
    addSpiritStones,
    addItem,
    removeItem,
  });

  // ===== SAVE/LOAD =====
  const resetGame = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setGameState(initialState);
  }, [setGameState]);

  const exportSave = useCallback(() => {
    const saveData = JSON.stringify(gameState);
    const blob = new Blob([saveData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tutien_save_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [gameState]);

  const importSave = useCallback((jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      setGameState({
        ...initialState,
        ...parsed,
        player: { ...initialState.player, ...parsed.player },
        resources: { ...initialState.resources, ...parsed.resources },
        stats: { ...initialState.stats, ...parsed.stats },
        equipment: { ...initialState.equipment, ...parsed.equipment },
        exploration: { ...initialState.exploration, ...parsed.exploration },
        quests: { ...initialState.quests, ...parsed.quests },
        foundation: { ...initialState.foundation, ...parsed.foundation },
        innerDemon: { ...initialState.innerDemon, ...parsed.innerDemon },
        reputation: { ...initialState.reputation, ...parsed.reputation },
        alchemy: { ...initialState.alchemy, ...parsed.alchemy },
        baseStats: { ...initialState.baseStats, ...parsed.baseStats },
      });
      return { success: true, message: 'Import thành công!' };
    } catch {
      return { success: false, message: 'File không hợp lệ!' };
    }
  }, [setGameState]);

  const value = {
    gameState,
    setGameState,
    characterId,
    addSpiritStones,
    spendSpiritStones,
    addPills,
    spendPills,
    addExp,
    getRealmName,
    formatNumber,
    // Tribulation
    canBreakthrough,
    attemptBreakthrough,
    // Meditation
    meditate,
    // Inventory
    getItemInfo,
    addItem,
    removeItem,
    useItem,
    getInventoryWithDetails,
    buyItem,
    // Equipment
    recalculateStats,
    unequipItem,
    upgradeEquipment,
    getEquippedItems,
    // Exploration & Quest
    addEvent,
    exploreLocation,
    claimQuestReward,
    restoreHp,
    // Foundation & Inner Demon
    reduceFoundation,
    recoverFoundation,
    getFoundationStatus,
    addInnerDemon,
    suppressInnerDemon,
    getInnerDemonStatus,
    // Reputation
    addReputation,
    // Alchemy
    craftPill,
    // Save/Load
    cancelPendingSave,
    saveToServer,
    loadFromServer,
    isServerLoading,
    resetGame,
    exportSave,
    importSave,
    // Data exports
    ITEM_DEFINITIONS,
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
