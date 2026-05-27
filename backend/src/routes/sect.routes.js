import express from 'express';
import Joi from 'joi';
import { query, withTransaction } from '../db/index.js';
import {
  applyCharacterStatGain,
  applyHpRegeneration,
  calculateExpProgress,
  calculateLevelStatGain,
} from '../domain/gameCatalog.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireCharacterOwner } from '../middleware/ownership.middleware.js';
import { gameplayLimiter } from '../middleware/rateLimit.js';
import { created, fail, failFromError, ok } from '../http/response.js';

const router = express.Router();

const DEFAULT_DAILY_BOSS_ATTACKS = 8;
const DEFAULT_RAID_MINUTES = 60;

const SECT_SHOP_CATALOG = [
  {
    id: 'sect_recovery_pack',
    itemId: 'tu_khi_dan',
    quantity: 2,
    contributionCost: 60,
    minSectLevel: 1,
    label: 'Gói hồi phục tông môn',
  },
  {
    id: 'sect_enhance_stone',
    itemId: 'cuong_hoa_thach',
    quantity: 1,
    contributionCost: 140,
    minSectLevel: 1,
    label: 'Cường hóa thạch',
  },
  {
    id: 'sect_breakthrough_pill',
    itemId: 'truc_co_dan',
    quantity: 1,
    contributionCost: 360,
    minSectLevel: 2,
    label: 'Trúc Cơ Đan',
  },
  {
    id: 'sect_core_pill',
    itemId: 'kim_dan_dan',
    quantity: 1,
    contributionCost: 900,
    minSectLevel: 3,
    label: 'Kim Đan Đan',
  },
];

const SECT_DAILY_QUESTS = [
  {
    id: 'daily_raid_damage',
    title: 'Dồn sát thương raid',
    description: 'Cả tông môn gây 5000 sát thương lên boss hôm nay.',
    metric: 'damage',
    target: 5000,
    rewards: { sectExp: 120, spiritStones: 500, contribution: 40 },
  },
  {
    id: 'daily_raid_party',
    title: 'Hợp lực đồng môn',
    description: 'Có 3 thành viên khác nhau tham gia đánh boss hôm nay.',
    metric: 'participants',
    target: 3,
    rewards: { sectExp: 100, spiritStones: 350, contribution: 35 },
  },
  {
    id: 'daily_boss_defeat',
    title: 'Trấn áp yêu thú',
    description: 'Hạ gục 1 boss tông môn trong ngày.',
    metric: 'defeats',
    target: 1,
    rewards: { sectExp: 180, spiritStones: 700, contribution: 60 },
  },
];

const createSectSchema = Joi.object({
  characterId: Joi.number().integer().positive().required(),
  name: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().max(500).allow('').default(''),
});

const characterActionSchema = Joi.object({
  characterId: Joi.number().integer().positive().required(),
});

const spawnBossSchema = Joi.object({
  characterId: Joi.number().integer().positive().required(),
  bossId: Joi.string().trim().max(100).required(),
});

const buySectShopSchema = Joi.object({
  characterId: Joi.number().integer().positive().required(),
  shopItemId: Joi.string().trim().max(100).required(),
});

const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return fail(res, 400, 'Dữ liệu không hợp lệ', error.details.map((detail) => detail.message));
  }
  req.body = value;
  next();
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const randomInteger = (min, max) => {
  const safeMin = Math.floor(toNumber(min, 1));
  const safeMax = Math.max(safeMin, Math.floor(toNumber(max, safeMin)));
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
};

const getBossPhase = (boss) => {
  const phases = Array.isArray(boss?.rewards?.phases) ? boss.rewards.phases : [];
  const hpPercent = boss?.max_hp
    ? toNumber(boss.current_hp, 0) / Math.max(1, toNumber(boss.max_hp, 1))
    : boss?.maxHp
      ? toNumber(boss.currentHp, 0) / Math.max(1, toNumber(boss.maxHp, 1))
      : 1;

  const sortedPhases = [...phases].sort((a, b) => toNumber(a.threshold, 1) - toNumber(b.threshold, 1));
  return sortedPhases.find((phase) => hpPercent <= toNumber(phase.threshold, 1))
    || phases[0]
    || { name: 'Ổn Định', description: 'Boss đang giữ nhịp chiến đấu.', retaliationMultiplier: 1, defenseMultiplier: 1 };
};

const normalizeBossDefinition = (row) => ({
  id: row.boss_id,
  bossId: row.boss_id,
  name: row.name,
  description: row.description || '',
  realmIndex: toNumber(row.realm_index),
  level: toNumber(row.level, 1),
  maxHp: toNumber(row.max_hp, 1),
  attack: toNumber(row.attack),
  defense: toNumber(row.defense),
  rewards: row.rewards || {},
  image: row.image || '',
  phase: getBossPhase({ ...row, current_hp: row.max_hp }),
  respawnHours: toNumber(row.respawn_hours, 24),
});

const normalizeSect = (row) => row && ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  ownerCharacterId: toNumber(row.owner_character_id),
  level: toNumber(row.level, 1),
  exp: toNumber(row.exp),
  spiritStones: toNumber(row.spirit_stones),
  maxMembers: toNumber(row.max_members, 30),
  memberCount: toNumber(row.member_count),
  createdAt: row.created_at,
});

