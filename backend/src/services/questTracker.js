import { query } from '../db/index.js';

export const DAILY_QUESTS = [
  {
    id: 'daily_gather',
    name: 'Thu Thap Thao Duoc',
    description: 'Explore the world 5 times.',
    trackEvent: 'explore',
    target: 5,
    rewards: { spiritStones: 100, exp: 50 },
  },
  {
    id: 'daily_meditate',
    name: 'Tinh Tam Nhap Dinh',
    description: 'Complete 3 meditation sessions.',
    trackEvent: 'meditate',
    target: 3,
    rewards: { spiritStones: 80, exp: 60 },
  },
  {
    id: 'daily_alchemy',
    name: 'Luyen Dan Moi Ngay',
    description: 'Craft pills 2 times.',
    trackEvent: 'craft',
    target: 2,
    rewards: { spiritStones: 120, exp: 40 },
  },
];

export const getQuestDefinition = (questId) => DAILY_QUESTS.find(q => q.id === questId) || null;

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
  };
};

export async function getOrCreateDailyQuest(characterId, client = { query }) {
  const active = await client.query(
    `SELECT id, quest_id, progress, status
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
       AND status IN ('completed', 'expired')
       AND assigned_at::date = CURRENT_DATE
     LIMIT 1`,
    [characterId]
  );

  if (completedToday.rows.length > 0) return null;

  const questDef = DAILY_QUESTS[0];
  const inserted = await client.query(
    `INSERT INTO character_quests (character_id, quest_id, progress, status)
     VALUES ($1, $2, 0, 'active')
     RETURNING id, quest_id, progress, status`,
    [characterId, questDef.id]
  );

  return normalizeQuestRow(inserted.rows[0]);
}

export async function trackQuestProgress(characterId, eventType) {
  try {
    const result = await query(
      `SELECT id, quest_id, progress
       FROM character_quests
       WHERE character_id = $1
         AND status = 'active'
         AND assigned_at::date = CURRENT_DATE`,
      [characterId]
    );

    if (result.rows.length === 0) return null;

    const dbQuest = result.rows[0];
    const questDef = getQuestDefinition(dbQuest.quest_id);

    if (!questDef || questDef.trackEvent !== eventType) return null;
    if (dbQuest.progress >= questDef.target) return null;

    const newProgress = Number(dbQuest.progress) + 1;
    await query(
      'UPDATE character_quests SET progress = $2 WHERE id = $1',
      [dbQuest.id, newProgress]
    );

    return {
      questId: dbQuest.quest_id,
      progress: newProgress,
      target: questDef.target,
      completed: newProgress >= questDef.target,
    };
  } catch {
    return null;
  }
}
