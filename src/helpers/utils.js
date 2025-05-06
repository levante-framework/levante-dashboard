/**
 * Safely fetches a document by ID from Firestore, with special handling for emulator mode
 * 
 * @param {string} collectionName - Firestore collection name
 * @param {string} docId - Document ID
 * @returns {Promise<Object|null>} Document data or null
 */
export const fetchDocById = async (collectionName, docId) => {
  console.log(`fetchDocById called for ${collectionName}/${docId}`);
  
  // Always return mock data for the test user in development mode
  if (import.meta.env.DEV && docId === 'sRzElmOQ5eAexgvFag4YKKMyxiv2') {
    console.log(`Using mock user claims for test emulator user: ${docId}`);
    
    // For userClaims requests, return an admin user with super_admin access
    if (collectionName === 'userClaims') {
      return {
        claims: {
          super_admin: true,
          admin: true,
          created: new Date().toISOString(),
          email: '7vpqcm4ihi@levante.com',
          roarUid: 'sRzElmOQ5eAexgvFag4YKKMyxiv2',
          minimalAdminOrgs: {
            "test-district-1": ["admin"],
            "test-school-1": ["admin"]
          }
        }
      };
    }
  }
  
  try {
    // Check if we're in development mode with emulators
    if (import.meta.env.DEV) {
      console.log('Development mode: Connecting to Firestore emulator for:', collectionName, docId);
      
      try {
        // When in development with emulators, use fetch directly instead of axios
        // This provides better error handling for emulator connections
        const emulatorBaseUrl = 'http://localhost:8080/v1/projects/hs-levante-admin-dev/databases/(default)/documents';
        const url = `${emulatorBaseUrl}/${collectionName}/${docId}`;
        
        console.log(`Fetching from emulator: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Emulator fetch failed: ${response.status} ${response.statusText}`);
          throw new Error(`Emulator fetch failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Emulator response:', data);
        return data.fields ? data.fields : data;
      } catch (emulatorError) {
        console.error('Error connecting to Firestore emulator:', emulatorError);
        
        // In development mode, if connecting to emulator fails, return mock data for the test user
        if (docId === 'sRzElmOQ5eAexgvFag4YKKMyxiv2') {
          console.log('Returning fallback mock user claims due to emulator connection error');
          return {
            claims: {
              super_admin: true,
              admin: true,
              created: new Date().toISOString(),
              email: '7vpqcm4ihi@levante.com',
              roarUid: 'sRzElmOQ5eAexgvFag4YKKMyxiv2',
              minimalAdminOrgs: {
                "test-district-1": ["admin"],
                "test-school-1": ["admin"]
              }
            }
          };
        }
        
        // For other documents, rethrow the error
        throw emulatorError;
      }
    } else {
      // In production, use the regular axios-based approach
      const baseUrl = 'https://firestore.googleapis.com/v1/projects/hs-levante-admin-dev/databases/(default)/documents';
      const url = `${baseUrl}/${collectionName}/${docId}`;
      
      console.log(`Fetching from production: ${url}`);
      
      const axios = (await import('axios')).default;
      const response = await axios.get(url);
      return response.data.fields ? response.data.fields : response.data;
    }
  } catch (error) {
    console.error(`Error fetching ${collectionName}/${docId}:`, error);
    
    // Last resort fallback for test user in development mode
    if (import.meta.env.DEV && collectionName === 'userClaims' && docId === 'sRzElmOQ5eAexgvFag4YKKMyxiv2') {
      console.log('Returning emergency fallback mock user claims');
      return {
        claims: {
          super_admin: true,
          admin: true,
          created: new Date().toISOString(),
          email: '7vpqcm4ihi@levante.com',
          roarUid: 'sRzElmOQ5eAexgvFag4YKKMyxiv2',
          minimalAdminOrgs: {
            "test-district-1": ["admin"],
            "test-school-1": ["admin"]
          }
        }
      };
    }
    
    // For all other errors, return null
    return null;
  }
} 