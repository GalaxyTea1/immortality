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
    if (value >= 80) return { label: 'Vung Chac', color: 'success', bonus: '+5% EXP' };
    if (value >= 50) return { label: 'Binh Thuong', color: 'warning', bonus: '+0% EXP' };
    if (value >= 20) return { label: 'Lung Lay', color: 'danger', bonus: '-5% EXP' };
    return { label: 'Rat Yeu', color: 'critical', bonus: '-15% EXP' };
  }, [gameState.foundation]);

  const getInnerDemonStatus = useCallback(() => {
    const { value, threshold } = gameState.innerDemon;
    if (value === 0) return { label: 'An Toan', color: 'success' };
    if (value < 30) return { label: 'Nhe', color: 'info' };
    if (value < threshold) return { label: 'Canh Bao', color: 'warning' };
    return { label: 'Nguy Hiem!', color: 'danger' };
  }, [gameState.innerDemon]);

  return {
    addEvent,
    getFoundationStatus,
    getInnerDemonStatus,
  };
}