const normalizeTreasuryRow = (row) => row && ({
  id: row.id,
  sectId: row.sect_id,
  itemId: row.item_id,
  itemName: row.item_name || row.item_id,
  quantity: toNumber(row.quantity),
  enhanceLevel: toNumber(row.enhance_level),
  rarity: row.rarity || 'common',
  type: row.type || 'material',
});

const normalizeSectShopItem = (item, sectLevel = 1) => ({
  ...item,
  unlocked: toNumber(sectLevel, 1) >= item.minSectLevel,
});

const normalizeMember = (row) => row && ({
  id: row.id,
  sectId: row.sect_id,
  characterId: row.character_id,
  characterName: row.character_name,
  role: row.role,
  contribution: toNumber(row.contribution),
  joinedAt: row.joined_at,
});

const normalizeDamageRow = (row, totalDamage = 0) => ({
  characterId: row.character_id,
  characterName: row.character_name,
  totalDamage: toNumber(row.total_damage),
  hitCount: toNumber(row.hit_count),
  share: totalDamage > 0 ? toNumber(row.total_damage) / totalDamage : 0,
});

const normalizeBossInstance = (row, damageBoard = []) => row && ({
  id: row.id,
  sectId: row.sect_id,
  bossId: row.boss_id,
  name: row.name,
  description: row.description || '',
  realmIndex: toNumber(row.realm_index),
  level: toNumber(row.level, 1),
  maxHp: toNumber(row.max_hp, 1),
  currentHp: toNumber(row.current_hp),
  attack: toNumber(row.attack),
  defense: toNumber(row.defense),
  rewards: row.rewards || {},
  image: row.image || '',
  phase: getBossPhase(row),
  status: row.status,
  spawnedAt: row.spawned_at,
  defeatedAt: row.defeated_at,
  expiresAt: row.expires_at,
  secondsRemaining: row.expires_at
    ? Math.max(0, Math.floor((new Date(row.expires_at).getTime() - Date.now()) / 1000))
    : null,
  totalDamage: toNumber(row.total_damage),
  damageBoard,
});

const listBossDefinitions = async (executor = { query }) => {
  const result = await executor.query(
    `SELECT boss_id, name, description, realm_index, level, max_hp, attack, defense, rewards, image, respawn_hours
     FROM boss_definitions
     WHERE is_active = TRUE
     ORDER BY realm_index ASC, level ASC, max_hp ASC`
  );
  return result.rows.map(normalizeBossDefinition);
};

const expireActiveBosses = async (sectId, executor = { query }) => {
  await executor.query(
    `UPDATE boss_instances
     SET status = 'expired'
     WHERE sect_id = $1
       AND status = 'active'
       AND expires_at IS NOT NULL
       AND expires_at <= NOW()`,
    [sectId]
  );
};

const getSectTreasury = async (sectId, executor = { query }) => {
  const result = await executor.query(
    `SELECT sti.*, idf.name AS item_name, idf.rarity, idf.type
     FROM sect_treasury_items sti
     JOIN item_definitions idf ON idf.item_id = sti.item_id
     WHERE sti.sect_id = $1 AND sti.quantity > 0
     ORDER BY idf.rarity DESC, idf.name ASC`,
    [sectId]
  );
  return result.rows.map(normalizeTreasuryRow);
};

const getSectShopItems = (sectLevel) => SECT_SHOP_CATALOG.map((item) => normalizeSectShopItem(item, sectLevel));

const getDailyAttackInfo = async (characterId, bossRewards = {}, executor = { query }) => {
  const limit = toNumber(bossRewards.dailyAttackLimit, DEFAULT_DAILY_BOSS_ATTACKS);
  const result = await executor.query(
    `SELECT COUNT(*)::int AS used
     FROM boss_attacks
     WHERE character_id = $1
       AND created_at::date = CURRENT_DATE`,
    [characterId]
  );
  const used = toNumber(result.rows[0]?.used);
  return {
    dailyLimit: limit,
    usedToday: used,
    remainingToday: Math.max(0, limit - used),
  };
};

const getBossParticipantCount = async (bossInstanceId, executor = { query }) => {
  const result = await executor.query(
    `SELECT COUNT(DISTINCT character_id)::int AS participants
     FROM boss_attacks
     WHERE boss_instance_id = $1`,
    [bossInstanceId]
  );
  return toNumber(result.rows[0]?.participants);
};

const getSectDailyMetrics = async (sectId, executor = { query }) => {
  const result = await executor.query(
    `SELECT
       COALESCE(SUM(ba.damage), 0)::bigint AS damage,
       COUNT(DISTINCT ba.character_id)::int AS participants,
       (
         SELECT COUNT(*)::int
         FROM boss_instances bi2
         WHERE bi2.sect_id = $1
           AND bi2.status = 'defeated'
           AND bi2.defeated_at::date = CURRENT_DATE
       ) AS defeats
     FROM boss_instances bi
     LEFT JOIN boss_attacks ba ON ba.boss_instance_id = bi.id
       AND ba.created_at::date = CURRENT_DATE
     WHERE bi.sect_id = $1`,
    [sectId]
  );

  return {
    damage: toNumber(result.rows[0]?.damage),
    participants: toNumber(result.rows[0]?.participants),
    defeats: toNumber(result.rows[0]?.defeats),
  };
};

