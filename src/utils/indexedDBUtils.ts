export const clearIndexedDB = async (): Promise<void> => {
  console.log('Starting IndexedDB clearing process (clearing all)...');
  try {
    // Check if indexedDB.databases() is supported
    if (!indexedDB.databases) {
      console.warn('indexedDB.databases() not supported, attempting to clear only firebaseLocalStorageDb.');
      // Fallback to clearing only the known main db if .databases() is unavailable
      return new Promise((resolve) => {
          const deleteRequest = indexedDB.deleteDatabase('firebaseLocalStorageDb');
          deleteRequest.onsuccess = () => {
              console.log('Fallback: Successfully deleted firebaseLocalStorageDb');
              resolve();
          };
          deleteRequest.onerror = (event) => {
              console.error('Fallback: Error deleting firebaseLocalStorageDb', event);
              resolve(); 
          };
          deleteRequest.onblocked = (event) => {
              console.warn('Fallback: Blocked deleting firebaseLocalStorageDb', event);
              resolve();
          };
      });
    }

    const dbs = await indexedDB.databases();
    console.log('Found databases:', dbs.map(db => db.name).filter(name => name)); // Log only named databases

    if (!dbs || dbs.length === 0) {
        console.log('No IndexedDB databases found to clear via .databases().');
        return;
    }

    const deletePromises = dbs
      .map((db) => {
        // Ensure db and db.name exist before attempting deletion
        if (db && db.name) {
          return new Promise<void>((resolve) => { // Always resolve
            console.log(`Attempting to delete database: ${db.name}`);
            const request = indexedDB.deleteDatabase(db.name);
            request.onsuccess = () => {
              console.log(`Successfully deleted database: ${db.name}`);
              resolve();
            };
            request.onerror = (event) => {
              // Don't reject the whole process, just log error for this DB
              console.error(`Error deleting database ${db.name}:`, event);
              resolve(); // Resolve anyway to allow others to proceed
            };
            request.onblocked = (event) => {
               // Don't reject the whole process, just log warning
              console.warn(`Database ${db.name} deletion blocked:`, event);
              resolve(); // Resolve anyway
            };
          });
        } else {
           console.log('Skipping unnamed or undefined database entry.');
           return Promise.resolve(); // Return resolved promise for unnamed/invalid DBs
        }
      });

    // Wait for all delete attempts to settle (either succeed or fail)
    const results = await Promise.allSettled(deletePromises);
    console.log('IndexedDB clearing process finished. Results:', results.map(r => r.status));

  } catch (error) {
    console.error('Error accessing or clearing IndexedDB databases:', error);
    // Don't throw, allow initialization to continue
  }
}; 