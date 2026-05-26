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

        if (!username || !email || !password) {
            return fail(res, 400, 'Vui lòng nhập đầy đủ thông tin bắt buộc');
        }

        if (username.length < 3 || username.length > 50) {
            return fail(res, 400, 'Tên đăng nhập phải dài từ 3 đến 50 ký tự');
        }

        if (password.length < 6) {
            return fail(res, 400, 'Mật khẩu phải có ít nhất 6 ký tự');
        }

        const existingUser = await query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return fail(res, 400, 'Tên đăng nhập hoặc email đã được sử dụng');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const userResult = await query(
            `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
            [username, email, passwordHash]
        );

        const newUser = userResult.rows[0];

        const characterResult = await query(
            `INSERT INTO characters (user_id, name)
       VALUES ($1, $2)
       RETURNING id`,
            [newUser.id, username]
        );

        const token = jwt.sign(
            { userId: newUser.id, username: newUser.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log(`[AUTH] New user joined: ${username}`);

        created(res, {
            message: 'Chào mừng đến với Tu Tiên Giới!',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                characterId: characterResult.rows[0].id,
            },
            token,
        });
    } catch (error) {
        console.error('Register error:', error);
        fail(res, 500, 'Không thể tạo tài khoản');
    }
});

// POST /api/auth/login - Login
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return fail(res, 400, 'Vui lòng nhập tên đăng nhập và mật khẩu');
        }

        const result = await query(
            `SELECT u.*, c.id as character_id
       FROM users u
       LEFT JOIN characters c ON c.user_id = u.id
       WHERE u.username = $1 OR u.email = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return fail(res, 401, 'Tên đăng nhập hoặc mật khẩu không đúng');
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return fail(res, 401, 'Tài khoản đã bị khóa');
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return fail(res, 401, 'Tên đăng nhập hoặc mật khẩu không đúng');
        }

        await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log(`[AUTH] User login: ${user.username}`);

        ok(res, {
            message: `Chào mừng trở lại, ${user.username}!`,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                characterId: user.character_id,
            },
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        fail(res, 500, 'Không thể đăng nhập');
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
            return fail(res, 404, 'Không tìm thấy thông tin');
        }

        ok(res, result.rows[0]);
    } catch (error) {
        console.error('Get me error:', error);
        fail(res, 500, 'Không thể tải thông tin');
    }
});

// POST /api/auth/change-password - Change password
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return fail(res, 400, 'Vui lòng nhập đầy đủ thông tin bắt buộc');
        }

        if (newPassword.length < 6) {
            return fail(res, 400, 'Mật khẩu mới phải có ít nhất 6 ký tự');
        }

        const result = await query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

        if (!isValidPassword) {
            return fail(res, 401, 'Mật khẩu hiện tại không đúng');
        }

        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        await query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, req.user.id]
        );

        ok(res, { message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error('Change password error:', error);
        fail(res, 500, 'Không thể đổi mật khẩu');
    }
});

export default router;
