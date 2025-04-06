import { mountApp } from './setup';

// --- REMOVE Monkey-patch ---
/*
console.log('[DEBUG] Applying IndexedDB put patch...');
const originalPut = IDBObjectStore.prototype.put;
IDBObjectStore.prototype.put = function(...args: any[]) {
  // ... patch logic ...
};
console.log('[DEBUG] IndexedDB put patch applied.');
*/
// -------------------------

mountApp(); 