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
    
    <!-- Added test user login for emulators -->
    <div v-if="usingEmulators" class="test-user-section">
      <h4>Emulator Test User</h4>
      <div class="test-user-info">
        <p>Email: test@example.com</p>
        <p>Password: password123</p>
      </div>
      <button @click="loginTestUser" class="login-button">Login Test User</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { initNewFirekit } from '../firebaseInit';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import baseConfig from '../config/firebaseLevante';

// Define test user credentials locally to avoid import issues
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'password123';

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
    let firebaseApp = null;
    let auth = null;
    let db = null;
    let functions = null;

    // Read port values from localStorage on mount
    onMounted(async () => {
      console.log('%c ===== INITIALIZING EMULATOR TOGGLE ===== ', 'background: #673AB7; color: #fff; font-size: 12px; padding: 3px; border-radius: 4px;');
      
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
      
      if (usingEmulators.value) {
        // Set global emulator variables first
        console.log('%c Setting global emulator variables...', 'background: #673AB7; color: #fff;');
        
        if (typeof window !== 'undefined') {
          window.FIREBASE_EMULATOR_MODE = true;
          window.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost.value}:${authPort.value}`;
          window.FIRESTORE_EMULATOR_HOST = `${emulatorHost.value}:${firestorePort.value}`;
          window.FUNCTIONS_EMULATOR_HOST = `${emulatorHost.value}:${functionsPort.value}`;
          
          console.log('Window emulator variables:', {
            FIREBASE_EMULATOR_MODE: window.FIREBASE_EMULATOR_MODE,
            FIREBASE_AUTH_EMULATOR_HOST: window.FIREBASE_AUTH_EMULATOR_HOST,
            FIRESTORE_EMULATOR_HOST: window.FIRESTORE_EMULATOR_HOST,
            FUNCTIONS_EMULATOR_HOST: window.FUNCTIONS_EMULATOR_HOST
          });
        }
        
        if (typeof process !== 'undefined' && process.env) {
          process.env.FIREBASE_EMULATOR_MODE = 'true';
          process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost.value}:${authPort.value}`;
          process.env.FIRESTORE_EMULATOR_HOST = `${emulatorHost.value}:${firestorePort.value}`;
          process.env.FUNCTIONS_EMULATOR_HOST = `${emulatorHost.value}:${functionsPort.value}`;
        }
        
        try {
          // Initialize Firebase manually to ensure emulators are connected properly
          const { auth: authInstance, db: dbInstance } = await initializeFirebaseEmulators();
          
          // Store the initialized instances
          auth = authInstance;
          db = dbInstance;
          
          // Verify emulator connection
          await verifyEmulatorConnection();
        } catch (error) {
          console.error('Error initializing Firebase with emulators:', error);
          verificationStatus.value = `Error: ${error.message}`;
          statusClass.value = 'status-error';
        }
      }
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

    // Direct function to initialize Firebase with emulators
    async function initializeFirebaseEmulators() {
      console.log('%c DIRECT FIREBASE EMULATOR INITIALIZATION ', 'background: #673AB7; color: #fff; font-weight: bold;');
      
      try {
        // Get the base config
        const appBaseConfig = baseConfig.app;
        
        // First, clear any existing Firebase instances
        if (firebaseApp) {
          console.log('Clearing existing Firebase instances...');
          firebaseApp = null;
          auth = null;
          db = null;
          functions = null;
        }
        
        // Set environment variables explicitly for all environments
        if (typeof window !== 'undefined') {
          window.FIREBASE_EMULATOR_MODE = true;
          window.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost.value}:${authPort.value}`;
          window.FIRESTORE_EMULATOR_HOST = `${emulatorHost.value}:${firestorePort.value}`;
          window.FUNCTIONS_EMULATOR_HOST = `${emulatorHost.value}:${functionsPort.value}`;
        }
        
        if (typeof process !== 'undefined' && process.env) {
          process.env.FIREBASE_EMULATOR_MODE = 'true';
          process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost.value}:${authPort.value}`;
          process.env.FIRESTORE_EMULATOR_HOST = `${emulatorHost.value}:${firestorePort.value}`;
          process.env.FUNCTIONS_EMULATOR_HOST = `${emulatorHost.value}:${functionsPort.value}`;
        }
        
        console.log('Emulator environment variables:', {
          'window.FIREBASE_AUTH_EMULATOR_HOST': typeof window !== 'undefined' ? window.FIREBASE_AUTH_EMULATOR_HOST : 'N/A',
          'process.env.FIREBASE_AUTH_EMULATOR_HOST': typeof process !== 'undefined' ? process.env.FIREBASE_AUTH_EMULATOR_HOST : 'N/A'
        });
        
        // Initialize Firebase app
        try {
          // Create a unique app name to avoid conflicts
          const appName = `emulator-app-${Date.now()}`;
          firebaseApp = initializeApp({
            apiKey: appBaseConfig.apiKey,
            authDomain: appBaseConfig.authDomain,
            projectId: appBaseConfig.projectId,
            storageBucket: appBaseConfig.storageBucket,
            messagingSenderId: appBaseConfig.messagingSenderId,
            appId: appBaseConfig.appId
          }, appName);
          
          console.log('Firebase app initialized with name:', appName);
        } catch (error) {
          console.error('Error initializing Firebase app:', error);
          throw error;
        }
        
        // Get Firebase Auth - IMPORTANT: Get auth first before connecting to emulator
        auth = getAuth(firebaseApp);
        
        // CRITICAL: Connect to Auth emulator FIRST before any other operation
        console.log(`Connecting to Auth emulator at http://${emulatorHost.value}:${authPort.value}`);
        
        try {
          // Suppress verbose log messages
          const originalInfo = console.info;
          console.info = () => {};
          
          // IMPORTANT: Use the complete URL with http:// prefix
          connectAuthEmulator(auth, `http://${emulatorHost.value}:${authPort.value}`, { disableWarnings: true });
          
          // Restore console.info
          console.info = originalInfo;
          
          console.log('%c Successfully connected to Auth emulator', 'background: #4CAF50; color: #fff;');
        } catch (error) {
          console.error('Failed to connect to Auth emulator:', error);
          throw error;
        }
        
        // Then get Firestore AFTER auth is connected to emulator
        db = getFirestore(firebaseApp);
        
        // Connect to Firestore emulator AFTER Auth
        try {
          connectFirestoreEmulator(db, emulatorHost.value, firestorePort.value);
          console.log('%c Successfully connected to Firestore emulator', 'background: #4CAF50; color: #fff;');
        } catch (error) {
          console.error('Failed to connect to Firestore emulator:', error);
          throw error;
        }
        
        // Connect to Functions emulator
        try {
          functions = getFunctions(firebaseApp);
          connectFunctionsEmulator(functions, emulatorHost.value, functionsPort.value);
          console.log('%c Successfully connected to Functions emulator', 'background: #4CAF50; color: #fff;');
        } catch (error) {
          console.error('Failed to connect to Functions emulator:', error);
          // Non-critical, continue anyway
        }
        
        return { auth, db, functions, firebaseApp };
      } catch (error) {
        console.error('Error in direct Firebase initialization:', error);
        throw error;
      }
    }

    // Function to login with the test user
    async function loginTestUser() {
      console.log('%c LOGGING IN TEST USER ', 'background: #FF9800; color: #fff; font-weight: bold;');
      verificationStatus.value = 'Logging in test user...';
      statusClass.value = 'status-checking';
      
      try {
        // Ensure Firebase is initialized with emulators first
        if (!auth) {
          const { auth: authInstance } = await initializeFirebaseEmulators();
          auth = authInstance;
        }
        
        // Attempt to sign in with test credentials
        try {
          console.log(`Signing in with ${TEST_USER_EMAIL} and ${TEST_USER_PASSWORD}`);
          const userCredential = await signInWithEmailAndPassword(
            auth,
            TEST_USER_EMAIL,
            TEST_USER_PASSWORD
          );
          
          if (userCredential && userCredential.user) {
            console.log('%c Successfully logged in test user', 'background: #4CAF50; color: #fff;', {
              uid: userCredential.user.uid,
              email: userCredential.user.email
            });
            
            verificationStatus.value = `Logged in as ${userCredential.user.email}`;
            statusClass.value = 'status-success';
            
            // Verify that we can now read from Firestore
            await verifyEmulatorConnection();
          }
        } catch (error) {
          console.error('Error signing in test user:', error);
          
          if (error.code === 'auth/user-not-found') {
            verificationStatus.value = 'Test user not found. Add a user to the emulator.';
          } else {
            verificationStatus.value = `Login error: ${error.message}`;
          }
          statusClass.value = 'status-error';
        }
      } catch (error) {
        console.error('Error initializing Firebase for test user login:', error);
        verificationStatus.value = `Error: ${error.message}`;
        statusClass.value = 'status-error';
      }
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
        // Use initialized instances if available, otherwise initialize Firebase
        if (!auth || !db) {
          const { auth: authInstance, db: dbInstance } = await initializeFirebaseEmulators();
          auth = authInstance;
          db = dbInstance;
        }
        
        // Try to access Firestore to verify permissions
        try {
          // First check if we're authenticated
          const currentUser = auth.currentUser;
          console.log('%c Current user:', 'font-weight: bold;', currentUser ? {
            uid: currentUser.uid,
            email: currentUser.email,
            isAnonymous: currentUser.isAnonymous
          } : 'Not signed in');
          
          // Try to read a document from Firestore
          console.log('Trying to read document from Firestore...');
          
          // Test collection access
          const testCollection = collection(db, 'test_collection');
          const snapshot = await getDocs(testCollection);
          
          console.log('Successfully read from Firestore collection:', {
            empty: snapshot.empty,
            size: snapshot.size
          });
          
          verificationStatus.value = 'VERIFIED: Connected to Firebase Emulators ✓';
          statusClass.value = 'status-success';
          console.log('%c VERIFIED: Connected to emulators with working permissions', 'background: #4CAF50; color: #fff;');
        } catch (error) {
          console.error('Error accessing Firestore:', error);
          
          if (error.code === 'permission-denied') {
            verificationStatus.value = 'CONNECTED BUT MISSING PERMISSIONS: Try logging in';
            statusClass.value = 'status-warning';
          } else {
            verificationStatus.value = `Error: ${error.message}`;
            statusClass.value = 'status-error';
          }
        }
      } catch (error) {
        console.error('Error initializing Firebase for verification:', error);
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
        try {
          // Initialize Firebase directly with the new emulator settings
          const { auth: newAuth, db: newDb } = await initializeFirebaseEmulators();
          
          // Update the stored instances
          auth = newAuth;
          db = newDb;
          
          // Verify the connection
          await verifyEmulatorConnection();
          
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
        
        if (typeof process !== 'undefined' && process.env) {
          delete process.env.FIREBASE_EMULATOR_MODE;
          delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
          delete process.env.FIRESTORE_EMULATOR_HOST;
          delete process.env.FUNCTIONS_EMULATOR_HOST;
        }
        
        // Alert the user that they need to reload for changes to fully take effect
        alert('Switched to production Firebase. The page will now reload.');
        window.location.reload();
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
      verifyEmulatorConnection,
      loginTestUser
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

.status-warning {
  background-color: #FF9800;
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

.test-user-section {
  margin-top: 16px;
  padding: 12px;
  background-color: #e3f2fd;
  border-radius: 4px;
  border-left: 4px solid #2196F3;
}

.test-user-section h4 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #1565C0;
}

.test-user-info {
  font-size: 14px;
  margin-bottom: 12px;
}

.test-user-info p {
  margin: 4px 0;
}

.login-button {
  padding: 6px 12px;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.login-button:hover {
  background-color: #F57C00;
}
</style> 