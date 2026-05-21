// ===== CÔNG THỨC LUYỆN ĐAN =====
export const ALCHEMY_RECIPES = {
  'tieu_hoan_dan': {
    id: 'tieu_hoan_dan',
    name: 'Tiểu Hoàn Đan',
    materials: [{ itemId: 'thao_duoc', quantity: 3 }],
    output: { itemId: 'tieu_hoan_dan', quantity: 1 },
    expGain: 5,
    minLevel: 1,
    baseSuccessRate: 0.8,
  },
  'tu_khi_dan': {
    id: 'tu_khi_dan',
    name: 'Tụ Khí Đan',
    materials: [
      { itemId: 'thao_duoc', quantity: 5 },
      { itemId: 'thiet_khoang', quantity: 2 }
    ],
    output: { itemId: 'tu_khi_dan', quantity: 1 },
    expGain: 10,
    minLevel: 2,
    baseSuccessRate: 0.6,
  },
  'truc_co_dan': {
    id: 'truc_co_dan',
    name: 'Trúc Cơ Đan',
    materials: [
      { itemId: 'thao_duoc', quantity: 10 },
      { itemId: 'linh_thach_khoang', quantity: 3 }
    ],
    output: { itemId: 'truc_co_dan', quantity: 1 },
    expGain: 20,
    minLevel: 3,
    baseSuccessRate: 0.5,
  },
  'kim_dan_dan': {
    id: 'kim_dan_dan',
    name: 'Kim Đan Đan',
    materials: [
      { itemId: 'thao_duoc', quantity: 10 },
      { itemId: 'thiet_khoang', quantity: 5 }
    ],
    output: { itemId: 'kim_dan_dan', quantity: 1 },
    expGain: 25,
    minLevel: 3,
    baseSuccessRate: 0.4,
  },
  'tinh_than_dan': {
    id: 'tinh_than_dan',
    name: 'Tĩnh Thần Đan',
    materials: [
      { itemId: 'thao_duoc', quantity: 8 },
      { itemId: 'linh_thach_khoang', quantity: 2 }
    ],
    output: { itemId: 'tinh_than_dan', quantity: 1 },
    expGain: 15,
    minLevel: 2,
    baseSuccessRate: 0.55,
  },
};

export default ALCHEMY_RECIPES;
