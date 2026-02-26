const { app } = require("indesign");
const { entrypoints } = require("uxp");

const statusEl = document.getElementById("status");

function connectToBridge() {
  const ws = new WebSocket("ws://127.0.0.1:3001");

  ws.onopen = () => {
    statusEl.textContent = "Connected to bridge";
    console.log("[Plugin] WebSocket connected to bridge");
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log("[Plugin] Received:", event.data);
    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', id: msg.id }));
    }
  };

  ws.onerror = (err) => {
    statusEl.textContent = "Bridge connection error";
    console.error("[Plugin] WebSocket error:", err);
  };

  ws.onclose = () => {
    statusEl.textContent = "Disconnected - retrying in 3s";
    setTimeout(connectToBridge, 3000);
  };
}

entrypoints.setup({
  panels: {
    mainPanel: {
      show() {
        // Test 1: InDesign DOM access
        try {
          const docCount = app.documents.length;
          console.log("DOM ACCESS OK: doc count =", docCount);
        } catch (e) {
          console.error("DOM ACCESS FAILED:", e);
        }

        // Test 2: eval()
        try {
          const result = eval("1 + 1");
          console.log("EVAL OK: result =", result);
        } catch (e) {
          console.error("EVAL FAILED:", e);
        }

        // Connect to bridge
        connectToBridge();
      }
    }
  }
});
