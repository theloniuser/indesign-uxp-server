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
            pageIndex = null,
            fontSize = 12,
            fontName = 'Arial\\tRegular',
            textColor = 'Black',
            alignment = 'LEFT',
            paragraphStyle = null,
            characterStyle = null
        } = args;

        // H5: skip stale sessionManager validation when caller provides explicit coordinates
        const hasAllCoords = x !== undefined && y !== undefined && width !== undefined && height !== undefined;
        const positioning = hasAllCoords
            ? { x, y, width, height }
            : (() => {
                const pos = sessionManager.getCalculatedPositioning({ x, y, width, height });
                const validation = sessionManager.validatePositioning(pos.x, pos.y, pos.width, pos.height);
                if (!validation.valid) {
                    if (validation.suggested) Object.assign(pos, validation.suggested);
                    else Object.assign(pos, sessionManager.getCalculatedPositioning({}));
                }
                return pos;
            })();

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const _pi = ${JSON.stringify(pageIndex)};
            let page;
            if (_pi !== null) {
                if (_pi < 0 || _pi >= doc.pages.length) return { success: false, error: 'Page index out of range' };
                page = doc.pages.item(_pi);
            } else {
                try { page = doc.activePage; if (!page || !page.isValid) page = doc.pages.item(0); }
                catch(e) { page = doc.pages.item(0); }
            }
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

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const page = doc.pages.item(0);

            if (${frameIndex} >= page.textFrames.length) {
                return { success: false, error: 'Text frame index out of range' };
            }

            const textFrame = page.textFrames.item(${frameIndex});

            const newContent = ${JSON.stringify(content || '')};
            if (newContent !== '') {
                textFrame.contents = newContent;
            }

            const newFontSize = ${fontSize || 0};
            if (newFontSize) {
                try { textFrame.texts.item(0).pointSize = newFontSize; } catch(e) {}
            }

            const newFontName = ${JSON.stringify(fontName || '')};
            if (newFontName !== '') {
                try { textFrame.texts.item(0).appliedFont = app.fonts.itemByName(newFontName); } catch(e) {}
            }

            const newTextColor = ${JSON.stringify(textColor || '')};
            if (newTextColor !== '') {
                try { textFrame.texts.item(0).fillColor = doc.colors.itemByName(newTextColor); } catch(e) {}
            }

            const newAlignment = ${JSON.stringify(alignment || '')};
            if (newAlignment !== '') {
                const alignMap = { CENTER: 'centerAlign', RIGHT: 'rightAlign', JUSTIFY: 'fullyJustified', LEFT: 'leftAlign' };
                const alignKey = alignMap[newAlignment] || 'leftAlign';
                try { textFrame.texts.item(0).justification = alignKey; } catch(e) {}
            }

            return { success: true };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success ?
            formatResponse('Text frame updated successfully', "Edit Text Frame") :
            formatErrorResponse(result?.error || 'Failed to edit text frame', "Edit Text Frame");
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
            pageIndex = null,
            headerRows = 1,
            headerColumns = 0
        } = args;

        const hasAllCoords = x !== undefined && y !== undefined && width !== undefined && height !== undefined;
        const positioning = hasAllCoords
            ? { x, y, width, height }
            : sessionManager.getCalculatedPositioning({ x, y, width, height });

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const _pi = ${JSON.stringify(pageIndex)};
            let page;
            if (_pi !== null) {
                if (_pi < 0 || _pi >= doc.pages.length) return { success: false, error: 'Page index out of range' };
                page = doc.pages.item(_pi);
            } else {
                try { page = doc.activePage; if (!page || !page.isValid) page = doc.pages.item(0); }
                catch(e) { page = doc.pages.item(0); }
            }

            try {
                const textFrame = page.textFrames.add();
                textFrame.geometricBounds = [${positioning.y}, ${positioning.x}, ${positioning.y + positioning.height}, ${positioning.x + positioning.width}];

                const table = textFrame.insertionPoints.item(0).tables.add({
                    bodyRowCount: ${rows},
                    bodyColumnCount: ${columns}
                });

                table.headerRowCount = ${headerRows};
                table.headerColumnCount = ${headerColumns};

                return { success: true };
            } catch(e) {
                return { success: false, error: 'Error creating table: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);

        if (result?.success) {
            // Store the created item info in session
            sessionManager.setLastCreatedItem({
                type: 'table',
                rows: rows,
                columns: columns,
                position: positioning,
                headerRows: headerRows,
                headerColumns: headerColumns
            });
        }

        return result?.success ?
            formatResponse('Table created successfully', "Create Table") :
            formatErrorResponse(result?.error || 'Failed to create table', "Create Table");
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
            return formatErrorResponse("Invalid data provided. Expected array of arrays.", "Populate Table");
        }

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const page = doc.pages.item(0);

            try {
                let table = null;
                let tableCount = 0;

                for (let i = 0; i < page.textFrames.length; i++) {
                    const textFrame = page.textFrames.item(i);
                    if (textFrame.tables.length > 0) {
                        if (tableCount === ${tableIndex}) {
                            table = textFrame.tables.item(0);
                            break;
                        }
                        tableCount++;
                    }
                }

                if (!table) {
                    return { success: false, error: 'Table index ${tableIndex} not found' };
                }

                const cellData = ${JSON.stringify(data.map(row => row.map(cell => cell.toString())))};
                const startRow = ${startRow};
                const startColumn = ${startColumn};
                let changed = 0;

                for (let row = 0; row < cellData.length; row++) {
                    for (let col = 0; col < cellData[row].length; col++) {
                        const cellRow = startRow + row;
                        const cellCol = startColumn + col;
                        if (cellRow < table.rows.length && cellCol < table.columns.length) {
                            table.cells.item(cellRow, cellCol).contents = cellData[row][col];
                            changed++;
                        }
                    }
                }

                return { success: true, changed: changed };
            } catch(e) {
                return { success: false, error: 'Error populating table: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success ?
            formatResponse(`Table populated successfully (${result.changed} cells updated)`, "Populate Table") :
            formatErrorResponse(result?.error || 'Failed to populate table', "Populate Table");
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

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;

            try {
                app.findGrepPreferences = null;
                app.changeGrepPreferences = null;

                app.findGrepPreferences.findWhat = ${JSON.stringify(findText)};
                app.findGrepPreferences.caseSensitive = ${caseSensitive};
                app.findGrepPreferences.wholeWord = ${wholeWord};

                app.changeGrepPreferences.changeTo = ${JSON.stringify(replaceText)};

                try { app.findChangeGrepOptions.includeMasterPages = true; } catch(e) {}

                const changed = doc.changeGrep();
                const count = changed ? changed.length : 0;

                app.findGrepPreferences = null;
                app.changeGrepPreferences = null;

                return { success: true, count: count };
            } catch(e) {
                return { success: false, error: 'Error during find and replace: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success ?
            formatResponse(`Find and replace completed. Items changed: ${result.count}`, "Find Replace Text") :
            formatErrorResponse(result?.error || 'Failed to find and replace', "Find Replace Text");
    }
} 