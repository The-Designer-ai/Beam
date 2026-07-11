import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuid } from 'uuid';

const PORT = process.env.PORT || 3001;
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Room state
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`[+] Client connected: ${socket.id}`);

  // ─── Join a room ─────────────────────────────────────────
  socket.on('join-room', ({ roomCode, userId }) => {
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.userId = userId;

    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, new Map());
    }
    rooms.get(roomCode).set(userId, socket.id);

    // Notify others in the room
    socket.to(roomCode).emit('peer-joined', { userId });
    console.log(`  → ${userId} joined room ${roomCode}`);
  });

  // ─── Leave a room ────────────────────────────────────────
  socket.on('leave-room', ({ roomCode, userId }) => {
    handleLeave(socket, roomCode, userId);
  });

  socket.on('disconnect', () => {
    const { roomCode, userId } = socket.data;
    if (roomCode && userId) {
      handleLeave(socket, roomCode, userId);
    }
    console.log(`[-] Client disconnected: ${socket.id}`);
  });

  // ─── WebRTC signaling ────────────────────────────────────
  socket.on('signal', ({ roomCode, msg }) => {
    // Forward the signal to everyone else in the room
    socket.to(roomCode).emit('signal', msg);
  });
});

function handleLeave(socket, roomCode, userId) {
  if (!roomCode || !userId) return;

  socket.leave(roomCode);
  socket.to(roomCode).emit('peer-left', { userId });

  const room = rooms.get(roomCode);
  if (room) {
    room.delete(userId);
    if (room.size === 0) {
      rooms.delete(roomCode);
    }
  }
}

// ─── Health check ─────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════╗
║   Beam Signaling Server         ║
║   Running on http://0.0.0.0:${PORT}  ║
║   Active rooms: 0               ║
╚══════════════════════════════════╝
  `);
});
