export async function clearIndexedDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.deleteDatabase('firebaseLocalStorageDb');
      request.onsuccess = () => {
        console.log('IndexedDB cleared successfully');
        resolve();
      };
      request.onerror = (event) => {
        console.error('Error clearing IndexedDB:', event);
        reject(event);
      };
    } catch (error) {
      console.error('Error accessing IndexedDB:', error);
      reject(error);
    }
  });
} 