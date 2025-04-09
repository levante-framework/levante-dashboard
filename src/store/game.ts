import { defineStore, type StoreDefinition } from 'pinia';
import { parse, stringify } from 'zipson';

// Define the state shape
interface GameState {
  selectedAdmin: any | undefined; // Consider defining a specific Administration type if available
  requireRefresh: boolean;
}

// Define the store type (including state and actions)
// We infer actions type from the definition below, but you could define it explicitly if needed
type GameStore = StoreDefinition<
  'gameStore',
  GameState,
  {}, // No getters defined
  { requireHomeRefresh(): void } // Define action types
>;

export const useGameStore: GameStore = () => {
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
