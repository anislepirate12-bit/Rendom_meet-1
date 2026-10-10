'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: false },
  maxHttpBufferSize: 1e4,
  connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 }
});

const PORT = Number(process.env.PORT) || 3000;
const waiting = [];
const partners = new Map();
const blockedBy = new Map();
const reports = [];

app.disable('x-powered-by');
app.use(express.static('public', { extensions: ['html'] }));
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

function onlineCount() {
  return io.engine.clientsCount;
}
function removeFromWaiting(id) {
  const i = waiting.indexOf(id);
  if (i !== -1) waiting.splice(i, 1);
}
function isBlocked(a, b) {
  return (blockedBy.get(a) || new Set()).has(b) || (blockedBy.get(b) || new Set()).has(a);
}
function unpair(id, notify = true) {
  const partnerId = partners.get(id);
  partners.delete(id);
  if (partnerId) {
    partners.delete(partnerId);
    const partner = io.sockets.sockets.get(partnerId);
    if (partner && notify) partner.emit('partner-left');
  }
  return partnerId;
}
function findPartner(socket) {
  removeFromWaiting(socket.id);
  unpair(socket.id);
  const eligibleIndex = waiting.findIndex(id => {
    const other = io.sockets.sockets.get(id);
    return other && other.connected && id !== socket.id && !partners.has(id) && !isBlocked(socket.id, id);
  });
  if (eligibleIndex === -1) {
    waiting.push(socket.id);
    socket.emit('waiting');
    return;
  }
  const partnerId = waiting.splice(eligibleIndex, 1)[0];
  partners.set(socket.id, partnerId);
  partners.set(partnerId, socket.id);
  socket.emit('matched');
  const partner = io.sockets.sockets.get(partnerId);
  if (partner) partner.emit('matched');
}

io.on('connection', socket => {
  socket.emit('online-count', onlineCount());
  socket.broadcast.emit('online-count', onlineCount());

  socket.on('find-partner', () => findPartner(socket));

  socket.on('message', raw => {
    if (typeof raw !== 'string') return;
    const message = raw.trim().slice(0, 1000);
    if (!message) return;
    const partnerId = partners.get(socket.id);
    if (!partnerId) return;
    const partner = io.sockets.sockets.get(partnerId);
    if (partner && partner.connected) partner.emit('message', { text: message, from: 'stranger', at: Date.now() });
  });

  socket.on('next', () => {
    unpair(socket.id);
    removeFromWaiting(socket.id);
    findPartner(socket);
  });

  socket.on('block', () => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      if (!blockedBy.has(socket.id)) blockedBy.set(socket.id, new Set());
      blockedBy.get(socket.id).add(partnerId);
      unpair(socket.id);
      removeFromWaiting(partnerId);
      const partner = io.sockets.sockets.get(partnerId);
      if (partner) partner.emit('blocked-notice');
    }
    socket.emit('blocked-confirmed');
    findPartner(socket);
  });

  socket.on('report', reason => {
    const partnerId = partners.get(socket.id);
    if (!partnerId) return;
    reports.push({ reporter: socket.id, reported: partnerId, reason: typeof reason === 'string' ? reason.slice(0, 200) : 'غير محدد', at: Date.now() });
    socket.emit('report-confirmed');
  });

  socket.on('disconnect', () => {
    removeFromWaiting(socket.id);
    unpair(socket.id);
    blockedBy.delete(socket.id);
    io.emit('online-count', onlineCount());
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Random Meet listening on port ${PORT}`);
});
