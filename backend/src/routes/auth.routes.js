import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tu_tien_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// POST /api/auth/register - Register account
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Please provide all required information' });
        }

        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ error: 'Username must be between 3-50 characters' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if username/email already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username or email already in use' });
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

        res.status(201).json({
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
        res.status(500).json({ error: 'Error creating account' });
    }
});

// POST /api/auth/login - Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Please enter username and password' });
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
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(401).json({ error: 'Account is locked' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
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

        res.json({
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
        res.status(500).json({ error: 'Login error' });
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
            return res.status(404).json({ error: 'Information not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Error fetching info' });
    }
});

// POST /api/auth/change-password - Change password
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Please provide all required information' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Get current password hash
        const result = await query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        await query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, req.user.id]
        );

        res.json({ message: 'Password changed successfully!' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Error changing password' });
    }
});

export default router;
