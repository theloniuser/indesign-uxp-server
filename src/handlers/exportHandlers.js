/**
 * Export handlers
 */
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
        const preset = presetMap[quality] || presetMap.PRINT;
        const pageRange = pages === 'all' ? 'All' : pages;

        const code = `
            const { ExportFormat } = require('indesign');
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            try {
                // L6: pageRange/bleed/marks live on app.pdfExportPreferences, not the
                // exportFile() call itself — must be set before every export or InDesign
                // silently reuses whatever range was last used (often just page 1).
                app.pdfExportPreferences.pageRange = ${JSON.stringify(pageRange)};
                app.pdfExportPreferences.useDocumentBleedWithPDF = ${JSON.stringify(includeBleed)};
                app.pdfExportPreferences.cropMarks = ${JSON.stringify(includeMarks)};
                await doc.exportFile(ExportFormat.pdfType, ${JSON.stringify(filePath)}, false, ${JSON.stringify(preset)});
                return { success: true, message: 'PDF exported to ' + ${JSON.stringify(filePath)}, pages: ${JSON.stringify(pageRange)} };
            } catch(e) {
                return { success: false, error: 'Export failed: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success ?
            formatResponse(result.message, "Export PDF") :
            formatErrorResponse(result?.error || 'Failed to export PDF', "Export PDF");
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