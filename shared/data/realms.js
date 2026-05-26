// Shared cultivation realms and reputation titles.
export const REALMS = [
    { name: "Luyện Khí", levels: 9, expPerLevel: 100 },
    { name: "Trúc Cơ", levels: 9, expPerLevel: 500 },
    { name: "Kim Đan", levels: 9, expPerLevel: 2000 },
    { name: "Nguyên Anh", levels: 9, expPerLevel: 10000 },
    { name: "Hóa Thần", levels: 9, expPerLevel: 50000 },
];

export const TRIBULATION_REQUIREMENTS = {
    0: {
        name: "Trúc Cơ Chi Kiếp",
        baseSuccessRate: 0.7,
        requiredPill: "truc_co_dan",
        pillBonus: 0.2,
        spiritStonesCost: 500,
        pillName: "Trúc Cơ Đan",
        failurePenalty: { exp: 0.2, innerDemon: 10 },
    },
    1: {
        name: "Kim Đan Chi Kiếp",
        baseSuccessRate: 0.5,
        requiredPill: "kim_dan_dan",
        pillBonus: 0.25,
        spiritStonesCost: 2000,
        pillName: "Kim Đan Đan",
        failurePenalty: { exp: 0.3, innerDemon: 20 },
    },
    2: {
        name: "Nguyên Anh Chi Kiếp",
        baseSuccessRate: 0.3,
        requiredPill: "nguyen_anh_dan",
        pillBonus: 0.3,
        spiritStonesCost: 10000,
        pillName: "Nguyên Anh Đan",
        failurePenalty: { exp: 0.4, innerDemon: 30 },
    },
    3: {
        name: "Hóa Thần Chi Kiếp",
        baseSuccessRate: 0.15,
        requiredPill: "hoa_than_dan",
        pillBonus: 0.35,
        spiritStonesCost: 50000,
        pillName: "Hóa Thần Đan",
        failurePenalty: { exp: 0.5, innerDemon: 50 },
    },
};

const REPUTATION_TITLE_ROWS = [
    { level: 1, minPoints: 0, title: "Vô Danh", color: "gray" },
    { level: 2, minPoints: 100, title: "Sơ Nhập Giang Hồ", color: "white" },
    { level: 3, minPoints: 300, title: "Tiểu Hữu Danh", color: "green" },
    { level: 4, minPoints: 600, title: "Danh Trấn Nhất Phương", color: "blue" },
    { level: 5, minPoints: 1000, title: "Phong Vân Nhân Vật", color: "purple" },
    { level: 6, minPoints: 2000, title: "Nhất Đại Tông Sư", color: "orange" },
    { level: 7, minPoints: 5000, title: "Thiên Hạ Đệ Nhất", color: "red" },
    { level: 8, minPoints: 10000, title: "Truyền Thuyết Bất Hủ", color: "gold" },
];

const REPUTATION_GLOBAL_NAMES = {
    1: "Nameless",
    2: "Newcomer",
    3: "Known Cultivator",
    4: "Regional Name",
    5: "Storm Figure",
    6: "Grandmaster",
    7: "Peerless",
    8: "Legendary",
};

export const REPUTATION_TITLES = REPUTATION_TITLE_ROWS.map((title) => ({
    ...title,
    vietnm: title.vietnm || title.title,
    globalnm: title.globalnm || REPUTATION_GLOBAL_NAMES[title.level] || title.title,
    title: title.vietnm || title.title,
}));

export const getReputationTitleByPoints = (points = 0) => {
    const safePoints = Math.max(0, Number(points) || 0);
    return REPUTATION_TITLES.reduce(
        (current, title) => (safePoints >= title.minPoints ? title : current),
        REPUTATION_TITLES[0]
    );
};

export default { REALMS, TRIBULATION_REQUIREMENTS, REPUTATION_TITLES, getReputationTitleByPoints };
