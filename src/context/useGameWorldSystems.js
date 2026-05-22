import { useCallback } from 'react';
import { ITEM_DEFINITIONS } from '../data/items.js';
import { REPUTATION_TITLES, REALMS } from '../data/realms.js';
import { ALCHEMY_RECIPES } from '../data/recipes.js';
import { WORLD_ZONES, canEnterZone, calculateZoneRewards } from '../data/zones.js';

export function useGameWorldSystems({
  gameState,
  setGameState,
  addExp,
  addSpiritStones,
  addItem,
  removeItem,
}) {
  // ===== EVENT SYSTEM =====
  const addEvent = useCallback((type, message) => {
    setGameState(prev => ({
      ...prev,
      events: [{ id: Date.now(), type, message, time: Date.now() }, ...prev.events.slice(0, 19)],
    }));
  }, [setGameState]);

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
    const explorationHpCost = 1;
    let hpLoss = explorationHpCost;
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
      hpLoss = zone.encounterDamage || 10;
      const damage = hpLoss;
      rewards.exp = Math.floor(baseRewards.exp * 0.3);
      eventMessage = `Gặp nguy hiểm tại ${zone.name}! Mất ${damage} HP, +${rewards.exp} EXP`;
    }

    if (roll > zone.encounterChance) {
      eventMessage += `, -${hpLoss} HP`;
    }

    if (rewards.exp > 0) addExp(rewards.exp);
    if (rewards.spiritStones > 0) addSpiritStones(rewards.spiritStones);
    rewards.items.forEach(item => addItem(item.itemId, item.quantity));

    setGameState(prev => ({
      ...prev,
      baseStats: { ...prev.baseStats, hp: Math.max(1, prev.baseStats.hp - hpLoss) },
      stats: { ...prev.stats, hp: Math.max(1, prev.stats.hp - hpLoss) },
      exploration: { ...prev.exploration, explorationCount: prev.exploration.explorationCount + 1 },
    }));

    addEvent(roll > zone.encounterChance ? 'success' : 'danger', eventMessage);

    return { success: true, message: eventMessage, rewards, hpLoss };
  }, [gameState, addExp, addSpiritStones, addItem, addEvent, setGameState]);

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
  }, [gameState, addSpiritStones, addExp, addEvent, setGameState]);

  const restoreHp = useCallback((amount) => {
    setGameState(prev => ({
      ...prev,
      stats: { ...prev.stats, hp: Math.min(prev.stats.hp + amount, prev.stats.maxHp) },
    }));
    addEvent('heal', `Hồi phục ${amount} HP`);
  }, [addEvent, setGameState]);

  // ===== FOUNDATION & INNER DEMON =====
  const reduceFoundation = useCallback((amount = 2) => {
    setGameState(prev => ({
      ...prev,
      foundation: { ...prev.foundation, value: Math.max(0, prev.foundation.value - amount), danUsedCount: prev.foundation.danUsedCount + 1 },
    }));
  }, [setGameState]);

  const recoverFoundation = useCallback((amount = 1) => {
    setGameState(prev => ({
      ...prev,
      foundation: { ...prev.foundation, value: Math.min(prev.foundation.maxValue, prev.foundation.value + amount), lastRecovery: Date.now() },
    }));
  }, [setGameState]);

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
  }, [setGameState]);

  const suppressInnerDemon = useCallback((amount = 5) => {
    setGameState(prev => ({
      ...prev,
      innerDemon: { ...prev.innerDemon, value: Math.max(0, prev.innerDemon.value - amount), suppressCount: prev.innerDemon.suppressCount + 1 },
    }));
    addEvent('heal', `Trấn áp tâm ma thành công! -${amount}% Tâm Ma`);
  }, [addEvent, setGameState]);

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
  }, [setGameState]);

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
  }, [gameState.alchemy, gameState.inventory, removeItem, addItem, addEvent, addReputation, addInnerDemon, setGameState]);


  return {
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
  };
}
