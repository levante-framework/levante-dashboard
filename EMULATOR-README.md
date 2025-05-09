# Levante Dashboard Development Setup

This guide explains how to set up Levante Dashboard to use both local development versions of:
1. Your levante-firekit package
2. Firebase emulators for Auth, Firestore, and Functions

## Prerequisites

- Node.js (v16+)
- Firebase CLI installed globally (`npm install -g firebase-tools`)
- Local checkout of the levante-firekit repository

## Setup Options

There are several ways to set up your development environment:

### Option 1: All-in-one script (recommended)

This will link your local firekit and start both emulators and the dev server:

```bash
./start-dev.sh
```

### Option 2: Step-by-step approach

#### 1. Link local levante-firekit

```bash
./link-local-firekit.sh
```

#### 2. Start Firebase emulators (in a separate terminal)

```bash
./start-emulators.sh
```

#### 3. Start development server (in another terminal)

```bash
./start-dev-server.sh
```

## Development Notes

### Firebase Emulator UI

Once started, the Firebase Emulator UI is available at:
- http://127.0.0.1:4000

### Test User Credentials

A test user is automatically created in the Auth emulator:
- Email: test@example.com
- Password: password123

### Port Configuration

The emulators use these ports:
- Auth: 127.0.0.1:9199
- Firestore: 127.0.0.1:8180
- Functions: 127.0.0.1:5102
- Emulator UI: 127.0.0.1:4000

### Troubleshooting

If you encounter issues:

1. Ensure ports 4000, 9199, 8180, and 5102 are not in use by other applications
2. Check that your local firekit has been properly linked with `npm link @levante-framework/firekit`
3. Verify that Firebase CLI is installed and properly configured
4. Look for error messages in the emulator console
5. If authentication fails, you can manually create a user through the Emulator UI 