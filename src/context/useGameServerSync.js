import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../services/api.js';

export function useGameServerSync({
  characterId,
  setGameState,
  gameStateRef,
  characterIdRef,
  mapServerToGameState,
  mapGameStateToServer,
  mapInventoryToServer,
  mapEquipmentToServer,
}) {
  const [isServerLoading, setIsServerLoading] = useState(true);
  const serverSaveTimerRef = useRef(null);
  const prevStateRef = useRef(null);

  useEffect(() => {
    characterIdRef.current = characterId;
  }, [characterId, characterIdRef]);

  const cancelPendingSave = useCallback(() => {
    if (serverSaveTimerRef.current) {
      clearTimeout(serverSaveTimerRef.current);
      serverSaveTimerRef.current = null;
    }
  }, []);

  const loadFromServer = useCallback(async () => {
    if (!characterId) {
      setIsServerLoading(false);
      return null;
    }

    cancelPendingSave();
    setIsServerLoading(true);
    try {
      const [charData, inventoryData, equipmentData, skillsData] = await Promise.all([
        api.characters.get(characterId).catch(err => { console.warn('Load character failed:', err); return null; }),
        api.inventory.get(characterId).catch(err => { console.warn('Load inventory failed:', err); return []; }),
        api.equipment.get(characterId).catch(err => { console.warn('Load equipment failed:', err); return {}; }),
        api.skills.get(characterId).catch(err => { console.warn('Load skills failed:', err); return []; }),
      ]);

      if (charData) {
        const serverState = mapServerToGameState(charData, inventoryData, equipmentData, skillsData);
        setGameState(serverState);
        prevStateRef.current = serverState;
        return serverState;
      }
    } catch (err) {
      console.error('[GameContext] Failed to load from server:', err);
    } finally {
      setIsServerLoading(false);
    }

    return null;
  }, [cancelPendingSave, characterId, mapServerToGameState, setGameState]);

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  const saveToServer = useCallback(() => {
    const cId = characterIdRef.current;
    if (!cId) return;

    cancelPendingSave();

    serverSaveTimerRef.current = setTimeout(async () => {
      try {
        const state = gameStateRef.current;
        const charPayload = mapGameStateToServer(state);
        const invPayload = mapInventoryToServer(state.inventory, state.equipment);
        const equipPayload = mapEquipmentToServer(state.equipment);

        await Promise.all([
          api.characters.save(cId, charPayload),
          api.inventory.sync(cId, invPayload),
          api.equipment.sync(cId, equipPayload),
        ]);

        prevStateRef.current = state;
      } catch (err) {
        console.error('[GameContext] Failed to save to server:', err);
      }
    }, 50);
  }, [
    characterIdRef,
    gameStateRef,
    mapEquipmentToServer,
    mapGameStateToServer,
    mapInventoryToServer,
    cancelPendingSave,
  ]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (serverSaveTimerRef.current) {
        clearTimeout(serverSaveTimerRef.current);
      }

      const cId = characterIdRef.current;
      const state = gameStateRef.current;
      if (!cId) return;

      const charPayload = mapGameStateToServer(state);
      const invPayload = mapInventoryToServer(state.inventory, state.equipment);
      const equipPayload = mapEquipmentToServer(state.equipment);
      const token = api.getToken();
      if (token) {
        navigator.sendBeacon(
          `${api.API_BASE_URL}/characters/${cId}/beacon-save`,
          new Blob([JSON.stringify({ ...charPayload, token, inventory: invPayload, equipment: equipPayload })], { type: 'application/json' })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
    characterIdRef,
    gameStateRef,
    mapEquipmentToServer,
    mapGameStateToServer,
    mapInventoryToServer,
  ]);

  return {
    cancelPendingSave,
    isServerLoading,
    loadFromServer,
    saveToServer,
  };
}
