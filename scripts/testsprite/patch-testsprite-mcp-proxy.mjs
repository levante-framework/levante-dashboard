import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const targetPath = path.join(projectRoot, 'node_modules/@testsprite/testsprite-mcp/dist/index.js');

if (!fs.existsSync(targetPath)) {
  process.stderr.write(`Missing file: ${targetPath}\n`);
  process.exit(1);
}

const original = fs.readFileSync(targetPath, 'utf8');

const marker = 'TESTSPRITE_CONNECT_HEAD_PATCH_APPLIED';
if (original.includes(marker)) {
  process.stdout.write('TestSprite MCP proxy patch already applied.\n');
  process.exit(0);
}

const needle =
  "clientSocket.write('HTTP/1.1 200 Connection Established\\r\\n\\r\\n');";

const insertion =
  "clientSocket.write('HTTP/1.1 200 Connection Established\\r\\n\\r\\n');\n" +
  `            const ${marker} = true;\n` +
  '            if (head && head.length) {\n' +
  '                serverSocket.write(head);\n' +
  '            }\n';

if (!original.includes(needle)) {
  process.stderr.write('Could not find expected CONNECT handshake line to patch.\n');
  process.exit(1);
}

const updated = original.replace(needle, insertion);
fs.writeFileSync(targetPath, updated, 'utf8');
process.stdout.write('Applied TestSprite MCP proxy CONNECT head patch.\n');

