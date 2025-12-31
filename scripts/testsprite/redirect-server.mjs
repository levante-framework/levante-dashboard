import http from 'node:http';

const PORT = Number(process.env.PORT || 5173);
const baseUrl = process.env.E2E_BASE_URL || 'https://hs-levante-admin-dev.web.app';

const server = http.createServer((req, res) => {
  const path = req.url || '/';
  const location = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  res.statusCode = 302;
  res.setHeader('Location', location);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`TestSprite redirect server listening on :${PORT} → ${baseUrl}`);
});

