<template>
  <div class="emulator-toggle">
    <label class="toggle-switch">
      <input 
        type="checkbox"
        :checked="usingEmulators"
        @change="toggleEmulators"
      />
      <span class="toggle-slider"></span>
      <span class="toggle-label">Use Firebase Emulators</span>
    </label>
    <div v-if="usingEmulators" class="emulator-badge">
      EMULATOR MODE
    </div>
    <div class="port-settings" v-if="showAdvanced">
      <div class="port-input">
        <label>Firestore Port:</label>
        <input type="number" v-model="firestorePort" placeholder="8180" />
      </div>
      <div class="port-input">
        <label>Auth Port:</label>
        <input type="number" v-model="authPort" placeholder="9199" />
      </div>
      <div class="port-input">
        <label>Functions Port:</label>
        <input type="number" v-model="functionsPort" placeholder="5102" />
      </div>
      <div class="port-input">
        <label>Host:</label>
        <input type="text" v-model="emulatorHost" placeholder="127.0.0.1" />
      </div>
      <button @click="applySettings" class="settings-button">Apply</button>
    </div>
    <button @click="showAdvanced = !showAdvanced" class="advanced-toggle">
      {{ showAdvanced ? 'Hide Advanced' : 'Show Advanced' }}
    </button>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { initNewFirekit } from '../firebaseInit';

