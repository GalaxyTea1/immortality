import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pool } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const migrationsDir = join(__dirname, 'migrations');

const ensureMigrationTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
};

const getAppliedMigrations = async (client) => {
  const result = await client.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map(row => row.filename));
};

export const runMigrations = async () => {
  const client = await pool.connect();

  try {
    await ensureMigrationTable(client);
    const applied = await getAppliedMigrations(client);
    const files = (await readdir(migrationsDir))
      .filter(file => file.endsWith('.sql'))
      .sort();

    const pending = files.filter(file => !applied.has(file));
    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    for (const file of pending) {
      const sql = await readFile(join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`Applied migration: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
  }
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runMigrations()
    .then(() => pool.end())
    .catch(async (error) => {
      console.error('Migration failed:', error);
      await pool.end();
      process.exit(1);
    });
}
