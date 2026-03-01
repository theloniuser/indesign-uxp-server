/**
 * Comprehensive Document management handlers
 * Merged from documentHandlers.js and documentAdvancedHandlers.js
 */
import { ScriptExecutor } from '../core/scriptExecutor.js';
import { formatResponse, formatErrorResponse, escapeJsxString } from '../utils/stringUtils.js';
import { sessionManager } from '../core/sessionManager.js';

export class DocumentHandlers {
    /**
     * Helper function to ensure we have an active document
     */
    static async ensureActiveDocument() {
        const script = [
            'try {',
            '  if (app.documents.length === 0) {',
            '    "No document open";',
            '  } else {',
            '    var doc = app.activeDocument;',
            '    if (!doc) {',
            '      // If no active document, try to get the first one',
            '      if (app.documents.length > 0) {',
            '        doc = app.documents[0];',
            '        app.activeDocument = doc;',
            '        "Document activated: " + doc.name;',
            '      } else {',
            '        "No document open";',
            '      }',
            '    } else {',
            '      "Document already active: " + doc.name;',
            '    }',
            '  }',
            '} catch (error) {',
            '  "Error ensuring active document: " + error.message;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Ensure Active Document");
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

        const script = [
            'try {',
            '  // Create the document with basic parameters',
            '  var doc = app.documents.add();',
            '',
            '  // Set document preferences after creation',
            `  doc.documentPreferences.pageWidth = ${width};`,
            `  doc.documentPreferences.pageHeight = ${height};`,
            `  doc.documentPreferences.facingPages = ${facingPages};`,
            `  doc.documentPreferences.pageOrientation = PageOrientation.${pageOrientation === 'PORTRAIT' ? 'PORTRAIT' : 'LANDSCAPE'};`,
            `  doc.documentPreferences.documentBleedTopOffset = ${bleedTop};`,
            `  doc.documentPreferences.documentBleedBottomOffset = ${bleedBottom};`,
            `  doc.documentPreferences.documentBleedInsideOrLeftOffset = ${bleedInside};`,
            `  doc.documentPreferences.documentBleedOutsideOrRightOffset = ${bleedOutside};`,
            `  doc.marginPreferences.top = ${marginTop};`,
            `  doc.marginPreferences.bottom = ${marginBottom};`,
            `  doc.marginPreferences.left = ${marginLeft};`,
            `  doc.marginPreferences.right = ${marginRight};`,
            '',
            '  // Ensure the document is active',
            '  app.activeDocument = doc;',
            '',
            '  // Verify the document is active and return success',
            '  if (app.activeDocument === doc) {',
            '    "Document created and activated successfully. Document name: " + doc.name;',
            '  } else {',
            '    "Document created but activation failed";',
            '  }',
            '} catch (error) {',
            '  "Error creating document: " + error.message;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);

        // Check if the operation was successful
        const isSuccess = result.includes("Document created and activated successfully");

        if (isSuccess) {
            // Store document info in session manager
            sessionManager.setActiveDocument({
                name: result.match(/Document name: (.+)/)?.[1] || 'New Document',
                path: 'Unsaved',
                pages: pages,
                width: width,
                height: height
            });

            sessionManager.setPageDimensions({
                width: width,
                height: height
            });
        }

        return isSuccess ?
            formatResponse(result, "Create Document") :
            formatErrorResponse(result, "Create Document");
    }

    /**
     * Open an existing document
     */
    static async openDocument(args) {
        const { filePath } = args;

        const script = [
            'var file = File("' + filePath + '");',
            'if (!file.exists) {',
            `  "File not found: ${filePath}";`,
            '} else {',
            '  app.open(file);',
            `  "Document opened: ${filePath}";`,
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Open Document");
    }

    /**
     * Save the active document
     */
    static async saveDocument(args) {
        const { filePath } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var file = File("' + filePath + '");',
            '  try {',
            '    doc.save(file);',
            `    "Document saved: ${filePath}";`,
            '  } catch (error) {',
            '    "Error saving document: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Save Document");
    }

    /**
     * Close the active document
     */
    static async closeDocument() {
        const script = [
            'try {',
            '  if (app.documents.length === 0) {',
            '    "No document to close";',
            '  } else {',
            '    var doc = app.activeDocument;',
            '    if (!doc) {',
            '      // If no active document, try to get the first one',
            '      if (app.documents.length > 0) {',
            '        doc = app.documents[0];',
            '      } else {',
            '        "No document to close";',
            '      }',
            '    }',
            '    ',
            '    var docName = doc.name;',
            '    doc.close(SaveOptions.NO);',
            '    "Document closed successfully: " + docName;',
            '  }',
            '} catch (error) {',
            '  "Error closing document: " + error.message;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Close Document");
    }

    // =================== DOCUMENT ADVANCED TOOLS ===================

    /**
     * Run preflight on the document
     */
    static async preflightDocument(args) {
        const { profile = 'Basic', includeWarnings = true } = args;
        const escapedProfile = escapeJsxString(profile);

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  try {',
            `    doc.preflight("${escapedProfile}", ${includeWarnings});`,
            '    "Document preflighted successfully";',
            '  } catch (error) {',
            '    "Error preflighting document: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Preflight Document");
    }

    /**
     * Zoom to fit page in view
     */
    static async zoomToPage(args) {
        const { pageIndex, zoomLevel = 100 } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            `  if (${pageIndex} >= doc.pages.length) {`,
            '    "Page index out of range";',
            '  } else {',
            '    try {',
            `      var page = doc.pages[${pageIndex}];`,
            `      page.zoomToFit(${zoomLevel});`,
            `      "Zoomed to page ${pageIndex} at ${zoomLevel}%";`,
            '    } catch (error) {',
            '      "Error zooming to page: " + error.message;',
            '    }',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Zoom to Page");
    }

    /**
     * Perform data merge operation
     */
    static async dataMerge(args) {
        const { dataSource, targetPage = 0, createNewPages = false, removeUnusedPages = false } = args;
        const escapedDataSource = escapeJsxString(dataSource);

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            `  var dataFile = File("${escapedDataSource}");`,
            '',
            '  if (!dataFile.exists) {',
            `    "Data source file not found: ${escapedDataSource}";`,
            '  } else {',
            '    try {',
            `      var targetPageObj = doc.pages[${targetPage}];`,
            `      doc.dataMerge(dataFile, targetPageObj, ${createNewPages}, ${removeUnusedPages});`,
            '      "Data merge completed successfully";',
            '    } catch (error) {',
            '      "Error performing data merge: " + error.message;',
            '    }',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Data Merge");
    }

    // =================== DOCUMENT ELEMENTS & STYLES ===================

    /**
     * Get all elements in the document
     */
    static async getDocumentElements(args) {
        const { elementType = 'all' } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var result = "Document Elements:\\n";',
            '',
            '  if ("' + elementType + '" === "all" || "' + elementType + '" === "text") {',
            '    result += "Text Frames: " + doc.textFrames.length + "\\n";',
            '    result += "Stories: " + doc.stories.length + "\\n";',
            '  }',
            '',
            '  if ("' + elementType + '" === "all" || "' + elementType + '" === "graphics") {',
            '    result += "Rectangles: " + doc.rectangles.length + "\\n";',
            '    result += "Ovals: " + doc.ovals.length + "\\n";',
            '    result += "Polygons: " + doc.polygons.length + "\\n";',
            '    result += "Graphic Lines: " + doc.graphicLines.length + "\\n";',
            '    result += "All Graphics: " + doc.allGraphics.length + "\\n";',
            '  }',
            '',
            '  if ("' + elementType + '" === "all" || "' + elementType + '" === "tables") {',
            '    var tableCount = 0;',
            '    for (var i = 0; i < doc.textFrames.length; i++) {',
            '      if (doc.textFrames[i].tables.length > 0) {',
            '        tableCount += doc.textFrames[i].tables.length;',
            '      }',
            '    }',
            '    result += "Tables: " + tableCount + "\\n";',
            '  }',
            '',
            '  if ("' + elementType + '" === "all") {',
            '    result += "All Page Items: " + doc.allPageItems.length + "\\n";',
            '    result += "Groups: " + doc.groups.length + "\\n";',
            '    result += "Layers: " + doc.layers.length + "\\n";',
            '  }',
            '',
            '  result;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Get Document Elements");
    }

    /**
     * Get all styles in the document
     */
    static async getDocumentStyles(args) {
        const { styleType = 'PARAGRAPH' } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var result = "Document Styles (' + styleType + '):\\n";',
            '',
            '  switch ("' + styleType + '") {',
            '    case "PARAGRAPH":',
            '      result += "Count: " + doc.paragraphStyles.length + "\\n";',
            '      for (var i = 0; i < doc.paragraphStyles.length; i++) {',
            '        result += "- " + doc.paragraphStyles[i].name + "\\n";',
            '      }',
            '      break;',
            '    case "CHARACTER":',
            '      result += "Count: " + doc.characterStyles.length + "\\n";',
            '      for (var i = 0; i < doc.characterStyles.length; i++) {',
            '        result += "- " + doc.characterStyles[i].name + "\\n";',
            '      }',
            '      break;',
            '    case "OBJECT":',
            '      result += "Count: " + doc.objectStyles.length + "\\n";',
            '      for (var i = 0; i < doc.objectStyles.length; i++) {',
            '        result += "- " + doc.objectStyles[i].name + "\\n";',
            '      }',
            '      break;',
            '    case "TABLE":',
            '      result += "Count: " + doc.tableStyles.length + "\\n";',
            '      for (var i = 0; i < doc.tableStyles.length; i++) {',
            '        result += "- " + doc.tableStyles[i].name + "\\n";',
            '      }',
            '      break;',
            '    case "CELL":',
            '      result += "Count: " + doc.cellStyles.length + "\\n";',
            '      for (var i = 0; i < doc.cellStyles.length; i++) {',
            '        result += "- " + doc.cellStyles[i].name + "\\n";',
            '      }',
            '      break;',
            '  }',
            '',
            '  result;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Get Document Styles");
    }

    /**
     * Get all colors and swatches in the document
     */
    static async getDocumentColors(args) {
        const { includeSwatches = true, includeGradients = true, includeTints = true } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var result = "Document Colors:\\n";',
            '',
            '  result += "Colors: " + doc.colors.length + "\\n";',
            '  for (var i = 0; i < doc.colors.length; i++) {',
            '    result += "- " + doc.colors[i].name + " (" + doc.colors[i].model + ")\\n";',
            '  }',
            '',
            '  if (' + includeSwatches + ') {',
            '    result += "\\nSwatches: " + doc.swatches.length + "\\n";',
            '    for (var i = 0; i < doc.swatches.length; i++) {',
            '      result += "- " + doc.swatches[i].name + "\\n";',
            '    }',
            '  }',
            '',
            '  if (' + includeGradients + ') {',
            '    result += "\\nGradients: " + doc.gradients.length + "\\n";',
            '    for (var i = 0; i < doc.gradients.length; i++) {',
            '      result += "- " + doc.gradients[i].name + "\\n";',
            '    }',
            '  }',
            '',
            '  if (' + includeTints + ') {',
            '    result += "\\nTints: " + doc.tints.length + "\\n";',
            '    for (var i = 0; i < doc.tints.length; i++) {',
            '      result += "- " + doc.tints[i].name + "\\n";',
            '    }',
            '  }',
            '',
            '  result;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Get Document Colors");
    }

    // =================== DOCUMENT PREFERENCES ===================

    /**
     * Get document preferences
     */
    static async getDocumentPreferences(args) {
        const { preferenceType = 'GENERAL' } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var result = "Document Preferences (' + preferenceType + '):\\n\\n";',
            '',
            '  switch ("' + preferenceType + '") {',
            '    case "GENERAL":',
            '      try {',
            '        result += "Page Width: " + doc.documentPreferences.pageWidth + "\\n";',
            '      } catch (e) { result += "Page Width: Not available\\n"; }',
            '      try {',
            '        result += "Page Height: " + doc.documentPreferences.pageHeight + "\\n";',
            '      } catch (e) { result += "Page Height: Not available\\n"; }',
            '      try {',
            '        result += "Facing Pages: " + doc.documentPreferences.facingPages + "\\n";',
            '      } catch (e) { result += "Facing Pages: Not available\\n"; }',
            '      try {',
            '        result += "Page Orientation: " + doc.documentPreferences.pageOrientation + "\\n";',
            '      } catch (e) { result += "Page Orientation: Not available\\n"; }',
            '      try {',
            '        result += "Pages Per Document: " + doc.documentPreferences.pagesPerDocument + "\\n";',
            '      } catch (e) { result += "Pages Per Document: Not available\\n"; }',
            '      try {',
            '        result += "Start Page Number: " + doc.documentPreferences.startPageNumber + "\\n";',
            '      } catch (e) { result += "Start Page Number: Not available\\n"; }',
            '      try {',
            '        result += "Document Bleed Top Offset: " + doc.documentPreferences.documentBleedTopOffset + "\\n";',
            '      } catch (e) { result += "Document Bleed Top Offset: Not available\\n"; }',
            '      try {',
            '        result += "Document Bleed Bottom Offset: " + doc.documentPreferences.documentBleedBottomOffset + "\\n";',
            '      } catch (e) { result += "Document Bleed Bottom Offset: Not available\\n"; }',
            '      try {',
            '        result += "Document Bleed Inside Or Left Offset: " + doc.documentPreferences.documentBleedInsideOrLeftOffset + "\\n";',
            '      } catch (e) { result += "Document Bleed Inside Or Left Offset: Not available\\n"; }',
            '      try {',
            '        result += "Document Bleed Outside Or Right Offset: " + doc.documentPreferences.documentBleedOutsideOrRightOffset + "\\n";',
            '      } catch (e) { result += "Document Bleed Outside Or Right Offset: Not available\\n"; }',
            '      try {',
            '        result += "Document Slug Top Offset: " + doc.documentPreferences.documentSlugTopOffset + "\\n";',
            '      } catch (e) { result += "Document Slug Top Offset: Not available\\n"; }',
            '      try {',
            '        result += "Document Slug Bottom Offset: " + doc.documentPreferences.documentSlugBottomOffset + "\\n";',
            '      } catch (e) { result += "Document Slug Bottom Offset: Not available\\n"; }',
            '      try {',
            '        result += "Document Slug Inside Or Left Offset: " + doc.documentPreferences.documentSlugInsideOrLeftOffset + "\\n";',
            '      } catch (e) { result += "Document Slug Inside Or Left Offset: Not available\\n"; }',
            '      try {',
            '        result += "Document Slug Outside Or Right Offset: " + doc.documentPreferences.documentSlugOutsideOrRightOffset + "\\n";',
            '      } catch (e) { result += "Document Slug Outside Or Right Offset: Not available\\n"; }',
            '      break;',
            '    case "GRID":',
            '      try {',
            '        result += "Document Grid Color: " + doc.gridPreferences.documentGridColor + "\\n";',
            '      } catch (e) { result += "Document Grid Color: Not available\\n"; }',
            '      try {',
            '        result += "Document Grid Increment: " + doc.gridPreferences.documentGridIncrement + "\\n";',
            '      } catch (e) { result += "Document Grid Increment: Not available\\n"; }',
            '      try {',
            '        result += "Document Grid Subdivision: " + doc.gridPreferences.documentGridSubdivision + "\\n";',
            '      } catch (e) { result += "Document Grid Subdivision: Not available\\n"; }',
            '      try {',
            '        result += "Grid View Threshold: " + doc.gridPreferences.gridViewThreshold + "\\n";',
            '      } catch (e) { result += "Grid View Threshold: Not available\\n"; }',
            '      try {',
            '        result += "Baseline Grid Color: " + doc.gridPreferences.baselineGridColor + "\\n";',
            '      } catch (e) { result += "Baseline Grid Color: Not available\\n"; }',
            '      try {',
            '        result += "Baseline Grid Increment: " + doc.gridPreferences.baselineGridIncrement + "\\n";',
            '      } catch (e) { result += "Baseline Grid Increment: Not available\\n"; }',
            '      try {',
            '        result += "Baseline Grid Offset: " + doc.gridPreferences.baselineGridOffset + "\\n";',
            '      } catch (e) { result += "Baseline Grid Offset: Not available\\n"; }',
            '      try {',
            '        result += "Baseline Grid View Threshold: " + doc.gridPreferences.baselineGridViewThreshold + "\\n";',
            '      } catch (e) { result += "Baseline Grid View Threshold: Not available\\n"; }',
            '      try {',
            '        result += "Grid Alignment: " + doc.gridPreferences.gridAlignment + "\\n";',
            '      } catch (e) { result += "Grid Alignment: Not available\\n"; }',
            '      break;',
            '    case "GUIDES":',
            '      try {',
            '        result += "Guides Locked: " + doc.guidePreferences.guidesLocked + "\\n";',
            '      } catch (e) { result += "Guides Locked: Not available\\n"; }',
            '      try {',
            '        result += "Guides In Back: " + doc.guidePreferences.guidesInBack + "\\n";',
            '      } catch (e) { result += "Guides In Back: Not available\\n"; }',
            '      try {',
            '        result += "Guides Snap To Zone: " + doc.guidePreferences.guidesSnapToZone + "\\n";',
            '      } catch (e) { result += "Guides Snap To Zone: Not available\\n"; }',
            '      try {',
            '        result += "Guides View Threshold: " + doc.guidePreferences.guidesViewThreshold + "\\n";',
            '      } catch (e) { result += "Guides View Threshold: Not available\\n"; }',
            '      break;',
            '    case "TEXT":',
            '      try {',
            '        result += "Typographers Quotes: " + doc.textPreferences.typographersQuotes + "\\n";',
            '      } catch (e) { result += "Typographers Quotes: Not available\\n"; }',
            '      try {',
            '        result += "Use Typographers Quotes: " + doc.textPreferences.useTypographersQuotes + "\\n";',
            '      } catch (e) { result += "Use Typographers Quotes: Not available\\n"; }',
            '      try {',
            '        result += "Highlight Substituted Fonts: " + doc.textPreferences.highlightSubstitutedFonts + "\\n";',
            '      } catch (e) { result += "Highlight Substituted Fonts: Not available\\n"; }',
            '      try {',
            '        result += "Highlight Substituted Glyphs: " + doc.textPreferences.highlightSubstitutedGlyphs + "\\n";',
            '      } catch (e) { result += "Highlight Substituted Glyphs: Not available\\n"; }',
            '      try {',
            '        result += "Highlight Keeps Violations: " + doc.textPreferences.highlightKeepsViolations + "\\n";',
            '      } catch (e) { result += "Highlight Keeps Violations: Not available\\n"; }',
            '      try {',
            '        result += "Highlight H&J Violations: " + doc.textPreferences.highlightHjViolations + "\\n";',
            '      } catch (e) { result += "Highlight H&J Violations: Not available\\n"; }',
            '      try {',
            '        result += "Highlight Custom Spacing: " + doc.textPreferences.highlightCustomSpacing + "\\n";',
            '      } catch (e) { result += "Highlight Custom Spacing: Not available\\n"; }',
            '      try {',
            '        result += "Highlight Substituted Lines: " + doc.textPreferences.highlightSubstitutedLines + "\\n";',
            '      } catch (e) { result += "Highlight Substituted Lines: Not available\\n"; }',
            '      break;',
            '    case "MARGINS":',
            '      try {',
            '        result += "Margin Top: " + doc.marginPreferences.top + "\\n";',
            '      } catch (e) { result += "Margin Top: Not available\\n"; }',
            '      try {',
            '        result += "Margin Bottom: " + doc.marginPreferences.bottom + "\\n";',
            '      } catch (e) { result += "Margin Bottom: Not available\\n"; }',
            '      try {',
            '        result += "Margin Left: " + doc.marginPreferences.left + "\\n";',
            '      } catch (e) { result += "Margin Left: Not available\\n"; }',
            '      try {',
            '        result += "Margin Right: " + doc.marginPreferences.right + "\\n";',
            '      } catch (e) { result += "Margin Right: Not available\\n"; }',
            '      try {',
            '        result += "Margin Column Count: " + doc.marginPreferences.columnCount + "\\n";',
            '      } catch (e) { result += "Margin Column Count: Not available\\n"; }',
            '      try {',
            '        result += "Margin Column Gutter: " + doc.marginPreferences.columnGutter + "\\n";',
            '      } catch (e) { result += "Margin Column Gutter: Not available\\n"; }',
            '      break;',
            '    default:',
            '      result += "Unknown preference type: " + preferenceType + "\\n";',
            '      result += "Available types: GENERAL, GRID, GUIDES, TEXT, MARGINS\\n";',
            '  }',
            '',
            '  result;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Get Document Preferences");
    }

    /**
     * Set document preferences
     */
    static async setDocumentPreferences(args) {
        const { preferenceType, preferences } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var updatedCount = 0;',
            '  try {',
            '    switch ("' + preferenceType + '") {',
            '      case "GENERAL":',
            '        if (preferences.pageWidth !== undefined) {',
            '          try { doc.documentPreferences.pageWidth = UnitValue(preferences.pageWidth, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.pageHeight !== undefined) {',
            '          try { doc.documentPreferences.pageHeight = UnitValue(preferences.pageHeight, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.facingPages !== undefined) {',
            '          try { doc.documentPreferences.facingPages = preferences.facingPages; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.pagesPerDocument !== undefined) {',
            '          try { doc.documentPreferences.pagesPerDocument = preferences.pagesPerDocument; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.startPageNumber !== undefined) {',
            '          try { doc.documentPreferences.startPageNumber = preferences.startPageNumber; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.documentBleedTopOffset !== undefined) {',
            '          try { doc.documentPreferences.documentBleedTopOffset = UnitValue(preferences.documentBleedTopOffset, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.documentBleedBottomOffset !== undefined) {',
            '          try { doc.documentPreferences.documentBleedBottomOffset = UnitValue(preferences.documentBleedBottomOffset, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.documentBleedInsideOrLeftOffset !== undefined) {',
            '          try { doc.documentPreferences.documentBleedInsideOrLeftOffset = UnitValue(preferences.documentBleedInsideOrLeftOffset, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.documentBleedOutsideOrRightOffset !== undefined) {',
            '          try { doc.documentPreferences.documentBleedOutsideOrRightOffset = UnitValue(preferences.documentBleedOutsideOrRightOffset, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        break;',
            '      case "GRID":',
            '        if (preferences.documentGridColor !== undefined) {',
            '          try { doc.gridPreferences.documentGridColor = preferences.documentGridColor; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.documentGridIncrement !== undefined) {',
            '          try { doc.gridPreferences.documentGridIncrement = UnitValue(preferences.documentGridIncrement, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.documentGridSubdivision !== undefined) {',
            '          try { doc.gridPreferences.documentGridSubdivision = preferences.documentGridSubdivision; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.gridViewThreshold !== undefined) {',
            '          try { doc.gridPreferences.gridViewThreshold = preferences.gridViewThreshold; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.baselineGridColor !== undefined) {',
            '          try { doc.gridPreferences.baselineGridColor = preferences.baselineGridColor; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.baselineGridIncrement !== undefined) {',
            '          try { doc.gridPreferences.baselineGridIncrement = UnitValue(preferences.baselineGridIncrement, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.baselineGridOffset !== undefined) {',
            '          try { doc.gridPreferences.baselineGridOffset = UnitValue(preferences.baselineGridOffset, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.baselineGridViewThreshold !== undefined) {',
            '          try { doc.gridPreferences.baselineGridViewThreshold = preferences.baselineGridViewThreshold; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.gridAlignment !== undefined) {',
            '          try { doc.gridPreferences.gridAlignment = preferences.gridAlignment; updatedCount++; } catch (e) {}',
            '        }',
            '        break;',
            '      case "GUIDES":',
            '        if (preferences.guidesLocked !== undefined) {',
            '          try { doc.guidePreferences.guidesLocked = preferences.guidesLocked; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.guidesInBack !== undefined) {',
            '          try { doc.guidePreferences.guidesInBack = preferences.guidesInBack; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.guidesSnapToZone !== undefined) {',
            '          try { doc.guidePreferences.guidesSnapToZone = preferences.guidesSnapToZone; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.guidesViewThreshold !== undefined) {',
            '          try { doc.guidePreferences.guidesViewThreshold = preferences.guidesViewThreshold; updatedCount++; } catch (e) {}',
            '        }',
            '        break;',
            '      case "TEXT":',
            '        if (preferences.typographersQuotes !== undefined) {',
            '          try { doc.textPreferences.typographersQuotes = preferences.typographersQuotes; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.useTypographersQuotes !== undefined) {',
            '          try { doc.textPreferences.useTypographersQuotes = preferences.useTypographersQuotes; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.highlightSubstitutedFonts !== undefined) {',
            '          try { doc.textPreferences.highlightSubstitutedFonts = preferences.highlightSubstitutedFonts; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.highlightSubstitutedGlyphs !== undefined) {',
            '          try { doc.textPreferences.highlightSubstitutedGlyphs = preferences.highlightSubstitutedGlyphs; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.highlightKeepsViolations !== undefined) {',
            '          try { doc.textPreferences.highlightKeepsViolations = preferences.highlightKeepsViolations; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.highlightHjViolations !== undefined) {',
            '          try { doc.textPreferences.highlightHjViolations = preferences.highlightHjViolations; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.highlightCustomSpacing !== undefined) {',
            '          try { doc.textPreferences.highlightCustomSpacing = preferences.highlightCustomSpacing; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.highlightSubstitutedLines !== undefined) {',
            '          try { doc.textPreferences.highlightSubstitutedLines = preferences.highlightSubstitutedLines; updatedCount++; } catch (e) {}',
            '        }',
            '        break;',
            '      case "MARGINS":',
            '        if (preferences.marginTop !== undefined) {',
            '          try { doc.marginPreferences.top = UnitValue(preferences.marginTop, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.marginBottom !== undefined) {',
            '          try { doc.marginPreferences.bottom = UnitValue(preferences.marginBottom, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.marginLeft !== undefined) {',
            '          try { doc.marginPreferences.left = UnitValue(preferences.marginLeft, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.marginRight !== undefined) {',
            '          try { doc.marginPreferences.right = UnitValue(preferences.marginRight, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.columnCount !== undefined) {',
            '          try { doc.marginPreferences.columnCount = preferences.columnCount; updatedCount++; } catch (e) {}',
            '        }',
            '        if (preferences.columnGutter !== undefined) {',
            '          try { doc.marginPreferences.columnGutter = UnitValue(preferences.columnGutter, "mm"); updatedCount++; } catch (e) {}',
            '        }',
            '        break;',
            '      default:',
            '        "Unknown preference type: " + preferenceType + ". Available types: GENERAL, GRID, GUIDES, TEXT, MARGINS";',
            '        break;',
            '    }',
            '    "Document preferences updated successfully. " + updatedCount + " properties updated.";',
            '  } catch (error) {',
            '    "Error updating document preferences: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Set Document Preferences");
    }

    // =================== DOCUMENT STORIES & TEXT ===================

    /**
     * Get all stories in the document
     */
    static async getDocumentStories(args) {
        const { includeOverset = true, includeHidden = false } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var result = "Document Stories:\\n";',
            '  var storyCount = 0;',
            '',
            '  for (var i = 0; i < doc.stories.length; i++) {',
            '    var story = doc.stories[i];',
            '    if (' + includeHidden + ' || !story.hidden) {',
            '      storyCount++;',
            '      result += "Story " + storyCount + ": " + story.name + "\\n";',
            '      result += "  Contents: " + story.contents.substring(0, 50) + "...\\n";',
            '      result += "  Overset: " + story.overset + "\\n";',
            '      result += "  Hidden: " + story.hidden + "\\n\\n";',
            '    }',
            '  }',
            '',
            '  result += "Total Stories: " + storyCount;',
            '  result;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Get Document Stories");
    }

    /**
     * Find text across the entire document
     */
    static async findTextInDocument(args) {
        const { searchText, replaceText, caseSensitive = false, wholeWord = false, useRegex = false } = args;
        const escapedSearchText = escapeJsxString(searchText);
        const escapedReplaceText = replaceText ? escapeJsxString(replaceText) : '';

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var foundCount = 0;',
            '',
            '  try {',
            '    app.findTextPreferences = app.changeTextPreferences = NothingEnum.NOTHING;',
            '    app.findTextPreferences.findWhat = "' + escapedSearchText + '";',
            '    app.findTextPreferences.caseSensitive = ' + caseSensitive + ';',
            '    app.findTextPreferences.wholeWord = ' + wholeWord + ';',
            '',
            '    if ("' + escapedReplaceText + '") {',
            '      app.changeTextPreferences.changeTo = "' + escapedReplaceText + '";',
            '      var found = doc.changeText();',
            '      foundCount = found.length;',
            '      "Found and replaced " + foundCount + " instances of \\"" + "' + escapedSearchText + '" + "\\"";',
            '    } else {',
            '      var found = doc.findText();',
            '      foundCount = found.length;',
            '      "Found " + foundCount + " instances of \\"" + "' + escapedSearchText + '" + "\\"";',
            '    }',
            '  } catch (error) {',
            '    "Error during find/replace: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Find Text in Document");
    }

    // =================== DOCUMENT LAYERS & ORGANIZATION ===================

    /**
     * Get all layers in the document
     */
    static async getDocumentLayers(args) {
        const { includeHidden = true, includeLocked = true } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var result = "Document Layers:\\n";',
            '  var layerCount = 0;',
            '',
            '  for (var i = 0; i < doc.layers.length; i++) {',
            '    var layer = doc.layers[i];',
            '    if ((' + includeHidden + ' || !layer.visible) && (' + includeLocked + ' || !layer.locked)) {',
            '      layerCount++;',
            '      result += "Layer " + layerCount + ": " + layer.name + "\\n";',
            '      result += "  Visible: " + layer.visible + "\\n";',
            '      result += "  Locked: " + layer.locked + "\\n";',
            '      result += "  Page Items: " + layer.pageItems.length + "\\n\\n";',
            '    }',
            '  }',
            '',
            '  result += "Total Layers: " + layerCount;',
            '  result;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Get Document Layers");
    }

    /**
     * Organize and clean up document layers
     */
    static async organizeDocumentLayers(args) {
        const { deleteEmptyLayers = false, mergeSimilarLayers = false, sortLayers = false } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var actions = [];',
            '',
            '  try {',
            '    if (' + deleteEmptyLayers + ') {',
            '      for (var i = doc.layers.length - 1; i >= 0; i--) {',
            '        if (doc.layers[i].pageItems.length === 0) {',
            '          doc.layers[i].remove();',
            '          actions.push("Deleted empty layer: " + doc.layers[i].name);',
            '        }',
            '      }',
            '    }',
            '',
            '    if (' + sortLayers + ') {',
            '      // Note: Layer sorting would require more complex logic',
            '      actions.push("Layer sorting not implemented in this version");',
            '    }',
            '',
            '    "Layer organization completed. Actions: " + actions.join(", ");',
            '  } catch (error) {',
            '    "Error organizing layers: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Organize Document Layers");
    }

    // =================== DOCUMENT HYPERLINKS & INTERACTIVITY ===================

    /**
     * Get all hyperlinks in the document
     */
    static async getDocumentHyperlinks(args) {
        const { includeDestinations = true, includeSources = true } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var result = "Document Hyperlinks:\\n";',
            '',
            '  for (var i = 0; i < doc.hyperlinks.length; i++) {',
            '    var link = doc.hyperlinks[i];',
            '    result += "Hyperlink " + (i + 1) + ": " + link.name + "\\n";',
            '    result += "  Source: " + link.source.name + "\\n";',
            '    result += "  Destination: " + link.destination.name + "\\n\\n";',
            '  }',
            '',
            '  result += "Total Hyperlinks: " + doc.hyperlinks.length;',
            '  result;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Get Document Hyperlinks");
    }

    /**
     * Create a hyperlink in the document
     */
    static async createDocumentHyperlink(args) {
        const { sourceText, destination, linkType = 'URL', pageIndex } = args;
        const escapedSourceText = escapeJsxString(sourceText);
        const escapedDestination = escapeJsxString(destination);

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  try {',
            '    var hyperlink = doc.hyperlinks.add({',
            '      name: "Link to ' + escapedDestination + '",',
            '      source: "' + escapedSourceText + '",',
            '      destination: "' + escapedDestination + '"',
            '    });',
            '    "Hyperlink created successfully: " + hyperlink.name;',
            '  } catch (error) {',
            '    "Error creating hyperlink: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Create Document Hyperlink");
    }

    // =================== DOCUMENT SECTIONS & NUMBERING ===================

    /**
     * Get all sections in the document
     */
    static async getDocumentSections() {
        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var result = "Document Sections:\\n";',
            '',
            '  for (var i = 0; i < doc.sections.length; i++) {',
            '    var section = doc.sections[i];',
            '    result += "Section " + (i + 1) + ": " + section.name + "\\n";',
            '    result += "  Prefix: " + section.sectionPrefix + "\\n\\n";',
            '  }',
            '',
            '  result += "Total Sections: " + doc.sections.length;',
            '  result;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Get Document Sections");
    }

    /**
     * Create a new section in the document
     */
    static async createDocumentSection(args) {
        const { startPage, sectionPrefix, startNumber = 1, numberingStyle = 'ARABIC' } = args;
        const escapedSectionPrefix = sectionPrefix ? escapeJsxString(sectionPrefix) : '';

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  try {',
            `    var page = doc.pages[${startPage}];`,
            '    var section = doc.sections.add(page);',
            '    if ("' + escapedSectionPrefix + '") section.sectionPrefix = "' + escapedSectionPrefix + '";',
            '    section.pageNumberingStyle = "' + numberingStyle + '";',
            '    "Section created successfully on page " + page.name;',
            '  } catch (error) {',
            '    "Error creating section: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Create Document Section");
    }

    // =================== DOCUMENT XML & STRUCTURE ===================

    /**
     * Get XML structure of the document
     */
    static async getDocumentXmlStructure(args) {
        const { includeTags = true, includeElements = true } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var result = "Document XML Structure:\\n";',
            '',
            '  if (' + includeTags + ') {',
            '    result += "XML Tags: " + doc.xmlTags.length + "\\n";',
            '    for (var i = 0; i < doc.xmlTags.length; i++) {',
            '      result += "- " + doc.xmlTags[i].name + "\\n";',
            '    }',
            '    result += "\\n";',
            '  }',
            '',
            '  if (' + includeElements + ') {',
            '    result += "XML Elements: " + doc.xmlElements.length + "\\n";',
            '    for (var i = 0; i < doc.xmlElements.length; i++) {',
            '      result += "- Element " + (i + 1) + "\\n";',
            '    }',
            '  }',
            '',
            '  result;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Get Document XML Structure");
    }

    /**
     * Export document as XML
     */
    static async exportDocumentXml(args) {
        const { filePath, includeImages = true, includeStyles = true } = args;
        const escapedFilePath = escapeJsxString(filePath);

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  try {',
            `    var xmlFile = File("${escapedFilePath}");`,
            '    doc.exportFile(ExportFormat.XML_TYPE, xmlFile, false);',
            '    "Document exported as XML successfully";',
            '  } catch (error) {',
            '    "Error exporting XML: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Export Document XML");
    }

    // =================== DOCUMENT CLOUD & COLLABORATION ===================

    /**
     * Save document to Adobe Creative Cloud
     */
    static async saveDocumentToCloud(args) {
        const { cloudName, includeAssets = true } = args;
        const escapedCloudName = escapeJsxString(cloudName);

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  try {',
            '    if (doc.isCloudDocument) {',
            '      doc.save();',
            '      "Cloud document saved successfully";',
            '    } else {',
            `      doc.saveACopyCloud("${escapedCloudName}");`,
            '      "Document saved to cloud as: ' + escapedCloudName + '";',
            '    }',
            '  } catch (error) {',
            '    "Error saving to cloud: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Save Document to Cloud");
    }

    /**
     * Open a document from Adobe Creative Cloud
     */
    static async openCloudDocument(args) {
        const { cloudDocumentId } = args;
        const escapedCloudDocumentId = escapeJsxString(cloudDocumentId);

        const script = [
            'try {',
            `  app.openCloudDocument("${escapedCloudDocumentId}");`,
            '  "Cloud document opened successfully";',
            '} catch (error) {',
            '  "Error opening cloud document: " + error.message;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Open Cloud Document");
    }

    // =================== DOCUMENT GRID & LAYOUT ===================

    /**
     * Get comprehensive grid settings for the document
     */
    static async getDocumentGridSettings() {
        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var result = "Document Grid Settings:\\n\\n";',
            '',
            '  result += "=== GRID PREFERENCES ===\\n";',
            '  try {',
            '    result += "Document Grid Color: " + doc.gridPreferences.documentGridColor + "\\n";',
            '  } catch (e) {',
            '    result += "Document Grid Color: Not available\\n";',
            '  }',
            '  try {',
            '    result += "Document Grid Increment: " + doc.gridPreferences.documentGridIncrement + "\\n";',
            '  } catch (e) {',
            '    result += "Document Grid Increment: Not available\\n";',
            '  }',
            '  try {',
            '    result += "Document Grid Subdivision: " + doc.gridPreferences.documentGridSubdivision + "\\n";',
            '  } catch (e) {',
            '    result += "Document Grid Subdivision: Not available\\n";',
            '  }',
            '  try {',
            '    result += "Grid View Threshold: " + doc.gridPreferences.gridViewThreshold + "\\n";',
            '  } catch (e) {',
            '    result += "Grid View Threshold: Not available\\n";',
            '  }',
            '',
            '  result += "\\n=== BASELINE GRID ===\\n";',
            '  try {',
            '    result += "Baseline Grid Color: " + doc.gridPreferences.baselineGridColor + "\\n";',
            '  } catch (e) {',
            '    result += "Baseline Grid Color: Not available\\n";',
            '  }',
            '  try {',
            '    result += "Baseline Grid Increment: " + doc.gridPreferences.baselineGridIncrement + "\\n";',
            '  } catch (e) {',
            '    result += "Baseline Grid Increment: Not available\\n";',
            '  }',
            '  try {',
            '    result += "Baseline Grid Offset: " + doc.gridPreferences.baselineGridOffset + "\\n";',
            '  } catch (e) {',
            '    result += "Baseline Grid Offset: Not available\\n";',
            '  }',
            '  try {',
            '    result += "Baseline Grid View Threshold: " + doc.gridPreferences.baselineGridViewThreshold + "\\n";',
            '  } catch (e) {',
            '    result += "Baseline Grid View Threshold: Not available\\n";',
            '  }',
            '',
            '  result += "\\n=== GRID ALIGNMENT ===\\n";',
            '  try {',
            '    result += "Grid Alignment: " + doc.gridPreferences.gridAlignment + "\\n";',
            '  } catch (e) {',
            '    result += "Grid Alignment: Not available\\n";',
            '  }',
            '',
            '  result;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Get Document Grid Settings");
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

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  try {',
            '    // Document Grid Settings',
            '    if ("' + (documentGridColor || '') + '") doc.gridPreferences.documentGridColor = "' + (documentGridColor || '') + '";',
            '    if ("' + (documentGridIncrement || '') + '") doc.gridPreferences.documentGridIncrement = "' + (documentGridIncrement || '') + '";',
            '    if (' + (documentGridSubdivision !== null) + ') doc.gridPreferences.documentGridSubdivision = ' + documentGridSubdivision + ';',
            '    if (' + (gridViewThreshold !== null) + ') doc.gridPreferences.gridViewThreshold = ' + gridViewThreshold + ';',
            '',
            '    // Baseline Grid Settings',
            '    if ("' + (baselineGridColor || '') + '") doc.gridPreferences.baselineGridColor = "' + (baselineGridColor || '') + '";',
            '    if ("' + (baselineGridIncrement || '') + '") doc.gridPreferences.baselineGridIncrement = "' + (baselineGridIncrement || '') + '";',
            '    if ("' + (baselineGridOffset || '') + '") doc.gridPreferences.baselineGridOffset = "' + (baselineGridOffset || '') + '";',
            '    if (' + (baselineGridViewThreshold !== null) + ') doc.gridPreferences.baselineGridViewThreshold = ' + baselineGridViewThreshold + ';',
            '',
            '    // Grid Alignment',
            '    if ("' + (gridAlignment || '') + '") doc.gridPreferences.gridAlignment = "' + (gridAlignment || '') + '";',
            '',
            '    "Document grid settings updated successfully";',
            '  } catch (error) {',
            '    "Error updating grid settings: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Set Document Grid Settings");
    }

    /**
     * Get layout preferences and settings
     */
    static async getDocumentLayoutPreferences() {
        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var result = "Document Layout Preferences:\\n\\n";',
            '',
            '  result += "=== ADJUST LAYOUT ===\\n";',
            '  try {',
            '    result += "Adjust Layout Enabled: " + doc.adjustLayoutPreferences.adjustLayout + "\\n";',
            '  } catch (e) {',
            '    result += "Adjust Layout Enabled: Not available\\n";',
            '  }',
            '  try {',
            '    result += "Adjust Layout Margins: " + doc.adjustLayoutPreferences.adjustLayoutMargins + "\\n";',
            '  } catch (e) {',
            '    result += "Adjust Layout Margins: Not available\\n";',
            '  }',
            '  try {',
            '    result += "Adjust Layout Page Breaks: " + doc.adjustLayoutPreferences.adjustLayoutPageBreaks + "\\n";',
            '  } catch (e) {',
            '    result += "Adjust Layout Page Breaks: Not available\\n";',
            '  }',
            '  try {',
            '    result += "Adjust Layout Rules: " + doc.adjustLayoutPreferences.adjustLayoutRules + "\\n";',
            '  } catch (e) {',
            '    result += "Adjust Layout Rules: Not available\\n";',
            '  }',
            '',
            '  result += "\\n=== ALIGN & DISTRIBUTE ===\\n";',
            '  try {',
            '    result += "Align Distribute Bounds: " + doc.alignDistributePreferences.alignDistributeBounds + "\\n";',
            '  } catch (e) {',
            '    result += "Align Distribute Bounds: Not available\\n";',
            '  }',
            '  try {',
            '    result += "Align Distribute Spacing: " + doc.alignDistributePreferences.alignDistributeSpacing + "\\n";',
            '  } catch (e) {',
            '    result += "Align Distribute Spacing: Not available\\n";',
            '  }',
            '',
            '  result += "\\n=== SMART GUIDES ===\\n";',
            '  try {',
            '    result += "Smart Guide Preferences: " + doc.smartGuidePreferences.smartGuidePreferences + "\\n";',
            '  } catch (e) {',
            '    result += "Smart Guide Preferences: Not available\\n";',
            '  }',
            '',
            '  result;',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Get Document Layout Preferences");
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

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  try {',
            '    // Adjust Layout Settings',
            '    if (' + (adjustLayout !== null) + ') doc.adjustLayoutPreferences.adjustLayout = ' + adjustLayout + ';',
            '    if (' + (adjustLayoutMargins !== null) + ') doc.adjustLayoutPreferences.adjustLayoutMargins = ' + adjustLayoutMargins + ';',
            '    if (' + (adjustLayoutPageBreaks !== null) + ') doc.adjustLayoutPreferences.adjustLayoutPageBreaks = ' + adjustLayoutPageBreaks + ';',
            '    if ("' + (adjustLayoutRules || '') + '") doc.adjustLayoutPreferences.adjustLayoutRules = "' + (adjustLayoutRules || '') + '";',
            '',
            '    // Align & Distribute Settings',
            '    if ("' + (alignDistributeBounds || '') + '") doc.alignDistributePreferences.alignDistributeBounds = "' + (alignDistributeBounds || '') + '";',
            '    if ("' + (alignDistributeSpacing || '') + '") doc.alignDistributePreferences.alignDistributeSpacing = "' + (alignDistributeSpacing || '') + '";',
            '',
            '    // Smart Guide Settings',
            '    if (' + (smartGuidePreferences !== null) + ') doc.smartGuidePreferences.smartGuidePreferences = ' + smartGuidePreferences + ';',
            '',
            '    "Document layout preferences updated successfully";',
            '  } catch (error) {',
            '    "Error updating layout preferences: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Set Document Layout Preferences");
    }

    // =================== DOCUMENT VALIDATION & CLEANUP ===================

    /**
     * Validate document structure and content
     */
    static async validateDocument(args) {
        const { checkLinks = true, checkFonts = true, checkImages = true, checkStyles = false } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var validation = {',
            '    isValid: true,',
            '    issues: []',
            '  };',
            '',
            '  try {',
            '    if (' + checkLinks + ') {',
            '      for (var i = 0; i < doc.links.length; i++) {',
            '        if (!doc.links[i].isValid) {',
            '          validation.issues.push("Broken link: " + doc.links[i].name);',
            '          validation.isValid = false;',
            '        }',
            '      }',
            '    }',
            '',
            '    if (' + checkFonts + ') {',
            '      for (var i = 0; i < doc.fonts.length; i++) {',
            '        if (!doc.fonts[i].isValid) {',
            '          validation.issues.push("Missing font: " + doc.fonts[i].name);',
            '          validation.isValid = false;',
            '        }',
            '      }',
            '    }',
            '',
            '    JSON.stringify(validation);',
            '  } catch (error) {',
            '    "Error validating document: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Validate Document");
    }

    /**
     * Clean up document (remove unused elements)
     */
    static async cleanupDocument(args) {
        const { removeUnusedStyles = false, removeUnusedColors = false, removeUnusedLayers = false, removeHiddenElements = false } = args;

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var cleanup = {',
            '    actions: [],',
            '    removedItems: 0',
            '  };',
            '',
            '  try {',
            '    if (' + removeUnusedStyles + ') {',
            '      var unusedStyles = doc.unusedSwatches;',
            '      cleanup.removedItems += unusedStyles.length;',
            '      cleanup.actions.push("Found " + unusedStyles.length + " unused styles");',
            '    }',
            '',
            '    if (' + removeUnusedColors + ') {',
            '      var unusedColors = doc.unusedSwatches;',
            '      cleanup.removedItems += unusedColors.length;',
            '      cleanup.actions.push("Found " + unusedColors.length + " unused colors");',
            '    }',
            '',
            '    JSON.stringify(cleanup);',
            '  } catch (error) {',
            '    "Error cleaning up document: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Cleanup Document");
    }
} 