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

export const PORT = process.env.PORT || 3002;
export const JWT_SECRET = process.env.JWT_SECRET || 'tu_tien_secret_key_2024';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const ALLOW_CLIENT_STATE_SYNC = process.env.ALLOW_CLIENT_STATE_SYNC === 'true';
export const CORS_ORIGINS = splitCsv(
    process.env.CORS_ORIGINS,
    ['http://localhost:5173', 'http://localhost:3002']
);
