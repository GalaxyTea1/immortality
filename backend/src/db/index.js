import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root directory
dotenv.config({ path: resolve(__dirname, '../../.env') });

const { Pool } = pg;

// Database connection pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'immortality_db',
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.log('Server will continue running but DB features will not work.');
    console.log('Please check .env file and ensure PostgreSQL is running.\n');
    return false;
  }
};

// Query helper
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed', { text: text.substring(0, 50), duration: `${duration}ms`, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

export default { pool, query, testConnection };
