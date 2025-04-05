export async function clearIndexedDB(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      console.log('Starting IndexedDB clearing process...');
      const databases = indexedDB.databases();
      databases.then((dbs) => {
        console.log('Found databases:', dbs.map(db => db.name));
        const deletePromises = dbs.map((db) => {
          if (db.name) {
            return new Promise<void>((resolve, reject) => {
              console.log(`Attempting to delete database: ${db.name}`);
              const request = indexedDB.deleteDatabase(db.name!);
              request.onsuccess = () => {
                console.log(`Successfully deleted database: ${db.name}`);
                resolve();
              };
              request.onerror = (event) => {
                console.error(`Error deleting database ${db.name}:`, event);
                reject(event);
              };
              request.onblocked = (event) => {
                console.warn(`Database ${db.name} deletion blocked:`, event);
                // Try to close any open connections
                const closeRequest = indexedDB.open(db.name!);
                closeRequest.onsuccess = (event) => {
                  const db = (event.target as IDBOpenDBRequest).result;
                  db.close();
                  console.log(`Closed open connections to database: ${db.name}`);
                };
              };
            });
          }
          return Promise.resolve();
        });

        Promise.all(deletePromises)
          .then(() => {
            console.log('All IndexedDB databases cleared successfully');
            resolve();
          })
          .catch((error) => {
            console.error('Error clearing IndexedDB databases:', error);
            reject(error);
          });
      }).catch((error) => {
        console.error('Error accessing IndexedDB databases:', error);
        reject(error);
      });
    } catch (error) {
      console.error('Error during IndexedDB clearing process:', error);
      reject(error);
    }
  });
} 