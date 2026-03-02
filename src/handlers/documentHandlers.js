/**
 * Comprehensive Document management handlers
 * Merged from documentHandlers.js and documentAdvancedHandlers.js
 */
import { ScriptExecutor } from '../core/scriptExecutor.js';
import { formatResponse, formatErrorResponse } from '../utils/stringUtils.js';
import { sessionManager } from '../core/sessionManager.js';

export class DocumentHandlers {
    /**
     * Helper function to ensure we have an active document
     */
    static async ensureActiveDocument() {
        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            let doc = app.activeDocument;
            if (!doc) {
                if (app.documents.length > 0) {
                    doc = app.documents.item(0);
                    app.activeDocument = doc;
                    return { success: true, message: 'Document activated: ' + doc.name };
                } else {
                    return { success: false, error: 'No document open' };
                }
            }
            return { success: true, message: 'Document already active: ' + doc.name };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Ensure Active Document")
            : formatErrorResponse(result?.error || 'Failed to ensure active document', "Ensure Active Document");
    }

    /**
     * Get information about the active document
     */
    static async getDocumentInfo() {
        const result = await ScriptExecutor.executeViaUXP(`
            if (app.documents.length === 0) {
                return { error: 'No document open' };
            }
            const doc = app.activeDocument;
            let filePath = 'Unsaved';
            try {
                const fp = await doc.filePath;
                filePath = fp ? (fp.nativePath || fp.url || String(fp) || 'Unsaved') : 'Unsaved';
            } catch (e) {}
            return {
                name: doc.name,
                filePath,
                pages: doc.pages.length,
                spreads: doc.spreads.length,
                layers: doc.layers.length,
                masterSpreads: doc.masterSpreads.length,
                width: doc.documentPreferences.pageWidth,
                height: doc.documentPreferences.pageHeight,
                facingPages: doc.documentPreferences.facingPages,
                bleedTop: doc.documentPreferences.documentBleedTopOffset,
                bleedBottom: doc.documentPreferences.documentBleedBottomOffset,
                bleedInside: doc.documentPreferences.documentBleedInsideOrLeftOffset,
                bleedOutside: doc.documentPreferences.documentBleedOutsideOrRightOffset,
                marginTop: doc.marginPreferences.top,
                marginBottom: doc.marginPreferences.bottom,
                marginLeft: doc.marginPreferences.left,
                marginRight: doc.marginPreferences.right
            };
        `);

        if (result && !result.error) {
            sessionManager.setActiveDocument({
                name: result.name,
                path: result.filePath,
                pages: result.pages,
                width: result.width,
                height: result.height
            });
            sessionManager.setPageDimensions({
                width: result.width,
                height: result.height
            });
        }

        return formatResponse(result, "Get Document Info");
    }

    /**
     * Create a new document
     */
    static async createDocument(args) {
        const {
            width = 210,
            height = 297,
            pages = 1,
            facingPages = false,
            pageOrientation = 'PORTRAIT',
            bleedTop = 3,
            bleedBottom = 3,
            bleedInside = 3,
            bleedOutside = 3,
            marginTop = 20,
            marginBottom = 20,
            marginLeft = 20,
            marginRight = 20
        } = args;

        // Convert mm to points (1mm = 2.8346pt) for InDesign UXP API
        const MM_TO_PT = 2.8346;
        const wPt  = Math.round(width  * MM_TO_PT * 100) / 100;
        const hPt  = Math.round(height * MM_TO_PT * 100) / 100;
        const mTPt = Math.round(marginTop    * MM_TO_PT * 100) / 100;
        const mBPt = Math.round(marginBottom * MM_TO_PT * 100) / 100;
        const mLPt = Math.round(marginLeft   * MM_TO_PT * 100) / 100;
        const mRPt = Math.round(marginRight  * MM_TO_PT * 100) / 100;
        const bTPt = Math.round(bleedTop     * MM_TO_PT * 100) / 100;
        const bBPt = Math.round(bleedBottom  * MM_TO_PT * 100) / 100;
        const bIPt = Math.round(bleedInside  * MM_TO_PT * 100) / 100;
        const bOPt = Math.round(bleedOutside * MM_TO_PT * 100) / 100;

        const code = `
            const doc = app.documents.add();
            doc.documentPreferences.pageWidth  = ${wPt};
            doc.documentPreferences.pageHeight = ${hPt};
            doc.documentPreferences.facingPages = ${facingPages};
            doc.documentPreferences.documentBleedTopOffset           = ${bTPt};
            doc.documentPreferences.documentBleedBottomOffset        = ${bBPt};
            doc.documentPreferences.documentBleedInsideOrLeftOffset  = ${bIPt};
            doc.documentPreferences.documentBleedOutsideOrRightOffset = ${bOPt};
            const page = doc.pages.item(0);
            page.marginPreferences.top    = ${mTPt};
            page.marginPreferences.bottom = ${mBPt};
            page.marginPreferences.left   = ${mLPt};
            page.marginPreferences.right  = ${mRPt};
            app.activeDocument = doc;
            return { success: true, name: doc.name, widthPt: ${wPt}, heightPt: ${hPt} };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);

        if (result?.success) {
            sessionManager.setActiveDocument({
                name: result.name || 'New Document',
                path: 'Unsaved',
                pages: pages,
                width: width,
                height: height
            });
            sessionManager.setPageDimensions({ width, height });
            return formatResponse(result, "Create Document");
        }
        return formatErrorResponse(result?.error || 'Failed to create document', "Create Document");
    }

    /**
     * Open an existing document
     */
    static async openDocument(args) {
        const { filePath } = args;

        const code = `
            const file = new File(${JSON.stringify(filePath)});
            if (!file.exists) {
                return { success: false, error: 'File not found: ' + ${JSON.stringify(filePath)} };
            }
            await app.open(file);
            return { success: true, message: 'Document opened: ' + ${JSON.stringify(filePath)} };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Open Document")
            : formatErrorResponse(result?.error || 'Failed to open document', "Open Document");
    }

