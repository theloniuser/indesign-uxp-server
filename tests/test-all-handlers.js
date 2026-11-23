/**
 * Comprehensive handler tests
 * Requires bridge running: cd bridge && node server.js
 * Requires InDesign open with a document and Bridge panel connected
 */

const BASE = 'http://127.0.0.1:3000';
const HEADERS = { 'Content-Type': 'application/json' };
if (process.env.BRIDGE_TOKEN) HEADERS.Authorization = `Bearer ${process.env.BRIDGE_TOKEN}`;

async function uxp(code) {
  const r = await fetch(`${BASE}/execute`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ code })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data.result;
}

async function mcp(tool, args = {}) {
  const r = await fetch(`${BASE}/tools/${tool}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(args)
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  return data;
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    const result = await fn();
    const preview = JSON.stringify(result).slice(0, 120);
    console.log('✓', preview);
    passed++;
  } catch(e) {
    console.log('✗', e.message.slice(0, 120));
    failed++;
  }
}

function section(name) {
  console.log(`\n── ${name} ──`);
}

async function run() {
  console.log('\n=== Comprehensive Handler Tests ===\n');

  try {
    const r = await fetch(`${BASE}/status`);
    const { connected } = await r.json();
    if (!connected) {
      console.error('Plugin not connected. Open InDesign and load the Bridge panel.');
      process.exit(1);
    }
    console.log('Bridge connected ✓');
  } catch(e) {
    console.error('Bridge not running. Start: cd bridge && node server.js');
    process.exit(1);
  }

  // The suite edits the active document (adds pages, layers, swatches). Never run it on real work.
  const docName = await uxp('return app.documents.length ? app.activeDocument.name : "";');
  if (!String(docName).startsWith('uxp-test-fixture')) {
    console.error(`Active document is '${docName || 'none'}', not a uxp-test-fixture document. ` +
      'The suite edits the active document. Open or create uxp-test-fixture.indd first.');
    process.exit(1);
  }

  // ── Document Handlers ──
  section('Document Handlers');

  await test('get_document_info', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    let filePath = 'Unsaved';
    try { const fp = await doc.filePath; filePath = fp ? (fp.nativePath || String(fp)) : 'Unsaved'; } catch(e) {}
    return { name: doc.name, filePath, pages: doc.pages.length, width: doc.documentPreferences.pageWidth, height: doc.documentPreferences.pageHeight };
  `));

  await test('get_document_layers', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const layers = [];
    for (let i = 0; i < doc.layers.length; i++) {
      const l = doc.layers.item(i);
      layers.push({ name: l.name, visible: l.visible, locked: l.locked });
    }
    return { count: layers.length, layers };
  `));

  await test('get_document_stories', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    return { storyCount: doc.stories.length };
  `));

  await test('get_document_styles (paragraph)', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const styles = [];
    for (let i = 0; i < Math.min(doc.paragraphStyles.length, 5); i++) {
      styles.push(doc.paragraphStyles.item(i).name);
    }
    return { total: doc.paragraphStyles.length, first5: styles };
  `));

  await test('get_document_colors', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const colors = [];
    for (let i = 0; i < Math.min(doc.colors.length, 5); i++) {
      colors.push(doc.colors.item(i).name);
    }
    return { total: doc.colors.length, first5: colors };
  `));

  await test('create_layer', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    try {
      const layer = doc.layers.add({ name: 'Test Layer ' + Date.now() });
      return { success: true, name: layer.name };
    } catch(e) { return { success: false, error: e.message }; }
  `));

  await test('find_text_in_document', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    try {
      app.findGrepPreferences = null;
      app.findGrepPreferences.findWhat = 'the';
      const found = doc.findGrep();
      app.findGrepPreferences = null;
      return { success: true, matches: found ? found.length : 0 };
    } catch(e) { return { success: false, error: e.message }; }
  `));

  // ── Page Handlers ──
  section('Page Handlers');

  await test('get_page_info', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const page = doc.pages.item(0);
    return {
      name: page.name,
      width: page.bounds[3] - page.bounds[1],
      height: page.bounds[2] - page.bounds[0],
      textFrames: page.textFrames.length,
      rectangles: page.rectangles.length
    };
  `));

  await test('add_page', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const before = doc.pages.length;
    try {
      doc.pages.add();
      return { success: true, pagesBefore: before, pagesAfter: doc.pages.length };
    } catch(e) { return { success: false, error: e.message }; }
  `));

  await test('get_page_content_summary', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const page = doc.pages.item(0);
    return {
      textFrames: page.textFrames.length,
      rectangles: page.rectangles.length,
      ovals: page.ovals.length,
      polygons: page.polygons.length,
      allPageItems: page.allPageItems.length
    };
  `));

  // ── Text Handlers ──
  section('Text Handlers');

  await test('create_text_frame', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const page = doc.pages.item(0);
    const frame = page.textFrames.add();
    frame.geometricBounds = [20, 20, 50, 150];
    frame.contents = 'Test frame ' + Date.now();
    try { frame.texts.item(0).pointSize = 14; } catch(e) {}
    return { success: true, id: frame.id, content: frame.contents.slice(0, 30) };
  `));

  await test('find_replace_text', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    try {
      app.findGrepPreferences = null;
      app.changeGrepPreferences = null;
      app.findGrepPreferences.findWhat = 'ZZZNOMATCH999';
      app.changeGrepPreferences.changeTo = 'ZZZNOMATCH999';
      const changed = doc.changeGrep();
      app.findGrepPreferences = null;
      app.changeGrepPreferences = null;
      return { success: true, changed: changed ? changed.length : 0 };
    } catch(e) { return { success: false, error: e.message }; }
  `));

  await test('create_table', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const page = doc.pages.item(0);
    try {
      const textFrame = page.textFrames.add();
      textFrame.geometricBounds = [60, 20, 120, 150];
      const table = textFrame.insertionPoints.item(0).tables.add({ bodyRowCount: 3, bodyColumnCount: 3 });
      return { success: true, rows: table.rows.length, cols: table.columns.length };
    } catch(e) { return { success: false, error: e.message }; }
  `));

  // ── Style Handlers ──
  section('Style Handlers');

  await test('list_paragraph_styles', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const styles = [];
    for (let i = 0; i < Math.min(doc.paragraphStyles.length, 8); i++) {
      const s = doc.paragraphStyles.item(i);
      styles.push({ name: s.name });
    }
    return { total: doc.paragraphStyles.length, styles };
  `));

  await test('list_character_styles', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const styles = [];
    for (let i = 0; i < Math.min(doc.characterStyles.length, 8); i++) {
      styles.push(doc.characterStyles.item(i).name);
    }
    return { total: doc.characterStyles.length, styles };
  `));

  await test('create_color_swatch', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const { ColorModel, ColorSpace } = require('indesign');
    try {
      const name = 'Test Red ' + Date.now();
      const color = doc.colors.add({
        name: name,
        model: ColorModel.process,
        space: ColorSpace.cmyk,
        colorValue: [0, 100, 100, 0]
      });
      return { success: true, name: color.name };
    } catch(e) { return { success: false, error: e.message }; }
  `));

  await test('list_object_styles', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const styles = [];
    for (let i = 0; i < Math.min(doc.objectStyles.length, 5); i++) {
      styles.push(doc.objectStyles.item(i).name);
    }
    return { total: doc.objectStyles.length, styles };
  `));

  // ── Graphics Handlers ──
  section('Graphics Handlers');

  await test('create_rectangle', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const page = doc.pages.item(0);
    try {
      const rect = page.rectangles.add();
      rect.geometricBounds = [130, 20, 160, 80];
      return { success: true, id: rect.id };
    } catch(e) { return { success: false, error: e.message }; }
  `));

  await test('create_ellipse', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const page = doc.pages.item(0);
    try {
      const oval = page.ovals.add();
      oval.geometricBounds = [165, 20, 195, 80];
      return { success: true, id: oval.id };
    } catch(e) { return { success: false, error: e.message }; }
  `));

  await test('list_page_items', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const page = doc.pages.item(0);
    const items = page.allPageItems;
    return { total: items.length };
  `));

  // ── Master Spreads ──
  section('Master Spread Handlers');

  await test('list_master_spreads', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const spreads = [];
    for (let i = 0; i < doc.masterSpreads.length; i++) {
      const ms = doc.masterSpreads.item(i);
      spreads.push({ name: ms.name, pageCount: ms.pages.length });
    }
    return { total: doc.masterSpreads.length, spreads };
  `));

  await test('get_master_spread_info', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    if (doc.masterSpreads.length === 0) return { error: 'No master spreads' };
    const ms = doc.masterSpreads.item(0);
    return { name: ms.name, pages: ms.pages.length, pageItems: ms.allPageItems.length };
  `));

  // ── Page Items ──
  section('Page Item Handlers');

  await test('list_page_items (detail)', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const page = doc.pages.item(0);
    const items = page.allPageItems;
    const summary = [];
    for (let i = 0; i < Math.min(items.length, 5); i++) {
      const item = items[i];
      const type = item.constructor?.name || 'Unknown';
      summary.push({ type, id: item.id });
    }
    return { total: items.length, first5: summary };
  `));

  // ── Group Handlers ──
  section('Group Handlers');

  await test('list_groups', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const page = doc.pages.item(0);
    const groups = [];
    const items = page.allPageItems;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (typeof item.pageItems !== 'undefined') {
        groups.push({ id: item.id, childCount: item.pageItems.length });
      }
    }
    return { groupCount: groups.length, groups };
  `));

  // ── Export Handlers ──
  section('Export Handlers');

  await test('export_pdf', async () => {
    const started = Date.now();
    const r = await uxp(`
    const { ExportFormat } = require('indesign');
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    try {
      const path = '/Users/jamescantwell/Desktop/uxp-all-handlers-test.pdf';
      // InDesign 2027: scripted exportFile(pdfType) crashes the app; the background export does not.
      const state = String(doc.asynchronousExportFile(ExportFormat.pdfType, path, false).waitForTask());
      if (state !== 'COMPLETED') return { success: false, error: 'task state ' + state };
      return { success: true, path };
    } catch(e) { return { success: false, error: e.message }; }
  `);
    if (!r?.success) throw new Error(r?.error || 'export failed');
    const { statSync } = await import('node:fs');
    const st = statSync(r.path);
    if (st.size === 0 || st.mtimeMs < started - 1000) throw new Error('no new PDF written');
    return { ...r, bytes: st.size };
  });

  // ── Utility Handlers ──
  section('Utility Handlers');

  await test('execute_indesign_code (passthrough)', () => uxp(`
    return { success: true, message: 'Execute passthrough works', docCount: app.documents.length };
  `));

  await test('validate_document', () => uxp(`
    if (app.documents.length === 0) return { error: 'No document open' };
    const doc = app.activeDocument;
    const issues = [];
    for (let i = 0; i < doc.pages.length; i++) {
      const page = doc.pages.item(i);
      const frames = page.textFrames;
      for (let j = 0; j < frames.length; j++) {
        const frame = frames.item(j);
        if (frame.overflows) issues.push({ page: i + 1, type: 'overflow', frameId: frame.id });
      }
    }
    return { success: true, issueCount: issues.length, issues };
  `));

  // Summary
  const total = passed + failed;
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
  if (failed === 0) console.log('All tests passed ✓');
  process.exitCode = failed === 0 ? 0 : 1;
}

run().catch(e => { console.error(e); process.exitCode = 1; });
