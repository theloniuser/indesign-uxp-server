/**
 * Main InDesign MCP Server class
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { allToolDefinitions } from '../types/index.js';
import {
    BookHandlers,
    DocumentHandlers,
    ExportHandlers,
    GraphicsHandlers,
    GroupHandlers,
    HelpHandlers,
    MasterSpreadHandlers,
    PageHandlers,
    PageItemHandlers,
    StyleHandlers,
    TextHandlers,
    UtilityHandlers
} from '../handlers/index.js';
import { formatResponse, formatErrorResponse } from '../utils/stringUtils.js';

export class InDesignMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'indesign-server-complete',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupToolHandlers();
    }

    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: allToolDefinitions,
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                const result = await this.handleToolCall(name, args ?? {});
                const response = { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                // Handlers report failure as { success: false } (formatErrorResponse); flag it
                // so MCP clients don't treat a failed call as a successful one.
                if (result && result.success === false) response.isError = true;
                return response;
            } catch (error) {
                return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
            }
        });
    }

    async handleToolCall(name, args) {
        // Document Management
        switch (name) {
            case 'get_document_info': return await DocumentHandlers.getDocumentInfo();
            case 'create_document': return await DocumentHandlers.createDocument(args);
            case 'open_document': return await DocumentHandlers.openDocument(args);
            case 'save_document': return await DocumentHandlers.saveDocument(args);
            case 'close_document': return await DocumentHandlers.closeDocument(args);

            // Document Advanced Tools
            case 'preflight_document': return await DocumentHandlers.preflightDocument(args);
            case 'zoom_to_page': return await DocumentHandlers.zoomToPage(args);
            case 'data_merge': return await DocumentHandlers.dataMerge(args);

            // Document Elements & Styles
            case 'get_document_elements': return await DocumentHandlers.getDocumentElements(args);
            case 'get_document_styles': return await DocumentHandlers.getDocumentStyles(args);
            case 'get_document_colors': return await DocumentHandlers.getDocumentColors(args);

            // Document Preferences
            case 'get_document_preferences': return await DocumentHandlers.getDocumentPreferences(args);
            case 'set_document_preferences': return await DocumentHandlers.setDocumentPreferences(args);

            // Document Stories & Text
            case 'get_document_stories': return await DocumentHandlers.getDocumentStories(args);
            case 'find_text_in_document': return await DocumentHandlers.findTextInDocument(args);

            // Document Layers & Organization
            case 'get_document_layers': return await DocumentHandlers.getDocumentLayers(args);
            case 'organize_document_layers': return await DocumentHandlers.organizeDocumentLayers(args);

            // Document Hyperlinks & Interactivity
            case 'get_document_hyperlinks': return await DocumentHandlers.getDocumentHyperlinks(args);
            case 'create_document_hyperlink': return await DocumentHandlers.createDocumentHyperlink(args);

            // Document Sections & Numbering
            case 'get_document_sections': return await DocumentHandlers.getDocumentSections();
            case 'create_document_section': return await DocumentHandlers.createDocumentSection(args);

            // Document XML & Structure
            case 'get_document_xml_structure': return await DocumentHandlers.getDocumentXmlStructure(args);
            case 'export_document_xml': return await DocumentHandlers.exportDocumentXml(args);

            // Document Cloud & Collaboration
            case 'save_document_to_cloud': return await DocumentHandlers.saveDocumentToCloud(args);
            case 'open_cloud_document': return await DocumentHandlers.openCloudDocument(args);

            // Document Grid & Layout
            case 'get_document_grid_settings': return await DocumentHandlers.getDocumentGridSettings();
            case 'set_document_grid_settings': return await DocumentHandlers.setDocumentGridSettings(args);
            case 'get_document_layout_preferences': return await DocumentHandlers.getDocumentLayoutPreferences();
            case 'set_document_layout_preferences': return await DocumentHandlers.setDocumentLayoutPreferences(args);

            // Document Validation & Cleanup
            case 'validate_document': return await DocumentHandlers.validateDocument(args);
            case 'cleanup_document': return await DocumentHandlers.cleanupDocument(args);

            // Page Management
            case 'add_page': return await PageHandlers.addPage(args);
            case 'get_page_info': return await PageHandlers.getPageInfo(args);
            case 'navigate_to_page': return await PageHandlers.navigateToPage(args);

            // Advanced Page Management
            case 'duplicate_page': return await PageHandlers.duplicatePage(args);
            case 'move_page': return await PageHandlers.movePage(args);
            case 'delete_page': return await PageHandlers.deletePage(args);
            case 'set_page_properties': return await PageHandlers.setPageProperties(args);
            case 'set_page_background': return await PageHandlers.setPageBackground(args);
            case 'adjust_page_layout': return await PageHandlers.adjustPageLayout(args);
            case 'resize_page': return await PageHandlers.resizePage(args);
            case 'create_page_guides': return await PageHandlers.createPageGuides(args);
            case 'place_file_on_page': return await PageHandlers.placeFileOnPage(args);
            case 'place_xml_on_page': return await PageHandlers.placeXmlOnPage(args);
            case 'snapshot_page_layout': return await PageHandlers.snapshotPageLayout(args);
            case 'delete_page_layout_snapshot': return await PageHandlers.deletePageLayoutSnapshot(args);
            case 'delete_all_page_layout_snapshots': return await PageHandlers.deleteAllPageLayoutSnapshots(args);
            case 'reframe_page': return await PageHandlers.reframePage(args);
            case 'select_page': return await PageHandlers.selectPage(args);
            case 'get_page_content_summary': return await PageHandlers.getPageContentSummary(args);

            // Text Management
            case 'create_text_frame': return await TextHandlers.createTextFrame(args);
            case 'edit_text_frame': return await TextHandlers.editTextFrame(args);
            case 'create_table': return await TextHandlers.createTable(args);
            case 'populate_table': return await TextHandlers.populateTable(args);
            case 'find_replace_text': return await TextHandlers.findReplaceText(args);

            // Graphics Management
            case 'create_rectangle': return await GraphicsHandlers.createRectangle(args);
            case 'create_ellipse': return await GraphicsHandlers.createEllipse(args);
            case 'create_polygon': return await GraphicsHandlers.createPolygon(args);
            case 'place_image': return await GraphicsHandlers.placeImage(args);
            case 'create_object_style': return await GraphicsHandlers.createObjectStyle(args);
            case 'list_object_styles': return await GraphicsHandlers.listObjectStyles();
            case 'apply_object_style': return await GraphicsHandlers.applyObjectStyle(args);
            case 'get_image_info': return await GraphicsHandlers.getImageInfo(args);

            // Style Management
            case 'create_paragraph_style': return await StyleHandlers.createParagraphStyle(args);
            case 'create_character_style': return await StyleHandlers.createCharacterStyle(args);
            case 'apply_paragraph_style': return await StyleHandlers.applyParagraphStyle(args);
            case 'apply_character_style': return await StyleHandlers.applyCharacterStyle(args);
            case 'apply_color': return await StyleHandlers.applyColor(args);
            case 'create_color_swatch': return await StyleHandlers.createColorSwatch(args);
            case 'list_styles': return await StyleHandlers.listStyles(args);
            case 'list_color_swatches': return await StyleHandlers.listColorSwatches();

            // Export Functions
            case 'export_pdf': return await ExportHandlers.exportPDF(args);
            case 'export_images': return await ExportHandlers.exportImages(args);
            case 'package_document': return await ExportHandlers.packageDocument(args);

            // Master Spread Management
            case 'create_master_spread': return await MasterSpreadHandlers.createMasterSpread(args);
            case 'list_master_spreads': return await MasterSpreadHandlers.listMasterSpreads(args);
            case 'delete_master_spread': return await MasterSpreadHandlers.deleteMasterSpread(args);
            case 'duplicate_master_spread': return await MasterSpreadHandlers.duplicateMasterSpread(args);
            case 'apply_master_spread': return await MasterSpreadHandlers.applyMasterSpread(args);
            case 'create_master_text_frame': return await MasterSpreadHandlers.createMasterTextFrame(args);
            case 'create_master_rectangle': return await MasterSpreadHandlers.createMasterRectangle(args);
            case 'create_master_guides': return await MasterSpreadHandlers.createMasterGuides(args);
            case 'get_master_spread_info': return await MasterSpreadHandlers.getMasterSpreadInfo(args);

            // Book Management
            case 'create_book': return await BookHandlers.createBook(args);
            case 'open_book': return await BookHandlers.openBook(args);
            case 'list_books': return await BookHandlers.listBooks(args);
            case 'add_document_to_book': return await BookHandlers.addDocumentToBook(args);
            case 'synchronize_book': return await BookHandlers.synchronizeBook(args);
            case 'repaginate_book': return await BookHandlers.repaginateBook(args);
            case 'update_all_cross_references': return await BookHandlers.updateAllCrossReferences(args);
            case 'update_all_numbers': return await BookHandlers.updateAllNumbers(args);
            case 'update_chapter_and_paragraph_numbers': return await BookHandlers.updateChapterAndParagraphNumbers(args);
            case 'export_book': return await BookHandlers.exportBook(args);
            case 'package_book': return await BookHandlers.packageBook(args);
            case 'preflight_book': return await BookHandlers.preflightBook(args);
            case 'print_book': return await BookHandlers.printBook(args);
            case 'get_book_info': return await BookHandlers.getBookInfo(args);
            case 'set_book_properties': return await BookHandlers.setBookProperties(args);

            // PageItem Management
            case 'get_page_item_info': return await PageItemHandlers.getPageItemInfo(args);
            case 'select_page_item': return await PageItemHandlers.selectPageItem(args);
            case 'move_page_item': return await PageItemHandlers.movePageItem(args);
            case 'resize_page_item': return await PageItemHandlers.resizePageItem(args);
            case 'set_page_item_properties': return await PageItemHandlers.setPageItemProperties(args);
            case 'duplicate_page_item': return await PageItemHandlers.duplicatePageItem(args);
            case 'delete_page_item': return await PageItemHandlers.deletePageItem(args);
            case 'list_page_items': return await PageItemHandlers.listPageItems(args);

            // Group Management
            case 'create_group': return await GroupHandlers.createGroup(args);
            case 'create_group_from_items': return await GroupHandlers.createGroupFromItems(args);
            case 'ungroup': return await GroupHandlers.ungroup(args);
            case 'get_group_info': return await GroupHandlers.getGroupInfo(args);
            case 'add_item_to_group': return await GroupHandlers.addItemToGroup(args);
            case 'remove_item_from_group': return await GroupHandlers.removeItemFromGroup(args);
            case 'list_groups': return await GroupHandlers.listGroups(args);
            case 'set_group_properties': return await GroupHandlers.setGroupProperties(args);

            // Utility Functions
            case 'execute_indesign_code': return await UtilityHandlers.executeInDesignCode(args);
            case 'view_document': return await UtilityHandlers.viewDocument();
            case 'get_session_info': return await UtilityHandlers.getSessionInfo();
            case 'clear_session': return await UtilityHandlers.clearSession();

            // Help System
            case 'help': return await HelpHandlers.getHelp(args);

            // Add more handlers as we create them
            default:
                return formatErrorResponse(`Tool '${name}' not found or not implemented. Use 'help' to see available tools.`, "Tool Call");
        }
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        // Don't log to stdout as it interferes with MCP protocol
        // console.log('InDesign MCP Server started');
    }
} 