const getSectDailyQuests = async (sectId, characterId, executor = { query }) => {
  const [metrics, claims] = await Promise.all([
    getSectDailyMetrics(sectId, executor),
    executor.query(
      `SELECT quest_id
       FROM sect_quest_claims
       WHERE sect_id = $1
         AND claimed_by = $2
         AND quest_date = CURRENT_DATE`,
      [sectId, characterId]
    ),
  ]);
  const claimed = new Set(claims.rows.map((row) => row.quest_id));

  return SECT_DAILY_QUESTS.map((questDef) => {
    const progress = Math.min(questDef.target, toNumber(metrics[questDef.metric]));
    return {
      ...questDef,
      progress,
      completed: progress >= questDef.target,
      claimed: claimed.has(questDef.id),
    };
  });
};

const getBossDamageBoard = async (bossInstanceId, executor = { query }) => {
  if (!bossInstanceId) return [];
  const result = await executor.query(
    `SELECT
       ba.character_id,
       c.name AS character_name,
       SUM(ba.damage) AS total_damage,
       COUNT(*) AS hit_count
     FROM boss_attacks ba
     JOIN characters c ON c.id = ba.character_id
     WHERE ba.boss_instance_id = $1
     GROUP BY ba.character_id, c.name
     ORDER BY total_damage DESC, hit_count ASC, c.name ASC`,
    [bossInstanceId]
  );
  const totalDamage = result.rows.reduce((sum, row) => sum + toNumber(row.total_damage), 0);
  return result.rows.map((row) => normalizeDamageRow(row, totalDamage));
};

const getActiveBossForSect = async (sectId, executor = { query }) => {
  await expireActiveBosses(sectId, executor);
  const result = await executor.query(
    `SELECT
       bi.id,
       bi.sect_id,
       bi.boss_id,
       bi.current_hp,
       bi.status,
       bi.spawned_at,
       bi.defeated_at,
       bi.expires_at,
       bd.name,
       bd.description,
       bd.realm_index,
       bd.level,
       bd.max_hp,
       bd.attack,
       bd.defense,
       bd.rewards,
       bd.image,
       COALESCE(SUM(ba.damage), 0) AS total_damage
     FROM boss_instances bi
     JOIN boss_definitions bd ON bd.boss_id = bi.boss_id
     LEFT JOIN boss_attacks ba ON ba.boss_instance_id = bi.id
     WHERE bi.sect_id = $1 AND bi.status = 'active'
     GROUP BY bi.id, bd.boss_id
     ORDER BY bi.spawned_at DESC
     LIMIT 1`,
    [sectId]
  );
  const boss = result.rows[0];
  if (!boss) return null;
  return normalizeBossInstance(boss, await getBossDamageBoard(boss.id, executor));
};

const getSectMembership = async (characterId, executor = { query }) => {
  const result = await executor.query(
    `SELECT
       sm.id,
       sm.sect_id,
       sm.character_id,
       sm.role,
       sm.contribution,
       sm.joined_at,
       c.name AS character_name
     FROM sect_members sm
     JOIN characters c ON c.id = sm.character_id
     WHERE sm.character_id = $1`,
    [characterId]
  );
  return normalizeMember(result.rows[0]);
};

