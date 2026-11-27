/**
 * Master Spread tool definitions for InDesign MCP Server
 * Master spread template management and functionality
 */

export const masterSpreadToolDefinitions = [
    // =================== MASTER SPREAD MANAGEMENT ===================
    {
        name: 'create_master_spread',
        description: 'Create a new master spread',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Master spread name' },
                baseName: { type: 'string', description: 'Base name for the master spread' },
                namePrefix: { type: 'string', description: 'Name prefix for the master spread' },
                pageColor: { type: 'string', description: 'Page color (RGB values as comma-separated string or UI color name)' },
                showMasterItems: { type: 'boolean', description: 'Show master items on document pages', default: true },
            },
            required: ['name'],
        },
    },
    {
        name: 'list_master_spreads',
        description: 'List all master spreads in the document',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'delete_master_spread',
        description: 'Delete a master spread',
        inputSchema: {
            type: 'object',
            properties: {
                masterIndex: { type: 'number', description: 'Master spread index (0-based, as returned by list_master_spreads)' },
            },
            required: ['masterIndex'],
        },
    },
    {
        name: 'duplicate_master_spread',
        description: 'Duplicate a master spread',
        inputSchema: {
            type: 'object',
            properties: {
                masterIndex: { type: 'number', description: 'Master spread index to duplicate (0-based)' },
                position: { type: 'string', enum: ['AT_END', 'AT_BEGINNING', 'BEFORE', 'AFTER'], default: 'AT_END' },
                referenceMaster: { type: 'number', description: 'Reference master spread index (for BEFORE/AFTER)' },
            },
            required: ['masterIndex'],
        },
    },
    {
        name: 'apply_master_spread',
        description: 'Apply a master spread to pages',
        inputSchema: {
            type: 'object',
            properties: {
                masterName: { type: 'string', description: 'Master spread name to apply' },
                pageRange: { type: 'string', description: 'Page range (e.g., "1-5", "all")', default: 'all' },
            },
            required: ['masterName'],
        },
    },
    {
        name: 'create_master_text_frame',
        description: 'Create a text frame on a master spread',
        inputSchema: {
            type: 'object',
            properties: {
                masterName: { type: 'string', description: 'Master spread name' },
                content: { type: 'string', description: 'Text content for the frame' },
                x: { type: 'number', description: 'X position in mm', default: 10 },
                y: { type: 'number', description: 'Y position in mm', default: 10 },
                width: { type: 'number', description: 'Width in mm', default: 100 },
                height: { type: 'number', description: 'Height in mm', default: 50 },
                fontSize: { type: 'number', description: 'Font size in points', default: 12 },
                fontFamily: { type: 'string', description: 'Font family name', default: 'Helvetica Neue' },
                textColor: { type: 'string', description: 'Text color (RGB hex or name)', default: 'Black' },
                alignment: { type: 'string', enum: ['LEFT_ALIGN', 'CENTER_ALIGN', 'RIGHT_ALIGN', 'JUSTIFY'], default: 'LEFT_ALIGN' },
                isPrimaryTextFrame: { type: 'boolean', description: 'Set as primary text frame', default: false },
            },
            required: ['masterName', 'content'],
        },
    },
    {
        name: 'create_master_rectangle',
        description: 'Create a rectangle on a master spread',
        inputSchema: {
            type: 'object',
            properties: {
                masterName: { type: 'string', description: 'Master spread name' },
                x: { type: 'number', description: 'X position in mm' },
                y: { type: 'number', description: 'Y position in mm' },
                width: { type: 'number', description: 'Width in mm' },
                height: { type: 'number', description: 'Height in mm' },
                fillColor: { type: 'string', description: 'Fill color (RGB hex or swatch name)' },
                strokeColor: { type: 'string', description: 'Stroke color' },
                strokeWidth: { type: 'number', description: 'Stroke width in points', default: 1 },
                cornerRadius: { type: 'number', description: 'Corner radius in mm', default: 0 },
            },
            required: ['masterName', 'x', 'y', 'width', 'height'],
        },
    },
    {
        name: 'create_master_guides',
        description: 'Create guides on a master spread',
        inputSchema: {
            type: 'object',
            properties: {
                masterName: { type: 'string', description: 'Master spread name' },
                numberOfRows: { type: 'number', description: 'Number of rows', default: 0 },
                numberOfColumns: { type: 'number', description: 'Number of columns', default: 0 },
                rowGutter: { type: 'number', description: 'Row gutter in mm', default: 5 },
                columnGutter: { type: 'number', description: 'Column gutter in mm', default: 5 },
                guideColor: { type: 'string', description: 'Guide color (RGB values as comma-separated string or UI color name)', default: 'BLUE' },
                fitMargins: { type: 'boolean', description: 'Fit guides to margins', default: true },
                removeExisting: { type: 'boolean', description: 'Remove existing guides', default: false },
                layerName: { type: 'string', description: 'Layer name to create guides on' },
            },
            required: ['masterName'],
        },
    },
    {
        name: 'get_master_spread_info',
        description: 'Get detailed information about a master spread',
        inputSchema: {
            type: 'object',
            properties: {
                masterIndex: { type: 'number', description: 'Master spread index (0-based)' },
            },
            required: ['masterIndex'],
        },
    },
]; 