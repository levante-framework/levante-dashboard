import { defineStore } from 'pinia';
import { parse, stringify } from 'zipson';

// Define an interface for the structure of selectedAdmin
// Assuming it has at least an 'id', adjust as needed
interface SelectedAdmin {
  id: string | number; // Use string or number depending on the actual ID type
  // Add other relevant properties if known
}

// Define the state structure with types
interface GameState {
  selectedAdmin: SelectedAdmin | null; // Allow null if it can be unselected
  requireRefresh: boolean;
}

export const useGameStore = defineStore('gameStore', {
  state: (): GameState => ({
    selectedAdmin: null, // Initialize as null
    requireRefresh: false,
  }),
  actions: {
    requireHomeRefresh() {
      this.requireRefresh = true;
    },
    // Add types for any action parameters if they exist
    // Example: setSelectedAdmin(admin: SelectedAdmin | null) {
    //   this.selectedAdmin = admin;
    // }
  },
  persist: {
    storage: sessionStorage,
    debug: false,
    serializer: {
      deserialize: parse,
      serialize: stringify,
    },
  },
});