const assertSectMember = async (sectId, characterId, executor) => {
  const result = await executor.query(
    `SELECT sm.*, c.name AS character_name
     FROM sect_members sm
     JOIN characters c ON c.id = sm.character_id
     WHERE sm.sect_id = $1 AND sm.character_id = $2`,
    [sectId, characterId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Nhân vật chưa thuộc tông môn này');
    error.status = 403;
    throw error;
  }

  return normalizeMember(result.rows[0]);
};

const calculateDamage = (character, boss, phase, coordinationMultiplier = 1) => {
  const attack = toNumber(character.attack);
  const spirit = toNumber(character.spirit);
  const agility = toNumber(character.agility);
  const defenseMultiplier = toNumber(phase.defenseMultiplier, 1);
  const effectiveDefense = toNumber(boss.defense) * defenseMultiplier;
  const rawDamage = attack * 1.5 + spirit * 0.8 + agility * 0.35 - effectiveDefense * 0.4;
  return Math.max(1, Math.floor(rawDamage * coordinationMultiplier));
};

const rollLoot = (rewards, recipient) => {
  const loot = Array.isArray(rewards?.loot) ? rewards.loot : [];
  return loot
    .filter((drop) => Math.random() < toNumber(drop.chance, 0))
    .map((drop) => ({
      itemId: drop.itemId,
      quantity: randomInteger(drop.minQty, drop.maxQty),
      mode: drop.mode || 'mvp',
      characterId: drop.mode === 'treasury' ? null : recipient?.characterId || null,
      characterName: drop.mode === 'treasury' ? null : recipient?.characterName || null,
    }));
};

const grantLoot = async (client, lootDrops) => {
  for (const drop of lootDrops.filter((entry) => entry.mode !== 'treasury')) {
    if (!drop.characterId || !drop.itemId || drop.quantity <= 0) continue;
    await client.query(
      `INSERT INTO inventory (character_id, item_id, quantity, enhance_level)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (character_id, item_id, enhance_level)
       DO UPDATE SET quantity = inventory.quantity + $3`,
      [drop.characterId, drop.itemId, drop.quantity]
    );
  }
};

const grantTreasuryLoot = async (client, sectId, lootDrops) => {
  for (const drop of lootDrops.filter((entry) => entry.mode === 'treasury')) {
    if (!drop.itemId || drop.quantity <= 0) continue;
    await client.query(
      `INSERT INTO sect_treasury_items (sect_id, item_id, quantity, enhance_level)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (sect_id, item_id, enhance_level)
       DO UPDATE SET quantity = sect_treasury_items.quantity + $3`,
      [sectId, drop.itemId, drop.quantity]
    );
  }
};

const distributeDefeatRewards = async ({ client, sectId, bossInstanceId, rewards, attackerId }) => {
  const damageBoard = await getBossDamageBoard(bossInstanceId, client);
  const totalDamage = damageBoard.reduce((sum, row) => sum + row.totalDamage, 0);
  const mvp = damageBoard[0] || null;
  const rewardDistribution = [];

  for (const row of damageBoard) {
    const share = totalDamage > 0 ? row.totalDamage / totalDamage : 0;
    const expGain = Math.max(1, Math.floor(toNumber(rewards.exp) * share));
    const stonesGain = Math.max(0, Math.floor(toNumber(rewards.spiritStones) * share));
    const contributionGain = Math.max(1, Math.floor(toNumber(rewards.contribution) * share));

    const characterResult = await client.query(
      `SELECT realm_index, level, exp, max_exp
       FROM characters
       WHERE id = $1
       FOR UPDATE`,
      [row.characterId]
    );
    const character = characterResult.rows[0];
    const nextProgress = calculateExpProgress({
      realmIndex: character.realm_index,
      level: character.level,
      exp: character.exp,
      maxExp: character.max_exp,
    }, expGain);
    const statGain = calculateLevelStatGain({
      realmIndex: character.realm_index,
      fromLevel: character.level,
      toLevel: nextProgress.level,
    });

    await client.query(
      `UPDATE characters
       SET spirit_stones = spirit_stones + $2,
           exp = $3,
           level = $4,
           max_exp = $5
      WHERE id = $1`,
      [row.characterId, stonesGain, nextProgress.exp, nextProgress.level, nextProgress.maxExp]
    );
    await applyCharacterStatGain(row.characterId, statGain, client);

    await client.query(
      `UPDATE sect_members
       SET contribution = contribution + $3
       WHERE sect_id = $1 AND character_id = $2`,
      [sectId, row.characterId, contributionGain]
    );

    rewardDistribution.push({
      characterId: row.characterId,
      characterName: row.characterName,
      exp: expGain,
      spiritStones: stonesGain,
      contribution: contributionGain,
      statGain,
      share,
    });
  }

  const fallbackMvp = mvp || { characterId: attackerId, characterName: null };
  const lootDrops = rollLoot(rewards, fallbackMvp);
  await grantLoot(client, lootDrops);
  await grantTreasuryLoot(client, sectId, lootDrops);

  return { damageBoard, rewardDistribution, lootDrops, mvp: fallbackMvp };
};

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, COUNT(sm.id) AS member_count
       FROM sects s
       LEFT JOIN sect_members sm ON sm.sect_id = s.id
       GROUP BY s.id
       ORDER BY s.level DESC, s.exp DESC, s.created_at ASC`
    );
    ok(res, { sects: result.rows.map(normalizeSect) });
  } catch (error) {
    console.error('Không thể tải danh sách tông môn:', error);
    fail(res, 500, 'Không thể tải danh sách tông môn');
  }
});

router.get('/bosses/catalog', async (req, res) => {
  try {
    ok(res, { bosses: await listBossDefinitions() });
  } catch (error) {
    console.error('Không thể tải danh sách boss:', error);
    fail(res, 500, 'Không thể tải danh sách boss');
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const result = await query(
      `SELECT
         s.id,
         s.name,
         s.level,
         s.exp,
         s.spirit_stones,
         COUNT(DISTINCT sm.character_id) AS member_count,
         COALESCE(SUM(CASE WHEN ba.created_at >= NOW() - INTERVAL '7 days' THEN ba.damage ELSE 0 END), 0) AS weekly_damage,
         COUNT(DISTINCT CASE WHEN bi.status = 'defeated' AND bi.defeated_at >= NOW() - INTERVAL '7 days' THEN bi.id END) AS weekly_defeats,
         RANK() OVER (
           ORDER BY
             COALESCE(SUM(CASE WHEN ba.created_at >= NOW() - INTERVAL '7 days' THEN ba.damage ELSE 0 END), 0) DESC,
             s.level DESC,
             s.exp DESC
         ) AS rank
       FROM sects s
       LEFT JOIN sect_members sm ON sm.sect_id = s.id
       LEFT JOIN boss_instances bi ON bi.sect_id = s.id
       LEFT JOIN boss_attacks ba ON ba.boss_instance_id = bi.id
       GROUP BY s.id
       ORDER BY rank
       LIMIT 50`
    );

    ok(res, {
      leaderboard: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        level: toNumber(row.level, 1),
        exp: toNumber(row.exp),
        spiritStones: toNumber(row.spirit_stones),
        memberCount: toNumber(row.member_count),
        weeklyDamage: toNumber(row.weekly_damage),
        weeklyDefeats: toNumber(row.weekly_defeats),
        rank: toNumber(row.rank),
      })),
    });
  } catch (error) {
    console.error('Không thể tải bảng xếp hạng tông môn:', error);
    fail(res, 500, 'Không thể tải bảng xếp hạng tông môn');
  }
});

router.get('/character/:characterId', requireCharacterOwner('characterId'), async (req, res) => {
  try {
    const { characterId } = req.params;
    const member = await getSectMembership(characterId);
    const bosses = await listBossDefinitions();

    if (!member) {
      return ok(res, {
        sect: null,
        member: null,
        members: [],
        activeBoss: null,
        bossCatalog: bosses,
        attackInfo: { dailyLimit: DEFAULT_DAILY_BOSS_ATTACKS, usedToday: 0, remainingToday: DEFAULT_DAILY_BOSS_ATTACKS },
        treasury: [],
        sectShop: [],
        dailyQuests: [],
      });
    }

    const sectResult = await query(
      `SELECT s.*, COUNT(sm.id) AS member_count
       FROM sects s
       LEFT JOIN sect_members sm ON sm.sect_id = s.id
       WHERE s.id = $1
       GROUP BY s.id`,
      [member.sectId]
    );

    const membersResult = await query(
      `SELECT sm.*, c.name AS character_name
       FROM sect_members sm
       JOIN characters c ON c.id = sm.character_id
       WHERE sm.sect_id = $1
       ORDER BY
         CASE sm.role WHEN 'leader' THEN 1 WHEN 'elder' THEN 2 ELSE 3 END,
         sm.contribution DESC,
         sm.joined_at ASC`,
      [member.sectId]
    );

    const sect = normalizeSect(sectResult.rows[0]);
    const activeBoss = await getActiveBossForSect(member.sectId);

    ok(res, {
      sect,
      member,
      members: membersResult.rows.map(normalizeMember),
      activeBoss,
      bossCatalog: bosses,
      attackInfo: await getDailyAttackInfo(characterId, activeBoss?.rewards),
      treasury: await getSectTreasury(member.sectId),
      sectShop: getSectShopItems(sect?.level),
      dailyQuests: await getSectDailyQuests(member.sectId, characterId),
    });
  } catch (error) {
    console.error('Không thể tải thông tin tông môn:', error);
    fail(res, 500, 'Không thể tải thông tin tông môn');
  }
});

router.post('/', gameplayLimiter, validateBody(createSectSchema), requireCharacterOwner('characterId'), async (req, res) => {
  try {
    const { characterId, name, description } = req.body;

    const result = await withTransaction(async (client) => {
      const existingMember = await getSectMembership(characterId, client);
      if (existingMember) {
        const error = new Error('Nhân vật đã thuộc một tông môn');
        error.status = 400;
        throw error;
      }

      const sectResult = await client.query(
        `INSERT INTO sects (name, description, owner_character_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, description, characterId]
      );
      const sect = sectResult.rows[0];

      const memberResult = await client.query(
        `INSERT INTO sect_members (sect_id, character_id, role)
         VALUES ($1, $2, 'leader')
         RETURNING *`,
        [sect.id, characterId]
      );

      await client.query(
        `INSERT INTO event_logs (character_id, event_type, message)
         VALUES ($1, 'success', $2)`,
        [characterId, `Sáng lập tông môn ${name}`]
      );

      return {
        sect: normalizeSect({ ...sect, member_count: 1 }),
        member: normalizeMember({ ...memberResult.rows[0], character_name: null }),
      };
    });

    created(res, { ...result, message: `Đã sáng lập tông môn ${result.sect.name}` });
  } catch (error) {
    if (error.code === '23505') {
      return fail(res, 400, 'Tên tông môn đã tồn tại');
    }
    if (error.status) return failFromError(res, error, 'Không thể tạo tông môn');
    console.error('Không thể tạo tông môn:', error);
    fail(res, 500, 'Không thể tạo tông môn');
  }
});

