import { useCallback, useEffect, useState } from 'react';
import * as api from '../services/api.js';

export function useGameServerSync({
  characterId,
  setGameState,
  characterIdRef,
  mapServerToGameState,
}) {
  const [isServerLoading, setIsServerLoading] = useState(true);

  useEffect(() => {
    characterIdRef.current = characterId;
  }, [characterId, characterIdRef]);

  const loadFromServer = useCallback(async () => {
    if (!characterId) {
      setIsServerLoading(false);
      return null;
    }

    setIsServerLoading(true);
    try {
      const [charData, inventoryData, equipmentData, skillsData, questData, eventData] = await Promise.all([
        api.characters.get(characterId).catch(err => { console.warn('Load character failed:', err); return null; }),
        api.inventory.get(characterId).catch(err => { console.warn('Load inventory failed:', err); return []; }),
        api.equipment.get(characterId).catch(err => { console.warn('Load equipment failed:', err); return {}; }),
        api.skills.get(characterId).catch(err => { console.warn('Load skills failed:', err); return []; }),
        api.quests.getActive(characterId).catch(err => { console.warn('Load quest failed:', err); return null; }),
        api.events.get(characterId).catch(err => { console.warn('Load events failed:', err); return []; }),
      ]);

      if (charData) {
        const serverState = mapServerToGameState(charData, inventoryData, equipmentData, skillsData, questData?.quest, eventData);
        setGameState(serverState);
        return serverState;
      }
    } catch (err) {
      console.error('[GameContext] Failed to load from server:', err);
    } finally {
      setIsServerLoading(false);
    }

    return null;
  }, [characterId, mapServerToGameState, setGameState]);

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  return {
    isServerLoading,
    loadFromServer,
  };
}
