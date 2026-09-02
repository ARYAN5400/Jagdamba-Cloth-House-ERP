import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imgPath = path.join(__dirname, '../public/assets/sanjeev-kumar-signature-transparent.png');
const targetPath = path.join(__dirname, '../src/utils/signatureHelper.js');

const buf = fs.readFileSync(imgPath);
const b64 = 'data:image/png;base64,' + buf.toString('base64');

const code = `/**
 * Actual Authorized Signature Asset
 * Jagdamba Cloth House
 * Sanjeev Kumar
 */

const SIGNATURE_DATA_URL = ${JSON.stringify(b64)};
const SIGNATURE_PATH = "/assets/sanjeev-kumar-signature-transparent.png";

export const DEFAULT_SIGNATURE_DATA_URL = SIGNATURE_DATA_URL;

export function getShopSignatureImage(shopSettings) {
  return shopSettings?.signature_url || SIGNATURE_DATA_URL;
}

export function getSignaturePngDataUrl(shopSettings) {
  return shopSettings?.signature_url || SIGNATURE_DATA_URL;
}
`;

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully updated signatureHelper.js with new signature base64!');
