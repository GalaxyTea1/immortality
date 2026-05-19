/**
 * Socket.IO Client — Singleton pattern
 */

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3002';

let socket = null;

/**
 * Connect to WebSocket server with JWT token
 * @param {string} token - JWT token
 * @returns {import('socket.io-client').Socket}
 */
export function connectSocket(token) {
    if (socket?.connected) return socket;

    // Disconnect old socket if exists
    if (socket) {
        socket.disconnect();
    }

    socket = io(SOCKET_URL, {
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
    });

    socket.on('connect', () => { });

    socket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message);
    });

    socket.on('disconnect', () => { });

    return socket;
}

/**
 * Disconnect from WebSocket server (on logout)
 */
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

/**
 * Get current socket instance
 * @returns {import('socket.io-client').Socket | null}
 */
export function getSocket() {
    return socket;
}
