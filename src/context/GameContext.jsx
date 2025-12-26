import { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Định nghĩa các cảnh giới tu luyện
const REALMS = [
  { name: 'Luyện Khí', levels: 9, expPerLevel: 100 },
  { name: 'Trúc Cơ', levels: 9, expPerLevel: 500 },
  { name: 'Kim Đan', levels: 9, expPerLevel: 2000 },
  { name: 'Nguyên Anh', levels: 9, expPerLevel: 10000 },
  { name: 'Hóa Thần', levels: 9, expPerLevel: 50000 },
];

// Định nghĩa các vật phẩm trong game
const ITEM_DEFINITIONS = {
  // Đan Dược (Pills)
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
    description: 'Đan dược quý hiếm, tăng 100 EXP',
    type: 'pill',
    rarity: 'rare',
    effect: { type: 'exp', value: 100 },
    price: 500,
    image: 'https://images.unsplash.com/photo-1515263487990-61b07816b324?q=80&w=200',
  },
  'kim_dan_dan': {
    id: 'kim_dan_dan',
    name: 'Kim Đan Đan',
    description: 'Đan dược thượng phẩm, tăng 500 EXP',
    type: 'pill',
    rarity: 'epic',
    effect: { type: 'exp', value: 500 },
    price: 2000,
    image: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?q=80&w=200',
  },
  // Nguyên liệu (Materials)
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
  
  // ====== TRANG BỊ (6 slots) ======
  // Slot: weapon (Sát Thương)
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
  
  // Slot: armor (Giáp)
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
  
  // Slot: spirit (Thần Thức)
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
  
  // Slot: speed (Tốc Độ)
  'phong_than_hài': {
    id: 'phong_than_hài',
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
  
  // Slot: vip (Đồ VIP - bonus đặc biệt)
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
    image: 'https://images.unsplash.com/photo-1601342630318-7b4c6e4e083c?q=80&w=200',
  },
  
  // Slot: fashion (Thời Trang)
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
  
  // ====== BÍ KÍP (Books - học vĩnh viễn) ======
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

// ===== CÔNG THỨC LUYỆN ĐAN =====
const ALCHEMY_RECIPES = {
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
    materials: [{ itemId: 'thao_duoc', quantity: 5 }, { itemId: 'thiet_khoang', quantity: 2 }],
    output: { itemId: 'tu_khi_dan', quantity: 1 },
    expGain: 10,
    minLevel: 2,
    baseSuccessRate: 0.6,
  },
  'kim_dan_dan': {
    id: 'kim_dan_dan',
    name: 'Kim Đan Đan',
    materials: [{ itemId: 'thao_duoc', quantity: 10 }, { itemId: 'thiet_khoang', quantity: 5 }],
    output: { itemId: 'kim_dan_dan', quantity: 1 },
    expGain: 25,
    minLevel: 3,
    baseSuccessRate: 0.4,
  },
};

