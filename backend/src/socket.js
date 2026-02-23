import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_tien_secret_key';

let io;

/**
 * Initialize Socket.IO server
 * @param {import('http').Server} httpServer
 * @returns {Server} Socket.IO instance
 */
export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: ['http://localhost:5173', 'http://localhost:3002', 'http://localhost:3001'],
            credentials: true,
        },
    });

    // JWT Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded; // { userId, username }
            next();
        } catch (err) {
            next(new Error('Invalid or expired token'));
        }
    });

    // Connection handler
    io.on('connection', (socket) => {
        const { userId, username } = socket.user;

        // Auto-join user's private room
        socket.join(`user:${userId}`);

        console.log(`[Socket] ${username} connected (${socket.id})`);

        // Leaderboard room management
        socket.on('leaderboard:subscribe', () => {
            socket.join('leaderboard_viewers');
        });

        socket.on('leaderboard:unsubscribe', () => {
            socket.leave('leaderboard_viewers');
        });

        socket.on('disconnect', (reason) => {
            console.log(`[Socket] ${username} disconnected: ${reason}`);
        });
    });

    console.log('[Socket] Socket.IO initialized');
    return io;
}

/**
 * Get Socket.IO instance (for use in routes)
 * @returns {Server}
 */
export function getIO() {
    if (!io) {
        throw new Error('Socket.IO not initialized! Call initSocket() first.');
    }
    return io;
}

/**
 * Broadcast leaderboard update to all subscribers
 */
export function broadcastLeaderboardUpdate() {
    if (!io) return;
    io.to('leaderboard_viewers').emit('leaderboard:updated');
}

/**
 * Send world announcement to all connected users
 * @param {string} message
 */
export function broadcastWorldAnnouncement(message) {
    if (!io) return;
    io.emit('world:announcement', { message, timestamp: Date.now() });
}

/**
 * Send notification to a specific user
 * @param {number} userId
 * @param {string} message
 */
export function notifyUser(userId, message) {
    if (!io) return;
    io.to(`user:${userId}`).emit('game:notification', { message, timestamp: Date.now() });
}
