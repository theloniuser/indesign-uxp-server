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

async function handleExecute(ws, msg) {
  try {
    // new Function injects `app` so code can access the InDesign DOM directly.
    // Auto-return: find the last meaningful line of code and wrap it with return
    // so the value of the last expression is captured.
    const code = msg.code.trimEnd();
    const lines = code.split('\n');

    // Find the last non-empty, non-brace-only line
    let lastExprIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (trimmed && trimmed !== '}' && trimmed !== '};') {
        lastExprIdx = i;
        break;
      }
    }

    let wrappedCode;
    if (lastExprIdx >= 0) {
      const lastLine = lines[lastExprIdx].trim().replace(/;$/, '');
      // Only add return if the last line looks like an expression (not a declaration/block)
      if (!/^(var|let|const|function|if|for|while|switch|try|class|return)\s/.test(lastLine) && !lastLine.startsWith('}')) {
        const before = lines.slice(0, lastExprIdx);
        const after = lines.slice(lastExprIdx + 1);
        wrappedCode = before.join('\n') + '\nreturn (' + lastLine + ');\n' + after.join('\n');
      } else {
        wrappedCode = code;
      }
    } else {
      wrappedCode = code;
    }
    const fn = new Function('app', `return (async () => { ${wrappedCode} })()`);
    const result = await fn(app);
    ws.send(JSON.stringify({ type: 'result', id: msg.id, result: serializeResult(result) }));
  } catch (e) {
    ws.send(JSON.stringify({ type: 'error', id: msg.id, error: e.message || String(e) }));
  }
}

function connectToBridge() {
  const ws = new WebSocket("ws://127.0.0.1:3001");

  ws.onopen = () => {
    statusEl.textContent = "Connected to bridge ✓";
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
    statusEl.textContent = "Bridge connection error";
    console.error("[Plugin] WebSocket error:", err);
  };

  ws.onclose = () => {
    statusEl.textContent = "Disconnected — retrying in 3s";
    setTimeout(connectToBridge, 3000);
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

        connectToBridge();
      }
    }
  }
});
