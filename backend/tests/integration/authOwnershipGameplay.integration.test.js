import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import test, { after, before } from 'node:test';

const RUN_DB_INTEGRATION = process.env.RUN_DB_INTEGRATION === 'true' && Boolean(process.env.TEST_DATABASE_URL);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'integration-test-secret';

let app;
let pool;
let server;
let baseUrl;

const request = async (method, path, { token, body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json();
  return { response, json };
};

before(async () => {
  if (!RUN_DB_INTEGRATION) return;

  ({ app } = await import('../../src/index.js'));
  ({ pool } = await import('../../src/db/index.js'));

  const schema = await readFile(join(import.meta.dirname, '../../src/db/schema.sql'), 'utf8');
  await pool.query(schema);

  server = createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});

after(async () => {
  if (!RUN_DB_INTEGRATION) return;

  await pool.query("DELETE FROM users WHERE username LIKE 'itest_%'");
  await pool.end();
  await new Promise((resolve) => server.close(resolve));
});

test('auth, ownership, and gameplay mutations work against a real database', { skip: !RUN_DB_INTEGRATION }, async () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const userA = `itest_a_${suffix}`;
  const userB = `itest_b_${suffix}`;

  const registerA = await request('POST', '/auth/register', {
    body: { username: userA, email: `${userA}@example.test`, password: 'secret123' },
  });
  assert.equal(registerA.response.status, 201);
  assert.equal(registerA.json.success, true);
  const tokenA = registerA.json.data.token;
  const characterA = registerA.json.data.user.characterId;

  const registerB = await request('POST', '/auth/register', {
    body: { username: userB, email: `${userB}@example.test`, password: 'secret123' },
  });
  assert.equal(registerB.response.status, 201);
  const tokenB = registerB.json.data.token;

  const me = await request('GET', '/auth/me', { token: tokenA });
  assert.equal(me.response.status, 200);
  assert.equal(me.json.data.username, userA);

  const forbidden = await request('GET', `/characters/${characterA}`, { token: tokenB });
  assert.equal(forbidden.response.status, 403);
  assert.equal(forbidden.json.success, false);

  const beforeCultivation = await pool.query('SELECT exp, level FROM characters WHERE id = $1', [characterA]);
  const cultivate = await request('POST', `/cultivation/${characterA}/cultivate`, {
    token: tokenA,
    body: { mode: 'manual' },
  });
  assert.equal(cultivate.response.status, 200);
  assert.equal(cultivate.json.success, true);

  const afterCultivation = await pool.query('SELECT exp, level FROM characters WHERE id = $1', [characterA]);
  assert.ok(
    Number(afterCultivation.rows[0].exp) > Number(beforeCultivation.rows[0].exp)
    || Number(afterCultivation.rows[0].level) > Number(beforeCultivation.rows[0].level)
  );

  const quest = await request('GET', `/quests/${characterA}/active`, { token: tokenA });
  assert.equal(quest.response.status, 200);
  assert.ok(quest.json.data.quest);

  await pool.query(
    `UPDATE character_quests
     SET quest_id = 'daily_gather', progress = $2
     WHERE character_id = $1 AND status = 'active'`,
    [characterA, 4]
  );

  const explore = await request('POST', `/world/${characterA}/explore`, {
    token: tokenA,
    body: { zoneId: 'tan_thu_thon' },
  });
  assert.equal(explore.response.status, 200);
  assert.equal(explore.json.data.questUpdate.completed, true);

  const progressedQuest = await pool.query(
    `SELECT progress
     FROM character_quests
     WHERE character_id = $1 AND status = 'active'`,
    [characterA]
  );
  assert.equal(Number(progressedQuest.rows[0].progress), 5);

  const events = await request('GET', `/events/${characterA}`, { token: tokenA });
  assert.equal(events.response.status, 200);
  assert.ok(events.json.data.events.length > 0);

  const beforeClaim = await pool.query('SELECT spirit_stones FROM characters WHERE id = $1', [characterA]);
  const claim = await request('POST', `/quests/${characterA}/claim`, { token: tokenA });
  assert.equal(claim.response.status, 200);
  assert.equal(claim.json.data.success, true);

  const afterClaim = await pool.query('SELECT spirit_stones FROM characters WHERE id = $1', [characterA]);
  assert.ok(Number(afterClaim.rows[0].spirit_stones) > Number(beforeClaim.rows[0].spirit_stones));
});
