const WebSocket = require('ws');
const ws = new WebSocket('wss://ais-dev-25gfll5l5kgi5wzrveg5lv-844587094120.asia-southeast1.run.app/api/live?sessionId=123');
ws.on('open', () => {
  console.log('connected');
  setTimeout(() => ws.close(), 1000);
});
ws.on('error', (err) => console.error('WS ERROR:', err));
ws.on('message', (msg) => console.log('msg', msg.toString()));
ws.on('close', () => console.log('closed'));
