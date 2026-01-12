// Định nghĩa các cảnh giới tu luyện
export const REALMS = [
  { name: 'Luyện Khí', levels: 9, expPerLevel: 100 },
  { name: 'Trúc Cơ', levels: 9, expPerLevel: 500 },
  { name: 'Kim Đan', levels: 9, expPerLevel: 2000 },
  { name: 'Nguyên Anh', levels: 9, expPerLevel: 10000 },
  { name: 'Hóa Thần', levels: 9, expPerLevel: 50000 },
];

// Yêu cầu độ kiếp cho mỗi cảnh giới
// Khi đạt tầng 9 và max EXP, cần đột phá để lên cảnh giới mới
export const TRIBULATION_REQUIREMENTS = {
  0: { // Luyện Khí -> Trúc Cơ
    name: 'Trúc Cơ Chi Kiếp',
    baseSuccessRate: 0.7,
    requiredPill: 'truc_co_dan', // Đan dược tăng tỉ lệ thành công
    pillBonus: 0.2,              // +20% khi dùng đan
    spiritStonesCost: 500,
    pillName: 'Trúc Cơ Đan',
    failurePenalty: { exp: 0.2, innerDemon: 10 }, // Mất 50% EXP, +10 tâm ma
  },
  1: { // Trúc Cơ -> Kim Đan
    name: 'Kim Đan Chi Kiếp',
    baseSuccessRate: 0.5,
    requiredPill: 'kim_dan_dan',
    pillBonus: 0.25,
    spiritStonesCost: 2000,
    pillName: 'Kim Đan Đan',
    failurePenalty: { exp: 0.3, innerDemon: 20 },
  },
  2: { // Kim Đan -> Nguyên Anh
    name: 'Nguyên Anh Chi Kiếp',
    baseSuccessRate: 0.3,
    requiredPill: 'nguyen_anh_dan',
    pillBonus: 0.3,
    spiritStonesCost: 10000,
    pillName: 'Nguyên Anh Đan',
    failurePenalty: { exp: 0.4, innerDemon: 30 },
  },
  3: { // Nguyên Anh -> Hóa Thần
    name: 'Hóa Thần Chi Kiếp',
    baseSuccessRate: 0.15,
    requiredPill: 'hoa_than_dan',
    pillBonus: 0.35,
    spiritStonesCost: 50000,
    pillName: 'Hoá Thần Đan',
    failurePenalty: { exp: 0.5, innerDemon: 50 },
  },
};

// Bảng danh hiệu
export const REPUTATION_TITLES = [
  { level: 1, minPoints: 0, title: 'Vô Danh', color: 'gray' },
  { level: 2, minPoints: 100, title: 'Sơ Nhập Giang Hồ', color: 'white' },
  { level: 3, minPoints: 300, title: 'Tiểu Hữu Danh', color: 'green' },
  { level: 4, minPoints: 600, title: 'Danh Trấn Nhất Phương', color: 'blue' },
  { level: 5, minPoints: 1000, title: 'Phong Vân Nhân Vật', color: 'purple' },
  { level: 6, minPoints: 2000, title: 'Nhất Đại Tông Sư', color: 'orange' },
  { level: 7, minPoints: 5000, title: 'Thiên Hạ Đệ Nhất', color: 'red' },
  { level: 8, minPoints: 10000, title: 'Truyền Thuyết Bất Hủ', color: 'gold' },
];

export default { REALMS, TRIBULATION_REQUIREMENTS, REPUTATION_TITLES };
