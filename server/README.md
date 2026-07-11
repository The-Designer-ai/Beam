# Beam Signaling Server (Dev)

A tiny WebSocket signaling server for testing Beam's WebRTC connections during development.

### Why?

WebRTC needs a signaling channel to exchange connection info (offers, answers, ICE candidates) between devices. In production, this will use **Supabase Realtime** — no custom server needed. This dev server is just for testing before Supabase MCP is connected.

### How to Use

```bash
cd server
npm install
npm start
```

Server runs on `http://localhost:3001`. The Beam app connects to it automatically when `__DEV__` is true.

### Supabase Migration

When you connect the Supabase MCP, delete this server and replace `lib/signaling.ts` with a Supabase Realtime implementation:

```ts
const channel = supabase.channel(`beam:${roomCode}`)
channel.send({ type: 'broadcast', event: 'signal', payload: msg })
channel.on('broadcast', { event: 'signal' }, ({ payload }) => cb(payload))
channel.subscribe()
```

That's it — no custom server, no Socket.IO, nothing to deploy.
