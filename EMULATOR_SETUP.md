# Firebase Emulator Setup with Functions

This dashboard now uses the Firebase emulators from the `../firebase-functions` repository, which includes support for Cloud Functions testing.

## Emulator Configuration

The emulators run on the following ports:
- **Firestore**: `localhost:8180`
- **Auth**: `localhost:9199`
- **Functions**: `localhost:5002`
- **Emulator UI**: `localhost:4001`

## Available Scripts

### Start Emulators (with existing data)
```bash
npm run emulators:start
# or directly: cd ../firebase-functions && npm run dev
```

### Start Emulators (clean slate)
```bash
npm run emulators:clean
# or directly: cd ../firebase-functions && npm run dev:clean
```

### Seed Emulators with Test Data
```bash
npm run emulators:seed
# or directly: cd ../firebase-functions && npm run emulator:seed
```

### Setup Emulators (clear + seed)
```bash
npm run emulators:setup
# or directly: cd ../firebase-functions && npm run emulator:setup
```

### Start Dashboard with Emulators
```bash
npm run dev:emulators
```

### Stop Emulators
```bash
npm run emulators:stop
```

## Development Workflow

1. **Start emulators**: `npm run emulators:start`
2. **Start dashboard**: `npm run dev:emulators`
3. **Access emulator UI**: `http://localhost:4001`
4. **Access dashboard**: `https://localhost:5173` (or next available port)

## Features

- ✅ **Local Firekit**: Uses local `../levante-firekit` development version
- ✅ **Merged Database**: Single Firebase project architecture
- ✅ **Cloud Functions**: Test your functions locally
- ✅ **Data Persistence**: Emulator data is imported/exported automatically
- ✅ **Seeding Scripts**: Pre-populate with test data

## Verification

Your database changes will go to the local emulators instead of live Firebase:
- Monitor operations in the **Emulator UI**: `http://localhost:4001/firestore`
- Check **Functions logs**: `http://localhost:4001/functions`
- View **Auth users**: `http://localhost:4001/auth`

## Troubleshooting

If you encounter issues:
1. Stop all processes: `npm run emulators:stop`
2. Clean start: `npm run emulators:clean`
3. Check ports aren't in use: `lsof -i :4001 -i :8180 -i :9199 -i :5002` 