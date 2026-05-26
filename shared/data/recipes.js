export const ALCHEMY_RECIPES = {
    tieu_hoan_dan: {
        id: "tieu_hoan_dan",
        name: "Tiểu Hoàn Đan",
        materials: [{ itemId: "thao_duoc", quantity: 3 }],
        output: { itemId: "tieu_hoan_dan", quantity: 1 },
        expGain: 5,
        minLevel: 1,
        baseSuccessRate: 0.8,
    },
    tu_khi_dan: {
        id: "tu_khi_dan",
        name: "Tụ Khí Đan",
        materials: [
            { itemId: "thao_duoc", quantity: 5 },
            { itemId: "thiet_khoang", quantity: 2 },
        ],
        output: { itemId: "tu_khi_dan", quantity: 1 },
        expGain: 10,
        minLevel: 2,
        baseSuccessRate: 0.6,
    },
    truc_co_dan: {
        id: "truc_co_dan",
        name: "Trúc Cơ Đan",
        materials: [
            { itemId: "thao_duoc", quantity: 10 },
            { itemId: "linh_thach_khoang", quantity: 3 },
        ],
        output: { itemId: "truc_co_dan", quantity: 1 },
        expGain: 20,
        minLevel: 3,
        baseSuccessRate: 0.5,
    },
    kim_dan_dan: {
        id: "kim_dan_dan",
        name: "Kim Đan Đan",
        materials: [
            { itemId: "thao_duoc", quantity: 10 },
            { itemId: "thiet_khoang", quantity: 5 },
        ],
        output: { itemId: "kim_dan_dan", quantity: 1 },
        expGain: 25,
        minLevel: 3,
        baseSuccessRate: 0.4,
    },
    nguyen_anh_dan: {
        id: "nguyen_anh_dan",
        name: "Nguyên Anh Đan",
        materials: [
            { itemId: "thao_duoc", quantity: 15 },
            { itemId: "thiet_khoang", quantity: 10 },
            { itemId: "linh_thach_khoang", quantity: 10 },
        ],
        output: { itemId: "nguyen_anh_dan", quantity: 1 },
        expGain: 50,
        minLevel: 4,
        baseSuccessRate: 0.3,
    },
    hoa_than_dan: {
        id: "hoa_than_dan",
        name: "Hóa Thần Đan",
        materials: [
            { itemId: "thao_duoc", quantity: 25 },
            { itemId: "thiet_khoang", quantity: 20 },
            { itemId: "linh_thach_khoang", quantity: 20 },
        ],
        output: { itemId: "hoa_than_dan", quantity: 1 },
        expGain: 120,
        minLevel: 5,
        baseSuccessRate: 0.3,
    },
    tinh_than_dan: {
        id: "tinh_than_dan",
        name: "Tĩnh Thần Đan",
        materials: [
            { itemId: "thao_duoc", quantity: 8 },
            { itemId: "linh_thach_khoang", quantity: 2 },
        ],
        output: { itemId: "tinh_than_dan", quantity: 1 },
        expGain: 15,
        minLevel: 2,
        baseSuccessRate: 0.55,
    },
};

export const ALCHEMY_BASE_MAX_EXP = 50;

export const calculateAlchemyMaxExp = (level = 1) => {
    const safeLevel = Math.max(1, Number(level) || 1);
    return Math.floor(ALCHEMY_BASE_MAX_EXP * 1.5 ** (safeLevel - 1));
};

export const calculateAlchemyProgress = ({ level = 1, exp = 0 } = {}, expGain = 0) => {
    let nextLevel = Math.max(1, Number(level) || 1);
    let nextExp = Math.max(0, Number(exp) || 0) + Math.max(0, Number(expGain) || 0);
    let nextMaxExp = calculateAlchemyMaxExp(nextLevel);

    while (nextExp >= nextMaxExp) {
        nextExp -= nextMaxExp;
        nextLevel += 1;
        nextMaxExp = calculateAlchemyMaxExp(nextLevel);
    }

    return {
        level: nextLevel,
        exp: nextExp,
        maxExp: nextMaxExp,
    };
};

export default ALCHEMY_RECIPES;
