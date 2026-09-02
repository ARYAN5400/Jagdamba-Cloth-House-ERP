import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ROBOTO_REGULAR_BASE64 from '../src/utils/fonts/Roboto-Regular.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// Register font
doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
doc.setFont('Roboto');

doc.setFontSize(14);
doc.text('Testing Rupee Symbol with Roboto Font:', 20, 20);
doc.text('₹420.00', 20, 30);
doc.text('Grand Total: ₹1,945.50', 20, 40);

const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(path.join(__dirname, 'test_roboto_output.pdf'), pdfBuffer);
console.log('Roboto PDF written successfully, size:', pdfBuffer.length);
