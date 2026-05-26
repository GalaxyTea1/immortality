import { useCallback } from 'react';

export function useGameWorldSystems({
  gameState,
  setGameState,
}) {
  const addEvent = useCallback((type, message) => {
    setGameState((prev) => ({
      ...prev,
      events: [{ id: Date.now(), type, message, time: Date.now() }, ...prev.events.slice(0, 19)],
    }));
  }, [setGameState]);

  const getFoundationStatus = useCallback(() => {
    const { value } = gameState.foundation;
    if (value >= 80) return { label: 'Vững Chắc', color: 'success', bonus: '+5% EXP' };
    if (value >= 50) return { label: 'Bình Thường', color: 'warning', bonus: '+0% EXP' };
    if (value >= 20) return { label: 'Lung Lay', color: 'danger', bonus: '-5% EXP' };
    return { label: 'Rất Yếu', color: 'critical', bonus: '-15% EXP' };
  }, [gameState.foundation]);

  const getInnerDemonStatus = useCallback(() => {
    const { value, threshold } = gameState.innerDemon;
    if (value === 0) return { label: 'An Toàn', color: 'success' };
    if (value < 30) return { label: 'Nhẹ', color: 'info' };
    if (value < threshold) return { label: 'Cảnh Báo', color: 'warning' };
    return { label: 'Nguy Hiểm!', color: 'danger' };
  }, [gameState.innerDemon]);

  return {
    addEvent,
    getFoundationStatus,
    getInnerDemonStatus,
  };
}
