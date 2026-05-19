import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import * as api from '../services/api.js';

// Import dữ liệu từ các file riêng biệt
import { ITEM_DEFINITIONS } from '../data/items.js';
import { REALMS, TRIBULATION_REQUIREMENTS, REPUTATION_TITLES } from '../data/realms.js';
import { ALCHEMY_RECIPES } from '../data/recipes.js';
import { WORLD_ZONES, canEnterZone, calculateZoneRewards } from '../data/zones.js';

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

const mapServerToGameState = (charData, inventoryData, equipmentData, skillsData) => {
  const state = { ...initialState };

  // Character data → player, resources, baseStats, foundation, innerDemon, reputation, alchemy
  if (charData) {
    state.player = {
      name: charData.name || initialState.player.name,
      realmIndex: charData.realm_index ?? initialState.player.realmIndex,
      level: charData.level ?? initialState.player.level,
      exp: Number(charData.exp) || initialState.player.exp,
      maxExp: Number(charData.max_exp) || initialState.player.maxExp,
    };
    state.resources = {
      ...initialState.resources,
      spiritStones: charData.spirit_stones !== undefined
        ? Number(charData.spirit_stones)
        : initialState.resources.spiritStones,
    };
    state.baseStats = {
      hp: charData.hp ?? initialState.baseStats.hp,
      maxHp: charData.max_hp ?? initialState.baseStats.maxHp,
      attack: charData.attack ?? initialState.baseStats.attack,
      defense: charData.defense ?? initialState.baseStats.defense,
      agility: charData.agility ?? initialState.baseStats.agility,
      spirit: charData.spirit ?? initialState.baseStats.spirit,
      cultivationSpeed: parseFloat(charData.cultivation_speed) || initialState.baseStats.cultivationSpeed,
    };
    state.stats = { ...state.baseStats };
    state.foundation = {
      ...initialState.foundation,
      value: charData.foundation_value ?? initialState.foundation.value,
      maxValue: charData.foundation_max ?? initialState.foundation.maxValue,
    };
    state.innerDemon = {
      ...initialState.innerDemon,
      value: charData.inner_demon_value ?? initialState.innerDemon.value,
    };
    state.reputation = {
      ...initialState.reputation,
      value: charData.reputation_points ?? initialState.reputation.value,
      level: charData.reputation_level ?? initialState.reputation.level,
      title: charData.reputation_title || initialState.reputation.title,
    };
    state.alchemy = {
      ...initialState.alchemy,
      level: charData.alchemy_level ?? initialState.alchemy.level,
      exp: charData.alchemy_exp ?? initialState.alchemy.exp,
    };

    // Exploration data
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const serverResetDate = charData.exploration_last_reset
      ? new Date(charData.exploration_last_reset).toISOString().split('T')[0]
      : today;
    const isNewDay = serverResetDate !== today;

    state.exploration = {
      ...initialState.exploration,
      explorationCount: isNewDay ? 0 : (charData.exploration_count ?? 0),
      lastResetDate: today,
    };

    // Meditation
    state.lastMeditationTime = charData.last_meditation_time
      ? new Date(charData.last_meditation_time).getTime()
      : null;
  }

  // Inventory data → inventory array
  if (Array.isArray(inventoryData) && inventoryData.length > 0) {
    state.inventory = inventoryData.map(item => {
      const itemDef = ITEM_DEFINITIONS[item.item_id];
      const entry = {
        itemId: item.item_id,
        quantity: item.quantity,
        enhanceLevel: item.enhance_level || 0,
      };
      // Equipment items need unique uid
      if (itemDef && itemDef.type === 'equipment') {
        entry.uid = `equip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      return entry;
    });
  }

  // Equipment data → equipment object (slot → {itemId, enhanceLevel})
  if (equipmentData && typeof equipmentData === 'object') {
    for (const [slot, data] of Object.entries(equipmentData)) {
      if (data && data.itemId) {
        state.equipment[slot] = {
          itemId: data.itemId,
          enhanceLevel: data.enhanceLevel || 0,
          uid: `equip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
      }
    }
  }

  // Skills data → learnedSkills array
  if (Array.isArray(skillsData) && skillsData.length > 0) {
    state.learnedSkills = skillsData.map(s => s.skill_id);
  }

  // Recalculate stats with equipment bonuses
  const newStats = { ...state.baseStats };
  for (const [, equipped] of Object.entries(state.equipment)) {
    if (equipped && equipped.itemId) {
      const equipDef = ITEM_DEFINITIONS[equipped.itemId];
      if (equipDef && equipDef.effect) {
        for (const [stat, value] of Object.entries(equipDef.effect)) {
          if (newStats[stat] !== undefined) {
            const enhanceBonus = Number.isInteger(value)
              ? Math.floor(value * equipped.enhanceLevel)
              : parseFloat((value * equipped.enhanceLevel).toFixed(2));
            newStats[stat] += value + enhanceBonus;
          }
        }
      }
    }
  }
  state.stats = newStats;

  return state;
};


const mapGameStateToServer = (state) => {
  return {
    name: state.player.name,
    realm_index: state.player.realmIndex,
    level: state.player.level,
    exp: state.player.exp,
    max_exp: state.player.maxExp,
    spirit_stones: state.resources.spiritStones,
    hp: state.baseStats.hp,
    max_hp: state.baseStats.maxHp,
    attack: state.baseStats.attack,
    defense: state.baseStats.defense,
    agility: state.baseStats.agility,
    spirit: state.baseStats.spirit,
    cultivation_speed: state.baseStats.cultivationSpeed,
    foundation_value: state.foundation.value,
    inner_demon_value: state.innerDemon.value,
    reputation_points: state.reputation.value,
    reputation_level: state.reputation.level,
    reputation_title: state.reputation.title,
    alchemy_level: state.alchemy.level,
    alchemy_exp: state.alchemy.exp,
    exploration_count: state.exploration.explorationCount,
    exploration_last_reset: state.exploration.lastResetDate || new Date().toISOString().split('T')[0],
    last_meditation_time: state.lastMeditationTime ? new Date(state.lastMeditationTime).toISOString() : null,
  };
};

/**=
 * Group by (itemId, enhanceLevel). Exclude items currently equipped.
 */
const mapInventoryToServer = (inventory, equipment) => {
  // Collect equipped items as composite keys to subtract
  const equippedKeys = {};
  if (equipment) {
    for (const [, data] of Object.entries(equipment)) {
      if (data && data.itemId) {
        const key = `${data.itemId}__${data.enhanceLevel || 0}`;
        equippedKeys[key] = (equippedKeys[key] || 0) + 1;
      }
    }
  }

  // Group by (itemId, enhanceLevel)
  const merged = {};
  inventory.forEach(item => {
    const key = `${item.itemId}__${item.enhanceLevel || 0}`;
    if (merged[key]) {
      merged[key].quantity += item.quantity;
    } else {
      merged[key] = { itemId: item.itemId, quantity: item.quantity, enhanceLevel: item.enhanceLevel || 0 };
    }
  });

  // Subtract equipped items
  for (const [key, eqCount] of Object.entries(equippedKeys)) {
    if (merged[key]) {
      merged[key].quantity -= eqCount;
      if (merged[key].quantity <= 0) {
        delete merged[key];
      }
    }
  }

  return Object.values(merged);
};

/**
 * Map equipment state sang format backend
 * { slot: { itemId, enhanceLevel, uid } } → { slot: { itemId, enhanceLevel } }
 */
const mapEquipmentToServer = (equipment) => {
  const result = {};
  for (const [slot, data] of Object.entries(equipment)) {
    if (data && data.itemId) {
      result[slot] = {
        itemId: data.itemId,
        enhanceLevel: data.enhanceLevel || 0,
      };
    }
  }
  return result;
};

export const gameStateTestUtils = {
  initialState,
  mapServerToGameState,
  mapGameStateToServer,
  mapInventoryToServer,
  mapEquipmentToServer,
};

export function GameProvider({ children, characterId }) {
  const [gameState, setGameStateRaw] = useState(initialState);
  const [isServerLoading, setIsServerLoading] = useState(true);
  const serverSaveTimerRef = useRef(null);
  const prevStateRef = useRef(null);
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

  useEffect(() => {
    characterIdRef.current = characterId;
  }, [characterId]);

  // Load game from server when characterId is available
  useEffect(() => {
    if (!characterId) {
      setIsServerLoading(false);
      return;
    }

    const loadFromServer = async () => {
      setIsServerLoading(true);
      try {
        const [charData, inventoryData, equipmentData, skillsData] = await Promise.all([
          api.characters.get(characterId).catch(err => { console.warn('Load character failed:', err); return null; }),
          api.inventory.get(characterId).catch(err => { console.warn('Load inventory failed:', err); return []; }),
          api.equipment.get(characterId).catch(err => { console.warn('Load equipment failed:', err); return {}; }),
          api.skills.get(characterId).catch(err => { console.warn('Load skills failed:', err); return []; }),
        ]);

        if (charData) {
          const serverState = mapServerToGameState(charData, inventoryData, equipmentData, skillsData);
          setGameState(serverState);
          prevStateRef.current = serverState;
        }
      } catch (err) {
        console.error('[GameContext] Failed to load from server:', err);
      } finally {
        setIsServerLoading(false);
      }
    };

    loadFromServer();
  }, [characterId]);

  // Save to server — called after user actions (short debounce for React setState to flush)
  const saveToServer = useCallback(() => {
    const cId = characterIdRef.current;
    if (!cId) return;

    if (serverSaveTimerRef.current) {
      clearTimeout(serverSaveTimerRef.current);
    }

    serverSaveTimerRef.current = setTimeout(async () => {
      try {
        const state = gameStateRef.current;
        const charPayload = mapGameStateToServer(state);
        const invPayload = mapInventoryToServer(state.inventory, state.equipment);
        const equipPayload = mapEquipmentToServer(state.equipment);

        await Promise.all([
          api.characters.save(cId, charPayload),
          api.inventory.sync(cId, invPayload),
          api.equipment.sync(cId, equipPayload),
        ]);

        prevStateRef.current = state;
      } catch (err) {
        console.error('[GameContext] Failed to save to server:', err);
      }
    }, 50);
  }, []);

  // Save immediately before page unload (F5, close tab)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Cancel any pending debounced save
      if (serverSaveTimerRef.current) {
        clearTimeout(serverSaveTimerRef.current);
      }

      const cId = characterIdRef.current;
      const state = gameStateRef.current;
      if (!cId) return;

      // Always send beacon on unload — don't skip even if prevState matches
      const charPayload = mapGameStateToServer(state);
      const invPayload = mapInventoryToServer(state.inventory, state.equipment);
      const equipPayload = mapEquipmentToServer(state.equipment);
      const token = api.getToken();
      if (token) {
        navigator.sendBeacon(
          `${api.API_BASE_URL}/characters/${cId}/beacon-save`,
          new Blob([JSON.stringify({ ...charPayload, token, inventory: invPayload, equipment: equipPayload })], { type: 'application/json' })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ===== RESOURCE MANAGEMENT =====
  const addSpiritStones = useCallback((amount) => {
    setGameState(prev => ({
      ...prev,
      resources: { ...prev.resources, spiritStones: prev.resources.spiritStones + amount },
    }));
  }, []);

  const spendSpiritStones = useCallback((amount) => {
    setGameState(prev => {
      if (prev.resources.spiritStones < amount) return prev;
      return {
        ...prev,
        resources: { ...prev.resources, spiritStones: prev.resources.spiritStones - amount },
      };
    });
  }, []);

  const addPills = useCallback((amount) => {
    setGameState(prev => ({
      ...prev,
      resources: { ...prev.resources, pills: prev.resources.pills + amount },
    }));
  }, []);

  const spendPills = useCallback((amount) => {
    setGameState(prev => {
      if (prev.resources.pills < amount) return prev;
      return {
        ...prev,
        resources: { ...prev.resources, pills: prev.resources.pills - amount },
      };
    });
  }, []);

  // ===== EXP & LEVELING =====
  const addExp = useCallback((amount) => {
    setGameState(prev => {
      let { exp, maxExp, level, realmIndex } = prev.player;
      exp += amount;

      // Level up trong cảnh giới hiện tại
      while (exp >= maxExp && level < REALMS[realmIndex].levels) {
        exp -= maxExp;
        level++;
        maxExp = REALMS[realmIndex].expPerLevel * level;
      }

      // Nếu đã đạt level tối đa của realm, giữ exp tại maxExp (không tràn)
      if (level >= REALMS[realmIndex].levels && exp > maxExp) {
        exp = maxExp;
      }

      return { ...prev, player: { ...prev.player, exp, maxExp, level, realmIndex } };
    });
  }, []);

  const getRealmName = useCallback(() => {
    const { realmIndex, level } = gameState.player;
    return `${REALMS[realmIndex].name} Tầng ${level}`;
  }, [gameState.player]);

  const formatNumber = useCallback((num) => num.toLocaleString('vi-VN'), []);

  // ===== ĐỘ KIẾP (TRIBULATION) =====
  const canBreakthrough = useCallback(() => {
    const { realmIndex, level, exp, maxExp } = gameState.player;
    // Phải đạt tầng 9 và đầy EXP
    if (level < REALMS[realmIndex].levels) return { can: false, reason: 'Chưa đạt tầng cao nhất của cảnh giới.' };
    if (exp < maxExp * 0.9) return { can: false, reason: 'Cần ít nhất 90% EXP để độ kiếp.' };
    if (realmIndex >= REALMS.length - 1) return { can: false, reason: 'Đã đạt cảnh giới tối cao!' };
    return { can: true, reason: 'Có thể độ kiếp!' };
  }, [gameState.player]);

  const attemptBreakthrough = useCallback((usePill = false) => {
    const { realmIndex, level, exp, maxExp } = gameState.player;
    const tribInfo = TRIBULATION_REQUIREMENTS[realmIndex];

    if (!tribInfo) {
      return { success: false, message: 'Không có thông tin độ kiếp!' };
    }

    // Kiểm tra điều kiện
    if (level < REALMS[realmIndex].levels || exp < maxExp * 0.9) {
      return { success: false, message: 'Chưa đủ điều kiện độ kiếp!' };
    }

    // Kiểm tra linh thạch
    if (gameState.resources.spiritStones < tribInfo.spiritStonesCost) {
      return { success: false, message: `Cần ${tribInfo.spiritStonesCost} Linh Thạch!` };
    }

    // Kiểm tra đan dược nếu user muốn dùng
    if (usePill && tribInfo.requiredPill) {
      const pillInInventory = gameState.inventory.find(i => i.itemId === tribInfo.requiredPill);
      if (!pillInInventory || pillInInventory.quantity < 1) {
        const pillName = ITEM_DEFINITIONS[tribInfo.requiredPill]?.name || 'đan dược';
        return {
          success: false,
          needsConfirmation: true,
          message: `Không có ${pillName}! Tỷ lệ thành công sẽ giảm ${tribInfo.pillBonus * 100}%. Vẫn tiếp tục?`
        };
      }
    }

    // Tính tỉ lệ thành công
    let successRate = tribInfo.baseSuccessRate;
    let pillUsed = false;

    if (usePill && tribInfo.requiredPill) {
      const pillInInventory = gameState.inventory.find(i => i.itemId === tribInfo.requiredPill);
      if (pillInInventory && pillInInventory.quantity > 0) {
        successRate += tribInfo.pillBonus;
        pillUsed = true;
      }
    }

    // Trừ linh thạch
    setGameState(prev => ({
      ...prev,
      resources: { ...prev.resources, spiritStones: prev.resources.spiritStones - tribInfo.spiritStonesCost }
    }));

    // Trừ đan dược nếu dùng
    if (pillUsed) {
      setGameState(prev => ({
        ...prev,
        inventory: prev.inventory.map(item =>
          item.itemId === tribInfo.requiredPill
            ? { ...item, quantity: item.quantity - 1 }
            : item
        ).filter(item => item.quantity > 0)
      }));
    }

    // Random kết quả
    const roll = Math.random();

    if (roll < successRate) {
      // THÀNH CÔNG - Lên cảnh giới mới
      setGameState(prev => ({
        ...prev,
        player: {
          ...prev.player,
          realmIndex: prev.player.realmIndex + 1,
          level: 1,
          exp: 0,
          maxExp: REALMS[prev.player.realmIndex + 1].expPerLevel,
        },
      }));

      return {
        success: true,
        message: `Độ kiếp thành công! Chúc mừng đạo hữu đã bước vào cảnh giới ${REALMS[realmIndex + 1].name}!`,
        newRealm: REALMS[realmIndex + 1].name,
      };
    } else {
      // THẤT BẠI
      const penalty = tribInfo.failurePenalty;

      setGameState(prev => {
        const newExp = Math.floor(prev.player.exp * (1 - penalty.exp));
        return {
          ...prev,
          player: { ...prev.player, exp: newExp },
          innerDemon: { ...prev.innerDemon, value: Math.min(prev.innerDemon.maxValue, prev.innerDemon.value + penalty.innerDemon) },
        };
      });

      return {
        success: false,
        message: `Độ kiếp thất bại! Mất ${Math.floor(penalty.exp * 100)}% EXP và +${penalty.innerDemon} Tâm Ma. Đen thôi đỏ là bờ lách`,
      };
    }
  }, [gameState.player, gameState.resources.spiritStones, gameState.inventory]);

  // ===== MEDITATION SYSTEM =====
  const meditate = useCallback(() => {
    const now = Date.now();
    const cooldown = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (gameState.lastMeditationTime && now - gameState.lastMeditationTime < cooldown) {
      const remaining = Math.ceil((cooldown - (now - gameState.lastMeditationTime)) / 1000);
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      return {
        success: false,
        cooldownRemaining: remaining,
        message: `Còn ${minutes}:${seconds.toString().padStart(2, '0')} để có thể thiền định`
      };
    }

    setGameState(prev => ({
      ...prev,
      stats: { ...prev.stats, hp: Math.min(prev.stats.maxHp, prev.stats.hp + 20) },
      lastMeditationTime: now
    }));

    return { success: true, message: 'Thiền định thành công! +20 HP' };
  }, [gameState.lastMeditationTime, gameState.stats.hp, gameState.stats.maxHp]);

  // ===== INVENTORY MANAGEMENT =====
  const getItemInfo = useCallback((itemId) => ITEM_DEFINITIONS[itemId] || null, []);

  const addItem = useCallback((itemId, quantity = 1) => {
    const itemDef = ITEM_DEFINITIONS[itemId];
    if (!itemDef) return false;

    setGameState(prev => {
      let newInventory = [...prev.inventory];

      // Equipment: mỗi item riêng biệt với uid
      if (itemDef.type === 'equipment') {
        for (let i = 0; i < quantity; i++) {
          const newUid = `equip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`;
          newInventory.push({
            itemId,
            quantity: 1,
            uid: newUid,
            enhanceLevel: 0
          });
        }
      } else {
        // Pills, materials, books: gộp quantity
        const existingIndex = newInventory.findIndex(i => i.itemId === itemId);
        if (existingIndex >= 0) {
          newInventory = newInventory.map((item, idx) =>
            idx === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
          );
        } else {
          newInventory.push({ itemId, quantity });
        }
      }

      return { ...prev, inventory: newInventory };
    });
    return true;
  }, []);

  const removeItem = useCallback((itemId, quantity = 1) => {
    setGameState(prev => {
      const existingIndex = prev.inventory.findIndex(i => i.itemId === itemId);
      if (existingIndex < 0) return prev;
      const currentQty = prev.inventory[existingIndex].quantity;
      if (currentQty < quantity) return prev;
      let newInventory;
      if (currentQty === quantity) {
        newInventory = prev.inventory.filter((_, idx) => idx !== existingIndex);
      } else {
        newInventory = prev.inventory.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity - quantity } : item
        );
      }
      return { ...prev, inventory: newInventory };
    });
    return true;
  }, []);

  // useItem: itemId for pills/materials, uid for equipment
  const useItem = useCallback((itemIdOrUid, quantity = 1) => {
    // Tìm item trong inventory - có thể là itemId hoặc uid
    let inventoryItem = gameState.inventory.find(i => i.uid === itemIdOrUid);
    let itemId = inventoryItem?.itemId;

    // Nếu không tìm thấy theo uid, thử tìm theo itemId (cho pills/materials)
    if (!inventoryItem) {
      inventoryItem = gameState.inventory.find(i => i.itemId === itemIdOrUid);
      itemId = itemIdOrUid;
    }

    const itemDef = ITEM_DEFINITIONS[itemId];
    if (!itemDef) return { success: false, message: 'Vật phẩm không tồn tại' };

    if (!inventoryItem || inventoryItem.quantity < quantity) {
      return { success: false, message: 'Không đủ vật phẩm trong túi' };
    }

    if (itemDef.type === 'pill') {
      let messages = [];
      const effect = itemDef.effect;

      if (effect.type === 'exp' || effect.exp) {
        const value = effect.value || effect.exp;
        const totalExp = value * quantity;
        addExp(totalExp);
        messages.push(`+${totalExp} EXP`);
      }
      if (effect.type === 'heal' || effect.hp) {
        const value = effect.value || effect.hp;
        const totalHp = value * quantity;
        setGameState(prev => ({
          ...prev,
          stats: { ...prev.stats, hp: Math.min(prev.stats.hp + totalHp, prev.stats.maxHp) },
        }));
        messages.push(`+${totalHp} HP`);
      }
      if (effect.type === 'suppress_demon') {
        const value = effect.value * quantity;
        setGameState(prev => ({
          ...prev,
          innerDemon: { ...prev.innerDemon, value: Math.max(0, prev.innerDemon.value - value) },
        }));
        messages.push(`-${value} Tâm Ma`);
      }

      removeItem(itemId, quantity);
      return { success: true, message: `Sử dụng ${quantity}x ${itemDef.name}: ${messages.join(', ')}!` };

    } else if (itemDef.type === 'equipment') {
      const oldEquipment = gameState.equipment[itemDef.slot];
      const enhanceLevelFromInventory = inventoryItem?.enhanceLevel || 0;
      const uidFromInventory = inventoryItem?.uid;

      if (!uidFromInventory) {
        return { success: false, message: 'Lỗi: Trang bị không có uid!' };
      }

      setGameState(prev => {
        // Xóa equipment item theo uid (chỉ xóa item có uid khớp)
        let newInventory = prev.inventory.filter(item => {
          if (!item.uid) return true; // Giữ lại items không có uid (pills, materials)
          return item.uid !== uidFromInventory;
        });

        // Trả trang bị cũ về inventory VỚI UID MỚI
        if (oldEquipment && oldEquipment.itemId) {
          const newUid = `equip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          newInventory.push({
            itemId: oldEquipment.itemId,
            quantity: 1,
            uid: newUid,
            enhanceLevel: oldEquipment.enhanceLevel || 0
          });
        }

        // Đeo trang bị mới VỚI ENHANCELEVEL TỪ INVENTORY
        const newEquipment = {
          ...prev.equipment,
          [itemDef.slot]: {
            itemId,
            enhanceLevel: enhanceLevelFromInventory,
            uid: uidFromInventory
          }
        };
        const newStats = { ...prev.baseStats };
        for (const equipped of Object.values(newEquipment)) {
          if (equipped && equipped.itemId) {
            const equipDef = ITEM_DEFINITIONS[equipped.itemId];
            if (equipDef && equipDef.effect) {
              for (const [stat, value] of Object.entries(equipDef.effect)) {
                if (newStats[stat] !== undefined) {
                  // Mỗi cấp cường hóa tăng thêm FULL effect value
                  const enhanceBonus = Number.isInteger(value)
                    ? Math.floor(value * equipped.enhanceLevel)
                    : parseFloat((value * equipped.enhanceLevel).toFixed(2));
                  newStats[stat] += value + enhanceBonus;
                }
              }
            }
          }
        }
        return { ...prev, inventory: newInventory, equipment: newEquipment, stats: newStats };
      });
      return { success: true, message: `Đã trang bị ${itemDef.name}${enhanceLevelFromInventory > 0 ? ` (+${enhanceLevelFromInventory})` : ''}!` };

    } else if (itemDef.type === 'book') {
      if (gameState.learnedSkills.includes(itemId)) {
        return { success: false, message: 'Bạn đã học bí kíp này rồi!' };
      }
      setGameState(prev => {
        const newBaseStats = { ...prev.baseStats };
        for (const [stat, value] of Object.entries(itemDef.effect)) {
          if (newBaseStats[stat] !== undefined) newBaseStats[stat] += value;
        }

        // Recalculate stats from baseStats + equipment
        const newStats = { ...newBaseStats };
        for (const equipped of Object.values(prev.equipment)) {
          if (equipped && equipped.itemId) {
            const equipDef = ITEM_DEFINITIONS[equipped.itemId];
            if (equipDef && equipDef.effect) {
              for (const [stat, value] of Object.entries(equipDef.effect)) {
                if (newStats[stat] !== undefined) {
                  const enhanceBonus = Number.isInteger(value)
                    ? Math.floor(value * equipped.enhanceLevel)
                    : parseFloat((value * equipped.enhanceLevel).toFixed(2));
                  newStats[stat] += value + enhanceBonus;
                }
              }
            }
          }
        }

        return { ...prev, baseStats: newBaseStats, stats: newStats, learnedSkills: [...prev.learnedSkills, itemId] };
      });
      removeItem(itemId, 1);
      return { success: true, message: `Học được ${itemDef.name}!` };

    } else if (itemDef.type === 'material') {
      return { success: false, message: 'Nguyên liệu không thể sử dụng trực tiếp' };
    }

    return { success: false, message: 'Không thể sử dụng vật phẩm này' };
  }, [gameState.inventory, gameState.equipment, gameState.learnedSkills, addExp, removeItem]);

  const recalculateStats = useCallback(() => {
    setGameState(prev => {
      const newStats = { ...prev.baseStats };
      for (const equipped of Object.values(prev.equipment)) {
        if (equipped && equipped.itemId) {
          const itemDef = ITEM_DEFINITIONS[equipped.itemId];
          if (itemDef && itemDef.effect) {
            for (const [stat, value] of Object.entries(itemDef.effect)) {
              if (newStats[stat] !== undefined) {
                // Mỗi cấp cường hóa tăng thêm FULL effect value
                const enhanceBonus = Number.isInteger(value)
                  ? Math.floor(value * equipped.enhanceLevel)
                  : parseFloat((value * equipped.enhanceLevel).toFixed(2));
                newStats[stat] += value + enhanceBonus;
              }
            }
          }
        }
      }
      return { ...prev, stats: newStats };
    });
  }, []);

  const unequipItem = useCallback((slot) => {
    const equipped = gameState.equipment[slot];
    if (!equipped || !equipped.itemId) {
      return { success: false, message: 'Slot này đang trống!' };
    }
    const itemDef = ITEM_DEFINITIONS[equipped.itemId];
    setGameState(prev => {
      let newInventory = [...prev.inventory];

      // Tạo uid mới cho equipment khi tháo ra
      const newUid = `equip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      newInventory.push({
        itemId: equipped.itemId,
        quantity: 1,
        uid: newUid,
        enhanceLevel: equipped.enhanceLevel || 0
      });

      const newEquipment = { ...prev.equipment, [slot]: null };
      const newStats = { ...prev.baseStats };
      for (const equip of Object.values(newEquipment)) {
        if (equip && equip.itemId) {
          const equipDef = ITEM_DEFINITIONS[equip.itemId];
          if (equipDef && equipDef.effect) {
            for (const [stat, value] of Object.entries(equipDef.effect)) {
              if (newStats[stat] !== undefined) {
                // Mỗi cấp cường hóa tăng thêm FULL effect value
                const enhanceBonus = Number.isInteger(value)
                  ? Math.floor(value * equip.enhanceLevel)
                  : parseFloat((value * equip.enhanceLevel).toFixed(2));
                newStats[stat] += value + enhanceBonus;
              }
            }
          }
        }
      }
      return { ...prev, inventory: newInventory, equipment: newEquipment, stats: newStats };
    });
    return { success: true, message: `Đã tháo ${itemDef?.name || 'trang bị'}!` };
  }, [gameState.equipment]);

  const upgradeEquipment = useCallback((slot) => {
    const equipped = gameState.equipment[slot];
    if (!equipped || !equipped.itemId) {
      return { success: false, message: 'Không có trang bị trong slot này!' };
    }
    const itemDef = ITEM_DEFINITIONS[equipped.itemId];
    if (!itemDef) return { success: false, message: 'Trang bị không hợp lệ!' };

    // Tìm 1 item cùng loại để làm nguyên liệu (ưu tiên enhanceLevel thấp nhất)
    const materialItem = gameState.inventory
      .filter(i => i.itemId === equipped.itemId)
      .sort((a, b) => (a.enhanceLevel || 0) - (b.enhanceLevel || 0))[0];

    if (!materialItem) {
      return { success: false, message: `Cần 1x ${itemDef.name} trong kho để cường hóa!` };
    }

    const enhanceStoneRequired = Math.max(1, equipped.enhanceLevel + 1);
    const enhanceStoneInInventory = gameState.inventory.find(i => i.itemId === 'cuong_hoa_thach');
    if (!enhanceStoneInInventory || enhanceStoneInInventory.quantity < enhanceStoneRequired) {
      return { success: false, message: `Cần ${enhanceStoneRequired}x Cường Hóa Thạch!` };
    }

    const newEnhanceLevel = equipped.enhanceLevel + 1;
    const materialUidToConsume = materialItem.uid;

    setGameState(prev => {
      let materialConsumed = false;
      let stoneConsumed = false;

      let newInventory = prev.inventory.map(item => {
        // Tiêu thụ nguyên liệu (equipment) - chỉ 1 item
        if (!materialConsumed) {
          if (materialUidToConsume && item.uid === materialUidToConsume) {
            materialConsumed = true;
            return { ...item, quantity: item.quantity - 1 };
          } else if (!materialUidToConsume && item.itemId === equipped.itemId) {
            materialConsumed = true;
            return { ...item, quantity: item.quantity - 1 };
          }
        }

        // Tiêu thụ đá cường hóa
        if (!stoneConsumed && item.itemId === 'cuong_hoa_thach') {
          stoneConsumed = true;
          return { ...item, quantity: item.quantity - enhanceStoneRequired };
        }

        return item;
      }).filter(item => item.quantity > 0);

      const newEquipment = { ...prev.equipment, [slot]: { ...equipped, enhanceLevel: newEnhanceLevel } };
      const newStats = { ...prev.baseStats };

      for (const equip of Object.values(newEquipment)) {
        if (equip && equip.itemId) {
          const equipDef = ITEM_DEFINITIONS[equip.itemId];
          if (equipDef && equipDef.effect) {
            for (const [stat, value] of Object.entries(equipDef.effect)) {
              if (newStats[stat] !== undefined) {
                // Mỗi cấp cường hóa tăng thêm FULL effect value
                const enhanceBonus = Number.isInteger(value)
                  ? Math.floor(value * equip.enhanceLevel)
                  : parseFloat((value * equip.enhanceLevel).toFixed(2));
                newStats[stat] += value + enhanceBonus;
              }
            }
          }
        }
      }
      return { ...prev, inventory: newInventory, equipment: newEquipment, stats: newStats };
    });
    return { success: true, message: `Cường hóa ${itemDef.name} thành công! Nay là +${newEnhanceLevel}` };
  }, [gameState.equipment, gameState.inventory]);

  const getEquippedItems = useCallback(() => {
    const result = {};
    for (const [slot, equipped] of Object.entries(gameState.equipment)) {
      if (equipped && equipped.itemId) {
        const itemDef = ITEM_DEFINITIONS[equipped.itemId];
        result[slot] = { ...equipped, ...itemDef };
      } else {
        result[slot] = null;
      }
    }
    return result;
  }, [gameState.equipment]);

  const getInventoryWithDetails = useCallback(() => {
    return gameState.inventory.map(item => ({ ...item, ...ITEM_DEFINITIONS[item.itemId] }));
  }, [gameState.inventory]);

  const buyItem = useCallback((itemId, price, quantity = 1) => {
    const totalCost = price * quantity;
    if (gameState.resources.spiritStones < totalCost) {
      return { success: false, message: `Không đủ Linh Thạch! Cần ${totalCost.toLocaleString()}` };
    }
    setGameState(prev => ({
      ...prev,
      resources: { ...prev.resources, spiritStones: prev.resources.spiritStones - totalCost },
    }));
    addItem(itemId, quantity);
    const itemDef = ITEM_DEFINITIONS[itemId];
    return { success: true, message: `Mua thành công ${quantity}x ${itemDef?.name || itemId}!` };
  }, [gameState.resources.spiritStones, addItem]);

  // ===== EVENT SYSTEM =====
  const addEvent = useCallback((type, message) => {
    setGameState(prev => ({
      ...prev,
      events: [{ id: Date.now(), type, message, time: Date.now() }, ...prev.events.slice(0, 19)],
    }));
  }, []);

  // ===== EXPLORATION (Dùng WORLD_ZONES) =====
  const exploreLocation = useCallback((zoneId) => {
    const zone = WORLD_ZONES[zoneId];
    if (!zone) return { success: false, message: 'Khu vực không tồn tại!' };

    const { exploration } = gameState;
    if (exploration.explorationCount >= exploration.maxExplorationPerDay) {
      return { success: false, message: 'Đã hết lượt khám phá hôm nay!' };
    }

    // Kiểm tra điều kiện vào zone
    if (!canEnterZone(zone, gameState.player.realmIndex, gameState.player.level)) {
      return { success: false, message: `Cần đạt ${REALMS[zone.minRealm].name} Tầng ${zone.minLevel}!` };
    }

    const baseRewards = calculateZoneRewards(zone, gameState.player.realmIndex, gameState.player.level);
    const rewards = { exp: 0, spiritStones: 0, items: [] };
    let eventMessage = '';

    const roll = Math.random();

    if (roll > zone.encounterChance) {
      // Thành công
      rewards.exp = baseRewards.exp + Math.floor(Math.random() * baseRewards.exp * 0.5);
      rewards.spiritStones = baseRewards.spiritStones + Math.floor(Math.random() * baseRewards.spiritStones * 0.3);
      eventMessage = `Khám phá ${zone.name} thành công! +${rewards.exp} EXP, +${rewards.spiritStones} Linh Thạch`;

      // Check drops
      zone.drops.forEach(drop => {
        if (Math.random() < drop.chance) {
          const qty = Math.floor(Math.random() * (drop.maxQty - drop.minQty + 1)) + drop.minQty;
          rewards.items.push({ itemId: drop.itemId, quantity: qty });
        }
      });
      if (rewards.items.length > 0) {
        eventMessage += ', tìm được vật phẩm!';
      }
    } else {
      // Gặp nguy hiểm
      const damage = zone.encounterDamage || 10;
      setGameState(prev => ({
        ...prev,
        stats: { ...prev.stats, hp: Math.max(1, prev.stats.hp - damage) },
      }));
      rewards.exp = Math.floor(baseRewards.exp * 0.3);
      eventMessage = `Gặp nguy hiểm tại ${zone.name}! Mất ${damage} HP, +${rewards.exp} EXP`;
    }

    if (rewards.exp > 0) addExp(rewards.exp);
    if (rewards.spiritStones > 0) addSpiritStones(rewards.spiritStones);
    rewards.items.forEach(item => addItem(item.itemId, item.quantity));

    setGameState(prev => ({
      ...prev,
      exploration: { ...prev.exploration, explorationCount: prev.exploration.explorationCount + 1 },
    }));

    addEvent(roll > zone.encounterChance ? 'success' : 'danger', eventMessage);

    return { success: true, message: eventMessage, rewards };
  }, [gameState.exploration, gameState.player, addExp, addSpiritStones, addItem, addEvent]);

  const claimQuestReward = useCallback(() => {
    const { quests } = gameState;
    if (!quests.active || quests.active.progress < quests.active.target) {
      return { success: false, message: 'Quest chưa hoàn thành!' };
    }
    const { rewards } = quests.active;
    if (rewards.spiritStones) addSpiritStones(rewards.spiritStones);
    if (rewards.exp) addExp(rewards.exp);
    setGameState(prev => ({
      ...prev,
      quests: { ...prev.quests, completed: [...prev.quests.completed, prev.quests.active.id], active: null },
    }));
    addEvent('quest', `Hoàn thành nhiệm vụ "${quests.active.name}"!`);
    return { success: true, message: `Hoàn thành! +${rewards.spiritStones} Linh Thạch, +${rewards.exp} EXP` };
  }, [gameState.quests, addSpiritStones, addExp, addEvent]);

  const restoreHp = useCallback((amount) => {
    setGameState(prev => ({
      ...prev,
      stats: { ...prev.stats, hp: Math.min(prev.stats.hp + amount, prev.stats.maxHp) },
    }));
    addEvent('heal', `Hồi phục ${amount} HP`);
  }, [addEvent]);

  // ===== FOUNDATION & INNER DEMON =====
  const reduceFoundation = useCallback((amount = 2) => {
    setGameState(prev => ({
      ...prev,
      foundation: { ...prev.foundation, value: Math.max(0, prev.foundation.value - amount), danUsedCount: prev.foundation.danUsedCount + 1 },
    }));
  }, []);

  const recoverFoundation = useCallback((amount = 1) => {
    setGameState(prev => ({
      ...prev,
      foundation: { ...prev.foundation, value: Math.min(prev.foundation.maxValue, prev.foundation.value + amount), lastRecovery: Date.now() },
    }));
  }, []);

  const getFoundationStatus = useCallback(() => {
    const { value } = gameState.foundation;
    if (value >= 80) return { label: 'Vững Chắc', color: 'success', bonus: '+5% EXP' };
    if (value >= 50) return { label: 'Bình Thường', color: 'warning', bonus: '+0% EXP' };
    if (value >= 20) return { label: 'Lung Lay', color: 'danger', bonus: '-5% EXP' };
    return { label: 'Rất Yếu', color: 'critical', bonus: '-15% EXP' };
  }, [gameState.foundation]);

  const addInnerDemon = useCallback((amount = 1) => {
    setGameState(prev => ({
      ...prev,
      innerDemon: { ...prev.innerDemon, value: Math.min(prev.innerDemon.maxValue, prev.innerDemon.value + amount) },
    }));
  }, []);

  const suppressInnerDemon = useCallback((amount = 5) => {
    setGameState(prev => ({
      ...prev,
      innerDemon: { ...prev.innerDemon, value: Math.max(0, prev.innerDemon.value - amount), suppressCount: prev.innerDemon.suppressCount + 1 },
    }));
    addEvent('heal', `Trấn áp tâm ma thành công! -${amount}% Tâm Ma`);
  }, [addEvent]);

  const getInnerDemonStatus = useCallback(() => {
    const { value, threshold } = gameState.innerDemon;
    if (value === 0) return { label: 'An Toàn', color: 'success' };
    if (value < 30) return { label: 'Nhỏ', color: 'info' };
    if (value < threshold) return { label: 'Cảnh Báo', color: 'warning' };
    return { label: 'Nguy Hiểm!', color: 'danger' };
  }, [gameState.innerDemon]);

  // ===== REPUTATION =====
  const addReputation = useCallback((points, type = 'general') => {
    setGameState(prev => {
      const newValue = prev.reputation.value + points;
      let newTitle = REPUTATION_TITLES[0];
      for (const title of REPUTATION_TITLES) {
        if (newValue >= title.minPoints) newTitle = title;
      }
      return {
        ...prev,
        reputation: {
          ...prev.reputation,
          value: newValue,
          level: newTitle.level,
          title: newTitle.title,
          [`${type}Points`]: (prev.reputation[`${type}Points`] || 0) + points,
        },
      };
    });
  }, []);

  // ===== ALCHEMY =====
  const craftPill = useCallback((recipeId) => {
    const recipe = ALCHEMY_RECIPES[recipeId];
    if (!recipe) return { success: false, message: 'Công thức không tồn tại!' };
    if (gameState.alchemy.level < recipe.minLevel) {
      return { success: false, message: `Cần cấp luyện đan ${recipe.minLevel}!` };
    }

    for (const material of recipe.materials) {
      const invItem = gameState.inventory.find(i => i.itemId === material.itemId);
      if (!invItem || invItem.quantity < material.quantity) {
        return { success: false, message: `Thiếu ${ITEM_DEFINITIONS[material.itemId]?.name}!` };
      }
    }

    recipe.materials.forEach(mat => removeItem(mat.itemId, mat.quantity));

    const levelBonus = (gameState.alchemy.level - recipe.minLevel) * 0.1;
    const finalRate = Math.min(0.95, recipe.baseSuccessRate + gameState.alchemy.successRate - 0.6 + levelBonus);
    const isSuccess = Math.random() < finalRate;

    if (isSuccess) {
      addItem(recipe.output.itemId, recipe.output.quantity);
      setGameState(prev => {
        let newExp = prev.alchemy.exp + recipe.expGain;
        let newLevel = prev.alchemy.level;
        let newMaxExp = prev.alchemy.maxExp;
        while (newExp >= newMaxExp) {
          newExp -= newMaxExp;
          newLevel++;
          newMaxExp = Math.floor(newMaxExp * 1.5);
        }
        return { ...prev, alchemy: { ...prev.alchemy, exp: newExp, level: newLevel, maxExp: newMaxExp, craftCount: prev.alchemy.craftCount + 1 } };
      });
      addEvent('success', `Luyện chế thành công ${ITEM_DEFINITIONS[recipe.output.itemId]?.name}!`);
      addReputation(5, 'cultivation');
      return { success: true, message: `Nhận được ${recipe.output.quantity}x ${ITEM_DEFINITIONS[recipe.output.itemId]?.name}` };
    } else {
      addInnerDemon(3);
      addEvent('danger', 'Luyện đan thất bại! Tâm ma tăng...');
      return { success: false, message: 'Luyện đan thất bại!' };
    }
  }, [gameState.alchemy, gameState.inventory, removeItem, addItem, addEvent, addReputation, addInnerDemon]);

  // ===== SAVE/LOAD =====
  const resetGame = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setGameState(initialState);
  }, []);

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
  }, []);

  const value = {
    gameState,
    setGameState,
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
    saveToServer,
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
