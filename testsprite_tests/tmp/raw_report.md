
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** levante-dashboard
- **Date:** 2025-12-30
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** TC001-Email/Password Sign-In Success
- **Test Code:** [TC001_EmailPassword_Sign_In_Success.py](./TC001_EmailPassword_Sign_In_Success.py)
- **Test Error:** User sign-in verification failed due to invalid credentials and Google OAuth sign-in blocked by browser security restrictions. Unable to authenticate user successfully via Firebase Auth.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCOzRA9a2sDHtVlX7qnszxrgsRCBLyf5p0:0:0)
[ERROR] Error signing in FirebaseError: Firebase: Error (auth/user-not-found).
    at createErrorInternal (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:3368:41)
    at _fail (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:3336:13)
    at _performFetchWithErrorHandling (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:3760:13)
    at async _performSignInRequest (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:3771:30)
    at async _signInWithCredential (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:6629:24)
    at async authWithEmail (http://localhost:5173/src/pages/SignIn.vue:106:5) (at http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:42671:18)
[ERROR] Error signing in: FirebaseError: Firebase: Error (auth/user-not-found). (at http://localhost:5173/src/store/auth.ts:116:18)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCOzRA9a2sDHtVlX7qnszxrgsRCBLyf5p0:0:0)
[ERROR] Error signing in FirebaseError: Firebase: Error (auth/user-not-found).
    at createErrorInternal (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:3368:41)
    at _fail (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:3336:13)
    at _performFetchWithErrorHandling (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:3760:13)
    at async _performSignInRequest (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:3771:30)
    at async _signInWithCredential (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:6629:24)
    at async authWithEmail (http://localhost:5173/src/pages/SignIn.vue:106:5) (at http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:42671:18)
[ERROR] Error signing in: FirebaseError: Firebase: Error (auth/user-not-found). (at http://localhost:5173/src/store/auth.ts:116:18)
[WARNING] [intlify] Not found parent scope. use the global scope. (at http://localhost:5173/node_modules/.vite/deps/vue-i18n.js?v=c9001acd:42:12)
[WARNING] [2025-12-31T02:40:44.646Z]  @firebase/app: Firebase: Error thrown when writing to IndexedDB. Original error: Failed to execute 'put' on 'IDBObjectStore': [object Array] could not be cloned.. (app/idb-set). (at http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:1790:24)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCOzRA9a2sDHtVlX7qnszxrgsRCBLyf5p0:0:0)
[ERROR] Error signing in FirebaseError: Firebase: Error (auth/user-not-found).
    at createErrorInternal (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:3368:41)
    at _fail (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:3336:13)
    at _performFetchWithErrorHandling (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:3760:13)
    at async _performSignInRequest (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:3771:30)
    at async _signInWithCredential (http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:6629:24)
    at async authWithEmail (http://localhost:5173/src/pages/SignIn.vue:106:5) (at http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:42671:18)
[ERROR] Error signing in: FirebaseError: Firebase: Error (auth/user-not-found). (at http://localhost:5173/src/store/auth.ts:116:18)
[ERROR] Cross-Origin-Opener-Policy policy would block the window.closed call. (at http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:8933:0)
[ERROR] Cross-Origin-Opener-Policy policy would block the window.closed call. (at http://localhost:5173/node_modules/.vite/deps/@levante-framework_firekit.js?v=62ea7c3a:8933:0)
[WARNING] [intlify] Not found parent scope. use the global scope. (at http://localhost:5173/node_modules/.vite/deps/vue-i18n.js?v=c9001acd:42:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/77a7ab0d-cfb2-4179-ba01-da15a431f7ab/e48d4fd9-e75d-4734-9450-4e0f59a61f46
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---