router.post('/:sectId/join', gameplayLimiter, validateBody(characterActionSchema), requireCharacterOwner('characterId'), async (req, res) => {
  try {
    const { sectId } = req.params;
    const { characterId } = req.body;

    const result = await withTransaction(async (client) => {
      const existingMember = await getSectMembership(characterId, client);
      if (existingMember) {
        const error = new Error('Nhân vật đã thuộc một tông môn');
        error.status = 400;
        throw error;
      }

      const sectResult = await client.query(
        `SELECT
           s.*,
           (SELECT COUNT(*) FROM sect_members sm WHERE sm.sect_id = s.id) AS member_count
         FROM sects s
         WHERE s.id = $1
         FOR UPDATE`,
        [sectId]
      );

      const sect = sectResult.rows[0];
      if (!sect) {
        const error = new Error('Không tìm thấy tông môn');
        error.status = 404;
        throw error;
      }
      if (toNumber(sect.member_count) >= toNumber(sect.max_members, 30)) {
        const error = new Error('Tông môn đã đủ thành viên');
        error.status = 400;
        throw error;
      }

      const memberResult = await client.query(
        `INSERT INTO sect_members (sect_id, character_id, role)
         VALUES ($1, $2, 'member')
         RETURNING *`,
        [sectId, characterId]
      );

      await client.query(
        `INSERT INTO event_logs (character_id, event_type, message)
         VALUES ($1, 'success', $2)`,
        [characterId, `Gia nhập tông môn ${sect.name}`]
      );

      return {
        sect: normalizeSect({ ...sect, member_count: toNumber(sect.member_count) + 1 }),
        member: normalizeMember({ ...memberResult.rows[0], character_name: null }),
      };
    });

    ok(res, { ...result, message: `Đã gia nhập tông môn ${result.sect.name}` });
  } catch (error) {
    if (error.status) return failFromError(res, error, 'Không thể gia nhập tông môn');
    console.error('Không thể gia nhập tông môn:', error);
    fail(res, 500, 'Không thể gia nhập tông môn');
  }
});

