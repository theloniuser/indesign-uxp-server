const { app } = require("indesign");
const { entrypoints } = require("uxp");

const statusEl = document.getElementById("status");

function serializeResult(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(serializeResult);
  if (typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      return String(value);
    }
  }
  return String(value);
}

// Whitelist: only 'indesign' and 'uxp' modules are allowed inside execute calls.
// Passing raw require into new Function() would otherwise expose the full module system.
const ALLOWED_MODULES = new Set(['indesign', 'uxp']);
function sandboxedRequire(moduleName) {
  if (!ALLOWED_MODULES.has(moduleName)) {
    throw new Error(`require('${moduleName}') is not allowed inside execute calls`);
  }
  return require(moduleName);
}

async function handleExecute(ws, msg) {
  let timerId;
  try {
    // Pass sandboxedRequire so code inside new Function() can call require('indesign') etc.
    // new Function() runs in global scope and loses UXP's module-scoped require.
    const fn = new Function('app', 'require', `return (async () => { ${msg.code} })()`);
    const result = await Promise.race([
      fn(app, sandboxedRequire).finally(() => clearTimeout(timerId)),
      new Promise((_, reject) => {
        timerId = setTimeout(() => reject(new Error('Execution timed out in plugin (25s)')), 25000);
      }),
    ]);
    ws.send(JSON.stringify({ type: 'result', id: msg.id, result: serializeResult(result) }));
  } catch (e) {
    clearTimeout(timerId);
    ws.send(JSON.stringify({ type: 'error', id: msg.id, error: e.message || String(e) }));
  }
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

// One live socket at a time. show() used to open a new socket every time the panel
// was shown, so reopening the panel left several sockets answering the bridge.
let activeSocket = null;
let retryTimer = null;

function connectToBridge() {
  if (activeSocket || retryTimer) return;
  let ws;
  try {
    ws = new WebSocket("ws://127.0.0.1:3001");
  } catch (e) {
    console.error("[Plugin] WebSocket could not be created:", e);
    setStatus("Bridge connection error — retrying in 3s");
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connectToBridge();
    }, 3000);
    return;
  }
  activeSocket = ws;

  ws.onopen = () => {
    setStatus("Connected to bridge ✓");
    console.log("[Plugin] Connected to bridge");
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      console.error("[Plugin] Invalid JSON:", event.data);
      return;
    }

    console.log("[Plugin] Received:", event.data.slice(0, 200));

    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', id: msg.id }));
    } else if (msg.type === 'execute') {
      handleExecute(ws, msg);
    }
  };

  ws.onerror = (err) => {
    setStatus("Bridge connection error");
    console.error("[Plugin] WebSocket error:", err);
  };

  ws.onclose = () => {
    if (activeSocket === ws) activeSocket = null;
    setStatus("Disconnected — retrying in 3s");
    if (!retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connectToBridge();
      }, 3000);
    }
  };
}

entrypoints.setup({
  panels: {
    mainPanel: {
      show() {
        try {
          const docCount = app.documents.length;
          console.log("[Plugin] DOM OK — open docs:", docCount);
        } catch (e) {
          console.error("[Plugin] DOM access failed:", e);
        }

        try {
          const result = new Function('return 1 + 1')();
          console.log("[Plugin] new Function() OK:", result);
        } catch (e) {
          console.error("[Plugin] new Function() failed:", e);
        }

        // No-op when already connected; reconnects if the bridge was down.
        connectToBridge();
      }
    }
  }
});

// Connect as soon as the plugin loads, so an installed plugin works after an InDesign
// restart without the user opening the Bridge panel first.
connectToBridge();
