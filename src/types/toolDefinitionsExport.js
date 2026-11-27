/**
 * Export tool definitions for InDesign MCP Server
 * Export, packaging, and production functionality
 */

export const exportToolDefinitions = [
    // =================== EXPORT MANAGEMENT ===================
    {
        name: 'export_pdf',
        description: 'Export document to PDF',
        inputSchema: {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Output PDF file path' },
                quality: { type: 'string', enum: ['PRESS', 'PRINT', 'SCREEN', 'DIGITAL'], default: 'PRINT' },
                includeMarks: { type: 'boolean', description: 'Include printer marks', default: false },
                includeBleed: { type: 'boolean', description: 'Include bleed', default: false },
                pages: { type: 'string', description: 'Page range (e.g., "1-5", "all")', default: 'all' },
            },
            required: ['filePath'],
        },
    },
    {
        name: 'export_images',
        description: 'Export pages as images, one file per page (page_<position>.jpg/.png)',
        inputSchema: {
            type: 'object',
            properties: {
                outputPath: { type: 'string', description: 'Absolute path of an existing output folder' },
                format: { type: 'string', enum: ['JPEG', 'PNG'], default: 'JPEG' },
                resolution: { type: 'number', description: 'Resolution in DPI', default: 300 },
                pages: { type: 'string', description: '1-based page positions in the document, e.g. "1,3,5-7" or "all" (not section page numbers)', default: 'all' },
                quality: { type: 'number', description: 'Quality 1-100, mapped to InDesign low/medium/high/maximum', default: 80 },
            },
            required: ['outputPath'],
        },
    },
    {
        name: 'package_document',
        description: 'Package document for printing',
        inputSchema: {
            type: 'object',
            properties: {
                outputPath: { type: 'string', description: 'Output directory path' },
                includeFonts: { type: 'boolean', description: 'Include fonts', default: true },
                includeLinks: { type: 'boolean', description: 'Include linked files', default: true },
                includeProfiles: { type: 'boolean', description: 'Include color profiles', default: true },
            },
            required: ['outputPath'],
        },
    },
]; 