import { useCallback } from 'react';
import { REALMS } from '../data/realms.js';

export function useGameProgression({ gameState }) {
  const formatNumber = useCallback((num) => Number(num || 0).toLocaleString('vi-VN'), []);

  const canBreakthrough = useCallback(() => {
    const { realmIndex, level, exp, maxExp } = gameState.player;
    const realm = REALMS[realmIndex];

    if (!realm) {
      return { can: false, reason: 'Cảnh giới không hợp lệ.' };
    }

    if (level < realm.levels) {
      return { can: false, reason: 'Chưa đạt tầng cao nhất của cảnh giới.' };
    }

    if (exp < maxExp * 0.9) {
      return { can: false, reason: 'Cần ít nhất 90% EXP để độ kiếp.' };
    }

    if (realmIndex >= REALMS.length - 1) {
      return { can: false, reason: 'Đã đạt cảnh giới tối cao.' };
    }

    return { can: true, reason: 'Có thể độ kiếp.' };
  }, [gameState.player]);

  return {
    formatNumber,
    canBreakthrough,
  };
}
