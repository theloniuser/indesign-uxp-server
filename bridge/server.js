const { WebSocketServer } = require('ws');

const WS_PORT = 3001;
const wss = new WebSocketServer({ port: WS_PORT, host: '127.0.0.1' });

wss.on('connection', (ws) => {
  console.log('[Bridge] Plugin connected');
  ws.send(JSON.stringify({ type: 'ping', id: 'test-1' }));

  ws.on('message', (data) => {
    console.log('[Bridge] Received from plugin:', data.toString());
  });

  ws.on('close', () => {
    console.log('[Bridge] Plugin disconnected');
  });
});

console.log(`[Bridge] WebSocket server listening on ws://127.0.0.1:${WS_PORT}`);
console.log('[Bridge] Waiting for UXP plugin to connect...');
