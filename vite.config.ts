import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function devSignalingPlugin(): Plugin {
  const rooms = new Map<string, any>();
  const participants = new Map<string, Map<string, any>>();
  const messages = new Map<string, any[]>();

  return {
    name: 'dev-signaling-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/signaling')) {
          return next();
        }

        // Helper to read JSON body
        const readBody = async (): Promise<any> => {
          return new Promise((resolve) => {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch {
                resolve({});
              }
            });
          });
        };

        const json = (data: any, status = 200) => {
          res.writeHead(status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end(JSON.stringify(data));
        };

        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          return res.end();
        }

        const cleanPath = url.split('?')[0];
        const searchParams = new URL(url, 'http://localhost').searchParams;

        // Match /api/signaling/rooms/:id/metadata
        const metaMatch = cleanPath.match(/^\/api\/signaling\/rooms\/([^/]+)\/metadata$/);
        if (metaMatch && req.method === 'GET') {
          const roomId = metaMatch[1];
          const room = rooms.get(roomId);
          if (!room) return json({ error: 'Room not found' }, 404);
          return json(room);
        }

        // Match /api/signaling/rooms/:id/revoke
        const revokeMatch = cleanPath.match(/^\/api\/signaling\/rooms\/([^/]+)\/revoke$/);
        if (revokeMatch && req.method === 'POST') {
          const roomId = revokeMatch[1];
          const room = rooms.get(roomId);
          if (room) {
            room.isRevoked = true;
            rooms.set(roomId, room);
          }
          return json({ success: true });
        }

        // Match /api/signaling/rooms/:id/participants/:pid
        const delPartMatch = cleanPath.match(/^\/api\/signaling\/rooms\/([^/]+)\/participants\/([^/]+)$/);
        if (delPartMatch && req.method === 'DELETE') {
          const [, roomId, pid] = delPartMatch;
          participants.get(roomId)?.delete(pid);
          return json({ success: true });
        }

        // Match /api/signaling/rooms/:id/participants
        const partMatch = cleanPath.match(/^\/api\/signaling\/rooms\/([^/]+)\/participants$/);
        if (partMatch) {
          const roomId = partMatch[1];
          if (req.method === 'GET') {
            const list = Array.from(participants.get(roomId)?.values() || []);
            return json(list);
          }
          if (req.method === 'POST') {
            readBody().then((part) => {
              if (!participants.has(roomId)) {
                participants.set(roomId, new Map());
              }
              participants.get(roomId)!.set(part.id, part);
              return json({ success: true });
            });
            return;
          }
        }

        // Match /api/signaling/rooms/:id/messages
        const msgMatch = cleanPath.match(/^\/api\/signaling\/rooms\/([^/]+)\/messages$/);
        if (msgMatch) {
          const roomId = msgMatch[1];
          if (req.method === 'GET') {
            const targetId = searchParams.get('targetId');
            const roomMsgs = messages.get(roomId) || [];
            if (!targetId) {
              return json(roomMsgs);
            }
            // Filter and drain messages addressed to targetId
            const forTarget: any[] = [];
            const remaining: any[] = [];
            roomMsgs.forEach((m) => {
              if (m.targetId === targetId) {
                forTarget.push(m);
              } else {
                remaining.push(m);
              }
            });
            messages.set(roomId, remaining);
            return json(forTarget);
          }
          if (req.method === 'POST') {
            readBody().then((msg) => {
              if (!messages.has(roomId)) {
                messages.set(roomId, []);
              }
              messages.get(roomId)!.push(msg);
              return json({ success: true });
            });
            return;
          }
        }

        // Match /api/signaling/rooms/:id
        const roomMatch = cleanPath.match(/^\/api\/signaling\/rooms\/([^/]+)$/);
        if (roomMatch) {
          const roomId = roomMatch[1];
          if (req.method === 'POST') {
            readBody().then((metadata) => {
              rooms.set(roomId, metadata);
              participants.set(roomId, new Map());
              messages.set(roomId, []);
              return json({ success: true, room: metadata });
            });
            return;
          }
          if (req.method === 'GET') {
            const room = rooms.get(roomId);
            if (!room) return json({ error: 'Room not found' }, 404);
            return json(room);
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), devSignalingPlugin()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

