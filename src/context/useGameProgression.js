import { useCallback } from 'react';
import { REALMS } from '../data/realms.js';

export function useGameProgression({ gameState }) {
  const formatNumber = useCallback((num) => Number(num || 0).toLocaleString('vi-VN'), []);

  const canBreakthrough = useCallback(() => {
    const { realmIndex, level, exp, maxExp } = gameState.player;
    const realm = REALMS[realmIndex];

    if (!realm) {
      return { can: false, reason: 'Canh gioi khong hop le.' };
    }

    if (level < realm.levels) {
      return { can: false, reason: 'Chua dat tang cao nhat cua canh gioi.' };
    }

    if (exp < maxExp * 0.9) {
      return { can: false, reason: 'Can it nhat 90% EXP de do kiep.' };
    }

    if (realmIndex >= REALMS.length - 1) {
      return { can: false, reason: 'Da dat canh gioi toi cao.' };
    }

    return { can: true, reason: 'Co the do kiep.' };
  }, [gameState.player]);

  return {
    formatNumber,
    canBreakthrough,
  };
}
