import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const splitCsv = (value, fallback) => {
    if (!value) return fallback;
    return value.split(',').map(item => item.trim()).filter(Boolean);
};

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const PORT = process.env.PORT || 3002;

const DEFAULT_DEV_JWT_SECRET = 'tu_tien_secret_key_2024';
if (IS_PRODUCTION && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production');
}

export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const ALLOW_CLIENT_STATE_SYNC = process.env.ALLOW_CLIENT_STATE_SYNC === 'true';
export const CORS_ORIGINS = splitCsv(
    process.env.CORS_ORIGINS,
    ['http://localhost:5173', 'http://localhost:3002']
);
