import { useCallback } from 'react';
import { ITEM_DEFINITIONS } from '../data/items.js';

export function useGameInventoryEquipment({ gameState, setGameState, addExp }) {
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
  }, [setGameState]);

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
  }, [setGameState]);

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
  }, [gameState.inventory, gameState.equipment, gameState.learnedSkills, addExp, removeItem, setGameState]);

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
  }, [setGameState]);

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
  }, [gameState.equipment, setGameState]);

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
  }, [gameState.equipment, gameState.inventory, setGameState]);

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
  }, [gameState.resources.spiritStones, addItem, setGameState]);


  return {
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
  };
}
