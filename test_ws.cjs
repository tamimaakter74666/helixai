const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/api/live?sessionId=123');
ws.on('open', () => {
  console.log('connected');
  setTimeout(() => ws.close(), 1000);
});
ws.on('error', (err) => console.error(err));
ws.on('message', (msg) => console.log('msg', msg.toString()));
ws.on('close', () => console.log('closed'));
