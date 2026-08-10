/**
 * Page tool definitions for InDesign MCP Server
 * Page management and advanced page properties
 */

export const pageToolDefinitions = [
    // =================== BASIC PAGE MANAGEMENT ===================
    {
        name: 'add_page',
        description: 'Add a new page to the document',
        inputSchema: {
            type: 'object',
            properties: {
                position: { type: 'string', enum: ['AT_END', 'AT_BEGINNING', 'BEFORE', 'AFTER'], default: 'AT_END' },
                referencePage: { type: 'number', description: 'Reference page index (for BEFORE/AFTER positioning)' },
            },
        },
    },
    {
        name: 'delete_page',
        description: 'Delete a page from the document',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Index of the page to delete' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'duplicate_page',
        description: 'Duplicate a page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index to duplicate' },
                position: { type: 'string', enum: ['AT_END', 'AT_BEGINNING', 'BEFORE', 'AFTER'], default: 'AT_END' },
                referencePageIndex: { type: 'number', description: 'Reference page index (for BEFORE/AFTER positioning)' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'navigate_to_page',
        description: 'Navigate to a specific page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index to navigate to' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'get_page_info',
        description: 'Get detailed information about a specific page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index (0-based)' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'move_page',
        description: 'Move a page to a different position',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index to move' },
                position: { type: 'string', enum: ['AT_END', 'AT_BEGINNING', 'BEFORE', 'AFTER'], default: 'AT_END' },
                referencePageIndex: { type: 'number', description: 'Reference page index (for BEFORE/AFTER positioning)' },
                binding: { type: 'string', enum: ['DEFAULT_VALUE', 'LEFT_ALIGN', 'RIGHT_ALIGN'], default: 'DEFAULT_VALUE' },
            },
            required: ['pageIndex'],
        },
    },

    // =================== ADVANCED PAGE PROPERTIES ===================
    {
        name: 'set_page_properties',
        description: 'Set properties for a page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index' },
                label: { type: 'string', description: 'Page label' },
                pageColor: { type: 'string', description: 'Page color (RGB values as comma-separated string or UI color name)' },
                optionalPage: { type: 'boolean', description: 'Optional page for HTML5 pagination' },
                layoutRule: { type: 'string', enum: ['GUIDE_BASED', 'OBJECT_BASED', 'OFF', 'PRESERVE_EXISTING', 'RECENTER', 'SCALE', 'USE_MASTER'], description: 'Layout rule' },
                snapshotBlendingMode: { type: 'string', enum: ['FULL_SNAPSHOT_BLENDING', 'IGNORE_LAYOUT_SNAPSHOTS', 'LIMITED_SNAPSHOT_BLENDING', 'USE_NEAREST_SNAPSHOT'], description: 'Snapshot blending mode' },
                appliedTrapPreset: { type: 'string', description: 'Trap preset name to apply' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'adjust_page_layout',
        description: 'Adjust page layout with new dimensions and margins',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index' },
                width: { type: 'string', description: 'Page width (e.g., "600px", "8.5in")' },
                height: { type: 'string', description: 'Page height (e.g., "800px", "11in")' },
                bleedInside: { type: 'string', description: 'Inside bleed (e.g., "3mm")' },
                bleedTop: { type: 'string', description: 'Top bleed (e.g., "3mm")' },
                bleedOutside: { type: 'string', description: 'Outside bleed (e.g., "3mm")' },
                bleedBottom: { type: 'string', description: 'Bottom bleed (e.g., "3mm")' },
                leftMargin: { type: 'string', description: 'Left margin (e.g., "20mm")' },
                topMargin: { type: 'string', description: 'Top margin (e.g., "20mm")' },
                rightMargin: { type: 'string', description: 'Right margin (e.g., "20mm")' },
                bottomMargin: { type: 'string', description: 'Bottom margin (e.g., "20mm")' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'resize_page',
        description: 'Resize a page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index' },
                width: { type: 'number', description: 'New width in mm' },
                height: { type: 'number', description: 'New height in mm' },
                resizeMethod: { type: 'string', enum: ['REPLACING_CURRENT_DIMENSIONS_WITH', 'MULTIPLYING_CURRENT_DIMENSIONS_BY', 'ADDING_CURRENT_DIMENSIONS_TO', 'RESHAPING_AREA_TO_RATIO', 'RESHAPING_BORDER_TO_RATIO'], default: 'REPLACING_CURRENT_DIMENSIONS_WITH' },
                anchorPoint: { type: 'string', enum: ['TOP_LEFT_ANCHOR', 'TOP_CENTER_ANCHOR', 'TOP_RIGHT_ANCHOR', 'LEFT_CENTER_ANCHOR', 'CENTER_ANCHOR', 'RIGHT_CENTER_ANCHOR', 'BOTTOM_LEFT_ANCHOR', 'BOTTOM_CENTER_ANCHOR', 'BOTTOM_RIGHT_ANCHOR'], default: 'CENTER_ANCHOR' },
                coordinateSpace: { type: 'string', enum: ['PAGE_COORDINATES', 'SPREAD_COORDINATES', 'PASTEBOARD_COORDINATES'], default: 'PAGE_COORDINATES' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'place_file_on_page',
        description: 'Place a file on a page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index' },
                filePath: { type: 'string', description: 'Path to file to place' },
                x: { type: 'number', description: 'X position in mm', default: 10 },
                y: { type: 'number', description: 'Y position in mm', default: 10 },
                layerName: { type: 'string', description: 'Layer name to place on' },
                showingOptions: { type: 'boolean', description: 'Show import options dialog', default: false },
                autoflowing: { type: 'boolean', description: 'Autoflow placed text', default: false },
            },
            required: ['pageIndex', 'filePath'],
        },
    },
    {
        name: 'place_xml_on_page',
        description: 'Place XML content on a page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index' },
                xmlElementName: { type: 'string', description: 'XML element name to place' },
                x: { type: 'number', description: 'X position in mm', default: 10 },
                y: { type: 'number', description: 'Y position in mm', default: 10 },
                autoflowing: { type: 'boolean', description: 'Autoflow placed text', default: false },
            },
            required: ['pageIndex', 'xmlElementName'],
        },
    },
    {
        name: 'snapshot_page_layout',
        description: 'Create a snapshot of the current page layout',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'delete_page_layout_snapshot',
        description: 'Delete the layout snapshot for a page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'delete_all_page_layout_snapshots',
        description: 'Delete all layout snapshots for a page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'reframe_page',
        description: 'Reframe (resize) a page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index' },
                x1: { type: 'number', description: 'Top-left X coordinate in mm' },
                y1: { type: 'number', description: 'Top-left Y coordinate in mm' },
                x2: { type: 'number', description: 'Bottom-right X coordinate in mm' },
                y2: { type: 'number', description: 'Bottom-right Y coordinate in mm' },
                coordinateSpace: { type: 'string', enum: ['PAGE_COORDINATES', 'SPREAD_COORDINATES', 'PASTEBOARD_COORDINATES'], default: 'PAGE_COORDINATES' },
            },
            required: ['pageIndex', 'x1', 'y1', 'x2', 'y2'],
        },
    },
    {
        name: 'create_page_guides',
        description: 'Create guides on a page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index' },
                numberOfRows: { type: 'number', description: 'Number of rows', default: 0 },
                numberOfColumns: { type: 'number', description: 'Number of columns', default: 0 },
                rowGutter: { type: 'number', description: 'Row gutter in mm', default: 5 },
                columnGutter: { type: 'number', description: 'Column gutter in mm', default: 5 },
                guideColor: { type: 'string', description: 'Guide color (RGB values as comma-separated string or UI color name)', default: 'BLUE' },
                fitMargins: { type: 'boolean', description: 'Fit guides to margins', default: true },
                removeExisting: { type: 'boolean', description: 'Remove existing guides', default: false },
                layerName: { type: 'string', description: 'Layer name to create guides on' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'select_page',
        description: 'Select a page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index' },
                selectionMode: { type: 'string', enum: ['REPLACE_WITH', 'ADD_TO', 'REMOVE_FROM'], default: 'REPLACE_WITH' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'get_page_content_summary',
        description: 'Get a summary of content on a page',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index' },
            },
            required: ['pageIndex'],
        },
    },
    {
        name: 'set_page_background',
        description: 'Set page background by creating a full-page rectangle with specified color',
        inputSchema: {
            type: 'object',
            properties: {
                pageIndex: { type: 'number', description: 'Page index', default: 0 },
                backgroundColor: { type: 'string', description: 'Background color as RGB hex (e.g. #ffffff) or a color swatch name in the document', default: '#ffffff' },
                opacity: { type: 'number', description: 'Background opacity percentage (0-100)', default: 100 },
            },
        },
    },
]; 