export default {
  name: 'EmulatorToggle',
  setup() {
    const usingEmulators = ref(false);
    const showAdvanced = ref(false);
    const firestorePort = ref(8180); // Match dashboard's default
    const authPort = ref(9199);      // Match dashboard's default
    const functionsPort = ref(5102); // Match dashboard's default
    const emulatorHost = ref('127.0.0.1');

    // Read port values from localStorage on mount
    onMounted(() => {
      // In development mode, emulators are on by default
      if (import.meta.env.DEV) {
        usingEmulators.value = true;
        
        // Check for window-based emulator settings (already set)
        if (typeof window !== 'undefined') {
          if (window.FIREBASE_AUTH_EMULATOR_HOST) {
            const authParts = window.FIREBASE_AUTH_EMULATOR_HOST.split(':');
            if (authParts.length === 2) {
              emulatorHost.value = authParts[0];
              authPort.value = parseInt(authParts[1], 10);
            }
          }
          
          if (window.FIRESTORE_EMULATOR_HOST) {
            const firestoreParts = window.FIRESTORE_EMULATOR_HOST.split(':');
            if (firestoreParts.length === 2) {
              // Host should already be set from auth
              firestorePort.value = parseInt(firestoreParts[1], 10);
            }
          }
          
          if (window.FUNCTIONS_EMULATOR_HOST) {
            const functionsParts = window.FUNCTIONS_EMULATOR_HOST.split(':');
            if (functionsParts.length === 2) {
              // Host should already be set from auth
              functionsPort.value = parseInt(functionsParts[1], 10);
            }
          }
        }
      } else {
        // In production, default to false
        usingEmulators.value = false;
      }
      
      // Load saved settings from localStorage if available (these override defaults)
      const savedUsingEmulators = localStorage.getItem('useEmulators');
      if (savedUsingEmulators !== null) {
        usingEmulators.value = savedUsingEmulators === 'true';
      }
      
      const savedFirestorePort = localStorage.getItem('firestorePort');
      if (savedFirestorePort) firestorePort.value = parseInt(savedFirestorePort, 10);
      
      const savedAuthPort = localStorage.getItem('authPort');
      if (savedAuthPort) authPort.value = parseInt(savedAuthPort, 10);
      
      const savedFunctionsPort = localStorage.getItem('functionsPort');
      if (savedFunctionsPort) functionsPort.value = parseInt(savedFunctionsPort, 10);
      
      const savedEmulatorHost = localStorage.getItem('emulatorHost');
      if (savedEmulatorHost) emulatorHost.value = savedEmulatorHost;
    });

    async function toggleEmulators(event) {
      usingEmulators.value = event.target.checked;
      
      // Save setting to localStorage
      localStorage.setItem('useEmulators', usingEmulators.value.toString());
      
      // Apply settings immediately
      await applySettings();
    }

    async function applySettings() {
      // Save current settings to localStorage
      localStorage.setItem('firestorePort', firestorePort.value.toString());
      localStorage.setItem('authPort', authPort.value.toString());
      localStorage.setItem('functionsPort', functionsPort.value.toString());
      localStorage.setItem('emulatorHost', emulatorHost.value);
      
      if (usingEmulators.value) {
        // Set global emulator variables first
        if (typeof window !== 'undefined') {
          window.FIREBASE_EMULATOR_MODE = true;
          window.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost.value}:${authPort.value}`;
          window.FIRESTORE_EMULATOR_HOST = `${emulatorHost.value}:${firestorePort.value}`;
          window.FUNCTIONS_EMULATOR_HOST = `${emulatorHost.value}:${functionsPort.value}`;
        }
        
        if (typeof process !== 'undefined') {
          process.env.FIREBASE_EMULATOR_MODE = 'true';
          process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost.value}:${authPort.value}`;
          process.env.FIRESTORE_EMULATOR_HOST = `${emulatorHost.value}:${firestorePort.value}`;
          process.env.FUNCTIONS_EMULATOR_HOST = `${emulatorHost.value}:${functionsPort.value}`;
        }
        
        try {
          // Create a new Firekit instance with emulator settings
          // The emulator ports will be picked up from the window/process variables
          await initNewFirekit();
          
          // Alert the user that they need to reload for changes to fully take effect
          alert('Emulator settings applied. The page will now reload.');
          window.location.reload();
        } catch (error) {
          console.error('Error applying emulator settings:', error);
          alert('Error applying emulator settings. See console for details.');
        }
      } else {
        // Reset emulator variables
        if (typeof window !== 'undefined') {
          window.FIREBASE_EMULATOR_MODE = false;
          delete window.FIREBASE_AUTH_EMULATOR_HOST;
          delete window.FIRESTORE_EMULATOR_HOST;
          delete window.FUNCTIONS_EMULATOR_HOST;
        }
        
        if (typeof process !== 'undefined') {
          delete process.env.FIREBASE_EMULATOR_MODE;
          delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
          delete process.env.FIRESTORE_EMULATOR_HOST;
          delete process.env.FUNCTIONS_EMULATOR_HOST;
        }
        
        try {
          // Create a new Firekit instance without emulator settings
          await initNewFirekit();
          
          // Alert the user that they need to reload for changes to fully take effect
          alert('Switched to production Firebase. The page will now reload.');
          window.location.reload();
        } catch (error) {
          console.error('Error switching to production:', error);
          alert('Error switching to production. See console for details.');
        }
      }
    }

    return {
      usingEmulators,
      showAdvanced,
      firestorePort,
      authPort,
      functionsPort,
      emulatorHost,
      toggleEmulators,
      applySettings
    };
  }
};
</script>

<style scoped>
.emulator-toggle {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.toggle-slider {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  background-color: #ccc;
  border-radius: 20px;
  margin-right: 8px;
  transition: background-color 0.2s;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #4CAF50;
}

.toggle-slider:before {
  content: "";
  position: absolute;
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.toggle-label {
  font-weight: 500;
}

.emulator-badge {
  display: inline-block;
  background-color: #ff5722;
  color: white;
  font-weight: bold;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  margin-left: 12px;
}

.port-settings {
  margin-top: 16px;
  padding: 12px;
  background-color: #e8f5e9;
  border-radius: 4px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.port-input {
  display: flex;
  flex-direction: column;
}

.port-input label {
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 500;
}

.port-input input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.advanced-toggle {
  margin-top: 12px;
  background-color: #f1f1f1;
  border: 1px solid #ddd;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.settings-button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  align-self: flex-end;
}

.settings-button:hover {
  background-color: #388E3C;
}
</style> 