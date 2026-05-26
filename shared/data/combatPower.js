export const COMBAT_POWER_REALM_STEP = 1_000_000;
export const COMBAT_POWER_LEVEL_STEP = 100_000;
export const COMBAT_POWER_STAT_WEIGHT = 10;

const toNonNegativeNumber = (value, fallback = 0) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return fallback;
    return Math.max(0, numberValue);
};

export const getCombatStatSum = ({ attack = 0, defense = 0, spirit = 0, agility = 0 } = {}) =>
    toNonNegativeNumber(attack) + toNonNegativeNumber(defense) + toNonNegativeNumber(spirit) + toNonNegativeNumber(agility);

export const calculateCombatPower = ({ attack = 0, defense = 0, spirit = 0, agility = 0, realmIndex = 0, level = 1 } = {}) => {
    const safeRealmIndex = Math.floor(toNonNegativeNumber(realmIndex));
    const safeLevel = Math.max(1, Math.floor(toNonNegativeNumber(level, 1)));
    const statPower = getCombatStatSum({ attack, defense, spirit, agility }) * COMBAT_POWER_STAT_WEIGHT;

    return Math.round(
        safeRealmIndex * COMBAT_POWER_REALM_STEP +
        safeLevel * COMBAT_POWER_LEVEL_STEP +
        statPower
    );
};
