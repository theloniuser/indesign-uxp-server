/**
 * Test UXP-native handlers
 * Requires bridge running: cd bridge && node server.js
 * Requires InDesign open with a document and Bridge panel connected
 *
 * Key discoveries:
 * - doc.pages[0] → must use doc.pages.item(0) in UXP
 * - doc.filePath returns a Promise → must await it
 * - exportFile(format, path, ...) → format FIRST, path string works directly
 * - rect.place(pathString) → path string works directly (no UXP storage needed)
 * - ExportFormat enum: require('indesign').ExportFormat.pdfType (not PDF_TYPE)
 */

const BASE = 'http://127.0.0.1:3000';

async function uxp(code) {
  const r = await fetch(`${BASE}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data.result;
}

async function test(name, fn) {
  process.stdout.write(`${name}... `);
  try {
    const result = await fn();
    console.log('✓', JSON.stringify(result).slice(0, 140));
  } catch(e) {
    console.log('✗', e.message);
  }
}

async function run() {
  console.log('\n=== UXP Handler Tests ===\n');

  try {
    const r = await fetch(`${BASE}/status`);
    const { connected } = await r.json();
    if (!connected) {
      console.error('Plugin not connected. Open InDesign and load the Bridge panel.');
      process.exit(1);
    }
    console.log('Bridge connected ✓\n');
  } catch(e) {
    console.error('Bridge not running. Start: cd bridge && node server.js');
    process.exit(1);
  }

  // 1. get_document_info — returns structured object
  await test('get_document_info', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    let filePath = 'Unsaved';
    try {
      const fp = await doc.filePath;
      filePath = fp ? (fp.nativePath || fp.url || String(fp) || 'Unsaved') : 'Unsaved';
    } catch(e) {}
    return {
      name: doc.name,
      filePath,
      pages: doc.pages.length,
      spreads: doc.spreads.length,
      layers: doc.layers.length,
      width: doc.documentPreferences.pageWidth,
      height: doc.documentPreferences.pageHeight,
      marginTop: doc.marginPreferences.top,
    };
  `));

  // 2. create_text_frame — use .item(0) not [0] for InDesign collections in UXP
  await test('create_text_frame', () => uxp(`
    if (app.documents.length === 0) return { success: false, error: 'No document open' };
    const doc = app.activeDocument;
    const page = doc.pages.item(0);
    const frame = page.textFrames.add();
    frame.geometricBounds = [20, 20, 50, 100];
    frame.contents = 'Hello from UXP!';
    try { frame.texts.item(0).pointSize = 14; } catch(e) {}
    return { success: true, message: 'Text frame created', id: frame.id };
  `));

  // 3. place_image — path string works directly (no UXP storage API needed)
  // Uses the uxp-test-export.pdf already on Desktop from prior test run
  await test('place_image (path string)', () => uxp(`
    if (app.documents.length === 0) return { success: false, error: 'No document open' };
    const doc = app.activeDocument;
    const page = doc.pages.item(0);
    const rect = page.rectangles.add();
    rect.geometricBounds = [60, 20, 120, 100];
    try {
      rect.place('/Users/jamescantwell/Desktop/uxp-test-export.pdf');
      return { success: true, message: 'File placed via path string' };
    } catch(e) {
      rect.remove();
      return { success: false, error: 'place() failed: ' + e.message };
    }
  `));

  // 4. export_pdf — format FIRST, then path string (signature same as ExtendScript)
  await test('export_pdf (path string)', () => uxp(`
    const { ExportFormat } = require('indesign');
    if (app.documents.length === 0) return { success: false, error: 'No document open' };
    const doc = app.activeDocument;
    try {
      doc.exportFile(ExportFormat.pdfType, '/Users/jamescantwell/Desktop/uxp-test-export.pdf', false, 'High Quality Print');
      return { success: true, path: '/Users/jamescantwell/Desktop/uxp-test-export.pdf' };
    } catch(e) {
      return { success: false, error: 'exportFile failed: ' + e.message };
    }
  `));

  console.log('\nDone.');
}

run();
