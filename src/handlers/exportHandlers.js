/**
 * Export handlers
 */
import { statSync } from 'node:fs';
import { isAbsolute, sep } from 'node:path';
import { ScriptExecutor } from '../core/scriptExecutor.js';
import { formatResponse, formatErrorResponse, escapeJsxString } from '../utils/stringUtils.js';

export class ExportHandlers {
    /**
     * Export document to PDF
     */
    static async exportPDF(args) {
        const {
            filePath,
            pages = 'all',
            quality = 'PRINT',
            includeBleed = false,
            includeMarks = false,
        } = args;

        // Built-in InDesign preset names guaranteed present across versions.
        const presetMap = {
            PRESS: '[Press Quality]',
            PRINT: '[High Quality Print]',
            SCREEN: '[Smallest File Size]',
            DIGITAL: '[High Quality Print]',
        };
        // Node (written-file check) and InDesign resolve relative paths differently.
        if (!isAbsolute(String(filePath || ''))) {
            return formatErrorResponse(`filePath must be absolute: ${filePath}`, "Export PDF");
        }
        const preset = presetMap[quality] || presetMap.PRINT;
        const pageRange = pages === 'all' ? 'All' : pages;

        const code = `
            const { ExportFormat } = require('indesign');
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const prefs = app.pdfExportPreferences;
            const presetObj = app.pdfExportPresets.itemByName(${JSON.stringify(preset)});
            if (!presetObj.isValid) {
                return { success: false, error: 'PDF preset not found: ' + ${JSON.stringify(preset)} };
            }
            // Copy the preset into the app prefs and export WITHOUT a preset argument:
            // a preset passed to the export overrides pageRange/bleed/marks (bleed was
            // silently dropped). The user's prefs are restored afterwards.
            const skip = { name: 1, parent: 1, index: 1, id: 1, isValid: 1, properties: 1,
                events: 1, eventListeners: 1 };
            const saved = {
                pageRange: prefs.pageRange,
                useDocumentBleedWithPDF: prefs.useDocumentBleedWithPDF,
                cropMarks: prefs.cropMarks,
            };
            const notCopied = [];
            try {
                for (const k of Object.keys(presetObj.properties)) {
                    if (skip[k]) continue;
                    const had = k in saved;
                    try { if (!had) saved[k] = prefs[k]; prefs[k] = presetObj[k]; }
                    catch (e) { if (!had) delete saved[k]; notCopied.push(k); }
                }
                // L6: pageRange/bleed/marks must be set before every export or InDesign
                // silently reuses whatever range was last used (often just page 1).
                prefs.pageRange = ${JSON.stringify(pageRange)};
                prefs.useDocumentBleedWithPDF = ${JSON.stringify(includeBleed)};
                prefs.cropMarks = ${JSON.stringify(includeMarks)};
                // InDesign 2027 (22.0) crashes (null deref after the PDF is written) on any
                // scripted doc.exportFile(pdfType). The background export does not.
                const task = doc.asynchronousExportFile(ExportFormat.pdfType, ${JSON.stringify(filePath)}, false);
                // waitForTask() takes no timeout and blocks until the task ends. In 22.0 it
                // returns 'COMPLETED' as a string; COMPLETED can include errors, but task.alerts
                // is unreadable once the task ends (error 30465), so alerts are best-effort.
                const state = String(task.waitForTask());
                let alerts = [];
                try { alerts = Array.from(task.alerts || []).map(String); } catch (e) {}
                if (state !== 'COMPLETED') {
                    return { success: false, error: 'Export did not complete (task state: ' + state + ')' };
                }
                if (alerts.length) {
                    return { success: false, error: 'Export finished with alerts: ' + alerts.join('; ') };
                }
                return { success: true, message: 'PDF exported to ' + ${JSON.stringify(filePath)}, pages: ${JSON.stringify(pageRange)}, presetPropsNotCopied: notCopied };
            } catch(e) {
                return { success: false, error: 'Export failed: ' + e.message };
            } finally {
                // Restore in reverse so dependent settings (PDF/X vs compatibility) unwind cleanly.
                for (const k of Object.keys(saved).reverse()) { try { prefs[k] = saved[k]; } catch (e) {} }
            }
        `;

        const started = Date.now();
        const result = await ScriptExecutor.executeViaUXP(code);
        if (!result?.success) {
            return formatErrorResponse(result?.error || 'Failed to export PDF', "Export PDF");
        }
        // COMPLETED can hide a failed export and task.alerts is unreadable afterwards, so confirm
        // the PDF was actually written by this call (1 s slack for filesystem mtime rounding).
        let st;
        try { st = statSync(filePath); } catch (e) { st = null; }
        if (!st || st.size === 0 || st.mtimeMs < started - 1000) {
            return formatErrorResponse(`InDesign reported success but no new PDF was written at ${filePath}`, "Export PDF");
        }
        return formatResponse(result.message, "Export PDF");
    }

