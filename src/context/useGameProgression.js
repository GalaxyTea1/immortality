import { useCallback } from 'react';
import { ITEM_DEFINITIONS as FALLBACK_ITEM_DEFINITIONS } from '../data/items.js';
import { REALMS, TRIBULATION_REQUIREMENTS } from '../data/realms.js';

export function useGameProgression({ gameState, setGameState, itemDefinitions = FALLBACK_ITEM_DEFINITIONS }) {
  const addSpiritStones = useCallback((amount) => {
    setGameState(prev => ({
      ...prev,
      resources: { ...prev.resources, spiritStones: prev.resources.spiritStones + amount },
    }));
  }, [setGameState]);

  const spendSpiritStones = useCallback((amount) => {
    setGameState(prev => {
      if (prev.resources.spiritStones < amount) return prev;
      return {
        ...prev,
        resources: { ...prev.resources, spiritStones: prev.resources.spiritStones - amount },
      };
    });
  }, [setGameState]);

  const addPills = useCallback((amount) => {
    setGameState(prev => ({
      ...prev,
      resources: { ...prev.resources, pills: prev.resources.pills + amount },
    }));
  }, [setGameState]);

  const spendPills = useCallback((amount) => {
    setGameState(prev => {
      if (prev.resources.pills < amount) return prev;
      return {
        ...prev,
        resources: { ...prev.resources, pills: prev.resources.pills - amount },
      };
    });
  }, [setGameState]);

  const addExp = useCallback((amount) => {
    setGameState(prev => {
      let { exp, maxExp, level, realmIndex } = prev.player;
      exp += amount;

      while (exp >= maxExp && level < REALMS[realmIndex].levels) {
        exp -= maxExp;
        level++;
        maxExp = REALMS[realmIndex].expPerLevel * level;
      }

      if (level >= REALMS[realmIndex].levels && exp > maxExp) {
        exp = maxExp;
      }

      return { ...prev, player: { ...prev.player, exp, maxExp, level, realmIndex } };
    });
  }, [setGameState]);

  const getRealmName = useCallback(() => {
    const { realmIndex, level } = gameState.player;
    return `${REALMS[realmIndex].name} T蘯ｧng ${level}`;
  }, [gameState.player]);

  const formatNumber = useCallback((num) => num.toLocaleString('vi-VN'), []);

  const canBreakthrough = useCallback(() => {
    const { realmIndex, level, exp, maxExp } = gameState.player;
    if (level < REALMS[realmIndex].levels) return { can: false, reason: 'Chﾆｰa ﾄ黛ｺ｡t t蘯ｧng cao nh蘯･t c盻ｧa c蘯｣nh gi盻嬖.' };
    if (exp < maxExp * 0.9) return { can: false, reason: 'C蘯ｧn ﾃｭt nh蘯･t 90% EXP ﾄ黛ｻ・ﾄ黛ｻ・ki蘯ｿp.' };
    if (realmIndex >= REALMS.length - 1) return { can: false, reason: 'ﾄ静｣ ﾄ黛ｺ｡t c蘯｣nh gi盻嬖 t盻訴 cao!' };
    return { can: true, reason: 'Cﾃｳ th盻・ﾄ黛ｻ・ki蘯ｿp!' };
  }, [gameState.player]);

  const attemptBreakthrough = useCallback((usePill = false) => {
    const { realmIndex, level, exp, maxExp } = gameState.player;
    const tribInfo = TRIBULATION_REQUIREMENTS[realmIndex];

    if (!tribInfo) {
      return { success: false, message: 'Khﾃｴng cﾃｳ thﾃｴng tin ﾄ黛ｻ・ki蘯ｿp!' };
    }

    if (level < REALMS[realmIndex].levels || exp < maxExp * 0.9) {
      return { success: false, message: 'Chﾆｰa ﾄ黛ｻｧ ﾄ訴盻「 ki盻㌻ ﾄ黛ｻ・ki蘯ｿp!' };
    }

    if (gameState.resources.spiritStones < tribInfo.spiritStonesCost) {
      return { success: false, message: `C蘯ｧn ${tribInfo.spiritStonesCost} Linh Th蘯｡ch!` };
    }

    if (usePill && tribInfo.requiredPill) {
      const pillInInventory = gameState.inventory.find(i => i.itemId === tribInfo.requiredPill);
      if (!pillInInventory || pillInInventory.quantity < 1) {
        const pillName = itemDefinitions[tribInfo.requiredPill]?.name || 'ﾄ疎n dﾆｰ盻｣c';
        return {
          success: false,
          needsConfirmation: true,
          message: `Khﾃｴng cﾃｳ ${pillName}! T盻ｷ l盻・thﾃnh cﾃｴng s蘯ｽ gi蘯｣m ${tribInfo.pillBonus * 100}%. V蘯ｫn ti蘯ｿp t盻･c?`
        };
      }
    }

    let successRate = tribInfo.baseSuccessRate;
    let pillUsed = false;

    if (usePill && tribInfo.requiredPill) {
      const pillInInventory = gameState.inventory.find(i => i.itemId === tribInfo.requiredPill);
      if (pillInInventory && pillInInventory.quantity > 0) {
        successRate += tribInfo.pillBonus;
        pillUsed = true;
      }
    }

    setGameState(prev => ({
      ...prev,
      resources: { ...prev.resources, spiritStones: prev.resources.spiritStones - tribInfo.spiritStonesCost }
    }));

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

    const roll = Math.random();

    if (roll < successRate) {
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
        message: `ﾄ雪ｻ・ki蘯ｿp thﾃnh cﾃｴng! Chﾃｺc m盻ｫng ﾄ黛ｺ｡o h盻ｯu ﾄ妥｣ bﾆｰ盻嫩 vﾃo c蘯｣nh gi盻嬖 ${REALMS[realmIndex + 1].name}!`,
        newRealm: REALMS[realmIndex + 1].name,
      };
    }

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
      message: `ﾄ雪ｻ・ki蘯ｿp th蘯･t b蘯｡i! M蘯･t ${Math.floor(penalty.exp * 100)}% EXP vﾃ +${penalty.innerDemon} Tﾃ｢m Ma. ﾄ親n thﾃｴi ﾄ黛ｻ・lﾃ b盻・lﾃ｡ch`,
    };
  }, [gameState.inventory, gameState.player, gameState.resources.spiritStones, itemDefinitions, setGameState]);

  const meditate = useCallback(() => {
    return {
      success: false,
      message: 'Hồi phục HP bằng thiền định đã bị tắt. HP chỉ hồi theo thời gian hoặc đạo cụ.',
    };
    /*
    const now = Date.now();
    const cooldown = 5 * 60 * 1000;

    if (gameState.lastMeditationTime && now - gameState.lastMeditationTime < cooldown) {
      const remaining = Math.ceil((cooldown - (now - gameState.lastMeditationTime)) / 1000);
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      return {
        success: false,
        cooldownRemaining: remaining,
        message: `Cﾃｲn ${minutes}:${seconds.toString().padStart(2, '0')} ﾄ黛ｻ・cﾃｳ th盻・thi盻］ ﾄ黛ｻ杵h`
      };
    }

    setGameState(prev => ({
      ...prev,
      stats: { ...prev.stats, hp: Math.min(prev.stats.maxHp, prev.stats.hp + 20) },
      lastMeditationTime: now
    }));

    return { success: true, message: 'Thi盻］ ﾄ黛ｻ杵h thﾃnh cﾃｴng! +20 HP' };
    */
  }, []);

  return {
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
  };
}
