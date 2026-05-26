import { query } from '../db/index.js';

export const DAILY_QUESTS = [
  {
    id: 'daily_gather',
    name: 'Thu Thập Thảo Dược',
    description: 'Thám hiểm thế giới 5 lần.',
    trackEvent: 'explore',
    target: 5,
    rewards: { spiritStones: 100, exp: 50 },
  },
  {
    id: 'daily_meditate',
    name: 'Tĩnh Tâm Nhập Định',
    description: 'Hoàn thành 3 phiên thiền định.',
    trackEvent: 'meditate',
    target: 3,
    rewards: { spiritStones: 80, exp: 60 },
  },
  {
    id: 'daily_alchemy',
    name: 'Luyện Đan Mỗi Ngày',
    description: 'Luyện đan 2 lần.',
    trackEvent: 'craft',
    target: 2,
    rewards: { spiritStones: 120, exp: 40 },
  },
];

export const getQuestDefinition = (questId) => DAILY_QUESTS.find(q => q.id === questId) || null;

const hashString = (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }
  return Math.abs(hash);
};

const getDailyQuestDefinition = (characterId, now = new Date()) => {
  const dayKey = now.toISOString().slice(0, 10);
  const questIndex = hashString(`${characterId}:${dayKey}`) % DAILY_QUESTS.length;
  return DAILY_QUESTS[questIndex];
};

export const normalizeQuestRow = (row) => {
  if (!row) return null;
  const questDef = getQuestDefinition(row.quest_id);
  if (!questDef) return null;

  return {
    id: questDef.id,
    name: questDef.name,
    description: questDef.description,
    type: 'daily',
    progress: Number(row.progress) || 0,
    target: questDef.target,
    rewards: questDef.rewards,
    status: row.status,
    assignedAt: row.assigned_at,
    completedAt: row.completed_at,
  };
};

export async function getOrCreateDailyQuest(characterId, client = { query }) {
  await client.query(
    `UPDATE character_quests
     SET status = 'expired'
     WHERE character_id = $1
       AND status = 'active'
       AND assigned_at::date < CURRENT_DATE`,
    [characterId]
  );

  const active = await client.query(
    `SELECT id, quest_id, progress, status, assigned_at, completed_at
     FROM character_quests
     WHERE character_id = $1
       AND status = 'active'
       AND assigned_at::date = CURRENT_DATE
     ORDER BY assigned_at ASC
     LIMIT 1`,
    [characterId]
  );

  if (active.rows.length > 0) {
    return normalizeQuestRow(active.rows[0]);
  }

  const completedToday = await client.query(
    `SELECT id
     FROM character_quests
     WHERE character_id = $1
       AND status = 'completed'
       AND assigned_at::date = CURRENT_DATE
     LIMIT 1`,
    [characterId]
  );

  if (completedToday.rows.length > 0) return null;

  const questDef = getDailyQuestDefinition(characterId);
  const inserted = await client.query(
    `INSERT INTO character_quests (character_id, quest_id, progress, status)
     VALUES ($1, $2, 0, 'active')
     ON CONFLICT (character_id, quest_id, (assigned_at::date)) DO NOTHING
     RETURNING id, quest_id, progress, status, assigned_at, completed_at`,
    [characterId, questDef.id]
  );

  if (inserted.rows.length > 0) {
    return normalizeQuestRow(inserted.rows[0]);
  }

  const existing = await client.query(
    `SELECT id, quest_id, progress, status, assigned_at, completed_at
     FROM character_quests
     WHERE character_id = $1
       AND quest_id = $2
       AND assigned_at::date = CURRENT_DATE
     LIMIT 1`,
    [characterId, questDef.id]
  );

  return normalizeQuestRow(existing.rows[0]);
}

export async function trackQuestProgress(characterId, eventType, client = { query }) {
  await getOrCreateDailyQuest(characterId, client);

  const result = await client.query(
    `SELECT id, quest_id, progress
     FROM character_quests
     WHERE character_id = $1
       AND status = 'active'
       AND assigned_at::date = CURRENT_DATE
     FOR UPDATE`,
    [characterId]
  );

  if (result.rows.length === 0) return null;

  const dbQuest = result.rows[0];
  const questDef = getQuestDefinition(dbQuest.quest_id);

  if (!questDef || questDef.trackEvent !== eventType) return null;
  if (dbQuest.progress >= questDef.target) return null;

  const updated = await client.query(
    'UPDATE character_quests SET progress = LEAST(progress + 1, $2) WHERE id = $1 RETURNING progress',
    [dbQuest.id, questDef.target]
  );
  const newProgress = Number(updated.rows[0]?.progress) || Number(dbQuest.progress);

  return {
    questId: dbQuest.quest_id,
    progress: newProgress,
    target: questDef.target,
    completed: newProgress >= questDef.target,
  };
}