    /**
     * Export pages as images
     */
    static async exportImages(args) {
        // The schema has always advertised outputPath/pages; the handler used to read
        // folderPath/pageRange, so every MCP call exported to "undefined". Accept both.
        const {
            outputPath,
            folderPath,
            format = 'JPEG',
            quality = 80,
            resolution = 300,
            pages,
            pageRange,
        } = args;
        const folder = outputPath ?? folderPath;
        const folderNoSep = String(folder ?? '').replace(/[\\/]+$/, '');
        const range = String(pages ?? pageRange ?? 'all').trim();
        const fmt = String(format).toUpperCase();

        if (!folder || !isAbsolute(String(folder))) {
            return formatErrorResponse(`outputPath must be an absolute folder path: ${folder}`, "Export Images");
        }
        if (!['JPEG', 'JPG', 'PNG'].includes(fmt)) {
            return formatErrorResponse(`Unsupported format: ${format}. InDesign exports pages as JPEG or PNG.`, "Export Images");
        }
        let positions = null; // 1-based page positions; null = all pages
        if (range.toLowerCase() !== 'all') {
            positions = [];
            for (const part of range.split(',').map(s => s.trim()).filter(Boolean)) {
                const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
                const a = m && parseInt(m[1], 10);
                const b = m && (m[2] ? parseInt(m[2], 10) : a);
                if (!m || a < 1 || b < a) {
                    return formatErrorResponse(
                        `Invalid page range "${part}": use 1-based positions like "1,3,5-7" or "all"`,
                        "Export Images"
                    );
                }
                for (let n = a; n <= b; n++) if (!positions.includes(n)) positions.push(n);
            }
            if (positions.length === 0) {
                return formatErrorResponse('Page range is empty', "Export Images");
            }
        }
        const isPng = fmt === 'PNG';
        const ext = isPng ? 'png' : 'jpg';
        // 1-100 quality mapped onto InDesign's four quality steps.
        const q = Number(quality);
        const qualityStep = q <= 25 ? 'LOW' : q <= 50 ? 'MEDIUM' : q <= 80 ? 'HIGH' : 'MAXIMUM';

        const code = `
            const ID = require('indesign');
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const isPng = ${JSON.stringify(isPng)};
            // Page.exportFile does not exist in UXP: export the document with a one-page range.
            const exportFormat = isPng
                ? (ID.ExportFormat.PNG_FORMAT ?? ID.ExportFormat.pngType)
                : (ID.ExportFormat.JPG ?? ID.ExportFormat.jpegType);
            const prefs = isPng ? app.pngExportPreferences : app.jpegExportPreferences;
            const rangeKey = isPng ? 'pngExportRange' : 'jpegExportRange';
            const qualityKey = isPng ? 'pngQuality' : 'jpegQuality';
            const qualityEnum = isPng ? ID.PNGQualityEnum : ID.JPEGOptionsQuality;
            const total = doc.pages.length;
            const wanted = ${JSON.stringify(positions)} || Array.from({ length: total }, (_, i) => i + 1);
            const outOfRange = wanted.filter(n => n > total);
            if (outOfRange.length) {
                return { success: false, error: 'Pages out of range (document has ' + total + ' pages): ' + outOfRange.join(', ') };
            }
            const saved = {};
            for (const k of [rangeKey, 'pageString', 'exportResolution', qualityKey]) {
                try { saved[k] = prefs[k]; } catch (e) {}
            }
            const files = [];
            try {
                prefs[rangeKey] = ID.ExportRangeOrAllPages.EXPORT_RANGE;
                prefs.exportResolution = ${JSON.stringify(Number(resolution))};
                try { prefs[qualityKey] = qualityEnum[${JSON.stringify(qualityStep)}]; } catch (e) {}
                for (const n of wanted) {
                    const page = doc.pages.item(n - 1);
                    // "+n" addresses the absolute position, independent of section numbering.
                    prefs.pageString = '+' + n;
                    const file = ${JSON.stringify(folderNoSep)} + ${JSON.stringify(sep)} + 'page_' + n + '.' + ${JSON.stringify(ext)};
                    await doc.exportFile(exportFormat, file, false);
                    files.push({ position: n, name: page.name, file });
                }
                return { success: true, files };
            } catch (e) {
                return { success: false, error: 'Error exporting images: ' + e.message, exported: files };
            } finally {
                for (const k of Object.keys(saved)) { try { prefs[k] = saved[k]; } catch (e) {} }
            }
        `;

        const started = Date.now();
        const result = await ScriptExecutor.executeViaUXP(code);
        if (!result?.success) {
            return formatErrorResponse(result?.error || 'Failed to export images', "Export Images");
        }
        // Confirm each file was written by this call, as export_pdf does.
        const missing = result.files.filter(f => {
            try {
                const st = statSync(f.file);
                return st.size === 0 || st.mtimeMs < started - 1000;
            } catch (e) {
                return true;
            }
        });
        if (missing.length) {
            return formatErrorResponse(
                `InDesign reported success but these images were not written: ${missing.map(f => f.file).join(', ')}`,
                "Export Images"
            );
        }
        return formatResponse({
            message: `${result.files.length} page(s) exported as ${isPng ? 'PNG' : 'JPEG'} to ${folder}`,
            files: result.files,
        }, "Export Images");
    }

    /**
     * Package document for printing
     */
    static async packageDocument(args) {
        // The schema name is outputPath; folderPath is still accepted for older callers.
        const { outputPath, includeFonts = true, includeLinks = true, includeProfiles = true } = args;
        const folderPath = outputPath ?? args.folderPath;
        if (!folderPath || !isAbsolute(String(folderPath))) {
            return formatErrorResponse(`outputPath must be an absolute folder path: ${folderPath}`, "Package Document");
        }

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;

            try {
                // to, copyingFonts, copyingLinkedGraphics, copyingProfiles, updatingGraphics,
                // includingHiddenLayers, ignorePreflightErrors, creatingReport (required in UXP)
                await doc.packageForPrint(
                    ${JSON.stringify(folderPath)},
                    ${!!includeFonts},
                    ${!!includeLinks},
                    ${!!includeProfiles},
                    false,
                    false,
                    true,
                    false
                );
                return { success: true };
            } catch(e) {
                return { success: false, error: 'Error packaging document: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success ?
            formatResponse(`Document packaged successfully to: ${folderPath}`, "Package Document") :
            formatErrorResponse(result?.error || 'Failed to package document', "Package Document");
    }
} 