import { defineStore } from 'pinia';
import { parse, stringify } from 'zipson';

interface GameState {
  selectedAdmin?: string;
  requireRefresh: boolean;
}

export const useGameStore = () => {
  return defineStore({
    id: 'gameStore',
    state: (): GameState => {
      return {
        selectedAdmin: undefined,
        requireRefresh: false,
      };
    },
    actions: {
      requireHomeRefresh(): void {
        this.requireRefresh = true;
      },
    },
    persist: {
      storage: sessionStorage,
      debug: false,
      serializer: {
        deserialize: parse,
        serialize: stringify,
      },
    },
  })();
}; 