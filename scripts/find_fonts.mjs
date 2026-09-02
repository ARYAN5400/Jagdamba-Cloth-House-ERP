import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findTTF(dir) {
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
      const full = path.join(dir, f.name);
      if (f.isDirectory() && !f.name.startsWith('.')) {
        findTTF(full);
      } else if (f.isFile() && (f.name.endsWith('.ttf') || f.name.endsWith('.woff'))) {
        console.log('Found font:', full);
      }
    }
  } catch (e) {}
}

findTTF(path.join(__dirname, '..', 'node_modules'));
