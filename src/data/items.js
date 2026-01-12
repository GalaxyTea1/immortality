// Định nghĩa các vật phẩm trong game
export const ITEM_DEFINITIONS = {
  // ========== ĐAN DƯỢC (Pills) ==========
  'tieu_hoan_dan': {
    id: 'tieu_hoan_dan',
    name: 'Tiểu Hoàn Đan',
    description: 'Đan dược cấp thấp, hồi phục 50 HP',
    type: 'pill',
    rarity: 'common',
    effect: { type: 'heal', value: 50 },
    price: 50,
    image: 'https://images.unsplash.com/photo-1515263487990-61b07816b324?q=80&w=200',
  },
  'tu_khi_dan': {
    id: 'tu_khi_dan',
    name: 'Tụ Khí Đan',
    description: 'Tăng 20 EXP tu luyện',
    type: 'pill',
    rarity: 'uncommon',
    effect: { type: 'exp', value: 20 },
    price: 100,
    image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=200',
  },
  'truc_co_dan': {
    id: 'truc_co_dan',
    name: 'Trúc Cơ Đan',
    description: 'Đan dược quý hiếm, tăng 100 EXP. Cần thiết khi độ kiếp Trúc Cơ.',
    type: 'pill',
    rarity: 'rare',
    effect: { type: 'exp', value: 100 },
    price: 500,
    image: 'https://images.unsplash.com/photo-1515263487990-61b07816b324?q=80&w=200',
  },
  'kim_dan_dan': {
    id: 'kim_dan_dan',
    name: 'Kim Đan Đan',
    description: 'Đan dược thượng phẩm, tăng 500 EXP. Cần thiết khi độ kiếp Kim Đan.',
    type: 'pill',
    rarity: 'epic',
    effect: { type: 'exp', value: 500 },
    price: 2000,
    image: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?q=80&w=200',
  },
  'nguyen_anh_dan': {
    id: 'nguyen_anh_dan',
    name: 'Nguyên Anh Đan',
    description: 'Đan dược cực phẩm, tăng 2000 EXP. Cần thiết khi độ kiếp Nguyên Anh.',
    type: 'pill',
    rarity: 'legendary',
    effect: { type: 'exp', value: 2000 },
    price: 10000,
    image: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?q=80&w=200',
  },
  'hoa_than_dan': {
    id: 'hoa_than_dan',
    name: 'Hóa Thần Đan',
    description: 'Đan dược truyền thuyết, tăng 10000 EXP. Cần thiết khi độ kiếp Hóa Thần.',
    type: 'pill',
    rarity: 'legendary',
    effect: { type: 'exp', value: 10000 },
    price: 50000,
    image: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?q=80&w=200',
  },
  'tinh_than_dan': {
    id: 'tinh_than_dan',
    name: 'Tĩnh Thần Đan',
    description: 'Giảm 20 điểm Tâm Ma, giúp tâm hồn thanh tịnh.',
    type: 'pill',
    rarity: 'rare',
    effect: { type: 'suppress_demon', value: 20 },
    price: 800,
    image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=200',
  },

  // ========== NGUYÊN LIỆU (Materials) ==========
  'thao_duoc': {
    id: 'thao_duoc',
    name: 'Thảo Dược',
    description: 'Nguyên liệu luyện đan cơ bản',
    type: 'material',
    rarity: 'common',
    price: 10,
    image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=200',
  },
  'thiet_khoang': {
    id: 'thiet_khoang',
    name: 'Thiết Khoáng',
    description: 'Quặng sắt dùng để rèn vũ khí',
    type: 'material',
    rarity: 'common',
    price: 15,
    image: 'https://images.unsplash.com/photo-1534944883526-a0d4ea910903?q=80&w=200',
  },
  'linh_thach_khoang': {
    id: 'linh_thach_khoang',
    name: 'Linh Thạch Khoáng',
    description: 'Quặng chứa linh khí',
    type: 'material',
    rarity: 'uncommon',
    price: 80,
    image: 'https://images.unsplash.com/photo-1601342630318-7b4c6e4e083c?q=80&w=200',
  },
  'cuong_hoa_thach': {
    id: 'cuong_hoa_thach',
    name: 'Cường Hóa Thạch',
    description: 'Đá cường hóa trang bị',
    type: 'material',
    rarity: 'rare',
    price: 500,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=200',
  },

  // ========== TRANG BỊ - VŨ KHÍ (Weapons) ==========
  'huyet_ma_kiem': {
    id: 'huyet_ma_kiem',
    name: 'Huyết Ma Kiếm',
    description: 'Kiếm ma đạo, tăng 50 công kích',
    type: 'equipment',
    slot: 'weapon',
    rarity: 'legendary',
    effect: { attack: 50 },
    upgradeRequirements: { cuong_hoa_thach: 1 },
    price: 10000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmig9T3VNe8tsp4kjHeELlD5bgAc6jgjbqBN0_roLlswhGNPkYCyzS3sO61vMqqCmeuiJaUP5vQiP29pDGiqbKwf2qME758M-oiJe8CqGIspgspzmm7fa9VKDhom2xw8alMHQh6K_DFYzsAYI4ylooOBW_sAkpzMqXksmIjr3iPeyzAzIgQY_JmX0gb-A-EeA5ENa19k25ug_phao3mXOl1oJb1OpHtKI3vMO7B8KRQWtf89l67C-A5owdx_ECxTMlh3lD2YW42Ik',
  },
  'thien_loi_kiem': {
    id: 'thien_loi_kiem',
    name: 'Thiên Lôi Kiếm',
    description: 'Kiếm sấm sét, tăng 30 công kích',
    type: 'equipment',
    slot: 'weapon',
    rarity: 'epic',
    effect: { attack: 30 },
    upgradeRequirements: { cuong_hoa_thach: 1 },
    price: 5000,
    image: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?q=80&w=200',
  },

  // ========== TRANG BỊ - GIÁP (Armor) ==========
  'kim_chung_tao': {
    id: 'kim_chung_tao',
    name: 'Kim Chung Tạo',
    description: 'Giáp hoàng kim, tăng 40 phòng thủ',
    type: 'equipment',
    slot: 'armor',
    rarity: 'legendary',
    effect: { defense: 40 },
    upgradeRequirements: { cuong_hoa_thach: 1 },
    price: 8000,
    image: 'https://images.unsplash.com/photo-1557531365-e8b22d93dbd0?q=80&w=200',
  },
  'huyen_thiet_giap': {
    id: 'huyen_thiet_giap',
    name: 'Huyền Thiết Giáp',
    description: 'Giáp sắt đen, tăng 20 phòng thủ',
    type: 'equipment',
    slot: 'armor',
    rarity: 'rare',
    effect: { defense: 20 },
    upgradeRequirements: { cuong_hoa_thach: 1 },
    price: 3000,
    image: 'https://images.unsplash.com/photo-1599839575850-994c5029a8a6?q=80&w=200',
  },

  // ========== TRANG BỊ - THẦN THỨC (Spirit) ==========
  'linh_hon_chu': {
    id: 'linh_hon_chu',
    name: 'Linh Hồn Châu',
    description: 'Ngọc linh hồn, tăng 30 tinh thần',
    type: 'equipment',
    slot: 'spirit',
    rarity: 'epic',
    effect: { spirit: 30 },
    upgradeRequirements: { cuong_hoa_thach: 1 },
    price: 6000,
    image: 'https://images.unsplash.com/photo-1601342630318-7b4c6e4e083c?q=80&w=200',
  },

  // ========== TRANG BỊ - TỐC ĐỘ (Speed) ==========
  'phong_than_hai': {
    id: 'phong_than_hai',
    name: 'Phong Thần Hài',
    description: 'Giày thần tốc, tăng 25 nhanh nhẹn',
    type: 'equipment',
    slot: 'speed',
    rarity: 'epic',
    effect: { agility: 25 },
    upgradeRequirements: { cuong_hoa_thach: 1 },
    price: 4500,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200',
  },

  // ========== TRANG BỊ - VIP ==========
  'ngoc_boi': {
    id: 'ngoc_boi',
    name: 'Ngọc Bội',
    description: 'Trang sức quý hiếm, +10% EXP tu luyện',
    type: 'equipment',
    slot: 'vip',
    rarity: 'rare',
    effect: { cultivationSpeed: 0.1 },
    upgradeRequirements: { cuong_hoa_thach: 1 },
    price: 2000,
    image: 'https://i.etsystatic.com/29320864/r/il/7d221a/4206023060/il_340x270.4206023060_di3b.jpg',
  },

  // ========== TRANG BỊ - THỜI TRANG (Fashion) ==========
  'tien_than_y': {
    id: 'tien_than_y',
    name: 'Tiên Thần Y',
    description: 'Áo tiên nhân, tăng 50 HP tối đa',
    type: 'equipment',
    slot: 'fashion',
    rarity: 'legendary',
    effect: { maxHp: 50 },
    upgradeRequirements: { cuong_hoa_thach: 1 },
    price: 7000,
    image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?q=80&w=200',
  },

  // ========== BÍ KÍP (Books) ==========
  'tu_ha_bi_dien': {
    id: 'tu_ha_bi_dien',
    name: 'Tử Hà Bí Điển',
    description: 'Công pháp thượng cổ, tăng tốc tu luyện vĩnh viễn +10%',
    type: 'book',
    rarity: 'epic',
    effect: { cultivationSpeed: 0.1 },
    price: 5000,
    image: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?q=80&w=200',
  },
  'kim_cuong_cuong_than_quyet': {
    id: 'kim_cuong_cuong_than_quyet',
    name: 'Kim Cương Cường Thân Quyết',
    description: 'Thể thuật cường hóa, +20 phòng thủ vĩnh viễn',
    type: 'book',
    rarity: 'rare',
    effect: { defense: 20 },
    price: 3000,
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=200',
  },
};

// Lấy item theo loại
export const getItemsByType = (type) => {
  return Object.values(ITEM_DEFINITIONS).filter(item => item.type === type);
};

// Lấy item theo slot trang bị
export const getItemsBySlot = (slot) => {
  return Object.values(ITEM_DEFINITIONS).filter(
    item => item.type === 'equipment' && item.slot === slot
  );
};

// Lấy màu rarity
export const getRarityColor = (rarity) => {
  const colors = {
    common: '#9ca3af',
    uncommon: '#22c55e',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
  };
  return colors[rarity] || colors.common;
};

export default ITEM_DEFINITIONS;
