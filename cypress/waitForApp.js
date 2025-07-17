import { get } from 'axios';

const waitForSelector = async (url, selector, timeout = 30000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await get(url);
      if (res.data.includes(selector)) {
        console.log('✅ App is ready');
        return;
      }
    } catch (e) {
      // retry silently
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('❌ Timed out waiting for app selector');
};

waitForSelector('http://localhost:5173/signin', 'data-cy="input-username-email"')
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
