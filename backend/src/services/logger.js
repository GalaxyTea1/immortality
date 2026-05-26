import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const LOG_FILE_PATH = process.env.LOG_FILE || resolve(__dirname, '../../logs/app.log');

let logDirReady = null;
let consoleLoggerAttached = false;

const ensureLogDir = () => {
  logDirReady ||= mkdir(dirname(LOG_FILE_PATH), { recursive: true });
  return logDirReady;
};

const serializeError = (error) => ({
  name: error.name,
  message: error.message,
  stack: error.stack,
  code: error.code,
  detail: error.detail,
  constraint: error.constraint,
  table: error.table,
  column: error.column,
});

const serializeValue = (value, seen = new WeakSet()) => {
  if (value instanceof Error) return serializeError(value);
  if (typeof value === 'bigint') return value.toString();
  if (value === null || typeof value !== 'object') return value;

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, serializeValue(item, seen)])
  );
};

export const writeLog = async (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...serializeValue(meta),
  };

  await ensureLogDir();
  await appendFile(LOG_FILE_PATH, `${JSON.stringify(entry)}\n`, 'utf8');
};

export const logger = {
  info: (message, meta) => writeLog('info', message, meta),
  warn: (message, meta) => writeLog('warn', message, meta),
  error: (message, meta) => writeLog('error', message, meta),
};

export const getRequestLogContext = (req) => ({
  method: req.method,
  path: req.originalUrl || req.url,
  ip: req.ip,
  userId: req.user?.id,
  characterId: req.params?.characterId || req.params?.id || req.body?.characterId,
});

export const attachConsoleFileLogger = () => {
  if (consoleLoggerAttached) return;
  consoleLoggerAttached = true;

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args) => {
    originalError(...args);
    void writeLog('error', 'console.error', { args: serializeValue(args) })
      .catch((error) => originalError('Failed to write error log:', error));
  };

  console.warn = (...args) => {
    originalWarn(...args);
    void writeLog('warn', 'console.warn', { args: serializeValue(args) })
      .catch((error) => originalError('Failed to write warning log:', error));
  };
};
