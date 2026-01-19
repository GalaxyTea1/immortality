import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_tien_secret_key_2024';

// Middleware for JWT verification
export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Not logged in' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if user exists and is active
        const result = await query(
            'SELECT id, username, email, is_active FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0 || !result.rows[0].is_active) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Attach user info to request
        req.user = result.rows[0];
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication error' });
    }
};

// Optional middleware - login not required
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);

            const result = await query(
                'SELECT id, username, email, is_active FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (result.rows.length > 0 && result.rows[0].is_active) {
                req.user = result.rows[0];
            }
        }

        next();
    } catch {
        // Silently ignore auth errors for optional auth
        next();
    }
};

export default { authMiddleware, optionalAuth, JWT_SECRET };
