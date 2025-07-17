const axios = require('axios');

const DEFAULT_URL = 'http://localhost:5173/signin';
const DEFAULT_SELECTOR = 'data-cy="input-username-email"';
const DEFAULT_TIMEOUT = 30000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForSelector = async (url, selector, timeout) => {
  const startTime = Date.now();
  const endTime = startTime + timeout;

  console.log(`🔍 Waiting for selector [${selector}] at ${url} (timeout: ${timeout}ms)`);

  while (Date.now() < endTime) {
    try {
      const res = await get(url);
      if (res.status === 200 && res.data.includes(selector)) {
        console.log('✅ Selector found, app is ready.');
        return;
      }
    } catch (error) {
      // Optional: log once if status is not 200 or host unreachable
    }

    await wait(1000);
    process.stdout.write('.'); // progress indicator
  }

  console.error('\n❌ Timed out waiting for selector.');
  process.exit(1);
};

// Optional: allow overrides via CLI args
const url = process.argv[2] || DEFAULT_URL;
const selector = process.argv[3] || DEFAULT_SELECTOR;
const timeout = parseInt(process.argv[4], 10) || DEFAULT_TIMEOUT;

waitForSelector(url, selector, timeout);