router.post('/:sectId/leave', gameplayLimiter, validateBody(characterActionSchema), requireCharacterOwner('characterId'), async (req, res) => {
  try {
    const { sectId } = req.params;
    const { characterId } = req.body;

    const result = await withTransaction(async (client) => {
      const member = await assertSectMember(sectId, characterId, client);
      if (member.role === 'leader') {
        const error = new Error('Tông chủ chưa thể rời tông môn');
        error.status = 400;
        throw error;
      }

      await client.query(
        'DELETE FROM sect_members WHERE sect_id = $1 AND character_id = $2',
        [sectId, characterId]
      );

      return { message: 'Đã rời tông môn' };
    });

    ok(res, result);
  } catch (error) {
    if (error.status) return failFromError(res, error, 'Không thể rời tông môn');
    console.error('Không thể rời tông môn:', error);
    fail(res, 500, 'Không thể rời tông môn');
  }
});

router.post('/:sectId/shop/buy', gameplayLimiter, validateBody(buySectShopSchema), requireCharacterOwner('characterId'), async (req, res) => {
  try {
    const { sectId } = req.params;
    const { characterId, shopItemId } = req.body;

    const result = await withTransaction(async (client) => {
      const member = await assertSectMember(sectId, characterId, client);
      const sectResult = await client.query('SELECT * FROM sects WHERE id = $1 FOR UPDATE', [sectId]);
      const sect = sectResult.rows[0];
      if (!sect) {
        const error = new Error('Không tìm thấy tông môn');
        error.status = 404;
        throw error;
      }

      const shopItem = getSectShopItems(sect.level).find((item) => item.id === shopItemId);
      if (!shopItem) {
        const error = new Error('Không tìm thấy vật phẩm tông môn');
        error.status = 404;
        throw error;
      }
      if (!shopItem.unlocked) {
        const error = new Error('Cấp tông môn chưa đủ để đổi vật phẩm này');
        error.status = 400;
        throw error;
      }
      if (toNumber(member.contribution) < shopItem.contributionCost) {
        const error = new Error('Không đủ cống hiến tông môn');
        error.status = 400;
        error.details = { required: shopItem.contributionCost, current: toNumber(member.contribution) };
        throw error;
      }

      await client.query(
        `UPDATE sect_members
         SET contribution = contribution - $3
         WHERE sect_id = $1 AND character_id = $2`,
        [sectId, characterId, shopItem.contributionCost]
      );
      await client.query(
        `INSERT INTO inventory (character_id, item_id, quantity, enhance_level)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (character_id, item_id, enhance_level)
         DO UPDATE SET quantity = inventory.quantity + $3`,
        [characterId, shopItem.itemId, shopItem.quantity]
      );

      return {
        shopItem,
        message: `Đã đổi ${shopItem.quantity}x ${shopItem.label}`,
      };
    });

    ok(res, result);
  } catch (error) {
    if (error.status) return failFromError(res, error, 'Không thể đổi vật phẩm tông môn');
    console.error('Không thể đổi vật phẩm tông môn:', error);
    fail(res, 500, 'Không thể đổi vật phẩm tông môn');
  }
});

router.post('/:sectId/quests/:questId/claim', gameplayLimiter, validateBody(characterActionSchema), requireCharacterOwner('characterId'), async (req, res) => {
  try {
    const { sectId, questId } = req.params;
    const { characterId } = req.body;

    const result = await withTransaction(async (client) => {
      await assertSectMember(sectId, characterId, client);
      const quests = await getSectDailyQuests(sectId, characterId, client);
      const questState = quests.find((quest) => quest.id === questId);
      if (!questState) {
        const error = new Error('Không tìm thấy nhiệm vụ tông môn');
        error.status = 404;
        throw error;
      }
      if (!questState.completed) {
        const error = new Error('Nhiệm vụ tông môn chưa hoàn thành');
        error.status = 400;
        throw error;
      }
      if (questState.claimed) {
        const error = new Error('Nhiệm vụ tông môn đã nhận thưởng hôm nay');
        error.status = 400;
        throw error;
      }

      await client.query(
        `INSERT INTO sect_quest_claims (sect_id, quest_id, quest_date, claimed_by)
         VALUES ($1, $2, CURRENT_DATE, $3)`,
        [sectId, questId, characterId]
      );

      const rewards = questState.rewards || {};
      await client.query(
        `UPDATE sects
         SET exp = exp + $2,
             spirit_stones = spirit_stones + $3
         WHERE id = $1`,
        [sectId, toNumber(rewards.sectExp), toNumber(rewards.spiritStones)]
      );
      await client.query(
        `UPDATE sect_members
         SET contribution = contribution + $3
         WHERE sect_id = $1 AND character_id = $2`,
        [sectId, characterId, toNumber(rewards.contribution)]
      );

      return {
        quest: { ...questState, claimed: true },
        dailyQuests: await getSectDailyQuests(sectId, characterId, client),
        message: `Đã nhận thưởng nhiệm vụ ${questState.title}`,
      };
    });

    ok(res, result);
  } catch (error) {
    if (error.code === '23505') {
      return fail(res, 400, 'Nhiệm vụ tông môn đã nhận thưởng hôm nay');
    }
    if (error.status) return failFromError(res, error, 'Không thể nhận thưởng nhiệm vụ tông môn');
    console.error('Không thể nhận thưởng nhiệm vụ tông môn:', error);
    fail(res, 500, 'Không thể nhận thưởng nhiệm vụ tông môn');
  }
});

