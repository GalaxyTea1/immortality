import test from 'node:test';
import assert from 'node:assert/strict';

import { trackQuestProgress } from '../backend/src/services/questTracker.js';
import { pool } from '../backend/src/db/index.js';

test.after(async () => {
  await pool.end();
});

test('tracks quest progress through the provided transaction client', async () => {
  const calls = [];
  const client = {
    query: async (sql, params) => {
      calls.push({ sql, params });

      if (sql.startsWith('UPDATE character_quests') && sql.includes("status = 'expired'")) {
        return { rows: [], rowCount: 0 };
      }

      if (sql.includes('ORDER BY assigned_at ASC')) {
        return {
          rows: [{
            id: 7,
            quest_id: 'daily_gather',
            progress: 4,
            status: 'active',
            assigned_at: new Date(),
            completed_at: null,
          }],
        };
      }

      if (sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 7, quest_id: 'daily_gather', progress: 4 }] };
      }

      if (sql.startsWith('UPDATE character_quests SET progress')) {
        return { rows: [{ progress: 5 }] };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const result = await trackQuestProgress(12, 'explore', client);

  assert.deepEqual(result, {
    questId: 'daily_gather',
    progress: 5,
    target: 5,
    completed: true,
  });
  assert.equal(calls.length, 4);
  assert.ok(calls.every(call => call.params[0] === 12 || call.params[0] === 7));
});

test('propagates quest tracker database errors', async () => {
  const client = {
    query: async () => {
      throw new Error('database unavailable');
    },
  };

  await assert.rejects(
    () => trackQuestProgress(12, 'explore', client),
    /database unavailable/
  );
});
