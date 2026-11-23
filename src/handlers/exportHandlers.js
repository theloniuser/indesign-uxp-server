/**
 * Export handlers
 */
import { statSync } from 'node:fs';
import { isAbsolute } from 'node:path';
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
        const {
            folderPath,
            format = 'JPEG',
            quality = 80,
            resolution = 300,
            pageRange = 'all'
        } = args;

        const formatLower = format.toLowerCase();

        // M4: validate pageRange entries before sending to UXP — invalid entries were
        // silently skipped, returning a count lower than expected with no error reported
        if (pageRange !== 'all') {
            const entries = pageRange.split(',');
            const invalid = entries.filter(p => {
                const n = parseInt(p.trim(), 10);
                return isNaN(n) || n < 1;
            });
            if (invalid.length > 0) {
                return formatErrorResponse(
                    `Invalid page range entries (must be positive integers): ${invalid.join(', ')}`,
                    "Export Images"
                );
            }
        }

        const code = `
            const { ExportFormat } = require('indesign');
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const folder = ${JSON.stringify(folderPath)};

            try {
                const formatStr = ${JSON.stringify(format)};
                let exportFormat;
                if (formatStr === 'JPEG') {
                    exportFormat = ExportFormat.jpegType;
                } else if (formatStr === 'PNG') {
                    exportFormat = ExportFormat.pngType;
                } else if (formatStr === 'TIFF') {
                    exportFormat = ExportFormat.tiffType;
                } else {
                    exportFormat = ExportFormat.jpegType;
                }

                const ext = ${JSON.stringify(formatLower)};
                const pageRangeStr = ${JSON.stringify(pageRange)};
                let exportedCount = 0;

                if (pageRangeStr !== 'all') {
                    const pages = pageRangeStr.split(',');
                    for (let i = 0; i < pages.length; i++) {
                        const pageNum = parseInt(pages[i]) - 1;
                        if (pageNum >= 0 && pageNum < doc.pages.length) {
                            const fileName = folder + '/page_' + (pageNum + 1) + '.' + ext;
                            await doc.pages.item(pageNum).exportFile(exportFormat, fileName, false);
                            exportedCount++;
                        }
                    }
                } else {
                    for (let i = 0; i < doc.pages.length; i++) {
                        const fileName = folder + '/page_' + (i + 1) + '.' + ext;
                        await doc.pages.item(i).exportFile(exportFormat, fileName, false);
                        exportedCount++;
                    }
                }

                return { success: true, count: exportedCount };
            } catch(e) {
                return { success: false, error: 'Error exporting images: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success ?
            formatResponse(`${result.count} pages exported as ${format} images to: ${folderPath}`, "Export Images") :
            formatErrorResponse(result?.error || 'Failed to export images', "Export Images");
    }

    /**
     * Package document for printing
     */
    static async packageDocument(args) {
        const { folderPath, includeFonts = true, includeLinks = true, includeProfiles = true } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;

            try {
                doc.packageForPrint(
                    ${JSON.stringify(folderPath)},
                    ${includeFonts},
                    ${includeLinks},
                    ${includeProfiles},
                    false,
                    false,
                    true
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