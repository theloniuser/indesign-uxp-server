# InDesign UXP MCP Server

A Model Context Protocol (MCP) server that gives AI assistants direct, native control over Adobe InDesign via a UXP plugin bridge. ~130 tools covering the full InDesign feature set — documents, pages, text, graphics, styles, master spreads, books, and export.

---

## Why UXP vs AppleScript

This server is a ground-up rewrite of the AppleScript-based [indesign-mcp-server](https://github.com/zachshallbetter/indesign-mcp-server). The execution model is fundamentally different.

| | AppleScript (original) | UXP (this fork) |
|---|---|---|
| **Platform** | macOS only | macOS + Windows |
| **Execution path** | Node → temp JSX file → AppleScript → InDesign | Node → HTTP → WebSocket → InDesign plugin |
| **Speed** | Slow — 3 hops, disk write per call | Fast — direct in-process call |
| **Reliability** | Flaky — breaks if InDesign loses focus or system dialogs appear | Stable — not affected by focus or system state |
| **Return values** | Strings only (last evaluated expression) | Full structured JSON objects |
| **JS version** | ExtendScript (ES3 — no `const`, arrow functions, or `async/await`) | Modern JS (ES2015+ — `async/await`, destructuring, arrow functions) |
| **Error messages** | Cryptic AppleScript/OSA errors | Structured JSON with clear error strings |
| **String handling** | Manual `escapeJsxString()` for every value | `JSON.stringify()` throughout — safe and simple |
| **Enums** | Magic strings like `'PDF_TYPE'` | Typed enums via `require('indesign').ExportFormat.pdfType` |
| **Async support** | Not supported — synchronous only | Native `await` (e.g. `await doc.filePath`) |
| **Permissions** | macOS Automation + Accessibility in System Settings | None beyond InDesign plugin install |
| **Future-proofing** | ❌ Adobe is deprecating ExtendScript/CEP | ✅ UXP is Adobe's official modern platform |

**The short version**: The AppleScript version puppets InDesign from the outside via macOS automation, writing temp files and hoping nothing interrupts the chain. This version runs _inside_ InDesign as a first-class plugin — faster, more reliable, cross-platform, and built on the platform Adobe is investing in going forward.

---

## How It Works

```
Claude / MCP Client
       │
       ▼
  MCP Server (Node.js)
       │  POST /execute
       ▼
  Bridge HTTP Server (port 3000)
       │  WebSocket
       ▼
  UXP Plugin (inside InDesign)
       │  runs as async IIFE with `app` in scope
       ▼
  InDesign DOM
```

The UXP plugin maintains a persistent WebSocket connection to the bridge. When a tool is called, the handler sends a JS code string to the bridge, which forwards it to the plugin. The plugin runs it as `new Function('app', 'return (async () => { CODE })()')` and returns the result as JSON.

---

## Prerequisites

- Adobe InDesign 2024+ (UXP plugin support required)
- Node.js 18+
- macOS or Windows

---

## Setup

### 1. Install the UXP Plugin

Load the plugin via the UXP Developer Tool or InDesign's plugin manager:

```
plugin/
├── index.js        # Plugin entry point + WebSocket client
└── manifest.json   # Plugin manifest
```

### 2. Start the Bridge

```bash
# Kill any existing bridge processes
lsof -ti:3001 | xargs kill 2>/dev/null
lsof -ti:3000 | xargs kill 2>/dev/null

# Start the bridge
cd bridge && node server.js
```

### 3. Connect the Plugin

In InDesign: **Window → Plugins → InDesign Bridge**

The panel should show: `Connected to bridge ✓`

### 4. Start the MCP Server

```bash
npm install
npm start
```

### 5. Configure Claude

Add to `~/.claude.json` (or your MCP client config):

```json
{
  "mcpServers": {
    "indesign": {
      "command": "node",
      "args": ["/path/to/indesign-uxp-server/src/index.js"]
    }
  }
}
```

---

## Testing

```bash
# Quick sanity check (4 core tools)
node tests/test-uxp-handlers.js

# Full suite (27 tests across all handler categories)
node tests/test-all-handlers.js
```

Current status: **27/27 passing** across all handler categories.

---

## Tools

### Documents
`create_document` `open_document` `save_document` `close_document` `get_document_info` `get_document_preferences` `set_document_preferences` `get_document_elements` `get_document_styles` `get_document_colors` `get_document_layers` `get_document_stories` `get_document_hyperlinks` `create_document_hyperlink` `get_document_sections` `create_document_section` `get_document_grid_settings` `set_document_grid_settings` `get_document_layout_preferences` `set_document_layout_preferences` `get_document_xml_structure` `export_document_xml` `preflight_document` `validate_document` `cleanup_document` `data_merge` `save_document_to_cloud` `open_cloud_document` `view_document`

### Pages & Spreads
`add_page` `delete_page` `duplicate_page` `move_page` `get_page_info` `set_page_properties` `adjust_page_layout` `resize_page` `reframe_page` `navigate_to_page` `select_page` `zoom_to_page` `set_page_background` `create_page_guides` `place_file_on_page` `place_xml_on_page` `get_page_content_summary` `snapshot_page_layout` `delete_page_layout_snapshot` `delete_all_page_layout_snapshots` `list_spreads` `get_spread_info` `duplicate_spread` `move_spread` `delete_spread` `set_spread_properties` `create_spread_guides` `place_file_on_spread` `place_xml_on_spread` `select_spread` `get_spread_content_summary`

### Text & Tables
`create_text_frame` `edit_text_frame` `create_table` `populate_table` `find_replace_text` `find_text_in_document`

### Styles & Colors
`create_paragraph_style` `apply_paragraph_style` `create_character_style` `list_styles` `create_color_swatch` `list_color_swatches` `apply_color` `create_object_style` `list_object_styles` `apply_object_style`

### Graphics & Shapes
`place_image` `get_image_info` `create_rectangle` `create_ellipse` `create_polygon`

### Layers
`create_layer` `set_active_layer` `list_layers` `organize_document_layers`

### Page Items
`get_page_item_info` `select_page_item` `move_page_item` `resize_page_item` `set_page_item_properties` `duplicate_page_item` `delete_page_item` `list_page_items`

### Groups
`create_group` `create_group_from_items` `ungroup` `get_group_info` `add_item_to_group` `remove_item_from_group` `list_groups` `set_group_properties`

### Master Spreads
`create_master_spread` `list_master_spreads` `delete_master_spread` `duplicate_master_spread` `apply_master_spread` `get_master_spread_info` `create_master_text_frame` `create_master_rectangle` `create_master_guides` `detach_master_items` `remove_master_override`

### Export & Output
`export_pdf` `export_images` `export_epub` `package_document`

### Books
`create_book` `open_book` `list_books` `add_document_to_book` `synchronize_book` `repaginate_book` `export_book` `package_book` `preflight_book` `print_book` `get_book_info` `set_book_properties` `update_all_cross_references` `update_all_numbers` `update_chapter_and_paragraph_numbers`

### Utility
`execute_indesign_code` `get_session_info` `clear_session` `help`

---

## Architecture

```
src/
├── core/
│   ├── InDesignMCPServer.js    # MCP server, tool registration
│   ├── scriptExecutor.js       # executeViaUXP() — POSTs to bridge
│   └── sessionManager.js       # Page dimension tracking, smart positioning
├── handlers/
│   ├── documentHandlers.js
│   ├── pageHandlers.js
│   ├── textHandlers.js
│   ├── styleHandlers.js
│   ├── graphicsHandlers.js
│   ├── masterSpreadHandlers.js
│   ├── pageItemHandlers.js
│   ├── groupHandlers.js
│   ├── bookHandlers.js
│   ├── exportHandlers.js
│   └── utilityHandlers.js
├── types/                      # MCP tool schema definitions
└── utils/stringUtils.js

bridge/
└── server.js                   # HTTP (port 3000) + WebSocket (port 3001) bridge

plugin/
├── index.js                    # UXP plugin — runs code inside InDesign
└── manifest.json

tests/
├── test-uxp-handlers.js        # 4 core handler tests
└── test-all-handlers.js        # 27-test comprehensive suite
```

### Key UXP API Notes

- InDesign collections require `.item(n)` — bracket access `[n]` returns undefined
- `doc.filePath` is async — always `await` it in UXP code
- `exportFile(format, path)` — format arg is **first** (same as ExtendScript)
- Enums via `require('indesign')`: `ExportFormat.pdfType`, `ColorModel.process`, etc.
- Path strings work directly for `place()` and `exportFile()` — no UXP storage API needed
- Code runs as `async IIFE` — use `return` to return values, `await` works natively

---

## License

MIT
