const { WebSocketServer } = require('ws');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const WS_PORT = 3001;
const HTTP_PORT = 3000;
const TIMEOUT_MS = 30000;

// L1: Optional auth token — set BRIDGE_TOKEN env var to require Bearer auth on /execute.
// Without it the bridge is open to any local process; token is recommended for shared machines.
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN || null;
if (!BRIDGE_TOKEN) {
  console.warn('[Bridge] WARNING: BRIDGE_TOKEN not set. Any local process can send InDesign commands.');
  console.warn('[Bridge]   To enable auth: export BRIDGE_TOKEN="$(openssl rand -hex 32)" before starting.');
}

const app = express();
app.use(express.json());

// Auth middleware — only applied when BRIDGE_TOKEN is configured
if (BRIDGE_TOKEN) {
  app.use('/execute', (req, res, next) => {
    const auth = req.headers['authorization'];
    if (!auth || auth !== `Bearer ${BRIDGE_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized: missing or invalid BRIDGE_TOKEN' });
    }
    next();
  });
}

let pluginSocket = null;
const pending = new Map(); // id -> { resolve, reject, timer }

// Serial execution queue — one UXP execution in flight at a time to prevent
// concurrent DOM mutations from corrupting InDesign document state (H2).
const requestQueue = [];
let processingQueue = false;

function drainQueue() {
  if (processingQueue || requestQueue.length === 0) return;

  const socket = pluginSocket;
  if (!socket) {
    // Drain all queued items with a connection error
    while (requestQueue.length > 0) {
      const item = requestQueue.shift();
      item.reject(new Error('Plugin not connected'));
    }
    return;
  }

  processingQueue = true;
  const { code, resolve, reject } = requestQueue.shift();
  const id = uuidv4();

  const timer = setTimeout(() => {
    pending.delete(id);
    processingQueue = false;
    reject(new Error('Execution timed out after 30s'));
    drainQueue();
  }, TIMEOUT_MS);

  pending.set(id, {
    socket,
    resolve: (result) => {
      processingQueue = false;
      resolve(result);
      drainQueue();
    },
    reject: (err) => {
      processingQueue = false;
      reject(err);
      drainQueue();
    },
    timer,
  });

  // Guard against WebSocket transitioning to CLOSING between null-check and send (L2)
  try {
    socket.send(JSON.stringify({ type: 'execute', id, code }));
    console.log('[Bridge] Sending execute:', id, code.slice(0, 100));
  } catch (err) {
    clearTimeout(timer);
    pending.delete(id);
    processingQueue = false;
    reject(new Error('Failed to send to plugin: ' + err.message));
    drainQueue();
  }
}

function enqueueExecution(code) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ code, resolve, reject });
    drainQueue();
  });
}

// WebSocket server — UXP plugin connects here
const wss = new WebSocketServer({ port: WS_PORT, host: '127.0.0.1' });

wss.on('connection', (ws) => {
  console.log('[Bridge] Plugin connected');
  // The newest connection wins. An older socket (panel reopened, InDesign restarted
  // before the old socket timed out) is closed so only one plugin answers.
  const previous = pluginSocket;
  pluginSocket = ws;
  if (previous && previous !== ws) {
    console.log('[Bridge] Replacing previous plugin connection');
    try { previous.close(); } catch (e) { /* already closing */ }
  }

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      console.error('[Bridge] Invalid JSON from plugin:', data.toString());
      return;
    }

    console.log('[Bridge] From plugin:', JSON.stringify(msg).slice(0, 200));

    const item = pending.get(msg.id);
    if (!item || item.socket !== ws) return;

    clearTimeout(item.timer);
    pending.delete(msg.id);

    if (msg.type === 'result') {
      item.resolve(msg.result);
    } else if (msg.type === 'error') {
      item.reject(new Error(msg.error));
    } else if (msg.type === 'pong') {
      item.resolve('pong');
    }
  });

  ws.on('close', () => {
    const wasCurrent = pluginSocket === ws;
    console.log(wasCurrent ? '[Bridge] Plugin disconnected' : '[Bridge] Previous plugin connection closed');
    // A replaced socket closing must not drop the live connection that replaced it.
    if (wasCurrent) pluginSocket = null;
    // Reject only what was sent on this socket; its answer can no longer arrive.
    for (const [id, item] of pending.entries()) {
      if (item.socket !== ws) continue;
      clearTimeout(item.timer);
      pending.delete(id);
      item.reject(new Error('Plugin disconnected'));
    }
    // reject() above already released the queue and drained it. With nothing in
    // flight, drain here so queued requests either run on the new socket or fail fast.
    if (pending.size === 0) {
      processingQueue = false;
      drainQueue();
    }
  });

  ws.on('error', (err) => {
    console.error('[Bridge] WebSocket error:', err);
  });
});

// HTTP API — MCP server calls these endpoints

app.get('/status', (req, res) => {
  res.json({ connected: pluginSocket !== null, queueDepth: requestQueue.length });
});

app.post('/execute', async (req, res) => {
  if (!pluginSocket) {
    return res.status(503).json({
      error: 'Plugin not connected. Open InDesign with the InDesign Bridge plugin installed (or loaded via UXP Developer Tool); open Plugins > Bridge Panel if it does not connect within a few seconds.'
    });
  }

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing "code" in request body' });
  }

  try {
    const result = await enqueueExecution(code);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(HTTP_PORT, '127.0.0.1', () => {
  console.log(`[Bridge] HTTP server on http://127.0.0.1:${HTTP_PORT}`);
  console.log(`[Bridge] WebSocket server on ws://127.0.0.1:${WS_PORT}`);
  console.log('[Bridge] Waiting for UXP plugin to connect...');
});
