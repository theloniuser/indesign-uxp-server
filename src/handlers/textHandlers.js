/**
 * Text frame handlers
 */
import { ScriptExecutor } from '../core/scriptExecutor.js';
import { formatResponse, formatErrorResponse, escapeJsxString } from '../utils/stringUtils.js';
import { sessionManager } from '../core/sessionManager.js';

export class TextHandlers {
    /**
     * Create a text frame on the active page
     */
    static async createTextFrame(args) {
        const {
            content,
            x,
            y,
            width,
            height,
            fontSize = 12,
            fontName = 'Arial\\tRegular',
            textColor = 'Black',
            alignment = 'LEFT',
            paragraphStyle = null,
            characterStyle = null
        } = args;

        // Use session manager for positioning if coordinates not provided
        const positioning = sessionManager.getCalculatedPositioning({ x, y, width, height });

        // Validate positioning before creating content
        const validation = sessionManager.validatePositioning(positioning.x, positioning.y, positioning.width, positioning.height);
        if (!validation.valid) {
            // Apply suggested corrections if available, otherwise use safe defaults
            if (validation.suggested) {
                Object.assign(positioning, validation.suggested);
            } else {
                // Fallback to safe positioning
                const safePos = sessionManager.getCalculatedPositioning({});
                Object.assign(positioning, safePos);
            }
        }

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const page = doc.pages.item(0);
            const frame = page.textFrames.add();
            frame.geometricBounds = [${positioning.y}, ${positioning.x}, ${positioning.y + positioning.height}, ${positioning.x + positioning.width}];
            frame.contents = ${JSON.stringify(content)};

            let styleMessage = '';
            const paragraphStyleName = ${JSON.stringify(paragraphStyle)};
            const characterStyleName = ${JSON.stringify(characterStyle)};

            if (paragraphStyleName) {
                try {
                    const pStyle = doc.paragraphStyles.itemByName(paragraphStyleName);
                    if (pStyle.isValid) {
                        frame.paragraphs.item(0).appliedParagraphStyle = pStyle;
                        styleMessage += 'Paragraph style applied. ';
                    } else {
                        styleMessage += 'Paragraph style not found. ';
                    }
                } catch(e) {
                    styleMessage += 'Error applying paragraph style: ' + e.message + '. ';
                }
            }

            if (characterStyleName) {
                try {
                    const cStyle = doc.characterStyles.itemByName(characterStyleName);
                    if (cStyle.isValid) {
                        frame.texts.item(0).appliedCharacterStyle = cStyle;
                        styleMessage += 'Character style applied. ';
                    }
                } catch(e) {}
            }

            if (!paragraphStyleName && !characterStyleName) {
                try {
                    frame.texts.item(0).pointSize = ${fontSize};
                } catch(e) {}
                try {
                    frame.texts.item(0).appliedFont = app.fonts.itemByName(${JSON.stringify(fontName)});
                } catch(e) {
                    try { frame.texts.item(0).appliedFont = app.fonts.itemByName('Arial\\tRegular'); } catch(e2) {}
                }
                if (${JSON.stringify(textColor)} !== 'Black') {
                    try {
                        frame.texts.item(0).fillColor = doc.colors.itemByName(${JSON.stringify(textColor)});
                    } catch(e) {}
                }
                const alignMap = { CENTER: 'centerAlign', RIGHT: 'rightAlign', JUSTIFY: 'fullyJustified', LEFT: 'leftAlign' };
                const alignKey = alignMap[${JSON.stringify(alignment)}] || 'leftAlign';
                try { frame.texts.item(0).justification = alignKey; } catch(e) {}
            }

            return { success: true, message: 'Text frame created. ' + styleMessage };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);

        if (result?.success) {
            sessionManager.setLastCreatedItem({
                type: 'textFrame',
                content: content,
                position: positioning,
                fontSize: fontSize,
                fontName: fontName,
                paragraphStyle: paragraphStyle,
                characterStyle: characterStyle
            });
        }