// ===== BẢNG DANH HIỆU =====
const REPUTATION_TITLES = [
  { level: 1, minPoints: 0, title: 'Vô Danh', color: 'gray' },
  { level: 2, minPoints: 100, title: 'Sơ Nhập Giang Hồ', color: 'white' },
  { level: 3, minPoints: 300, title: 'Tiểu Hữu Danh', color: 'green' },
  { level: 4, minPoints: 600, title: 'Danh Trấn Nhất Phương', color: 'blue' },
  { level: 5, minPoints: 1000, title: 'Phong Vân Nhân Vật', color: 'purple' },
  { level: 6, minPoints: 2000, title: 'Nhất Đại Tông Sư', color: 'orange' },
  { level: 7, minPoints: 5000, title: 'Thiên Hạ Đệ Nhất', color: 'red' },
  { level: 8, minPoints: 10000, title: 'Truyền Thuyết Bất Hủ', color: 'gold' },
];

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
  // Inventory: mảng các { itemId, quantity }
  inventory: [
    { itemId: 'tieu_hoan_dan', quantity: 5 },
    { itemId: 'tu_khi_dan', quantity: 3 },
    { itemId: 'thao_duoc', quantity: 20 },
    { itemId: 'thiet_khoang', quantity: 15 },
    { itemId: 'huyet_ma_kiem', quantity: 2 }, // Thêm trang bị mẫu
    { itemId: 'cuong_hoa_thach', quantity: 10 }, // Đá cường hóa
  ],
  // Trang bị đang đeo - 6 slots
  equipment: {
    spirit: null,    // Thần Thức (tăng tinh thần)
    weapon: null,    // Sát Thương (tăng công kích)
    armor: null,     // Giáp (tăng phòng thủ)
    vip: null,       // Đồ VIP (bonus đặc biệt)
    speed: null,     // Tốc Độ (tăng nhanh nhẹn)
    fashion: null,   // Thời Trang (cosmetic)
  },
  // Chỉ số cơ bản (không tính trang bị)
  baseStats: {
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 5,
    agility: 10,      // Nhanh nhẹn
    spirit: 10,       // Tinh thần
    cultivationSpeed: 1.0, // Tốc độ tu luyện (multiplier)
  },
  // Stats tổng hợp (sẽ được tính toán từ baseStats + equipment)
  stats: {
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 5,
    agility: 10,
    spirit: 10,
    cultivationSpeed: 1.0,
  },
  // Bí kíp/Kỹ năng đã học
  learnedSkills: [],
  
  // ===== HỆ THỐNG CĂN CƠ =====
  // Căn cơ thể hiện nền tảng tu luyện, dùng đan quá nhiều sẽ giảm căn cơ
  foundation: {
    value: 100,      // Giá trị căn cơ hiện tại (0-100)
    maxValue: 100,   // Căn cơ tối đa
    danUsedCount: 0, // Số lần dùng đan dược (dùng để tính phạt)
    expBonus: 0.05,  // Bonus EXP khi căn cơ >= 70 (5%)
    lastRecovery: Date.now(),
  },
  
  // ===== HỆ THỐNG TÂM MA =====
  // Tâm ma sinh ra khi tu luyện nhanh quá, dùng đan nhiều, hoặc thất bại
  innerDemon: {
    value: 0,        // Giá trị tâm ma (0-100)
    maxValue: 100,
    threshold: 70,   // Ngưỡng nguy hiểm
    suppressCount: 0, // Số lần đã trấn áp tâm ma
  },
  
  // ===== HỆ THỐNG DANH VỌNG =====
  // Danh vọng tăng qua tu luyện, khám phá, hoàn thành quest
  reputation: {
    value: 0,          // Điểm danh vọng
    level: 1,          // Cấp danh vọng
    title: 'Vô Danh',  // Danh hiệu
    explorationPoints: 0,  // Điểm từ khám phá
    questPoints: 0,        // Điểm từ quest
    cultivationPoints: 0,  // Điểm từ tu luyện
  },
  
  // ===== HỆ THỐNG LUYỆN ĐAN =====
  alchemy: {
    level: 1,        // Cấp luyện đan
    exp: 0,          // EXP luyện đan
    maxExp: 50,      // EXP để lên cấp
    successRate: 0.6, // Tỷ lệ thành công cơ bản (60%)
    craftCount: 0,   // Số lần đã luyện
  },
  
  // Exploration system
  exploration: {
    currentLocation: null,
    isExploring: false,
    explorationCount: 0, // Số lần khám phá hôm nay
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

// Key để lưu vào localStorage
const STORAGE_KEY = 'tutien_game_save';

// Hàm load game từ localStorage
const loadGameState = () => {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      // Merge với initialState để đảm bảo có đầy đủ các field mới
      return {
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
      };
    }
  } catch (error) {
    console.error('Lỗi khi load game:', error);
  }
  return initialState;
};

// Hàm save game vào localStorage
const saveGameState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Lỗi khi save game:', error);
  }
};

