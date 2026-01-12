// ===== ĐỊNH NGHĨA CÁC KHU VỰC KHÁM PHÁ =====
export const WORLD_ZONES = {
  // ========== KHU VỰC AN TOÀN ==========
  'tan_thu_thon': {
    id: 'tan_thu_thon',
    name: 'Tân Thủ Thôn',
    description: 'Làng nhỏ yên bình, nơi bắt đầu hành trình tu tiên.',
    dangerLevel: 'safe',
    minRealm: 0,
    minLevel: 1,
    baseExpReward: 5,
    baseStonesReward: 10,
    drops: [
      { itemId: 'thao_duoc', chance: 0.4, minQty: 1, maxQty: 3 },
    ],
    encounterChance: 0.05,
  },
  'linh_duoc_vien': {
    id: 'linh_duoc_vien',
    name: 'Linh Dược Viên',
    description: 'Vườn thuốc của tông môn, nhiều thảo dược quý.',
    dangerLevel: 'safe',
    minRealm: 0,
    minLevel: 3,
    baseExpReward: 8,
    baseStonesReward: 15,
    drops: [
      { itemId: 'thao_duoc', chance: 0.6, minQty: 2, maxQty: 5 },
      { itemId: 'linh_thach_khoang', chance: 0.1, minQty: 1, maxQty: 1 },
    ],
    encounterChance: 0.1,
  },

  // ========== KHU VỰC TRUNG BÌNH ==========
  'thiet_khoang_son': {
    id: 'thiet_khoang_son',
    name: 'Thiết Khoáng Sơn',
    description: 'Núi khoáng sản, có thể khai thác quặng sắt và linh thạch.',
    dangerLevel: 'medium',
    minRealm: 0,
    minLevel: 5,
    baseExpReward: 15,
    baseStonesReward: 25,
    drops: [
      { itemId: 'thiet_khoang', chance: 0.5, minQty: 1, maxQty: 4 },
      { itemId: 'linh_thach_khoang', chance: 0.2, minQty: 1, maxQty: 2 },
      { itemId: 'cuong_hoa_thach', chance: 0.05, minQty: 1, maxQty: 1 },
    ],
    encounterChance: 0.2,
  },
  'u_minh_lam': {
    id: 'u_minh_lam',
    name: 'U Minh Lâm',
    description: 'Khu rừng tối tăm, đầy ma khí và yêu thú.',
    dangerLevel: 'medium',
    minRealm: 1,
    minLevel: 1,
    baseExpReward: 25,
    baseStonesReward: 40,
    drops: [
      { itemId: 'thao_duoc', chance: 0.4, minQty: 2, maxQty: 5 },
      { itemId: 'linh_thach_khoang', chance: 0.25, minQty: 1, maxQty: 3 },
    ],
    encounterChance: 0.3,
    encounterDamage: 15,
  },

  // ========== KHU VỰC NGUY HIỂM ==========
  'huyet_ma_quyet': {
    id: 'huyet_ma_quyet',
    name: 'Huyết Ma Quật',
    description: 'Hang động của ma tu, nguy hiểm nhưng nhiều bảo vật.',
    dangerLevel: 'high',
    minRealm: 1,
    minLevel: 5,
    baseExpReward: 50,
    baseStonesReward: 80,
    drops: [
      { itemId: 'linh_thach_khoang', chance: 0.4, minQty: 2, maxQty: 4 },
      { itemId: 'cuong_hoa_thach', chance: 0.15, minQty: 1, maxQty: 2 },
      { itemId: 'truc_co_dan', chance: 0.05, minQty: 1, maxQty: 1 },
    ],
    encounterChance: 0.4,
    encounterDamage: 30,
  },
  'thien_ma_coc': {
    id: 'thien_ma_coc',
    name: 'Thiên Ma Cốc',
    description: 'Thung lũng ma đạo, nơi ẩn náu của tà tu.',
    dangerLevel: 'high',
    minRealm: 2,
    minLevel: 1,
    baseExpReward: 100,
    baseStonesReward: 150,
    drops: [
      { itemId: 'cuong_hoa_thach', chance: 0.3, minQty: 1, maxQty: 3 },
      { itemId: 'kim_dan_dan', chance: 0.05, minQty: 1, maxQty: 1 },
    ],
    encounterChance: 0.5,
    encounterDamage: 50,
  },

  // ========== KHU VỰC PVP ==========
  'loan_chien_truong': {
    id: 'loan_chien_truong',
    name: 'Loạn Chiến Trường',
    description: 'Chiến trường tu sĩ, nơi giao đấu tàn khốc để tranh đoạt tài nguyên.',
    dangerLevel: 'pvp',
    minRealm: 1,
    minLevel: 1,
    baseExpReward: 80,
    baseStonesReward: 120,
    drops: [
      { itemId: 'linh_thach_khoang', chance: 0.5, minQty: 3, maxQty: 6 },
      { itemId: 'cuong_hoa_thach', chance: 0.2, minQty: 1, maxQty: 2 },
    ],
    encounterChance: 0.6,
    encounterDamage: 40,
    pvpEnabled: true,
  },
};

// Lấy các khu vực theo danger level
export const getZonesByDanger = (dangerLevel) => {
  return Object.values(WORLD_ZONES).filter(zone => zone.dangerLevel === dangerLevel);
};

// Kiểm tra player có đủ điều kiện vào zone không
export const canEnterZone = (zone, playerRealmIndex, playerLevel) => {
  return playerRealmIndex >= zone.minRealm && 
         (playerRealmIndex > zone.minRealm || playerLevel >= zone.minLevel);
};

// Tính toán phần thưởng dựa trên zone và player stats
export const calculateZoneRewards = (zone, playerRealmIndex, playerLevel) => {
  const levelMultiplier = 1 + (playerRealmIndex * 0.5) + (playerLevel * 0.05);
  
  return {
    exp: Math.floor(zone.baseExpReward * levelMultiplier),
    spiritStones: Math.floor(zone.baseStonesReward * levelMultiplier),
  };
};

export default WORLD_ZONES;
