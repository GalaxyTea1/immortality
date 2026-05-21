import { ITEM_DEFINITIONS } from '../data/items.js';

const makeEquipmentUid = () => `equip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const createGameStateMappers = (initialState) => {
  const mapServerToGameState = (charData, inventoryData, equipmentData, skillsData, questData) => {
    const state = { ...initialState };

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

      const today = new Date().toISOString().split('T')[0];
      const serverResetDate = charData.exploration_last_reset
        ? new Date(charData.exploration_last_reset).toISOString().split('T')[0]
        : today;
      const isNewDay = serverResetDate !== today;

      state.exploration = {
        ...initialState.exploration,
        explorationCount: isNewDay ? 0 : (charData.exploration_count ?? 0),
        lastResetDate: today,
      };

      state.lastMeditationTime = charData.last_meditation_time
        ? new Date(charData.last_meditation_time).getTime()
        : null;
    }

    if (Array.isArray(inventoryData) && inventoryData.length > 0) {
      state.inventory = inventoryData.map(item => {
        const itemDef = ITEM_DEFINITIONS[item.item_id];
        const entry = {
          itemId: item.item_id,
          quantity: item.quantity,
          enhanceLevel: item.enhance_level || 0,
        };

        if (itemDef && itemDef.type === 'equipment') {
          entry.uid = makeEquipmentUid();
        }
        return entry;
      });
    }

    if (equipmentData && typeof equipmentData === 'object') {
      for (const [slot, data] of Object.entries(equipmentData)) {
        if (data && data.itemId) {
          state.equipment[slot] = {
            itemId: data.itemId,
            enhanceLevel: data.enhanceLevel || 0,
            uid: makeEquipmentUid(),
          };
        }
      }
    }

    if (Array.isArray(skillsData) && skillsData.length > 0) {
      state.learnedSkills = skillsData.map(s => s.skill_id || s.skillId);
    }

    state.quests = {
      ...initialState.quests,
      active: questData || null,
      completed: questData ? initialState.quests.completed : ['daily'],
    };

    const newStats = { ...state.baseStats };
    for (const equipped of Object.values(state.equipment)) {
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

  const mapGameStateToServer = (state) => ({
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
  });

  const mapInventoryToServer = (inventory, equipment) => {
    const equippedKeys = {};
    if (equipment) {
      for (const data of Object.values(equipment)) {
        if (data && data.itemId) {
          const key = `${data.itemId}__${data.enhanceLevel || 0}`;
          equippedKeys[key] = (equippedKeys[key] || 0) + 1;
        }
      }
    }

    const merged = {};
    inventory.forEach(item => {
      const key = `${item.itemId}__${item.enhanceLevel || 0}`;
      if (merged[key]) {
        merged[key].quantity += item.quantity;
      } else {
        merged[key] = { itemId: item.itemId, quantity: item.quantity, enhanceLevel: item.enhanceLevel || 0 };
      }
    });

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

  return {
    mapServerToGameState,
    mapGameStateToServer,
    mapInventoryToServer,
    mapEquipmentToServer,
  };
};
