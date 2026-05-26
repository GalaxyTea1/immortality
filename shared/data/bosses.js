export const BOSS_DEFINITIONS = {
  thanh_lang_vuong: {
    id: 'thanh_lang_vuong',
    name: 'Thanh Lang Vương',
    description: 'Yêu lang canh giữ linh mạch ngoại vi, phù hợp cho tông môn mới lập.',
    realmIndex: 0,
    level: 5,
    maxHp: 2500,
    attack: 35,
    defense: 12,
    respawnHours: 6,
    rewards: {
      spiritStones: 800,
      sectExp: 120,
      contribution: 80,
      exp: 120,
      phases: [
        { threshold: 1, name: 'Thăm Dò', description: 'Thanh Lang Vương quan sát con mồi, phản kích nhẹ.', retaliationMultiplier: 1, defenseMultiplier: 1 },
        { threshold: 0.7, name: 'Cuồng Nộ', description: 'Lang khí bùng phát, sát thương phản kích tăng lên.', retaliationMultiplier: 1.25, defenseMultiplier: 0.95 },
        { threshold: 0.35, name: 'Huyết Lang', description: 'Boss trọng thương, liều mạng cắn xé và giảm phòng ngự.', retaliationMultiplier: 1.55, defenseMultiplier: 0.82 },
      ],
      loot: [
        { itemId: 'thao_duoc', chance: 1, minQty: 4, maxQty: 8, mode: 'mvp' },
        { itemId: 'cuong_hoa_thach', chance: 0.35, minQty: 1, maxQty: 1, mode: 'mvp' },
      ],
    },
  },
  xich_viem_ma_tuong: {
    id: 'xich_viem_ma_tuong',
    name: 'Xích Viêm Ma Tướng',
    description: 'Ma tướng hấp thu địa hỏa, cần nhiều đệ tử hợp lực mới có thể hạ gục.',
    realmIndex: 1,
    level: 3,
    maxHp: 9000,
    attack: 85,
    defense: 35,
    respawnHours: 12,
    rewards: {
      spiritStones: 3200,
      sectExp: 450,
      contribution: 240,
      exp: 420,
      phases: [
        { threshold: 1, name: 'Liệt Diễm', description: 'Hỏa khí hộ thể, boss phòng ngự ổn định.', retaliationMultiplier: 1, defenseMultiplier: 1 },
        { threshold: 0.65, name: 'Ma Hỏa', description: 'Ma hỏa lan rộng, phản kích mạnh hơn.', retaliationMultiplier: 1.35, defenseMultiplier: 0.9 },
        { threshold: 0.3, name: 'Phần Thiên', description: 'Đại chiêu Phần Thiên khiến mọi đòn đánh đều phải trả giá.', retaliationMultiplier: 1.8, defenseMultiplier: 0.78 },
      ],
      loot: [
        { itemId: 'linh_thach_khoang', chance: 1, minQty: 3, maxQty: 6, mode: 'mvp' },
        { itemId: 'cuong_hoa_thach', chance: 0.65, minQty: 1, maxQty: 2, mode: 'mvp' },
        { itemId: 'truc_co_dan', chance: 0.25, minQty: 1, maxQty: 1, mode: 'mvp' },
      ],
    },
  },
  huyen_bang_long: {
    id: 'huyen_bang_long',
    name: 'Huyền Băng Long',
    description: 'Cổ long ngủ sâu trong băng mạch, chỉ tông môn mạnh mới nên khiêu chiến.',
    realmIndex: 2,
    level: 2,
    maxHp: 24000,
    attack: 180,
    defense: 90,
    respawnHours: 24,
    rewards: {
      spiritStones: 10000,
      sectExp: 1200,
      contribution: 600,
      exp: 1500,
      phases: [
        { threshold: 1, name: 'Long Tức', description: 'Băng tức bao phủ chiến trường, giảm nhịp tấn công.', retaliationMultiplier: 1.1, defenseMultiplier: 1 },
        { threshold: 0.6, name: 'Băng Phong', description: 'Lớp vảy rạn nứt, boss phản kích dữ dội hơn.', retaliationMultiplier: 1.45, defenseMultiplier: 0.88 },
        { threshold: 0.25, name: 'Long Nộ', description: 'Long uy trấn áp toàn trường, phần thưởng cũng trở nên đáng giá hơn.', retaliationMultiplier: 2.1, defenseMultiplier: 0.72 },
      ],
      loot: [
        { itemId: 'cuong_hoa_thach', chance: 1, minQty: 3, maxQty: 5, mode: 'mvp' },
        { itemId: 'kim_dan_dan', chance: 0.4, minQty: 1, maxQty: 1, mode: 'mvp' },
        { itemId: 'nguyen_anh_dan', chance: 0.12, minQty: 1, maxQty: 1, mode: 'mvp' },
      ],
    },
  },
};

export const BOSS_LIST = Object.values(BOSS_DEFINITIONS);

export default BOSS_DEFINITIONS;
