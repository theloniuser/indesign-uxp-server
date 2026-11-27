/**
 * Content tool definitions for InDesign MCP Server
 * Text, graphics, styling, and content management functionality
 */

export const contentToolDefinitions = [
    // =================== TEXT MANAGEMENT ===================
    {
        name: 'create_text_frame',
        description: 'Create a text frame on the specified page (defaults to active page in InDesign UI)',
        inputSchema: {
            type: 'object',
            properties: {
                content: { type: 'string', description: 'Text content for the frame' },
                x: { type: 'number', description: 'X position in mm', default: 10 },
                y: { type: 'number', description: 'Y position in mm', default: 10 },
                width: { type: 'number', description: 'Width in mm', default: 100 },
                height: { type: 'number', description: 'Height in mm', default: 50 },
                pageIndex: { type: 'number', description: 'Page index (0-based). Omit to use the active page in InDesign.' },
                fontSize: { type: 'number', description: 'Font size in points', default: 12 },
                fontName: { type: 'string', description: 'Font name (use format: FontName\\tStyle)', default: 'Arial\\tRegular' },
                textColor: { type: 'string', description: 'Text color (RGB hex or name)', default: 'Black' },
                alignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFY'], default: 'LEFT' },
                paragraphStyle: { type: 'string', description: 'Paragraph style name to apply during creation' },
                characterStyle: { type: 'string', description: 'Character style name to apply during creation' },
            },
            required: ['content'],
        },
    },
    {
        name: 'edit_text_frame',
        description: 'Edit an existing text frame',
        inputSchema: {
            type: 'object',
            properties: {
                frameIndex: { type: 'number', description: 'Index of the text frame to edit' },
                content: { type: 'string', description: 'New text content' },
                fontSize: { type: 'number', description: 'Font size in points' },
                fontName: { type: 'string', description: 'Font name' },
                textColor: { type: 'string', description: 'Text color (RGB hex or name)' },
                alignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFY'] },
            },
            required: ['frameIndex'],
        },
    },
    {
        name: 'find_replace_text',
        description: 'Find and replace text in the document',
        inputSchema: {
            type: 'object',
            properties: {
                findText: { type: 'string', description: 'Text to find' },
                replaceText: { type: 'string', description: 'Text to replace with' },
                caseSensitive: { type: 'boolean', description: 'Case sensitive search', default: false },
                wholeWord: { type: 'boolean', description: 'Whole word search', default: false },
            },
            required: ['findText', 'replaceText'],
        },
    },
    {
        name: 'create_table',
        description: 'Create a table on the specified page (defaults to active page in InDesign UI)',
        inputSchema: {
            type: 'object',
            properties: {
                rows: { type: 'number', description: 'Number of rows', default: 3 },
                columns: { type: 'number', description: 'Number of columns', default: 3 },
                x: { type: 'number', description: 'X position in mm' },
                y: { type: 'number', description: 'Y position in mm' },
                width: { type: 'number', description: 'Table width in mm' },
                height: { type: 'number', description: 'Table height in mm' },
                pageIndex: { type: 'number', description: 'Page index (0-based). Omit to use the active page in InDesign.' },
                headerRows: { type: 'number', description: 'Number of header rows', default: 1 },
                headerColumns: { type: 'number', description: 'Number of header columns', default: 0 },
            },
            required: ['rows', 'columns'],
        },
    },
    {
        name: 'populate_table',
        description: 'Populate a table with data',
        inputSchema: {
            type: 'object',
            properties: {
                tableIndex: { type: 'number', description: 'Table index', default: 0 },
                data: { type: 'array', description: 'Array of arrays containing table data' },
                startRow: { type: 'number', description: 'Starting row index', default: 0 },
                startColumn: { type: 'number', description: 'Starting column index', default: 0 },
            },
            required: ['data'],
        },
    },

    // =================== GRAPHICS MANAGEMENT ===================
    {
        name: 'place_image',
        description: 'Place an image on the specified page (defaults to active page in InDesign UI)',
        inputSchema: {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to the image file' },
                x: { type: 'number', description: 'X position in mm', default: 10 },
                y: { type: 'number', description: 'Y position in mm', default: 10 },
                width: { type: 'number', description: 'Width in mm' },
                height: { type: 'number', description: 'Height in mm' },
                pageIndex: { type: 'number', description: 'Page index (0-based). Omit to use the active page in InDesign.' },
                linkImage: { type: 'boolean', description: 'Link the image', default: true },
                scale: { type: 'number', description: 'Scale percentage (1-1000)', default: 100 },
                fitMode: {
                    type: 'string',
                    description: 'Image fitting mode',
                    enum: ['PROPORTIONALLY', 'FILL_FRAME', 'FIT_CONTENT', 'FIT_FRAME'],
                    default: 'PROPORTIONALLY'
                },
            },
            required: ['filePath'],
        },
    },
    {
        name: 'help',
        description: 'Get help information about available tools and their usage',
        inputSchema: {
            type: 'object',
            properties: {
                tool: {
                    type: 'string',
                    description: 'Specific tool name to get help for (optional)',
                },
                category: {
                    type: 'string',
                    description: 'Category of tools to list (optional)',
                    enum: ['document', 'page', 'text', 'graphics', 'styles', 'layout', 'export', 'all'],
                    default: 'all'
                },
                format: {
                    type: 'string',
                    description: 'Output format',
                    enum: ['summary', 'detailed', 'examples'],
                    default: 'summary'
                }
            },
        },
    },
    {
        name: 'create_rectangle',
        description: 'Create a rectangle on the specified page (defaults to active page in InDesign UI)',
        inputSchema: {
            type: 'object',
            properties: {
                x: { type: 'number', description: 'X position in mm' },
                y: { type: 'number', description: 'Y position in mm' },
                width: { type: 'number', description: 'Width in mm' },
                height: { type: 'number', description: 'Height in mm' },
                pageIndex: { type: 'number', description: 'Page index (0-based). Omit to use the active page in InDesign.' },
                fillColor: { type: 'string', description: 'Fill color (RGB hex or swatch name)' },
                strokeColor: { type: 'string', description: 'Stroke color' },
                strokeWidth: { type: 'number', description: 'Stroke width in points', default: 1 },
                cornerRadius: { type: 'number', description: 'Corner radius in mm', default: 0 },
            },
            required: ['x', 'y', 'width', 'height'],
        },
    },
    {
        name: 'create_ellipse',
        description: 'Create an ellipse on the specified page (defaults to active page in InDesign UI)',
        inputSchema: {
            type: 'object',
            properties: {
                x: { type: 'number', description: 'X position in mm' },
                y: { type: 'number', description: 'Y position in mm' },
                width: { type: 'number', description: 'Width in mm' },
                height: { type: 'number', description: 'Height in mm' },
                pageIndex: { type: 'number', description: 'Page index (0-based). Omit to use the active page in InDesign.' },
                fillColor: { type: 'string', description: 'Fill color (RGB hex or swatch name)' },
                strokeColor: { type: 'string', description: 'Stroke color' },
                strokeWidth: { type: 'number', description: 'Stroke width in points', default: 1 },
            },
            required: ['x', 'y', 'width', 'height'],
        },
    },
    {
        name: 'create_polygon',
        description: 'Create a polygon on the specified page (defaults to active page in InDesign UI)',
        inputSchema: {
            type: 'object',
            properties: {
                x: { type: 'number', description: 'X position in mm' },
                y: { type: 'number', description: 'Y position in mm' },
                width: { type: 'number', description: 'Width in mm' },
                height: { type: 'number', description: 'Height in mm' },
                pageIndex: { type: 'number', description: 'Page index (0-based). Omit to use the active page in InDesign.' },
                sides: { type: 'number', description: 'Number of sides', default: 6 },
                fillColor: { type: 'string', description: 'Fill color (RGB hex or swatch name)' },
                strokeColor: { type: 'string', description: 'Stroke color' },
                strokeWidth: { type: 'number', description: 'Stroke width in points', default: 1 },
            },
            required: ['x', 'y', 'width', 'height'],
        },
    },
    {
        name: 'create_object_style',
        description: 'Create an object style for consistent formatting',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Object style name' },
                fillColor: { type: 'string', description: 'Fill color (swatch name)' },
                strokeColor: { type: 'string', description: 'Stroke color (swatch name)' },
                strokeWeight: { type: 'number', description: 'Stroke weight in points', default: 1 },
                cornerRadius: { type: 'number', description: 'Corner radius in mm', default: 0 },
                transparency: { type: 'number', description: 'Transparency percentage (0-100)', default: 100 },
            },
            required: ['name'],
        },
    },
    {
        name: 'list_object_styles',
        description: 'List all object styles in the document',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'apply_object_style',
        description: 'Apply an object style to a page item',
        inputSchema: {
            type: 'object',
            properties: {
                styleName: { type: 'string', description: 'Object style name' },
                itemType: { type: 'string', enum: ['rectangle', 'ellipse', 'polygon'], default: 'rectangle' },
                itemIndex: { type: 'number', description: 'Item index', default: 0 },
            },
            required: ['styleName'],
        },
    },
    {
        name: 'get_image_info',
        description: 'Get detailed information about an image',
        inputSchema: {
            type: 'object',
            properties: {
                itemIndex: { type: 'number', description: 'Image index', default: 0 },
            },
        },
    },

    // =================== STYLES MANAGEMENT ===================
    {
        name: 'create_paragraph_style',
        description: 'Create a paragraph style',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Style name' },
                fontFamily: { type: 'string', description: 'Font family (use format: FontName\\tStyle)', default: 'Arial\\tRegular' },
                fontSize: { type: 'number', description: 'Font size in points', default: 12 },
                textColor: { type: 'string', description: 'Text color', default: 'Black' },
                alignment: { type: 'string', enum: ['LEFT_ALIGN', 'CENTER_ALIGN', 'RIGHT_ALIGN', 'JUSTIFY'], default: 'LEFT_ALIGN' },
                leading: { type: 'number', description: 'Line spacing in points' },
                spaceBefore: { type: 'number', description: 'Space before paragraph in points' },
                spaceAfter: { type: 'number', description: 'Space after paragraph in points' },
            },
            required: ['name'],
        },
    },
    {
        name: 'create_character_style',
        description: 'Create a character style',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Style name' },
                fontFamily: { type: 'string', description: 'Font family (use format: FontName\\tStyle)', default: 'Arial\\tRegular' },
                fontSize: { type: 'number', description: 'Font size in points', default: 12 },
                textColor: { type: 'string', description: 'Text color', default: 'Black' },
                bold: { type: 'boolean', description: 'Bold text', default: false },
                italic: { type: 'boolean', description: 'Italic text', default: false },
                underline: { type: 'boolean', description: 'Underline text', default: false },
            },
            required: ['name'],
        },
    },
    {
        name: 'apply_paragraph_style',
        description: 'Apply a paragraph style to text',
        inputSchema: {
            type: 'object',
            properties: {
                styleName: { type: 'string', description: 'Paragraph style name' },
                frameIndex: { type: 'number', description: 'Text frame index' },
            },
            required: ['styleName', 'frameIndex'],
        },
    },
    {
        name: 'apply_character_style',
        description: 'Apply a character style to a character range of a text frame on the first page',
        inputSchema: {
            type: 'object',
            properties: {
                styleName: { type: 'string', description: 'Character style name' },
                frameIndex: { type: 'number', description: 'Text frame index (0-based) on the first page', default: 0 },
                startIndex: { type: 'number', description: 'First character index (0-based)', default: 0 },
                endIndex: { type: 'number', description: 'Last character index, inclusive; -1 styles the whole text (startIndex ignored)', default: -1 },
            },
            required: ['styleName'],
        },
    },
    {
        name: 'list_styles',
        description: 'List all paragraph and character styles',
        inputSchema: {
            type: 'object',
            properties: {
                styleType: { type: 'string', enum: ['PARAGRAPH', 'CHARACTER', 'ALL'], default: 'ALL' },
            },
        },
    },

    // =================== COLORS MANAGEMENT ===================
    {
        name: 'create_color_swatch',
        description: 'Create a color swatch',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Swatch name' },
                colorType: { type: 'string', enum: ['PROCESS', 'SPOT'], default: 'PROCESS' },
                red: { type: 'number', description: 'Red value (0-255)' },
                green: { type: 'number', description: 'Green value (0-255)' },
                blue: { type: 'number', description: 'Blue value (0-255)' },
            },
            required: ['name', 'red', 'green', 'blue'],
        },
    },
    {
        name: 'list_color_swatches',
        description: 'List all color swatches',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'apply_color',
        description: 'Apply a color swatch as fill to an object on the first page',
        inputSchema: {
            type: 'object',
            properties: {
                colorName: { type: 'string', description: 'Color swatch name' },
                targetType: { type: 'string', enum: ['text', 'rectangle', 'ellipse'], default: 'text', description: 'text colors the text of a text frame' },
                frameIndex: { type: 'number', description: 'Index (0-based) of the target among that object type on the first page', default: 0 },
            },
            required: ['colorName'],
        },
    },
]; 