export function GameProvider({ children }) {
  // Load game từ localStorage khi khởi động
  const [gameState, setGameState] = useState(() => loadGameState());
  const [isLoaded, setIsLoaded] = useState(false);

  // Auto-save khi gameState thay đổi (debounced)
  useEffect(() => {
    if (!isLoaded) {
      setIsLoaded(true);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      saveGameState(gameState);
      console.log('💾 Game đã lưu tự động');
    }, 500); // Debounce 500ms
    
    return () => clearTimeout(timeoutId);
  }, [gameState, isLoaded]);

  // Thêm Linh Thạch
  const addSpiritStones = useCallback((amount) => {
    setGameState(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        spiritStones: prev.resources.spiritStones + amount,
      },
    }));
  }, []);

  // Tiêu Linh Thạch
  const spendSpiritStones = useCallback((amount) => {
    setGameState(prev => {
      if (prev.resources.spiritStones < amount) {
        return prev; // Không đủ
      }
      return {
        ...prev,
        resources: {
          ...prev.resources,
          spiritStones: prev.resources.spiritStones - amount,
        },
      };
    });
  }, []);

  // Thêm Đan Dược
  const addPills = useCallback((amount) => {
    setGameState(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        pills: prev.resources.pills + amount,
      },
    }));
  }, []);

  // Tiêu Đan Dược
  const spendPills = useCallback((amount) => {
    setGameState(prev => {
      if (prev.resources.pills < amount) {
        return prev;
      }
      return {
        ...prev,
        resources: {
          ...prev.resources,
          pills: prev.resources.pills - amount,
        },
      };
    });
  }, []);

  // Thêm EXP tu luyện
  const addExp = useCallback((amount) => {
    setGameState(prev => {
      let { exp, maxExp, level, realmIndex } = prev.player;
      exp += amount;

      // Kiểm tra thăng cấp
      while (exp >= maxExp) {
        exp -= maxExp;
        level++;

        // Kiểm tra đột phá cảnh giới
        if (level > REALMS[realmIndex].levels) {
          if (realmIndex < REALMS.length - 1) {
            realmIndex++;
            level = 1;
            maxExp = REALMS[realmIndex].expPerLevel;
          } else {
            // Đã đạt cảnh giới cao nhất
            level = REALMS[realmIndex].levels;
            exp = maxExp;
            break;
          }
        } else {
          maxExp = REALMS[realmIndex].expPerLevel * level;
        }
      }

      return {
        ...prev,
        player: {
          ...prev.player,
          exp,
          maxExp,
          level,
          realmIndex,
        },
      };
    });
  }, []);

  // Lấy tên cảnh giới đầy đủ
  const getRealmName = useCallback(() => {
    const { realmIndex, level } = gameState.player;
    return `${REALMS[realmIndex].name} Tầng ${level}`;
  }, [gameState.player]);

  // Format số cho dễ đọc
  const formatNumber = useCallback((num) => {
    return num.toLocaleString('vi-VN');
  }, []);

  // Lấy thông tin item theo id
  const getItemInfo = useCallback((itemId) => {
    return ITEM_DEFINITIONS[itemId] || null;
  }, []);

  // Thêm item vào inventory
  const addItem = useCallback((itemId, quantity = 1) => {
    if (!ITEM_DEFINITIONS[itemId]) return false;
    
    setGameState(prev => {
      const existingIndex = prev.inventory.findIndex(i => i.itemId === itemId);
      let newInventory;
      
      if (existingIndex >= 0) {
        // Đã có item này, tăng số lượng
        newInventory = prev.inventory.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Chưa có, thêm mới
        newInventory = [...prev.inventory, { itemId, quantity }];
      }
      
      return { ...prev, inventory: newInventory };
    });
    return true;
  }, []);

  // Xóa item khỏi inventory
  const removeItem = useCallback((itemId, quantity = 1) => {
    setGameState(prev => {
      const existingIndex = prev.inventory.findIndex(i => i.itemId === itemId);
      if (existingIndex < 0) return prev;
      
      const currentQty = prev.inventory[existingIndex].quantity;
      if (currentQty < quantity) return prev; // Không đủ
      
      let newInventory;
      if (currentQty === quantity) {
        // Xóa hoàn toàn
        newInventory = prev.inventory.filter((_, idx) => idx !== existingIndex);
      } else {
        // Giảm số lượng
        newInventory = prev.inventory.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity - quantity }
            : item
        );
      }
      
      return { ...prev, inventory: newInventory };
    });
    return true;
  }, []);

  // Sử dụng item (áp dụng effect) - có thể sử dụng nhiều cùng lúc
  const useItem = useCallback((itemId, quantity = 1) => {
    const itemDef = ITEM_DEFINITIONS[itemId];
    if (!itemDef) return { success: false, message: 'Vật phẩm không tồn tại' };
    
    // Kiểm tra có trong inventory không
    const inInventory = gameState.inventory.find(i => i.itemId === itemId);
    if (!inInventory || inInventory.quantity < quantity) {
      return { success: false, message: 'Không đủ vật phẩm trong túi' };
    }
    
    // Xử lý theo loại item
    if (itemDef.type === 'pill') {
      // Đan dược - có thể dùng nhiều cùng lúc
      let messages = [];
      const effect = itemDef.effect;
      
      // Xử lý tăng EXP
      if (effect.type === 'exp' || effect.exp) {
        const value = effect.value || effect.exp;
        const totalExp = value * quantity;
        addExp(totalExp);
        messages.push(`+${totalExp} EXP`);
      }
      
      // Xử lý hồi máu
      if (effect.type === 'heal' || effect.hp) {
        const value = effect.value || effect.hp;
        const totalHp = value * quantity;
        setGameState(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            hp: Math.min(prev.stats.hp + totalHp, prev.stats.maxHp),
          },
        }));
        messages.push(`+${totalHp} HP`);
      }
      
      removeItem(itemId, quantity);
      return { 
        success: true, 
        message: `Sử dụng ${quantity}x ${itemDef.name}: ${messages.join(', ')}!` 
      };
      
    } else if (itemDef.type === 'equipment') {
      // Trang bị - equip vào slot tương ứng
      console.log('🔧 [useItem] Equipping:', itemId, 'to slot:', itemDef.slot);
      const oldEquipment = gameState.equipment[itemDef.slot];
      console.log('🔧 [useItem] Old equipment:', oldEquipment);
      setGameState(prev => {
        // Xóa item mới từ inventory
        let newInventory = prev.inventory.map(item => 
          item.itemId === itemId 
            ? { ...item, quantity: item.quantity - 1 }
            : item
        ).filter(item => item.quantity > 0);
        
        // Thêm item cũ vào inventory (nếu có)
        if (oldEquipment && oldEquipment.itemId) {
          const existingOld = newInventory.find(i => i.itemId === oldEquipment.itemId);
          if (existingOld) {
            newInventory = newInventory.map(item =>
              item.itemId === oldEquipment.itemId
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          } else {
            newInventory.push({ itemId: oldEquipment.itemId, quantity: 1 });
          }
        }
        
        // Cập nhật equipment
        const newEquipment = {
          ...prev.equipment,
          [itemDef.slot]: { itemId, enhanceLevel: 0 },
        };
        
        // Tính lại stats ngay trong cùng setState
        const newStats = { ...prev.baseStats };
        for (const [slotKey, equipped] of Object.entries(newEquipment)) {
          if (equipped && equipped.itemId) {
            const equipDef = ITEM_DEFINITIONS[equipped.itemId];
            if (equipDef && equipDef.effect) {
              for (const [stat, value] of Object.entries(equipDef.effect)) {
                if (newStats[stat] !== undefined) {
                  const enhanceBonus = Math.floor(value * equipped.enhanceLevel * 0.1);
                  newStats[stat] += value + enhanceBonus;
                }
              }
            }
          }
        }
        
        console.log('🔧 [useItem] New inventory:', newInventory);
        console.log('🔧 [useItem] New equipment:', newEquipment);
        console.log('🔧 [useItem] New stats:', newStats);
        return {
          ...prev,
          inventory: newInventory,
          equipment: newEquipment,
          stats: newStats,
        };
      });
      
      return { 
        success: true, 
        message: `Đã trang bị ${itemDef.name}${oldEquipment?.itemId ? ` (thay ${ITEM_DEFINITIONS[oldEquipment.itemId]?.name})` : ''}!` 
      };
      
    } else if (itemDef.type === 'book') {
      // Bí kíp - học vĩnh viễn, cộng vào baseStats
      const alreadyLearned = gameState.learnedSkills.includes(itemId);
      if (alreadyLearned) {
        return { success: false, message: 'Bạn đã học bí kíp này rồi!' };
      }
      
      // Áp dụng effect vào baseStats
      setGameState(prev => {
        const newBaseStats = { ...prev.baseStats };
        for (const [stat, value] of Object.entries(itemDef.effect)) {
          if (newBaseStats[stat] !== undefined) {
            newBaseStats[stat] += value;
          }
        }
        return {
          ...prev,
          baseStats: newBaseStats,
          learnedSkills: [...prev.learnedSkills, itemId],
        };
      });
      
      removeItem(itemId, 1);
      
      // Tính lại stats
      recalculateStats();
      
      const effectStr = Object.entries(itemDef.effect)
        .map(([k, v]) => `+${v * (k === 'cultivationSpeed' ? 100 : 1)}${k === 'cultivationSpeed' ? '%' : ''} ${k}`)
        .join(', ');
      
      return { success: true, message: `Học được ${itemDef.name}! ${effectStr}` };
      
    } else if (itemDef.type === 'material') {
      return { success: false, message: 'Nguyên liệu không thể sử dụng trực tiếp' };
    }
    
    return { success: false, message: 'Không thể sử dụng vật phẩm này' };
  }, [gameState.inventory, gameState.equipment, gameState.learnedSkills, addExp, removeItem]);

  // Tính lại stats từ baseStats + equipment
  const recalculateStats = useCallback(() => {
    setGameState(prev => {
      const newStats = { ...prev.baseStats };
      
      // Cộng thêm từ equipment
      for (const [slotKey, equipped] of Object.entries(prev.equipment)) {
        if (equipped && equipped.itemId) {
          const itemDef = ITEM_DEFINITIONS[equipped.itemId];
          if (itemDef && itemDef.effect) {
            for (const [stat, value] of Object.entries(itemDef.effect)) {
              if (newStats[stat] !== undefined) {
                // Cộng thêm bonus từ enhance level
                const enhanceBonus = Math.floor(value * equipped.enhanceLevel * 0.1);
                newStats[stat] += value + enhanceBonus;
              }
            }
          }
        }
      }
      
      return { ...prev, stats: newStats };
    });
  }, []);

  // Tháo trang bị
  const unequipItem = useCallback((slot) => {
    console.log('🔧 [unequipItem] Unequipping slot:', slot);
    const equipped = gameState.equipment[slot];
    console.log('🔧 [unequipItem] Equipped item:', equipped);
    if (!equipped || !equipped.itemId) {
      console.log('🔧 [unequipItem] Slot is empty!');
      return { success: false, message: 'Slot này đang trống!' };
    }
    
    const itemDef = ITEM_DEFINITIONS[equipped.itemId];
    console.log('🔧 [unequipItem] Item def:', itemDef?.name);
    
    setGameState(prev => {
      // Trả trang bị về inventory
      let newInventory = [...prev.inventory];
      const existingItem = newInventory.find(i => i.itemId === equipped.itemId);
      if (existingItem) {
        newInventory = newInventory.map(item =>
          item.itemId === equipped.itemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newInventory.push({ itemId: equipped.itemId, quantity: 1 });
      }
      
      // Cập nhật equipment
      const newEquipment = {
        ...prev.equipment,
        [slot]: null,
      };
      
      // Tính lại stats
      const newStats = { ...prev.baseStats };
      for (const [slotKey, equip] of Object.entries(newEquipment)) {
        if (equip && equip.itemId) {
          const equipDef = ITEM_DEFINITIONS[equip.itemId];
          if (equipDef && equipDef.effect) {
            for (const [stat, value] of Object.entries(equipDef.effect)) {
              if (newStats[stat] !== undefined) {
                const enhanceBonus = Math.floor(value * equip.enhanceLevel * 0.1);
                newStats[stat] += value + enhanceBonus;
              }
            }
          }
        }
      }
      
      return {
        ...prev,
        inventory: newInventory,
        equipment: newEquipment,
        stats: newStats,
      };
    });
    
    return { success: true, message: `Đã tháo ${itemDef?.name || 'trang bị'}!` };
  }, [gameState.equipment]);

  // Cường hóa trang bị
  const upgradeEquipment = useCallback((slot) => {
    const equipped = gameState.equipment[slot];
    if (!equipped || !equipped.itemId) {
      return { success: false, message: 'Không có trang bị trong slot này!' };
    }
    
    const itemDef = ITEM_DEFINITIONS[equipped.itemId];
    if (!itemDef) {
      return { success: false, message: 'Trang bị không hợp lệ!' };
    }
    
    // Kiểm tra có item giống trong kho để cường hóa không
    const sameItemInInventory = gameState.inventory.find(i => i.itemId === equipped.itemId);
    if (!sameItemInInventory || sameItemInInventory.quantity < 1) {
      return { success: false, message: `Cần 1x ${itemDef.name} trong kho để cường hóa!` };
    }
    
    // Kiểm tra đá cường hóa (cấp cao hơn cần nhiều hơn)
    const enhanceStoneRequired = Math.max(1, equipped.enhanceLevel + 1);
    const enhanceStoneInInventory = gameState.inventory.find(i => i.itemId === 'cuong_hoa_thach');
    if (!enhanceStoneInInventory || enhanceStoneInInventory.quantity < enhanceStoneRequired) {
      return { success: false, message: `Cần ${enhanceStoneRequired}x Cường Hóa Thạch để cường hóa!` };
    }
    
    const newEnhanceLevel = equipped.enhanceLevel + 1;
    
    setGameState(prev => {
      // Tiêu hao nguyên liệu
      let newInventory = prev.inventory.map(item => {
        if (item.itemId === equipped.itemId) {
          return { ...item, quantity: item.quantity - 1 };
        }
        if (item.itemId === 'cuong_hoa_thach') {
          return { ...item, quantity: item.quantity - enhanceStoneRequired };
        }
        return item;
      }).filter(item => item.quantity > 0);
      
      // Cập nhật equipment với enhance level mới
      const newEquipment = {
        ...prev.equipment,
        [slot]: {
          ...equipped,
          enhanceLevel: newEnhanceLevel,
        },
      };
      
      // Tính lại stats
      const newStats = { ...prev.baseStats };
      for (const [slotKey, equip] of Object.entries(newEquipment)) {
        if (equip && equip.itemId) {
          const equipDef = ITEM_DEFINITIONS[equip.itemId];
          if (equipDef && equipDef.effect) {
            for (const [stat, value] of Object.entries(equipDef.effect)) {
              if (newStats[stat] !== undefined) {
                const enhanceBonus = Math.floor(value * equip.enhanceLevel * 0.1);
                newStats[stat] += value + enhanceBonus;
              }
            }
          }
        }
      }
      
      return {
        ...prev,
        inventory: newInventory,
        equipment: newEquipment,
        stats: newStats,
      };
    });
    
    return { 
      success: true, 
      message: `Cường hóa ${itemDef.name} thành công! Nay là +${newEnhanceLevel}` 
    };
  }, [gameState.equipment, gameState.inventory]);

  // Lấy thông tin trang bị đang đeo với details
  const getEquippedItems = useCallback(() => {
    const result = {};
    for (const [slot, equipped] of Object.entries(gameState.equipment)) {
      if (equipped && equipped.itemId) {
        const itemDef = ITEM_DEFINITIONS[equipped.itemId];
        result[slot] = {
          ...equipped,
          ...itemDef,
        };
      } else {
        result[slot] = null;
      }
    }
    return result;
  }, [gameState.equipment]);

  // Lấy inventory với đầy đủ thông tin item
  const getInventoryWithDetails = useCallback(() => {
    return gameState.inventory.map(item => ({
      ...item,
      ...ITEM_DEFINITIONS[item.itemId],
    }));
  }, [gameState.inventory]);

  // Mua item từ shop
  const buyItem = useCallback((itemId, price, quantity = 1) => {
    const totalCost = price * quantity;
    
    // Kiểm tra đủ tiền không
    if (gameState.resources.spiritStones < totalCost) {
      return { 
        success: false, 
        message: `Không đủ Linh Thạch! Cần ${totalCost.toLocaleString()}, bạn chỉ có ${gameState.resources.spiritStones.toLocaleString()}.` 
      };
    }
    
    // Trừ tiền
    setGameState(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        spiritStones: prev.resources.spiritStones - totalCost,
      },
    }));
    
    // Thêm vào inventory
    addItem(itemId, quantity);
    
    const itemDef = ITEM_DEFINITIONS[itemId];
    const itemName = itemDef ? itemDef.name : itemId;
    
    return { 
      success: true, 
      message: `Mua thành công ${quantity}x ${itemName}! Đã trừ ${totalCost.toLocaleString()} Linh Thạch.` 
    };
  }, [gameState.resources.spiritStones, addItem]);

  // Thêm event vào log
  const addEvent = useCallback((type, message) => {
    setGameState(prev => ({
      ...prev,
      events: [
        { id: Date.now(), type, message, time: Date.now() },
        ...prev.events.slice(0, 19), // Giữ tối đa 20 events
      ],
    }));
  }, []);

  // Khám phá địa điểm
  const exploreLocation = useCallback((locationId, locationName, dangerLevel) => {
    const { exploration } = gameState;
    
    // Kiểm tra còn lượt khám phá không
    if (exploration.explorationCount >= exploration.maxExplorationPerDay) {
      return {
        success: false,
        message: 'Đã hết lượt khám phá hôm nay! (10/10)',
        rewards: null,
      };
    }
    
    // Random kết quả dựa trên danger level
    const rewards = { exp: 0, spiritStones: 0, items: [] };
    let eventMessage = '';
    
    // Base rewards
    const baseExp = 5;
    const baseStones = 10;
    
    // Danger multiplier
    const dangerMultiplier = {
      'safe': 0.5,
      'medium': 1,
      'high': 2,
      'pvp': 3,
    }[dangerLevel] || 1;
    
    // Random events
    const roll = Math.random();
    
    if (roll < 0.6) {
      // Thành công - nhận thưởng thường
      rewards.exp = Math.floor((baseExp + Math.random() * 10) * dangerMultiplier);
      rewards.spiritStones = Math.floor((baseStones + Math.random() * 20) * dangerMultiplier);
      eventMessage = `Khám phá ${locationName} thành công! +${rewards.exp} EXP, +${rewards.spiritStones} Linh Thạch`;
      
      // Có cơ hội nhận thêm item
      if (Math.random() < 0.3) {
        rewards.items.push({ itemId: 'thao_duoc', quantity: Math.ceil(Math.random() * 3) });
        eventMessage += ', tìm được Thảo Dược!';
      }
      
    } else if (roll < 0.85) {
      // Bình thường
      rewards.exp = Math.floor(baseExp * dangerMultiplier * 0.5);
      eventMessage = `Khám phá ${locationName} không thu được gì đặc biệt. +${rewards.exp} EXP`;
      
    } else {
      // Gặp nguy hiểm
      const damage = Math.floor(10 * dangerMultiplier);
      setGameState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          hp: Math.max(1, prev.stats.hp - damage),
        },
      }));
      rewards.exp = Math.floor(baseExp * dangerMultiplier * 0.3);
      eventMessage = `Gặp nguy hiểm tại ${locationName}! Mất ${damage} HP, +${rewards.exp} EXP`;
    }
    
    // Áp dụng rewards
    if (rewards.exp > 0) addExp(rewards.exp);
    if (rewards.spiritStones > 0) addSpiritStones(rewards.spiritStones);
    rewards.items.forEach(item => addItem(item.itemId, item.quantity));
    
    // Cập nhật exploration count và quest progress
    setGameState(prev => {
      const newState = {
        ...prev,
        exploration: {
          ...prev.exploration,
          explorationCount: prev.exploration.explorationCount + 1,
        },
      };
      
      // Cập nhật quest progress nếu có item liên quan
      if (rewards.items.some(i => i.itemId === 'thao_duoc') && prev.quests.active) {
        const itemQty = rewards.items.find(i => i.itemId === 'thao_duoc')?.quantity || 0;
        newState.quests = {
          ...prev.quests,
          active: {
            ...prev.quests.active,
            progress: Math.min(prev.quests.active.progress + itemQty, prev.quests.active.target),
          },
        };
      }
      
      return newState;
    });
    
    // Thêm event
    addEvent(roll < 0.85 ? 'success' : 'danger', eventMessage);
    
    return {
      success: true,
      message: eventMessage,
      rewards,
      explorationLeft: gameState.exploration.maxExplorationPerDay - gameState.exploration.explorationCount - 1,
    };
  }, [gameState.exploration, addExp, addSpiritStones, addItem, addEvent]);

  // Nhận thưởng quest
  const claimQuestReward = useCallback(() => {
    const { quests } = gameState;
    
    if (!quests.active || quests.active.progress < quests.active.target) {
      return { success: false, message: 'Quest chưa hoàn thành!' };
    }
    
    const { rewards } = quests.active;
    
    // Áp dụng rewards
    if (rewards.spiritStones) addSpiritStones(rewards.spiritStones);
    if (rewards.exp) addExp(rewards.exp);
    
    // Hoàn thành quest
    setGameState(prev => ({
      ...prev,
      quests: {
        ...prev.quests,
        completed: [...prev.quests.completed, prev.quests.active.id],
        active: null, // Tạm thời không có quest mới
      },
    }));
    
    addEvent('quest', `Hoàn thành nhiệm vụ "${quests.active.name}"! Nhận ${rewards.spiritStones} Linh Thạch, ${rewards.exp} EXP`);
    
    return { 
      success: true, 
      message: `Hoàn thành! +${rewards.spiritStones} Linh Thạch, +${rewards.exp} EXP` 
    };
  }, [gameState.quests, addSpiritStones, addExp, addEvent]);

  // Hồi phục HP (thiền định)
  const restoreHp = useCallback((amount) => {
    setGameState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        hp: Math.min(prev.stats.hp + amount, prev.stats.maxHp),
      },
    }));
    addEvent('heal', `Hồi phục ${amount} HP`);
  }, [addEvent]);

  // Reset game về trạng thái ban đầu
  const resetGame = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setGameState(initialState);
    console.log('🔄 Game đã được reset');
  }, []);

  // Export save data (để backup)
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

  // Import save data (để restore)
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
    } catch (error) {
      return { success: false, message: 'Lỗi: File không hợp lệ!' };
    }
  }, []);

  // ===== HỆ THỐNG CĂN CƠ =====
  // Giảm căn cơ khi dùng đan (được gọi trong useItem)
  const reduceFoundation = useCallback((amount = 2) => {
    setGameState(prev => ({
      ...prev,
      foundation: {
        ...prev.foundation,
        value: Math.max(0, prev.foundation.value - amount),
        danUsedCount: prev.foundation.danUsedCount + 1,
      },
    }));
  }, []);

  // Hồi phục căn cơ (thiền định, không dùng đan)
  const recoverFoundation = useCallback((amount = 1) => {
    setGameState(prev => ({
      ...prev,
      foundation: {
        ...prev.foundation,
        value: Math.min(prev.foundation.maxValue, prev.foundation.value + amount),
        lastRecovery: Date.now(),
      },
    }));
  }, []);

  // Lấy trạng thái căn cơ
  const getFoundationStatus = useCallback(() => {
    const { value } = gameState.foundation;
    if (value >= 80) return { label: 'Vững Chắc', color: 'success', bonus: '+5% EXP' };
    if (value >= 50) return { label: 'Bình Thường', color: 'warning', bonus: '+0% EXP' };
    if (value >= 20) return { label: 'Lung Lay', color: 'danger', bonus: '-5% EXP' };
    return { label: 'Rất Yếu', color: 'critical', bonus: '-15% EXP' };
  }, [gameState.foundation]);

  // ===== HỆ THỐNG TÂM MA =====
  // Tăng tâm ma (khi dùng đan nhiều, tu luyện quá nhanh)
  const addInnerDemon = useCallback((amount = 1) => {
    setGameState(prev => {
      const newValue = Math.min(prev.innerDemon.maxValue, prev.innerDemon.value + amount);
      return {
        ...prev,
        innerDemon: { ...prev.innerDemon, value: newValue },
      };
    });
  }, []);

  // Trấn áp tâm ma (thiền định, dùng item đặc biệt)
  const suppressInnerDemon = useCallback((amount = 5) => {
    setGameState(prev => ({
      ...prev,
      innerDemon: {
        ...prev.innerDemon,
        value: Math.max(0, prev.innerDemon.value - amount),
        suppressCount: prev.innerDemon.suppressCount + 1,
      },
    }));
    addEvent('heal', `Trấn áp tâm ma thành công! -${amount}% Tâm Ma`);
  }, [addEvent]);

  // Lấy trạng thái tâm ma
  const getInnerDemonStatus = useCallback(() => {
    const { value, threshold } = gameState.innerDemon;
    if (value === 0) return { label: 'An Toàn', color: 'success' };
    if (value < 30) return { label: 'Nhỏ', color: 'info' };
    if (value < threshold) return { label: 'Cảnh Báo', color: 'warning' };
    return { label: 'Nguy Hiểm!', color: 'danger' };
  }, [gameState.innerDemon]);

  // ===== HỆ THỐNG DANH VỌNG =====
  // Thêm điểm danh vọng
  const addReputation = useCallback((points, type = 'general') => {
    setGameState(prev => {
      const newValue = prev.reputation.value + points;
      // Tìm danh hiệu mới
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

  // ===== HỆ THỐNG LUYỆN ĐAN =====
  // Luyện đan
  const craftPill = useCallback((recipeId) => {
    const recipe = ALCHEMY_RECIPES[recipeId];
    if (!recipe) {
      return { success: false, message: 'Công thức không tồn tại!' };
    }
    
    // Kiểm tra cấp luyện đan
    if (gameState.alchemy.level < recipe.minLevel) {
      return { success: false, message: `Cần cấp luyện đan ${recipe.minLevel}!` };
    }
    
    // Kiểm tra nguyên liệu
    for (const material of recipe.materials) {
      const invItem = gameState.inventory.find(i => i.itemId === material.itemId);
      if (!invItem || invItem.quantity < material.quantity) {
        const itemName = ITEM_DEFINITIONS[material.itemId]?.name || material.itemId;
        return { success: false, message: `Thiếu ${itemName}!` };
      }
    }
    
    // Trừ nguyên liệu
    recipe.materials.forEach(mat => removeItem(mat.itemId, mat.quantity));
    
    // Tính tỷ lệ thành công
    const levelBonus = (gameState.alchemy.level - recipe.minLevel) * 0.1;
    const finalRate = Math.min(0.95, recipe.baseSuccessRate + gameState.alchemy.successRate - 0.6 + levelBonus);
    
    // Random kết quả
    const isSuccess = Math.random() < finalRate;
    
    if (isSuccess) {
      // Thành công
      addItem(recipe.output.itemId, recipe.output.quantity);
      
      // Thêm EXP luyện đan
      setGameState(prev => {
        let newExp = prev.alchemy.exp + recipe.expGain;
        let newLevel = prev.alchemy.level;
        let newMaxExp = prev.alchemy.maxExp;
        
        // Level up
        while (newExp >= newMaxExp) {
          newExp -= newMaxExp;
          newLevel++;
          newMaxExp = Math.floor(newMaxExp * 1.5);
        }
        
        return {
          ...prev,
          alchemy: {
            ...prev.alchemy,
            exp: newExp,
            level: newLevel,
            maxExp: newMaxExp,
            craftCount: prev.alchemy.craftCount + 1,
          },
        };
      });
      
      addEvent('success', `Luyện chế thành công ${ITEM_DEFINITIONS[recipe.output.itemId]?.name}!`);
      addReputation(5, 'cultivation');
      return { success: true, message: `Thành công! Nhận được ${recipe.output.quantity}x ${ITEM_DEFINITIONS[recipe.output.itemId]?.name}` };
    } else {
      // Thất bại - tăng tâm ma
      addInnerDemon(3);
      addEvent('danger', `Luyện đan thất bại! Tâm ma tăng...`);
      return { success: false, message: 'Luyện đan thất bại! Nguyên liệu đã mất.' };
    }
  }, [gameState.alchemy, gameState.inventory, removeItem, addItem, addEvent, addReputation, addInnerDemon]);

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
    // Inventory functions
    getItemInfo,
    addItem,
    removeItem,
    useItem,
    getInventoryWithDetails,
    buyItem,
    // Equipment functions
    recalculateStats,
    unequipItem,
    upgradeEquipment,
    getEquippedItems,
    // Exploration & Quest functions
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
    // Save/Load functions
    resetGame,
    exportSave,
    importSave,
    ITEM_DEFINITIONS,
    ALCHEMY_RECIPES,
    REPUTATION_TITLES,
    REALMS,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