router.post('/:sectId/bosses/spawn', gameplayLimiter, validateBody(spawnBossSchema), requireCharacterOwner('characterId'), async (req, res) => {
  try {
    const { sectId } = req.params;
    const { characterId, bossId } = req.body;

    const result = await withTransaction(async (client) => {
      const member = await assertSectMember(sectId, characterId, client);
      if (!['leader', 'elder'].includes(member.role)) {
        const error = new Error('Chỉ tông chủ hoặc trưởng lão có thể mở raid boss');
        error.status = 400;
        throw error;
      }

      const activeBoss = await getActiveBossForSect(sectId, client);
      if (activeBoss) {
        const error = new Error('Tông môn đang có boss cần khiêu chiến');
        error.status = 400;
        throw error;
      }

      const bossResult = await client.query(
        `SELECT boss_id, name, description, realm_index, level, max_hp, attack, defense, rewards, image, respawn_hours
         FROM boss_definitions
         WHERE boss_id = $1 AND is_active = TRUE`,
        [bossId]
      );
      const boss = bossResult.rows[0];
      if (!boss) {
        const error = new Error('Không tìm thấy boss');
        error.status = 404;
        throw error;
      }

      const raidMinutes = Math.max(15, Math.min(180, toNumber(boss.rewards?.raidMinutes, DEFAULT_RAID_MINUTES)));
      const instanceResult = await client.query(
        `INSERT INTO boss_instances (sect_id, boss_id, current_hp, expires_at)
         VALUES ($1, $2, $3, NOW() + ($4::integer * INTERVAL '1 minute'))
         RETURNING *`,
        [sectId, boss.boss_id, boss.max_hp, raidMinutes]
      );

      return normalizeBossInstance({ ...instanceResult.rows[0], ...boss, total_damage: 0 }, []);
    });

    ok(res, { activeBoss: result, message: `Đã triệu hồi ${result.name}` });
  } catch (error) {
    if (error.status) return failFromError(res, error, 'Không thể triệu hồi boss');
    console.error('Không thể triệu hồi boss:', error);
    fail(res, 500, 'Không thể triệu hồi boss');
  }
});

