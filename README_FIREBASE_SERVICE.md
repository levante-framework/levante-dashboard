# Firebase Service & Repositories

This folder contains the client-side Firebase integration for the Levante Dashboard: a singleton **FirebaseService** and **repositories** that call Firebase Cloud Functions. Repositories are the preferred way to query or mutate data via the backend instead of calling Firestore directly.

## FirebaseService

**Location:** `src/firebase/Service.ts`

`FirebaseService` is a static singleton that holds the initialized Firebase app and its core services (Auth, Firestore, Functions). It is the single entry point for Firebase in the app. The Auth service is just for the firebase emulator. For the app, we use the firekit authentication.

### What it does

- **Initialization:** `FirebaseService.initialize(config?, emulatorConfig?)` creates (or returns) the Firebase app and sets:
  - `FirebaseService.app` – Firebase App instance
  - `FirebaseService.auth` – Auth instance
  - `FirebaseService.db` – Firestore instance
  - `FirebaseService.functions` – Cloud Functions instance
- **Emulator support:** When `VITE_EMULATOR` is set and `emulatorConfig` is provided, it connects Auth, Firestore, and Functions to the configured emulator hosts/ports.
- **Single app name:** Uses the app name `'admin'` so the same app is reused across the codebase.

### Usage

You typically do **not** call `FirebaseService` directly in app code. Repositories extend `Repository`, which calls `FirebaseService.initialize()` in their constructor and use `FirebaseService.functions` to invoke callable functions. Use `FirebaseService` only when you need direct access to `auth`, `db`, or `functions` outside of a repository.

---

## Repositories

Repositories live in `src/firebase/repositories/` and wrap **Firebase Callable Functions**. Each repository is usually named after a Firestore collection or domain (e.g. `AdministrationsRepository` for administrations). They expose methods that call a Cloud Function and return the function’s data.

### Base class: Repository

**Location:** `src/firebase/Repository.ts`

- It is intended to be used as a base class for concrete repositories.
- In the constructor, it ensures Firebase is initialized via `FirebaseService.initialize()`.
- It provides a protected `call<TData, TResponse>(functionName, data?)` method that uses `httpsCallable` with `FirebaseService.functions`, sends `data`, and returns the callable result’s payload. Errors are logged and rethrown.

Your repository methods should call `this.call(...)` with the correct Cloud Function name and typed params/response.

---

## Creating a new repository

Use the generator script so that a new repository is created with the right name, place, and a minimal template.

### 1. Run the script via npm

From the **levante-dashboard** root:

```bash
npm run repository:new "CollectionName"
```

- **CollectionName** should be the singular or logical name (e.g. the Firestore collection name or domain). Examples: `"Users"`, `"Administrations"`, `"Groups"`.
- The script creates a single file: `src/firebase/repositories/<CollectionName>Repository.ts`.
- If that file already exists, the script exits with an error.

**Example:**

```bash
npm run repository:new "Users"
```

This creates `src/firebase/repositories/UsersRepository.ts` with a class `UsersRepository`, an exported singleton (e.g. `usersRepository`), and placeholder types and one example method (`exampleFn`).

### 2. Implement methods that call Cloud Functions

After generation:

1. **Rename or remove the example method** and add methods that match your Cloud Functions (e.g. `getUsers`, `createUser`).
2. **Define TypeScript interfaces** (or use Zod schemas) for:
   - Parameters passed to the callable (e.g. `GetUsersParams`)
   - The shape of the data returned by the function (e.g. `GetUsersResponse` with a `data` field if that’s what the function returns).
3. **Call the Cloud Function** via `this.call<ParamsType, ResponseType>(functionName, params)` and return the part of the response your callers need (e.g. `response.data`).

**Example:** After running `npm run repository:new "Users"`, you might replace the template with something like:

```ts
import { Repository } from '@/firebase/Repository';

interface GetUsersParams {
  siteId: string;
  idsOnly?: boolean;
}

interface User {
  id: string;
  email: string;
}

interface GetUsersResponse {
  data: User[];
}

class UsersRepository extends Repository {
  constructor() {
    super();
  }

  async getUsers(params: GetUsersParams): Promise<User[]> {
    const response = await this.call<GetUsersParams, GetUsersResponse>('getUsers', params);
    return response.data;
  }
}

export const usersRepository = new UsersRepository();
```

- The first type parameter of `call` is the payload you send; the second is the shape of the callable’s return value (what `response.data` has).
- The Cloud Function name (e.g. `'getUsers'`) must match the name of the callable function deployed in your Firebase project.

### 3. Use the repository in the app

Import the exported singleton and call its methods where you need to talk to the backend (e.g. in a composable, store, or component):

```ts
import { usersRepository } from '@/firebase/repositories/UsersRepository';

const users = await usersRepository.getUsers({ siteId: '...' });
```

---

## Summary

| Item                       | Purpose                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **FirebaseService**        | Singleton that initializes and exposes Firebase `app`, `auth`, `db`, and `functions`. Used by `Repository` and when you need direct Firebase access.         |
| **Repository**             | Base class that initializes Firebase and provides `call()` to invoke callable Cloud Functions with typed params and response.                                |
| **generate-repository.sh** | Run via `npm run repository:new "Name"` to create `repositories/<Name>Repository.ts`; then add methods that call your Cloud Functions and return their data. |

Repositories are the standard place to add new functions that call Firebase Cloud Functions; keep Firestore collection naming in mind when choosing the name for the script.
