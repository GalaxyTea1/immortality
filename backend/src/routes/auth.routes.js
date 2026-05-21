import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validate, registerSchema, loginSchema } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config.js';
import { created, fail, ok } from '../http/response.js';
const router = express.Router();

// POST /api/auth/register - Register account
router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return fail(res, 400, 'Please provide all required information');
        }

        if (username.length < 3 || username.length > 50) {
            return fail(res, 400, 'Username must be between 3-50 characters');
        }

        if (password.length < 6) {
            return fail(res, 400, 'Password must be at least 6 characters');
        }

        // Check if username/email already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return fail(res, 400, 'Username or email already in use');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create new user
        const userResult = await query(
            `INSERT INTO users (username, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email, created_at`,
            [username, email, passwordHash]
        );

        const newUser = userResult.rows[0];

        // Create character for new user
        const characterResult = await query(
            `INSERT INTO characters (user_id, name) 
       VALUES ($1, $2) 
       RETURNING id`,
            [newUser.id, username]
        );

        // Create JWT token
        const token = jwt.sign(
            { userId: newUser.id, username: newUser.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log(`[AUTH] New user joined: ${username}`);

        created(res, {
            message: 'Welcome to the Immortality World!',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                characterId: characterResult.rows[0].id
            },
            token
        });
    } catch (error) {
        console.error('Register error:', error);
        fail(res, 500, 'Error creating account');
    }
});

// POST /api/auth/login - Login
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return fail(res, 400, 'Please enter username and password');
        }

        // Find user by username or email
        const result = await query(
            `SELECT u.*, c.id as character_id 
       FROM users u 
       LEFT JOIN characters c ON c.user_id = u.id
       WHERE u.username = $1 OR u.email = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return fail(res, 401, 'Invalid username or password');
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return fail(res, 401, 'Account is locked');
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return fail(res, 401, 'Invalid username or password');
        }

        // Update last_login
        await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        // Create JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log(`[AUTH] User login: ${user.username}`);

        ok(res, {
            message: `Welcome back, Daoist ${user.username}!`,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                characterId: user.character_id
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        fail(res, 500, 'Login error');
    }
});

// GET /api/auth/me - Get current user info
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            `SELECT u.id, u.username, u.email, u.created_at, u.last_login,
              c.id as character_id, c.name as character_name, 
              c.realm_index, c.level, c.spirit_stones
       FROM users u
       LEFT JOIN characters c ON c.user_id = u.id
       WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return fail(res, 404, 'Information not found');
        }

        ok(res, result.rows[0]);
    } catch (error) {
        console.error('Get me error:', error);
        fail(res, 500, 'Error fetching info');
    }
});

// POST /api/auth/change-password - Change password
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return fail(res, 400, 'Please provide all required information');
        }

        if (newPassword.length < 6) {
            return fail(res, 400, 'New password must be at least 6 characters');
        }

        // Get current password hash
        const result = await query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

        if (!isValidPassword) {
            return fail(res, 401, 'Current password is incorrect');
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        await query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, req.user.id]
        );

        ok(res, { message: 'Password changed successfully!' });
    } catch (error) {
        console.error('Change password error:', error);
        fail(res, 500, 'Error changing password');
    }
});

export default router;