        return result?.success ?
            formatResponse(result.message || 'Text frame created', "Create Text Frame") :
            formatErrorResponse(result?.error || 'Failed to create text frame', "Create Text Frame");
    }

    /**
     * Edit an existing text frame
     */
    static async editTextFrame(args) {
        const {
            frameIndex,
            content,
            fontSize,
            fontName,
            textColor,
            alignment
        } = args;

        const escapedContent = content ? escapeJsxString(content) : '';
        const escapedFontName = fontName ? escapeJsxString(fontName) : '';

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var page = doc.pages[0];',
            '',
            '  try {',
            `    if (${frameIndex} >= page.textFrames.length) {`,
            '      "Text frame index out of range";',
            '    } else {',
            `      var textFrame = page.textFrames[${frameIndex}];`,
            '',
            `      if ("${escapedContent}" !== "") {`,
            `        textFrame.contents = "${escapedContent}";`,
            '      }',
            '',
            `      if (${fontSize}) {`,
            `        textFrame.texts[0].pointSize = ${fontSize};`,
            '      }',
            '',
            `      if ("${escapedFontName}" !== "") {`,
            `        textFrame.texts[0].appliedFont = app.fonts.itemByName("${escapedFontName}");`,
            '      }',
            '',
            `      if ("${textColor}" !== "") {`,
            '      try {',
            `        textFrame.texts[0].fillColor = app.colors.itemByName("${textColor}");`,
            '      } catch (colorError) {',
            '        // Use default color if specified color not found',
            '      }',
            '      }',
            '',
            `      if ("${alignment}" !== "") {`,
            `        if ("${alignment}" === "CENTER") {`,
            '          textFrame.texts[0].justification = Justification.CENTER_ALIGN;',
            `        } else if ("${alignment}" === "RIGHT") {`,
            '          textFrame.texts[0].justification = Justification.RIGHT_ALIGN;',
            `        } else if ("${alignment}" === "JUSTIFY") {`,
            '          textFrame.texts[0].justification = Justification.FULLY_JUSTIFIED;',
            '        } else {',
            '          textFrame.texts[0].justification = Justification.LEFT_ALIGN;',
            '        }',
            '      }',
            '',
            '      "Text frame updated successfully";',
            '    }',
            '  } catch (error) {',
            '    "Error updating text frame: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Edit Text Frame");
    }

    /**
     * Create a table on the active page
     */
    static async createTable(args) {
        const {
            rows = 3,
            columns = 3,
            x,
            y,
            width,
            height,
            headerRows = 1,
            headerColumns = 0
        } = args;

        // Use session manager for positioning if coordinates not provided
        const positioning = sessionManager.getCalculatedPositioning({ x, y, width, height });

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var page = doc.pages[0];',
            '  var table;',
            '',
            '  try {',
            '    // Create text frame for table',
            '    var textFrame = page.textFrames.add();',
            `    textFrame.geometricBounds = [${positioning.y}, ${positioning.x}, ${positioning.y + positioning.height}, ${positioning.x + positioning.width}];`,
            '',
            '    // Create table',
            `    table = textFrame.insertionPoints[0].tables.add({bodyRowCount: ${rows}, bodyColumnCount: ${columns}});`,
            '',
            '    // Set header rows and columns',
            `    table.headerRowCount = ${headerRows};`,
            `    table.headerColumnCount = ${headerColumns};`,
            '',
            '    "Table created successfully";',
            '  } catch (error) {',
            '    "Error creating table: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);

        // Store the created item info in session
        sessionManager.setLastCreatedItem({
            type: 'table',
            rows: rows,
            columns: columns,
            position: positioning,
            headerRows: headerRows,
            headerColumns: headerColumns
        });

        return formatResponse(result, "Create Table");
    }

    /**
     * Populate a table with data
     */
    static async populateTable(args) {
        const {
            tableIndex = 0,
            data,
            startRow = 0,
            startColumn = 0
        } = args;

        if (!data || !Array.isArray(data)) {
            return formatResponse("Invalid data provided. Expected array of arrays.", "Populate Table");
        }

        const escapedData = data.map(row =>
            row.map(cell => escapeJsxString(cell.toString()))
        );

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var page = doc.pages[0];',
            '',
            '  try {',
            '    // Find table in text frames',
            '    var table = null;',
            '    var tableCount = 0;',
            '',
            '    for (var i = 0; i < page.textFrames.length; i++) {',
            '      var textFrame = page.textFrames[i];',
            '      if (textFrame.tables.length > 0) {',
            `        if (tableCount === ${tableIndex}) {`,
            '          table = textFrame.tables[0];',
            '          break;',
            '        }',
            '        tableCount++;',
            '      }',
            '    }',
            '',
            '    if (!table) {',
            `      "Table index ${tableIndex} not found";`,
            '    } else {',
            '      // Populate table with data',
            `      var data = ${JSON.stringify(escapedData)};`,
            `      var startRow = ${startRow};`,
            `      var startColumn = ${startColumn};`,
            '',
            '      for (var row = 0; row < data.length; row++) {',
            '        for (var col = 0; col < data[row].length; col++) {',
            '          var cellRow = startRow + row;',
            '          var cellCol = startColumn + col;',
            '',
            '          if (cellRow < table.rows.length && cellCol < table.columns.length) {',
            '            var cell = table.cells.item(cellRow, cellCol);',
            '            cell.contents = data[row][col];',
            '          }',
            '        }',
            '      }',
            '',
            '      "Table populated successfully";',
            '    }',
            '  } catch (error) {',
            '    "Error populating table: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Populate Table");
    }

    /**
     * Find and replace text in the document
     */
    static async findReplaceText(args) {
        const {
            findText,
            replaceText,
            caseSensitive = false,
            wholeWord = false
        } = args;

        const escapedFindText = escapeJsxString(findText);
        const escapedReplaceText = escapeJsxString(replaceText);

        const script = [
            'if (app.documents.length === 0) {',
            '  "No document open";',
            '} else {',
            '  var doc = app.activeDocument;',
            '  var findGrepPreferences = app.findGrepPreferences;',
            '  var changeGrepPreferences = app.changeGrepPreferences;',
            '',
            '  try {',
            '    // Clear previous preferences',
            '    findGrepPreferences.clear();',
            '    changeGrepPreferences.clear();',
            '',
            '    // Set find preferences',
            `    findGrepPreferences.findWhat = "${escapedFindText}";`,
            `    findGrepPreferences.caseSensitive = ${caseSensitive};`,
            `    findGrepPreferences.wholeWord = ${wholeWord};`,
            '',
            '    // Set change preferences',
            `    changeGrepPreferences.changeTo = "${escapedReplaceText}";`,
            '',
            '    // Perform find and replace',
            '    var foundItems = doc.changeGrep();',
            '',
            '    "Find and replace completed. Items changed: " + foundItems.length;',
            '  } catch (error) {',
            '    "Error during find and replace: " + error.message;',
            '  }',
            '}'
        ].join('\n');

        const result = await ScriptExecutor.executeInDesignScript(script);
        return formatResponse(result, "Find Replace Text");
    }
} 