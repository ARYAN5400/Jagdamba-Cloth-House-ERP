import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const content = fs.readFileSync(path.join(__dirname, 'test_roboto_output.pdf'), 'utf8');
console.log('Roboto PDF Content Snippet:');
console.log(content.slice(0, 1500));