router.post('/:sectId/bosses/:instanceId/attack', gameplayLimiter, validateBody(characterActionSchema), requireCharacterOwner('characterId'), async (req, res) => {
  try {
    const { sectId, instanceId } = req.params;
    const { characterId } = req.body;

    const result = await withTransaction(async (client) => {
      await assertSectMember(sectId, characterId, client);
      await applyHpRegeneration(characterId, client);

      const bossResult = await client.query(
        `SELECT
           bi.*,
           bd.name,
           bd.description,
           bd.realm_index,
           bd.level,
           bd.max_hp,
           bd.attack,
           bd.defense,
           bd.rewards,
           bd.image
         FROM boss_instances bi
         JOIN boss_definitions bd ON bd.boss_id = bi.boss_id
         WHERE bi.id = $1 AND bi.sect_id = $2 AND bi.status = 'active'
         FOR UPDATE OF bi`,
        [instanceId, sectId]
      );

      const boss = bossResult.rows[0];
      if (!boss) {
        const error = new Error('Không tìm thấy boss đang hoạt động');
        error.status = 404;
        throw error;
      }

      if (boss.expires_at && new Date(boss.expires_at).getTime() <= Date.now()) {
        await client.query(
          `UPDATE boss_instances
           SET status = 'expired'
           WHERE id = $1`,
          [instanceId]
        );
        const error = new Error('Raid boss đã hết thời gian khiêu chiến');
        error.status = 400;
        throw error;
      }

      const phase = getBossPhase(boss);
      const attackInfo = await getDailyAttackInfo(characterId, boss.rewards || {}, client);
      if (attackInfo.remainingToday <= 0) {
        const error = new Error('Đã hết lượt đánh boss hôm nay');
        error.status = 429;
        error.details = attackInfo;
        throw error;
      }

      const participantResult = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM boss_attacks
           WHERE boss_instance_id = $1 AND character_id = $2
         ) AS has_attacked`,
        [instanceId, characterId]
      );
      const existingParticipants = await getBossParticipantCount(instanceId, client);
      const participantCount = existingParticipants + (participantResult.rows[0]?.has_attacked ? 0 : 1);
      const requiredParticipants = Math.max(1, toNumber(phase.requiredParticipants, 1));
      const coordinationMultiplier = participantCount >= requiredParticipants
        ? 1
        : Math.max(0.35, participantCount / requiredParticipants);
      const phaseMechanic = {
        requiredParticipants,
        participantCount,
        coordinationMultiplier,
        underCoordinated: participantCount < requiredParticipants,
      };
      const characterResult = await client.query(
        `WITH equipment_bonus AS (
           SELECT
             e.character_id,
             COALESCE(SUM(COALESCE((i.effect->>'attack')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_attack,
             COALESCE(SUM(COALESCE((i.effect->>'defense')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_defense,
             COALESCE(SUM(COALESCE((i.effect->>'spirit')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_spirit,
             COALESCE(SUM(COALESCE((i.effect->>'agility')::numeric, 0) * (1 + COALESCE(e.enhance_level, 0))), 0) AS bonus_agility
           FROM equipment e
           JOIN item_definitions i ON i.item_id = e.item_id
           WHERE e.character_id = $1
           GROUP BY e.character_id
         )
         SELECT
           c.*,
           (COALESCE(c.attack, 0) + COALESCE(eb.bonus_attack, 0)) AS attack,
           (COALESCE(c.defense, 0) + COALESCE(eb.bonus_defense, 0)) AS defense,
           (COALESCE(c.spirit, 0) + COALESCE(eb.bonus_spirit, 0)) AS spirit,
           (COALESCE(c.agility, 0) + COALESCE(eb.bonus_agility, 0)) AS agility
         FROM characters c
         LEFT JOIN equipment_bonus eb ON eb.character_id = c.id
         WHERE c.id = $1
         FOR UPDATE OF c`,
        [characterId]
      );
      const character = characterResult.rows[0];
      if (!character) {
        const error = new Error('Không tìm thấy nhân vật');
        error.status = 404;
        throw error;
      }

      const hpLoss = Math.max(
        1,
        Math.floor((toNumber(boss.attack) * 0.08 - toNumber(character.defense) * 0.03) * toNumber(phase.retaliationMultiplier, 1))
      );
      const currentHp = toNumber(character.hp);
      if (currentHp <= hpLoss) {
        const error = new Error('Không đủ HP để đánh boss');
        error.status = 400;
        error.details = { requiredHp: hpLoss + 1, currentHp };
        throw error;
      }

      const damage = Math.min(toNumber(boss.current_hp), calculateDamage(character, boss, phase, coordinationMultiplier));
      const nextHp = Math.max(0, toNumber(boss.current_hp) - damage);
      const defeated = nextHp <= 0;
      const rewards = boss.rewards || {};

      await client.query(
        `UPDATE boss_instances
         SET current_hp = $2,
             status = CASE WHEN $3 THEN 'defeated' ELSE status END,
             defeated_at = CASE WHEN $3 THEN NOW() ELSE defeated_at END
         WHERE id = $1`,
        [instanceId, nextHp, defeated]
      );

      await client.query(
        `INSERT INTO boss_attacks (boss_instance_id, character_id, damage)
         VALUES ($1, $2, $3)`,
        [instanceId, characterId, damage]
      );

      await client.query(
        `UPDATE characters
         SET hp = hp - $2,
             last_hp_regen_at = NOW()
         WHERE id = $1`,
        [characterId, hpLoss]
      );

      const contributionGain = Math.max(1, Math.floor(damage / 10));
      const sectExpGain = Math.max(1, Math.floor(damage / 20));
      await client.query(
        `UPDATE sect_members
         SET contribution = contribution + $3
         WHERE sect_id = $1 AND character_id = $2`,
        [sectId, characterId, contributionGain]
      );

      let defeatRewards = { damageBoard: [], rewardDistribution: [], lootDrops: [], mvp: null };
      if (defeated) {
        defeatRewards = await distributeDefeatRewards({ client, sectId, bossInstanceId: instanceId, rewards, attackerId: characterId });
      }

      await client.query(
        `UPDATE sects
         SET exp = exp + $2,
             spirit_stones = spirit_stones + $3
         WHERE id = $1`,
        [sectId, defeated ? toNumber(rewards.sectExp, 0) : sectExpGain, defeated ? toNumber(rewards.spiritStones, 0) : 0]
      );

      const damageBoard = defeated ? defeatRewards.damageBoard : await getBossDamageBoard(instanceId, client);
      const nextBoss = normalizeBossInstance({
        ...boss,
        current_hp: nextHp,
        status: defeated ? 'defeated' : 'active',
        total_damage: damageBoard.reduce((sum, row) => sum + row.totalDamage, 0),
      }, damageBoard);
      const nextPhase = getBossPhase({ ...boss, current_hp: nextHp });

      const message = defeated
        ? `Đã hạ gục ${boss.name}! MVP: ${defeatRewards.mvp?.characterName || 'Đạo hữu'}, phần thưởng đã chia theo sát thương.`
        : `Tấn công ${boss.name}: gây ${damage} sát thương, mất ${hpLoss} HP.`;

      await client.query(
        `INSERT INTO event_logs (character_id, event_type, message)
         VALUES ($1, $2, $3)`,
        [characterId, defeated ? 'success' : 'info', message]
      );

      return {
        success: true,
        message,
        damage,
        hpLoss,
        defeated,
        phase,
        nextPhase,
        phaseMechanic,
        attackInfo: {
          ...attackInfo,
          usedToday: attackInfo.usedToday + 1,
          remainingToday: Math.max(0, attackInfo.remainingToday - 1),
        },
        rewards: defeated ? rewards : {},
        rewardDistribution: defeatRewards.rewardDistribution,
        lootDrops: defeatRewards.lootDrops,
        damageBoard,
        activeBoss: nextBoss,
      };
    });

    ok(res, result);
  } catch (error) {
    if (error.status) return failFromError(res, error, 'Không thể đánh boss');
    console.error('Không thể đánh boss:', error);
    fail(res, 500, 'Không thể đánh boss');
  }
});

export default router;
