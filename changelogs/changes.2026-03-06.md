# Session Changelog — 2026-03-06

## What Was Done

Fixed the InDesign UXP bridge server not auto-starting when Claude loads the MCP.

## Problem

The `indesign-uxp-server` MCP has two components:
1. **MCP server** (`src/index.js`) — started automatically by Claude via MCP config
2. **Bridge server** (`bridge/server.js`) — a WebSocket/HTTP relay that must be running separately for the UXP plugin to connect

The bridge server was not starting automatically, causing the InDesign Bridge Panel to show "Disconnected — retrying in 3s" indefinitely.

## Solution

Modified `src/index.js` to auto-spawn the bridge server on startup:
- Checks if port 3001 is already in use (bridge already running)
- If not, spawns `bridge/server.js` as a detached background process
- Waits 500ms for it to bind before starting the MCP server

## Files Modified

- `src/index.js` — added `ensureBridge()` logic using `net`, `child_process.spawn`, `url`, and `path` imports

## Next Steps

- Restart Claude Code so the MCP server reloads with the new code
- Verify the Bridge Panel in InDesign shows "Connected to bridge ✓"
