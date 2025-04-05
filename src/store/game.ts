import { defineStore } from 'pinia';
import { parse, stringify } from 'zipson';

// Define the state shape
interface GameState {
  selectedAdmin: any; // Use 'any' or a more specific type if known
  requireRefresh: boolean;
}

// Define the store, explicitly typing the state
export const useGameStore = defineStore('gameStore', {
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
      // Assuming zipson types are not readily available or complex,
      // using Function type or any might be necessary initially.
      // Ideally, install @types/zipson if available.
      deserialize: parse as (value: string) => any,
      serialize: stringify as (value: any) => string,
    },
  },
}); 