import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Direct link to Roboto-Regular TTF on Google Fonts gstatic CDN
const fontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf';

function download(url) {
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      console.log('Redirecting to:', res.headers.location);
      download(res.headers.location);
      return;
    }
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const buffer = Buffer.concat(chunks);
      console.log('Status:', res.statusCode, 'Buffer size:', buffer.length);
      if (res.statusCode === 200 && buffer.length > 10000) {
        const base64 = buffer.toString('base64');
        const fontDir = path.join(__dirname, '..', 'src', 'utils', 'fonts');
        if (!fs.existsSync(fontDir)) fs.mkdirSync(fontDir, { recursive: true });
        const fontJsPath = path.join(fontDir, 'Roboto-Regular.js');
        fs.writeFileSync(fontJsPath, `export const ROBOTO_REGULAR_BASE64 = "${base64}";\nexport default ROBOTO_REGULAR_BASE64;\n`);
        console.log('Successfully written Roboto-Regular.js! Size:', base64.length);
      }
    });
  });
}

download(fontUrl);
