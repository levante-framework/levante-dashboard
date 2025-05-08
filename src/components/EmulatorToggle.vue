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
    
    <!-- Add verification status -->
    <div class="verification-status" v-if="verificationStatus">
      <div class="status-badge" :class="statusClass">
        {{ verificationStatus }}
      </div>
      <button @click="verifyEmulatorConnection" class="verify-button">Verify Connection</button>
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
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, connectFirestoreEmulator } from 'firebase/firestore';

export default {
  name: 'EmulatorToggle',
  setup() {
    const usingEmulators = ref(false);
    const showAdvanced = ref(false);
    const firestorePort = ref(8180); // Match dashboard's default
    const authPort = ref(9199);      // Match dashboard's default
    const functionsPort = ref(5102); // Match dashboard's default
    const emulatorHost = ref('127.0.0.1');
    const verificationStatus = ref('');
    const statusClass = ref('');

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
      
      // Automatically verify emulator connection on startup
      setTimeout(() => {
        verifyEmulatorConnection();
      }, 1000);
    });

    async function toggleEmulators(event) {
      usingEmulators.value = event.target.checked;
      
      console.log('%c ===== TOGGLING EMULATORS ===== ', 'background: #673AB7; color: #fff; font-size: 12px; padding: 3px; border-radius: 4px;');
      console.log('%c Emulators enabled:', 'font-weight: bold;', usingEmulators.value);
      
      // Save setting to localStorage
      localStorage.setItem('useEmulators', usingEmulators.value.toString());
      console.log('Saved useEmulators setting to localStorage:', usingEmulators.value.toString());
      
      // Apply settings immediately
      await applySettings();
    }

    async function verifyEmulatorConnection() {
      console.log('%c ===== VERIFYING EMULATOR CONNECTION ===== ', 'background: #E91E63; color: #fff; font-size: 12px; padding: 3px; border-radius: 4px;');
      verificationStatus.value = 'Checking...';
      statusClass.value = 'status-checking';
      
      // 1. Check if global variables are set
      if (typeof window !== 'undefined') {
        const hasAuthEmulator = !!window.FIREBASE_AUTH_EMULATOR_HOST;
        const hasFirestoreEmulator = !!window.FIRESTORE_EMULATOR_HOST;
        
        console.log('%c Global emulator variables check:', 'font-weight: bold;', {
          FIREBASE_EMULATOR_MODE: window.FIREBASE_EMULATOR_MODE,
          FIREBASE_AUTH_EMULATOR_HOST: window.FIREBASE_AUTH_EMULATOR_HOST,
          FIRESTORE_EMULATOR_HOST: window.FIRESTORE_EMULATOR_HOST,
          FUNCTIONS_EMULATOR_HOST: window.FUNCTIONS_EMULATOR_HOST
        });
        
        if (!hasAuthEmulator || !hasFirestoreEmulator) {
          verificationStatus.value = 'NOT USING EMULATORS - Global variables not set';
          statusClass.value = 'status-error';
          console.log('%c NOT using emulators - global variables missing', 'background: #F44336; color: #fff;');
          return;
        }
      }
      
      try {
        // 2. Check direct connectivity to Auth emulator
        const authEmulatorUrl = `http://${emulatorHost.value}:${authPort.value}`;
        console.log(`Testing direct connectivity to auth emulator at ${authEmulatorUrl}`);
        
        try {
          const response = await fetch(authEmulatorUrl, { 
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            mode: 'no-cors' 
          });
          console.log('Auth emulator response:', response);
        } catch (error) {
          console.warn('Auth emulator direct connection test failed:', error);
          // This might fail due to CORS, which is actually expected, so we continue
        }
        
        // 3. Most reliable test: try to use the Firebase Auth object
        const auth = getAuth();
        
        // Check if Auth is connected to emulator by inspecting internal properties
        // This is a bit hacky but works to detect emulator use
        const isAuthEmulated = auth.config?.emulator?.url?.includes(authPort.value);
        console.log('%c Auth emulator check:', 'font-weight: bold;', {
          'Auth config': auth.config,
          'Using auth emulator': isAuthEmulated
        });
        
        // 4. Check Firestore emulator
        const db = getFirestore();
        let hasFirestoreData = false;
        
        try {
          // Try to read from Firestore to see if it's connected
          const testCollection = collection(db, 'emulator_test');
          const snapshot = await getDocs(testCollection);
          
          console.log('%c Firestore test query results:', 'font-weight: bold;', {
            empty: snapshot.empty,
            size: snapshot.size,
            metadata: snapshot.metadata
          });
          
          // Check Firestore's internal properties to see if it's using the emulator
          // @ts-ignore - _delegate is an internal property
          const isFirestoreEmulated = db._delegate?._settings?.host?.includes(firestorePort.value);
          console.log('%c Firestore emulator check:', 'font-weight: bold;', {
            'Using firestore emulator': isFirestoreEmulated,
            // @ts-ignore - accessing internal property
            'Firestore settings': db._delegate?._settings
          });
          
          // Final verification result
          if (isAuthEmulated || isFirestoreEmulated) {
            verificationStatus.value = 'VERIFIED: Using Firebase Emulators ✓';
            statusClass.value = 'status-success';
            console.log('%c VERIFIED: Using Firebase Emulators', 'background: #4CAF50; color: #fff; font-weight: bold;');
          } else {
            verificationStatus.value = 'NOT USING EMULATORS - Connected to production';
            statusClass.value = 'status-error';
            console.log('%c NOT using emulators - connected to production', 'background: #F44336; color: #fff;');
          }
        } catch (error) {
          console.error('Error verifying emulator connection:', error);
          verificationStatus.value = `Error: ${error.message}`;
          statusClass.value = 'status-error';
        }
      } catch (error) {
        console.error('Error in verification process:', error);
        verificationStatus.value = `Error: ${error.message}`;
        statusClass.value = 'status-error';
      }
    }

    async function applySettings() {
      console.log('%c ===== APPLYING EMULATOR SETTINGS ===== ', 'background: #673AB7; color: #fff; font-size: 12px; padding: 3px; border-radius: 4px;');
      
      // Save current settings to localStorage
      localStorage.setItem('firestorePort', firestorePort.value.toString());
      localStorage.setItem('authPort', authPort.value.toString());
      localStorage.setItem('functionsPort', functionsPort.value.toString());
      localStorage.setItem('emulatorHost', emulatorHost.value);
      
      console.log('%c Saved emulator settings to localStorage:', 'font-weight: bold;', {
        firestorePort: firestorePort.value,
        authPort: authPort.value,
        functionsPort: functionsPort.value,
        emulatorHost: emulatorHost.value
      });
      
      if (usingEmulators.value) {
        // Set global emulator variables first
        if (typeof window !== 'undefined') {
          window.FIREBASE_EMULATOR_MODE = true;
          window.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost.value}:${authPort.value}`;
          window.FIRESTORE_EMULATOR_HOST = `${emulatorHost.value}:${firestorePort.value}`;
          window.FUNCTIONS_EMULATOR_HOST = `${emulatorHost.value}:${functionsPort.value}`;
          
          console.log('%c Set window emulator variables:', 'font-weight: bold;', {
            FIREBASE_EMULATOR_MODE: window.FIREBASE_EMULATOR_MODE,
            FIREBASE_AUTH_EMULATOR_HOST: window.FIREBASE_AUTH_EMULATOR_HOST,
            FIRESTORE_EMULATOR_HOST: window.FIRESTORE_EMULATOR_HOST,
            FUNCTIONS_EMULATOR_HOST: window.FUNCTIONS_EMULATOR_HOST
          });
        } else {
          console.warn('No window object available, cannot set window emulator variables');
        }
        
        if (typeof process !== 'undefined') {
          process.env.FIREBASE_EMULATOR_MODE = 'true';
          process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost.value}:${authPort.value}`;
          process.env.FIRESTORE_EMULATOR_HOST = `${emulatorHost.value}:${firestorePort.value}`;
          process.env.FUNCTIONS_EMULATOR_HOST = `${emulatorHost.value}:${functionsPort.value}`;
          
          console.log('Set process.env emulator variables:', {
            FIREBASE_EMULATOR_MODE: process.env.FIREBASE_EMULATOR_MODE,
            FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
            FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
            FUNCTIONS_EMULATOR_HOST: process.env.FUNCTIONS_EMULATOR_HOST
          });
        } else {
          console.warn('No process object available, cannot set process.env emulator variables');
        }
        
        try {
          console.log('%c Initializing Firekit with emulator settings...', 'font-weight: bold;');
          // Create a new Firekit instance with emulator settings
          // The emulator ports will be picked up from the window/process variables
          const firekitInstance = await initNewFirekit();
          console.log('%c Firekit initialized successfully with emulators', 'background: #4CAF50; color: #fff;', firekitInstance);
          
          // Verify connectivity to emulators
          console.log('%c Checking emulator connectivity...', 'font-weight: bold;');
          
          try {
            // Simple fetch test to see if we can reach the auth emulator
            const authEmulatorUrl = `http://${emulatorHost.value}:${authPort.value}`;
            console.log(`Testing connectivity to auth emulator at ${authEmulatorUrl}`);
            
            fetch(authEmulatorUrl, { mode: 'no-cors' })
              .then(() => {
                console.log('%c Auth emulator connection test successful', 'background: #4CAF50; color: #fff;');
              })
              .catch((error) => {
                console.error('%c Auth emulator connection test failed:', 'background: #F44336; color: #fff;', error);
              });
          } catch (error) {
            console.warn('Error testing emulator connectivity:', error);
          }
          
          // Alert the user that they need to reload for changes to fully take effect
          console.log('%c Reloading page to apply emulator settings...', 'font-weight: bold;');
          alert('Emulator settings applied. The page will now reload.');
          window.location.reload();
        } catch (error) {
          console.error('%c Error applying emulator settings:', 'background: #F44336; color: #fff;', error);
          alert('Error applying emulator settings. See console for details.');
        }
      } else {
        // Reset emulator variables
        if (typeof window !== 'undefined') {
          window.FIREBASE_EMULATOR_MODE = false;
          delete window.FIREBASE_AUTH_EMULATOR_HOST;
          delete window.FIRESTORE_EMULATOR_HOST;
          delete window.FUNCTIONS_EMULATOR_HOST;
          
          console.log('Reset window emulator variables');
        }
        
        if (typeof process !== 'undefined') {
          delete process.env.FIREBASE_EMULATOR_MODE;
          delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
          delete process.env.FIRESTORE_EMULATOR_HOST;
          delete process.env.FUNCTIONS_EMULATOR_HOST;
          
          console.log('Reset process.env emulator variables');
        }
        
        try {
          // Create a new Firekit instance without emulator settings
          console.log('Initializing Firekit with production settings...');
          await initNewFirekit();
          console.log('%c Switched to production Firebase', 'background: #4CAF50; color: #fff;');
          
          // Alert the user that they need to reload for changes to fully take effect
          alert('Switched to production Firebase. The page will now reload.');
          window.location.reload();
        } catch (error) {
          console.error('%c Error switching to production:', 'background: #F44336; color: #fff;', error);
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
      applySettings,
      verificationStatus,
      statusClass,
      verifyEmulatorConnection
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

.verification-status {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 14px;
}

.status-success {
  background-color: #4CAF50;
  color: white;
}

.status-error {
  background-color: #F44336;
  color: white;
}

.status-checking {
  background-color: #2196F3;
  color: white;
}

.verify-button {
  padding: 6px 12px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.verify-button:hover {
  background-color: #1976D2;
}
</style> 