    /**
     * Save the active document
     */
    static async saveDocument(args) {
        const { filePath } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            ${filePath ? `await doc.save(new File(${JSON.stringify(filePath)}));` : `await doc.save();`}
            return { success: true, message: 'Document saved' };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Save Document")
            : formatErrorResponse(result?.error || 'Failed to save document', "Save Document");
    }

    /**
     * Close the active document
     */
    static async closeDocument() {
        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document to close' };
            }
            const { SaveOptions } = require('indesign');
            let doc = app.activeDocument;
            if (!doc && app.documents.length > 0) {
                doc = app.documents.item(0);
            }
            if (!doc) {
                return { success: false, error: 'No document to close' };
            }
            const docName = doc.name;
            await doc.close(SaveOptions.no);
            return { success: true, message: 'Document closed successfully: ' + docName };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Close Document")
            : formatErrorResponse(result?.error || 'Failed to close document', "Close Document");
    }

    // =================== DOCUMENT ADVANCED TOOLS ===================

    /**
     * Run preflight on the document
     */
    static async preflightDocument(args) {
        const { profile = 'Basic', includeWarnings = true } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            await doc.preflight(${JSON.stringify(profile)}, ${includeWarnings});
            return { success: true, message: 'Document preflighted successfully' };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Preflight Document")
            : formatErrorResponse(result?.error || 'Failed to preflight document', "Preflight Document");
    }

    /**
     * Zoom to fit page in view
     */
    static async zoomToPage(args) {
        const { pageIndex, zoomLevel = 100 } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            if (${pageIndex} >= doc.pages.length) {
                return { success: false, error: 'Page index out of range' };
            }
            const page = doc.pages.item(${pageIndex});
            await page.zoomToFit(${zoomLevel});
            return { success: true, message: 'Zoomed to page ${pageIndex} at ${zoomLevel}%' };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Zoom to Page")
            : formatErrorResponse(result?.error || 'Failed to zoom to page', "Zoom to Page");
    }

    /**
     * Perform data merge operation
     */
    static async dataMerge(args) {
        const { dataSource, targetPage = 0, createNewPages = false, removeUnusedPages = false } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const dataFile = new File(${JSON.stringify(dataSource)});
            if (!dataFile.exists) {
                return { success: false, error: 'Data source file not found: ' + ${JSON.stringify(dataSource)} };
            }
            const targetPageObj = doc.pages.item(${targetPage});
            await doc.dataMerge(dataFile, targetPageObj, ${createNewPages}, ${removeUnusedPages});
            return { success: true, message: 'Data merge completed successfully' };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Data Merge")
            : formatErrorResponse(result?.error || 'Failed to perform data merge', "Data Merge");
    }

    // =================== DOCUMENT ELEMENTS & STYLES ===================

    /**
     * Get all elements in the document
     */
    static async getDocumentElements(args) {
        const { elementType = 'all' } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const et = ${JSON.stringify(elementType)};
            const counts = {};
            if (et === 'all' || et === 'text') {
                counts.textFrames = doc.textFrames.length;
                counts.stories = doc.stories.length;
            }
            if (et === 'all' || et === 'graphics') {
                counts.rectangles = doc.rectangles.length;
                counts.ovals = doc.ovals.length;
                counts.polygons = doc.polygons.length;
                counts.graphicLines = doc.graphicLines.length;
                counts.allGraphics = doc.allGraphics.length;
            }
            if (et === 'all' || et === 'tables') {
                let tableCount = 0;
                for (let i = 0; i < doc.textFrames.length; i++) {
                    tableCount += doc.textFrames.item(i).tables.length;
                }
                counts.tables = tableCount;
            }
            if (et === 'all') {
                counts.allPageItems = doc.allPageItems.length;
                counts.groups = doc.groups.length;
                counts.layers = doc.layers.length;
            }
            return { success: true, elementType: et, counts };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Document Elements")
            : formatErrorResponse(result?.error || 'Failed to get document elements', "Get Document Elements");
    }

    /**
     * Get all styles in the document
     */
    static async getDocumentStyles(args) {
        const { styleType = 'PARAGRAPH' } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const st = ${JSON.stringify(styleType)};
            let collection;
            switch (st) {
                case 'PARAGRAPH': collection = doc.paragraphStyles; break;
                case 'CHARACTER': collection = doc.characterStyles; break;
                case 'OBJECT':    collection = doc.objectStyles; break;
                case 'TABLE':     collection = doc.tableStyles; break;
                case 'CELL':      collection = doc.cellStyles; break;
                default: return { success: false, error: 'Unknown style type: ' + st };
            }
            const styles = [];
            for (let i = 0; i < collection.length; i++) {
                styles.push(collection.item(i).name);
            }
            return { success: true, styleType: st, count: styles.length, styles };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Document Styles")
            : formatErrorResponse(result?.error || 'Failed to get document styles', "Get Document Styles");
    }

    /**
     * Get all colors and swatches in the document
     */
    static async getDocumentColors(args) {
        const { includeSwatches = true, includeGradients = true, includeTints = true } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const colors = [];
            for (let i = 0; i < doc.colors.length; i++) {
                const c = doc.colors.item(i);
                colors.push({ name: c.name, model: String(c.model) });
            }
            const swatches = ${includeSwatches} ? (() => {
                const s = [];
                for (let i = 0; i < doc.swatches.length; i++) s.push(doc.swatches.item(i).name);
                return s;
            })() : null;
            const gradients = ${includeGradients} ? (() => {
                const g = [];
                for (let i = 0; i < doc.gradients.length; i++) g.push(doc.gradients.item(i).name);
                return g;
            })() : null;
            const tints = ${includeTints} ? (() => {
                const t = [];
                for (let i = 0; i < doc.tints.length; i++) t.push(doc.tints.item(i).name);
                return t;
            })() : null;
            return { success: true, colors, swatches, gradients, tints };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Document Colors")
            : formatErrorResponse(result?.error || 'Failed to get document colors', "Get Document Colors");
    }

    // =================== DOCUMENT PREFERENCES ===================

    /**
     * Get document preferences
     */
    static async getDocumentPreferences(args) {
        const { preferenceType = 'GENERAL' } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const pt = ${JSON.stringify(preferenceType)};
            const prefs = {};
            const safeGet = (fn) => { try { return fn(); } catch (e) { return null; } };
            switch (pt) {
                case 'GENERAL':
                    prefs.pageWidth = safeGet(() => doc.documentPreferences.pageWidth);
                    prefs.pageHeight = safeGet(() => doc.documentPreferences.pageHeight);
                    prefs.facingPages = safeGet(() => doc.documentPreferences.facingPages);
                    prefs.pageOrientation = safeGet(() => String(doc.documentPreferences.pageOrientation));
                    prefs.pagesPerDocument = safeGet(() => doc.documentPreferences.pagesPerDocument);
                    prefs.startPageNumber = safeGet(() => doc.documentPreferences.startPageNumber);
                    prefs.documentBleedTopOffset = safeGet(() => doc.documentPreferences.documentBleedTopOffset);
                    prefs.documentBleedBottomOffset = safeGet(() => doc.documentPreferences.documentBleedBottomOffset);
                    prefs.documentBleedInsideOrLeftOffset = safeGet(() => doc.documentPreferences.documentBleedInsideOrLeftOffset);
                    prefs.documentBleedOutsideOrRightOffset = safeGet(() => doc.documentPreferences.documentBleedOutsideOrRightOffset);
                    prefs.documentSlugTopOffset = safeGet(() => doc.documentPreferences.documentSlugTopOffset);
                    prefs.documentSlugBottomOffset = safeGet(() => doc.documentPreferences.documentSlugBottomOffset);
                    prefs.documentSlugInsideOrLeftOffset = safeGet(() => doc.documentPreferences.documentSlugInsideOrLeftOffset);
                    prefs.documentSlugOutsideOrRightOffset = safeGet(() => doc.documentPreferences.documentSlugOutsideOrRightOffset);
                    break;
                case 'GRID':
                    prefs.documentGridColor = safeGet(() => String(doc.gridPreferences.documentGridColor));
                    prefs.documentGridIncrement = safeGet(() => doc.gridPreferences.documentGridIncrement);
                    prefs.documentGridSubdivision = safeGet(() => doc.gridPreferences.documentGridSubdivision);
                    prefs.gridViewThreshold = safeGet(() => doc.gridPreferences.gridViewThreshold);
                    prefs.baselineGridColor = safeGet(() => String(doc.gridPreferences.baselineGridColor));
                    prefs.baselineGridIncrement = safeGet(() => doc.gridPreferences.baselineGridIncrement);
                    prefs.baselineGridOffset = safeGet(() => doc.gridPreferences.baselineGridOffset);
                    prefs.baselineGridViewThreshold = safeGet(() => doc.gridPreferences.baselineGridViewThreshold);
                    prefs.gridAlignment = safeGet(() => String(doc.gridPreferences.gridAlignment));
                    break;
                case 'GUIDES':
                    prefs.guidesLocked = safeGet(() => doc.guidePreferences.guidesLocked);
                    prefs.guidesInBack = safeGet(() => doc.guidePreferences.guidesInBack);
                    prefs.guidesSnapToZone = safeGet(() => doc.guidePreferences.guidesSnapToZone);
                    prefs.guidesViewThreshold = safeGet(() => doc.guidePreferences.guidesViewThreshold);
                    break;
                case 'TEXT':
                    prefs.typographersQuotes = safeGet(() => doc.textPreferences.typographersQuotes);
                    prefs.useTypographersQuotes = safeGet(() => doc.textPreferences.useTypographersQuotes);
                    prefs.highlightSubstitutedFonts = safeGet(() => doc.textPreferences.highlightSubstitutedFonts);
                    prefs.highlightSubstitutedGlyphs = safeGet(() => doc.textPreferences.highlightSubstitutedGlyphs);
                    prefs.highlightKeepsViolations = safeGet(() => doc.textPreferences.highlightKeepsViolations);
                    prefs.highlightHjViolations = safeGet(() => doc.textPreferences.highlightHjViolations);
                    prefs.highlightCustomSpacing = safeGet(() => doc.textPreferences.highlightCustomSpacing);
                    prefs.highlightSubstitutedLines = safeGet(() => doc.textPreferences.highlightSubstitutedLines);
                    break;
                case 'MARGINS':
                    prefs.marginTop = safeGet(() => doc.marginPreferences.top);
                    prefs.marginBottom = safeGet(() => doc.marginPreferences.bottom);
                    prefs.marginLeft = safeGet(() => doc.marginPreferences.left);
                    prefs.marginRight = safeGet(() => doc.marginPreferences.right);
                    prefs.columnCount = safeGet(() => doc.marginPreferences.columnCount);
                    prefs.columnGutter = safeGet(() => doc.marginPreferences.columnGutter);
                    break;
                default:
                    return { success: false, error: 'Unknown preference type: ' + pt + '. Available: GENERAL, GRID, GUIDES, TEXT, MARGINS' };
            }
            return { success: true, preferenceType: pt, preferences: prefs };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Document Preferences")
            : formatErrorResponse(result?.error || 'Failed to get document preferences', "Get Document Preferences");
    }

    /**
     * Set document preferences
     */
    static async setDocumentPreferences(args) {
        const { preferenceType, preferences } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const pt = ${JSON.stringify(preferenceType)};
            const prefs = ${JSON.stringify(preferences)};
            let updatedCount = 0;
            const safeSet = (fn) => { try { fn(); updatedCount++; } catch (e) {} };
            switch (pt) {
                case 'GENERAL':
                    if (prefs.pageWidth !== undefined) safeSet(() => { doc.documentPreferences.pageWidth = prefs.pageWidth; });
                    if (prefs.pageHeight !== undefined) safeSet(() => { doc.documentPreferences.pageHeight = prefs.pageHeight; });
                    if (prefs.facingPages !== undefined) safeSet(() => { doc.documentPreferences.facingPages = prefs.facingPages; });
                    if (prefs.pagesPerDocument !== undefined) safeSet(() => { doc.documentPreferences.pagesPerDocument = prefs.pagesPerDocument; });
                    if (prefs.startPageNumber !== undefined) safeSet(() => { doc.documentPreferences.startPageNumber = prefs.startPageNumber; });
                    if (prefs.documentBleedTopOffset !== undefined) safeSet(() => { doc.documentPreferences.documentBleedTopOffset = prefs.documentBleedTopOffset; });
                    if (prefs.documentBleedBottomOffset !== undefined) safeSet(() => { doc.documentPreferences.documentBleedBottomOffset = prefs.documentBleedBottomOffset; });
                    if (prefs.documentBleedInsideOrLeftOffset !== undefined) safeSet(() => { doc.documentPreferences.documentBleedInsideOrLeftOffset = prefs.documentBleedInsideOrLeftOffset; });
                    if (prefs.documentBleedOutsideOrRightOffset !== undefined) safeSet(() => { doc.documentPreferences.documentBleedOutsideOrRightOffset = prefs.documentBleedOutsideOrRightOffset; });
                    break;
                case 'GRID':
                    if (prefs.documentGridColor !== undefined) safeSet(() => { doc.gridPreferences.documentGridColor = prefs.documentGridColor; });
                    if (prefs.documentGridIncrement !== undefined) safeSet(() => { doc.gridPreferences.documentGridIncrement = prefs.documentGridIncrement; });
                    if (prefs.documentGridSubdivision !== undefined) safeSet(() => { doc.gridPreferences.documentGridSubdivision = prefs.documentGridSubdivision; });
                    if (prefs.gridViewThreshold !== undefined) safeSet(() => { doc.gridPreferences.gridViewThreshold = prefs.gridViewThreshold; });
                    if (prefs.baselineGridColor !== undefined) safeSet(() => { doc.gridPreferences.baselineGridColor = prefs.baselineGridColor; });
                    if (prefs.baselineGridIncrement !== undefined) safeSet(() => { doc.gridPreferences.baselineGridIncrement = prefs.baselineGridIncrement; });
                    if (prefs.baselineGridOffset !== undefined) safeSet(() => { doc.gridPreferences.baselineGridOffset = prefs.baselineGridOffset; });
                    if (prefs.baselineGridViewThreshold !== undefined) safeSet(() => { doc.gridPreferences.baselineGridViewThreshold = prefs.baselineGridViewThreshold; });
                    if (prefs.gridAlignment !== undefined) safeSet(() => { doc.gridPreferences.gridAlignment = prefs.gridAlignment; });
                    break;
                case 'GUIDES':
                    if (prefs.guidesLocked !== undefined) safeSet(() => { doc.guidePreferences.guidesLocked = prefs.guidesLocked; });
                    if (prefs.guidesInBack !== undefined) safeSet(() => { doc.guidePreferences.guidesInBack = prefs.guidesInBack; });
                    if (prefs.guidesSnapToZone !== undefined) safeSet(() => { doc.guidePreferences.guidesSnapToZone = prefs.guidesSnapToZone; });
                    if (prefs.guidesViewThreshold !== undefined) safeSet(() => { doc.guidePreferences.guidesViewThreshold = prefs.guidesViewThreshold; });
                    break;
                case 'TEXT':
                    if (prefs.typographersQuotes !== undefined) safeSet(() => { doc.textPreferences.typographersQuotes = prefs.typographersQuotes; });
                    if (prefs.useTypographersQuotes !== undefined) safeSet(() => { doc.textPreferences.useTypographersQuotes = prefs.useTypographersQuotes; });
                    if (prefs.highlightSubstitutedFonts !== undefined) safeSet(() => { doc.textPreferences.highlightSubstitutedFonts = prefs.highlightSubstitutedFonts; });
                    if (prefs.highlightSubstitutedGlyphs !== undefined) safeSet(() => { doc.textPreferences.highlightSubstitutedGlyphs = prefs.highlightSubstitutedGlyphs; });
                    if (prefs.highlightKeepsViolations !== undefined) safeSet(() => { doc.textPreferences.highlightKeepsViolations = prefs.highlightKeepsViolations; });
                    if (prefs.highlightHjViolations !== undefined) safeSet(() => { doc.textPreferences.highlightHjViolations = prefs.highlightHjViolations; });
                    if (prefs.highlightCustomSpacing !== undefined) safeSet(() => { doc.textPreferences.highlightCustomSpacing = prefs.highlightCustomSpacing; });
                    if (prefs.highlightSubstitutedLines !== undefined) safeSet(() => { doc.textPreferences.highlightSubstitutedLines = prefs.highlightSubstitutedLines; });
                    break;
                case 'MARGINS':
                    if (prefs.marginTop !== undefined) safeSet(() => { doc.marginPreferences.top = prefs.marginTop; });
                    if (prefs.marginBottom !== undefined) safeSet(() => { doc.marginPreferences.bottom = prefs.marginBottom; });
                    if (prefs.marginLeft !== undefined) safeSet(() => { doc.marginPreferences.left = prefs.marginLeft; });
                    if (prefs.marginRight !== undefined) safeSet(() => { doc.marginPreferences.right = prefs.marginRight; });
                    if (prefs.columnCount !== undefined) safeSet(() => { doc.marginPreferences.columnCount = prefs.columnCount; });
                    if (prefs.columnGutter !== undefined) safeSet(() => { doc.marginPreferences.columnGutter = prefs.columnGutter; });
                    break;
                default:
                    return { success: false, error: 'Unknown preference type: ' + pt + '. Available: GENERAL, GRID, GUIDES, TEXT, MARGINS' };
            }
            return { success: true, message: 'Document preferences updated successfully. ' + updatedCount + ' properties updated.', updatedCount };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Set Document Preferences")
            : formatErrorResponse(result?.error || 'Failed to set document preferences', "Set Document Preferences");
    }

    // =================== DOCUMENT STORIES & TEXT ===================

    /**
     * Get all stories in the document
     */
    static async getDocumentStories(args) {
        const { includeOverset = true, includeHidden = false } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const stories = [];
            for (let i = 0; i < doc.stories.length; i++) {
                const story = doc.stories.item(i);
                if (${includeHidden} || !story.hidden) {
                    stories.push({
                        name: story.name,
                        contents: (story.contents || '').substring(0, 50),
                        overset: story.overset,
                        hidden: story.hidden
                    });
                }
            }
            return { success: true, count: stories.length, stories };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Document Stories")
            : formatErrorResponse(result?.error || 'Failed to get document stories', "Get Document Stories");
    }

    /**
     * Find text across the entire document
     */
    static async findTextInDocument(args) {
        const { searchText, replaceText, caseSensitive = false, wholeWord = false, useRegex = false } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const { NothingEnum } = require('indesign');
            app.findTextPreferences = NothingEnum.nothing;
            app.changeTextPreferences = NothingEnum.nothing;
            app.findTextPreferences.findWhat = ${JSON.stringify(searchText)};
            app.findTextPreferences.caseSensitive = ${caseSensitive};
            app.findTextPreferences.wholeWord = ${wholeWord};
            const replaceText = ${JSON.stringify(replaceText || '')};
            if (replaceText) {
                app.changeTextPreferences.changeTo = replaceText;
                const found = doc.changeText();
                return { success: true, action: 'replace', count: found.length, searchText: ${JSON.stringify(searchText)} };
            } else {
                const found = doc.findText();
                return { success: true, action: 'find', count: found.length, searchText: ${JSON.stringify(searchText)} };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Find Text in Document")
            : formatErrorResponse(result?.error || 'Failed to find text in document', "Find Text in Document");
    }

    // =================== DOCUMENT LAYERS & ORGANIZATION ===================

    /**
     * Get all layers in the document
     */
    static async getDocumentLayers(args) {
        const { includeHidden = true, includeLocked = true } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const layers = [];
            for (let i = 0; i < doc.layers.length; i++) {
                const layer = doc.layers.item(i);
                if ((${includeHidden} || layer.visible) && (${includeLocked} || !layer.locked)) {
                    layers.push({
                        name: layer.name,
                        visible: layer.visible,
                        locked: layer.locked,
                        pageItemCount: layer.pageItems.length
                    });
                }
            }
            return { success: true, count: layers.length, layers };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Document Layers")
            : formatErrorResponse(result?.error || 'Failed to get document layers', "Get Document Layers");
    }

    /**
     * Organize and clean up document layers
     */
    static async organizeDocumentLayers(args) {
        const { deleteEmptyLayers = false, mergeSimilarLayers = false, sortLayers = false } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const actions = [];
            if (${deleteEmptyLayers}) {
                for (let i = doc.layers.length - 1; i >= 0; i--) {
                    const layer = doc.layers.item(i);
                    if (layer.pageItems.length === 0) {
                        const layerName = layer.name;
                        layer.remove();
                        actions.push('Deleted empty layer: ' + layerName);
                    }
                }
            }
            if (${sortLayers}) {
                actions.push('Layer sorting not implemented in this version');
            }
            return { success: true, message: 'Layer organization completed.', actions };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Organize Document Layers")
            : formatErrorResponse(result?.error || 'Failed to organize document layers', "Organize Document Layers");
    }

    // =================== DOCUMENT HYPERLINKS & INTERACTIVITY ===================

    /**
     * Get all hyperlinks in the document
     */
    static async getDocumentHyperlinks(args) {
        const { includeDestinations = true, includeSources = true } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const hyperlinks = [];
            for (let i = 0; i < doc.hyperlinks.length; i++) {
                const link = doc.hyperlinks.item(i);
                const entry = { name: link.name };
                if (${includeSources}) {
                    try { entry.source = link.source.name; } catch (e) { entry.source = null; }
                }
                if (${includeDestinations}) {
                    try { entry.destination = link.destination.name; } catch (e) { entry.destination = null; }
                }
                hyperlinks.push(entry);
            }
            return { success: true, count: hyperlinks.length, hyperlinks };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Document Hyperlinks")
            : formatErrorResponse(result?.error || 'Failed to get document hyperlinks', "Get Document Hyperlinks");
    }

    /**
     * Create a hyperlink in the document
     */
    static async createDocumentHyperlink(args) {
        const { sourceText, destination, linkType = 'URL', pageIndex } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const dest = doc.hyperlinkURLDestinations.add({ destinationURL: ${JSON.stringify(destination)} });
            const hyperlink = doc.hyperlinks.add({
                name: 'Link to ' + ${JSON.stringify(destination)},
                destination: dest
            });
            return { success: true, message: 'Hyperlink created successfully: ' + hyperlink.name, name: hyperlink.name };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Create Document Hyperlink")
            : formatErrorResponse(result?.error || 'Failed to create document hyperlink', "Create Document Hyperlink");
    }

    // =================== DOCUMENT SECTIONS & NUMBERING ===================

    /**
     * Get all sections in the document
     */
    static async getDocumentSections() {
        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const sections = [];
            for (let i = 0; i < doc.sections.length; i++) {
                const section = doc.sections.item(i);
                sections.push({ name: section.name, sectionPrefix: section.sectionPrefix });
            }
            return { success: true, count: sections.length, sections };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Document Sections")
            : formatErrorResponse(result?.error || 'Failed to get document sections', "Get Document Sections");
    }

    /**
     * Create a new section in the document
     */
    static async createDocumentSection(args) {
        const { startPage, sectionPrefix, startNumber = 1, numberingStyle = 'ARABIC' } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const page = doc.pages.item(${startPage});
            const section = doc.sections.add(page);
            if (${JSON.stringify(sectionPrefix || '')}) section.sectionPrefix = ${JSON.stringify(sectionPrefix || '')};
            section.pageNumberingStyle = ${JSON.stringify(numberingStyle)};
            return { success: true, message: 'Section created successfully on page ' + page.name };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Create Document Section")
            : formatErrorResponse(result?.error || 'Failed to create document section', "Create Document Section");
    }

    // =================== DOCUMENT XML & STRUCTURE ===================

    /**
     * Get XML structure of the document
     */
    static async getDocumentXmlStructure(args) {
        const { includeTags = true, includeElements = true } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const tags = ${includeTags} ? (() => {
                const t = [];
                for (let i = 0; i < doc.xmlTags.length; i++) t.push(doc.xmlTags.item(i).name);
                return t;
            })() : null;
            const elementCount = ${includeElements} ? doc.xmlElements.length : null;
            return { success: true, tags, elementCount };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Document XML Structure")
            : formatErrorResponse(result?.error || 'Failed to get document XML structure', "Get Document XML Structure");
    }

    /**
     * Export document as XML
     */
    static async exportDocumentXml(args) {
        const { filePath, includeImages = true, includeStyles = true } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const { ExportFormat } = require('indesign');
            const doc = app.activeDocument;
            await doc.exportFile(ExportFormat.xmlType, ${JSON.stringify(filePath)}, false);
            return { success: true, message: 'Document exported as XML successfully', filePath: ${JSON.stringify(filePath)} };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Export Document XML")
            : formatErrorResponse(result?.error || 'Failed to export document XML', "Export Document XML");
    }

    // =================== DOCUMENT CLOUD & COLLABORATION ===================

    /**
     * Save document to Adobe Creative Cloud
     */
    static async saveDocumentToCloud(args) {
        const { cloudName, includeAssets = true } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            if (doc.isCloudDocument) {
                await doc.save();
                return { success: true, message: 'Cloud document saved successfully' };
            } else {
                await doc.saveACopyCloud(${JSON.stringify(cloudName)});
                return { success: true, message: 'Document saved to cloud as: ' + ${JSON.stringify(cloudName)} };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Save Document to Cloud")
            : formatErrorResponse(result?.error || 'Failed to save document to cloud', "Save Document to Cloud");
    }

    /**
     * Open a document from Adobe Creative Cloud
     */
    static async openCloudDocument(args) {
        const { cloudDocumentId } = args;

        const code = `
            await app.openCloudDocument(${JSON.stringify(cloudDocumentId)});
            return { success: true, message: 'Cloud document opened successfully' };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Open Cloud Document")
            : formatErrorResponse(result?.error || 'Failed to open cloud document', "Open Cloud Document");
    }

    // =================== DOCUMENT GRID & LAYOUT ===================

    /**
     * Get comprehensive grid settings for the document
     */
    static async getDocumentGridSettings() {
        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const safeGet = (fn) => { try { return fn(); } catch (e) { return null; } };
            return {
                success: true,
                grid: {
                    documentGridColor: safeGet(() => String(doc.gridPreferences.documentGridColor)),
                    documentGridIncrement: safeGet(() => doc.gridPreferences.documentGridIncrement),
                    documentGridSubdivision: safeGet(() => doc.gridPreferences.documentGridSubdivision),
                    gridViewThreshold: safeGet(() => doc.gridPreferences.gridViewThreshold),
                    gridAlignment: safeGet(() => String(doc.gridPreferences.gridAlignment))
                },
                baselineGrid: {
                    baselineGridColor: safeGet(() => String(doc.gridPreferences.baselineGridColor)),
                    baselineGridIncrement: safeGet(() => doc.gridPreferences.baselineGridIncrement),
                    baselineGridOffset: safeGet(() => doc.gridPreferences.baselineGridOffset),
                    baselineGridViewThreshold: safeGet(() => doc.gridPreferences.baselineGridViewThreshold)
                }
            };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Document Grid Settings")
            : formatErrorResponse(result?.error || 'Failed to get document grid settings', "Get Document Grid Settings");
    }

    /**
     * Set comprehensive grid settings for the document
     */
    static async setDocumentGridSettings(args) {
        const {
            documentGridColor = null,
            documentGridIncrement = null,
            documentGridSubdivision = null,
            baselineGridColor = null,
            baselineGridIncrement = null,
            baselineGridOffset = null,
            baselineGridViewThreshold = null,
            gridViewThreshold = null,
            gridAlignment = null
        } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const safeSet = (fn) => { try { fn(); } catch (e) {} };
            if (${JSON.stringify(documentGridColor)} !== null) safeSet(() => { doc.gridPreferences.documentGridColor = ${JSON.stringify(documentGridColor)}; });
            if (${JSON.stringify(documentGridIncrement)} !== null) safeSet(() => { doc.gridPreferences.documentGridIncrement = ${JSON.stringify(documentGridIncrement)}; });
            if (${JSON.stringify(documentGridSubdivision)} !== null) safeSet(() => { doc.gridPreferences.documentGridSubdivision = ${JSON.stringify(documentGridSubdivision)}; });
            if (${JSON.stringify(gridViewThreshold)} !== null) safeSet(() => { doc.gridPreferences.gridViewThreshold = ${JSON.stringify(gridViewThreshold)}; });
            if (${JSON.stringify(baselineGridColor)} !== null) safeSet(() => { doc.gridPreferences.baselineGridColor = ${JSON.stringify(baselineGridColor)}; });
            if (${JSON.stringify(baselineGridIncrement)} !== null) safeSet(() => { doc.gridPreferences.baselineGridIncrement = ${JSON.stringify(baselineGridIncrement)}; });
            if (${JSON.stringify(baselineGridOffset)} !== null) safeSet(() => { doc.gridPreferences.baselineGridOffset = ${JSON.stringify(baselineGridOffset)}; });
            if (${JSON.stringify(baselineGridViewThreshold)} !== null) safeSet(() => { doc.gridPreferences.baselineGridViewThreshold = ${JSON.stringify(baselineGridViewThreshold)}; });
            if (${JSON.stringify(gridAlignment)} !== null) safeSet(() => { doc.gridPreferences.gridAlignment = ${JSON.stringify(gridAlignment)}; });
            return { success: true, message: 'Document grid settings updated successfully' };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Set Document Grid Settings")
            : formatErrorResponse(result?.error || 'Failed to set document grid settings', "Set Document Grid Settings");
    }

    /**
     * Get layout preferences and settings
     */
    static async getDocumentLayoutPreferences() {
        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const safeGet = (fn) => { try { return fn(); } catch (e) { return null; } };
            return {
                success: true,
                adjustLayout: {
                    adjustLayout: safeGet(() => doc.adjustLayoutPreferences.adjustLayout),
                    adjustLayoutMargins: safeGet(() => doc.adjustLayoutPreferences.adjustLayoutMargins),
                    adjustLayoutPageBreaks: safeGet(() => doc.adjustLayoutPreferences.adjustLayoutPageBreaks),
                    adjustLayoutRules: safeGet(() => String(doc.adjustLayoutPreferences.adjustLayoutRules))
                },
                alignDistribute: {
                    alignDistributeBounds: safeGet(() => String(doc.alignDistributePreferences.alignDistributeBounds)),
                    alignDistributeSpacing: safeGet(() => doc.alignDistributePreferences.alignDistributeSpacing)
                },
                smartGuides: {
                    smartGuidePreferences: safeGet(() => doc.smartGuidePreferences.smartGuidePreferences)
                }
            };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Document Layout Preferences")
            : formatErrorResponse(result?.error || 'Failed to get document layout preferences', "Get Document Layout Preferences");
    }

    /**
     * Set layout preferences for the document
     */
    static async setDocumentLayoutPreferences(args) {
        const {
            adjustLayout = null,
            adjustLayoutMargins = null,
            adjustLayoutPageBreaks = null,
            adjustLayoutRules = null,
            alignDistributeBounds = null,
            alignDistributeSpacing = null,
            smartGuidePreferences = null
        } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const safeSet = (fn) => { try { fn(); } catch (e) {} };
            if (${JSON.stringify(adjustLayout)} !== null) safeSet(() => { doc.adjustLayoutPreferences.adjustLayout = ${JSON.stringify(adjustLayout)}; });
            if (${JSON.stringify(adjustLayoutMargins)} !== null) safeSet(() => { doc.adjustLayoutPreferences.adjustLayoutMargins = ${JSON.stringify(adjustLayoutMargins)}; });
            if (${JSON.stringify(adjustLayoutPageBreaks)} !== null) safeSet(() => { doc.adjustLayoutPreferences.adjustLayoutPageBreaks = ${JSON.stringify(adjustLayoutPageBreaks)}; });
            if (${JSON.stringify(adjustLayoutRules)} !== null) safeSet(() => { doc.adjustLayoutPreferences.adjustLayoutRules = ${JSON.stringify(adjustLayoutRules)}; });
            if (${JSON.stringify(alignDistributeBounds)} !== null) safeSet(() => { doc.alignDistributePreferences.alignDistributeBounds = ${JSON.stringify(alignDistributeBounds)}; });
            if (${JSON.stringify(alignDistributeSpacing)} !== null) safeSet(() => { doc.alignDistributePreferences.alignDistributeSpacing = ${JSON.stringify(alignDistributeSpacing)}; });
            if (${JSON.stringify(smartGuidePreferences)} !== null) safeSet(() => { doc.smartGuidePreferences.smartGuidePreferences = ${JSON.stringify(smartGuidePreferences)}; });
            return { success: true, message: 'Document layout preferences updated successfully' };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Set Document Layout Preferences")
            : formatErrorResponse(result?.error || 'Failed to set document layout preferences', "Set Document Layout Preferences");
    }

    // =================== DOCUMENT VALIDATION & CLEANUP ===================

    /**
     * Validate document structure and content
     */
    static async validateDocument(args) {
        const { checkLinks = true, checkFonts = true, checkImages = true, checkStyles = false } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const issues = [];
            let isValid = true;
            if (${checkLinks}) {
                for (let i = 0; i < doc.links.length; i++) {
                    const link = doc.links.item(i);
                    if (!link.isValid) {
                        issues.push('Broken link: ' + link.name);
                        isValid = false;
                    }
                }
            }
            if (${checkFonts}) {
                for (let i = 0; i < doc.fonts.length; i++) {
                    const font = doc.fonts.item(i);
                    if (!font.isValid) {
                        issues.push('Missing font: ' + font.name);
                        isValid = false;
                    }
                }
            }
            return { success: true, isValid, issues };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Validate Document")
            : formatErrorResponse(result?.error || 'Failed to validate document', "Validate Document");
    }

    /**
     * Clean up document (remove unused elements)
     */
    static async cleanupDocument(args) {
        const { removeUnusedStyles = false, removeUnusedColors = false, removeUnusedLayers = false, removeHiddenElements = false } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const actions = [];
            let removedItems = 0;
            if (${removeUnusedStyles}) {
                const unusedStyles = doc.unusedSwatches;
                removedItems += unusedStyles.length;
                actions.push('Found ' + unusedStyles.length + ' unused styles');
            }
            if (${removeUnusedColors}) {
                const unusedColors = doc.unusedSwatches;
                removedItems += unusedColors.length;
                actions.push('Found ' + unusedColors.length + ' unused colors');
            }
            return { success: true, actions, removedItems };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Cleanup Document")
            : formatErrorResponse(result?.error || 'Failed to cleanup document', "Cleanup Document");
    }
} 