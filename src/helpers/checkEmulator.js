/**
 * Emulator verification helper script
 * This script can be run directly from the browser console to check emulator connectivity
 */

/**
 * Check if the Firebase emulators are running and accessible
 */
async function checkFirebaseEmulators() {
  console.log('===== FIREBASE EMULATOR VERIFICATION =====');

  const host = localStorage.getItem('emulatorHost') || '127.0.0.1';
  const authPort = localStorage.getItem('authPort') || '9199';
  const firestorePort = localStorage.getItem('firestorePort') || '8180';
  const functionsPort = localStorage.getItem('functionsPort') || '5102';
  
  console.log('Using emulator configuration:');
  console.log(`Auth: ${host}:${authPort}`);
  console.log(`Firestore: ${host}:${firestorePort}`);
  console.log(`Functions: ${host}:${functionsPort}`);
  
  // Check emulator UI
  try {
    console.log('\nTesting Emulator UI access...');
    const emulatorUIUrl = `http://127.0.0.1:4000`;
    const uiResponse = await fetch(emulatorUIUrl, { 
      method: 'GET',
      mode: 'no-cors' 
    }).catch(err => {
      console.error(`Cannot access Emulator UI at ${emulatorUIUrl}`, err);
      return null;
    });
    
    if (uiResponse) {
      console.log('✅ Emulator UI is accessible');
    } else {
      console.error('❌ Emulator UI is NOT accessible');
    }
  } catch (error) {
    console.error('❌ Error checking Emulator UI:', error);
  }
  
  // Check Auth emulator
  try {
    console.log('\nTesting Auth emulator...');
    const authEmulatorUrl = `http://${host}:${authPort}`;
    const authResponse = await fetch(authEmulatorUrl, { 
      method: 'GET',
      mode: 'no-cors'
    }).catch(err => {
      console.error(`Cannot access Auth emulator at ${authEmulatorUrl}`, err);
      return null;
    });
    
    if (authResponse) {
      console.log('✅ Auth emulator is reachable');
    } else {
      console.error('❌ Auth emulator is NOT reachable');
    }
  } catch (error) {
    console.error('❌ Error checking Auth emulator:', error);
  }
  
  // Check Firestore emulator
  try {
    console.log('\nTesting Firestore emulator...');
    const firestoreEmulatorUrl = `http://${host}:${firestorePort}`;
    const firestoreResponse = await fetch(firestoreEmulatorUrl, { 
      method: 'GET',
      mode: 'no-cors'
    }).catch(err => {
      console.error(`Cannot access Firestore emulator at ${firestoreEmulatorUrl}`, err);
      return null;
    });
    
    if (firestoreResponse) {
      console.log('✅ Firestore emulator is reachable');
    } else {
      console.error('❌ Firestore emulator is NOT reachable');
    }
  } catch (error) {
    console.error('❌ Error checking Firestore emulator:', error);
  }
  
  // Check Functions emulator
  try {
    console.log('\nTesting Functions emulator...');
    const functionsEmulatorUrl = `http://${host}:${functionsPort}`;
    const functionsResponse = await fetch(functionsEmulatorUrl, { 
      method: 'GET',
      mode: 'no-cors'
    }).catch(err => {
      console.error(`Cannot access Functions emulator at ${functionsEmulatorUrl}`, err);
      return null;
    });
    
    if (functionsResponse) {
      console.log('✅ Functions emulator is reachable');
    } else {
      console.error('❌ Functions emulator is NOT reachable');
    }
  } catch (error) {
    console.error('❌ Error checking Functions emulator:', error);
  }
  
  // Check window environment variables
  console.log('\nChecking window environment variables...');
  if (window.FIREBASE_EMULATOR_MODE) {
    console.log('✅ FIREBASE_EMULATOR_MODE is set to', window.FIREBASE_EMULATOR_MODE);
  } else {
    console.error('❌ FIREBASE_EMULATOR_MODE is not set');
  }
  
  if (window.FIREBASE_AUTH_EMULATOR_HOST) {
    console.log('✅ FIREBASE_AUTH_EMULATOR_HOST is set to', window.FIREBASE_AUTH_EMULATOR_HOST);
  } else {
    console.error('❌ FIREBASE_AUTH_EMULATOR_HOST is not set');
  }
  
  if (window.FIRESTORE_EMULATOR_HOST) {
    console.log('✅ FIRESTORE_EMULATOR_HOST is set to', window.FIRESTORE_EMULATOR_HOST);
  } else {
    console.error('❌ FIRESTORE_EMULATOR_HOST is not set');
  }
  
  if (window.FUNCTIONS_EMULATOR_HOST) {
    console.log('✅ FUNCTIONS_EMULATOR_HOST is set to', window.FUNCTIONS_EMULATOR_HOST);
  } else {
    console.error('❌ FUNCTIONS_EMULATOR_HOST is not set');
  }
  
  console.log('\n===== END VERIFICATION =====');
}

// Add to window for easy access from console
if (typeof window !== 'undefined') {
  window.checkFirebaseEmulators = checkFirebaseEmulators;
  console.log('Firebase emulator verification helper loaded. Run window.checkFirebaseEmulators() to verify your emulator connection.');
}

export { checkFirebaseEmulators }; 