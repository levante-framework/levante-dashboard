import http from 'node:http';
import net from 'node:net';
import { URL } from 'node:url';

const LISTEN_PORT = Number(process.env.PORT || 5173);
const VITE_PORT = Number(process.env.VITE_PORT || 5174);
const AUTH_PORT = Number(process.env.AUTH_PORT || 9199);
const FS_PORT = Number(process.env.FS_PORT || 8180);
const HOST = process.env.HOST || '127.0.0.1';

function getTargetPort(pathname) {
  if (pathname.startsWith('/identitytoolkit.googleapis.com/')) return AUTH_PORT;
  if (pathname.startsWith('/v1/projects/')) return FS_PORT;
  if (pathname.startsWith('/google.firestore.v1.Firestore/')) return FS_PORT;
  return VITE_PORT;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const targetPort = getTargetPort(url.pathname);

  const proxyReq = http.request(
    {
      host: HOST,
      port: targetPort,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        host: `${HOST}:${targetPort}`,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', () => {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Proxy error');
  });

  req.pipe(proxyReq);
});

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const targetPort = getTargetPort(url.pathname);

  const upstream = net.connect(targetPort, HOST, () => {
    upstream.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
        Object.entries(req.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n',
    );
    if (head && head.length) upstream.write(head);
    socket.pipe(upstream);
    upstream.pipe(socket);
  });

  upstream.on('error', () => {
    socket.destroy();
  });
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(
    `TestSprite emulator proxy listening on :${LISTEN_PORT} → vite:${VITE_PORT}, auth:${AUTH_PORT}, fs:${FS_PORT}`,
  );
});

