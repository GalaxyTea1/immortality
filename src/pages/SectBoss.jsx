import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useGame } from '../context/GameContext';
import { sects as sectApi } from '../services/api';
import './SectBoss.css';

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value) || 0);

const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes <= 0) return `${remainingSeconds}s`;
  return `${minutes}p ${remainingSeconds.toString().padStart(2, '0')}s`;
};

const getBossPercent = (boss) => {
  if (!boss?.maxHp) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(boss.currentHp) / Number(boss.maxHp)) * 100)));
};

const getRoleLabel = (role) => {
  if (role === 'leader') return 'Tông chủ';
  if (role === 'elder') return 'Trưởng lão';
  return 'Thành viên';
};

const emptyProfile = {
  sect: null,
  member: null,
  members: [],
  activeBoss: null,
  bossCatalog: [],
  attackInfo: null,
  treasury: [],
  sectShop: [],
  dailyQuests: [],
};

function SectBoss() {
  const { characterId, loadFromServer, ITEM_DEFINITIONS } = useGame();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [combatResult, setCombatResult] = useState(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [sectList, setSectList] = useState([]);
  const [sectLeaderboard, setSectLeaderboard] = useState([]);
  const [newSect, setNewSect] = useState({ name: '', description: '' });
  const [selectedBossId, setSelectedBossId] = useState('');

  const selectedBoss = useMemo(
    () => profile.bossCatalog.find((boss) => boss.id === selectedBossId) || profile.bossCatalog[0],
    [profile.bossCatalog, selectedBossId]
  );

  const activeBoss = profile.activeBoss?.status === 'active' ? profile.activeBoss : null;
  const damageBoard = activeBoss?.damageBoard || combatResult?.damageBoard || [];
  const currentPhase = activeBoss?.phase || selectedBoss?.phase || null;
  const bossPercent = getBossPercent(activeBoss);
  const attackInfo = combatResult?.attackInfo || profile.attackInfo;
  const canManageRaid = ['leader', 'elder'].includes(profile.member?.role);

  const getItemName = useCallback((itemId) => ITEM_DEFINITIONS?.[itemId]?.name || itemId, [ITEM_DEFINITIONS]);

  const loadSectData = useCallback(async () => {
    if (!characterId) return;
    setIsLoading(true);
    try {
      const [nextProfile, nextSectList, nextSectLeaderboard] = await Promise.all([
        sectApi.getProfile(characterId),
        sectApi.getAll(),
        sectApi.getLeaderboard(),
      ]);
      setProfile({ ...emptyProfile, ...nextProfile });
      setSectList(nextSectList);
      setSectLeaderboard(nextSectLeaderboard);
      setSelectedBossId((current) => current || nextProfile.bossCatalog?.[0]?.id || '');
    } catch (error) {
      toast.error(error.message || 'Không thể tải dữ liệu tông môn');
    } finally {
      setIsLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    loadSectData();
  }, [loadSectData]);

  const runAction = useCallback(async (action, successMessage) => {
    if (!characterId) {
      toast.error('Không tìm thấy nhân vật đang online');
      return null;
    }
    setIsSubmitting(true);
    try {
      const result = await action();
      setCombatResult(result?.damage !== undefined ? result : null);
      toast.success(result?.message || successMessage);
      await Promise.all([loadSectData(), loadFromServer?.()]);
      return result;
    } catch (error) {
      toast.error(error.message || 'Thao tác thất bại');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [characterId, loadFromServer, loadSectData]);

  const handleCreateSect = (event) => {
    event.preventDefault();
    const name = newSect.name.trim();
    if (!name) {
      toast.error('Vui lòng nhập tên tông môn');
      return;
    }
    runAction(
      () => sectApi.create(characterId, name, newSect.description.trim()),
      'Đã tạo tông môn'
    );
  };

  const handleJoinSect = (sectId) => {
    runAction(() => sectApi.join(sectId, characterId), 'Đã gia nhập tông môn');
  };

  const handleSpawnBoss = () => {
    if (!profile.sect || !selectedBoss) return;
    setCombatResult(null);
    runAction(
      () => sectApi.spawnBoss(profile.sect.id, characterId, selectedBoss.id),
      'Đã mở raid boss'
    );
  };

  const handleAttackBoss = () => {
    if (!profile.sect || !activeBoss) return;
    runAction(
      () => sectApi.attackBoss(profile.sect.id, activeBoss.id, characterId),
      'Đã tấn công boss'
    );
  };

  const handleBuyShopItem = (shopItemId) => {
    if (!profile.sect) return;
    runAction(
      () => sectApi.buyShopItem(profile.sect.id, characterId, shopItemId),
      'Đã đổi vật phẩm tông môn'
    );
  };

  const handleClaimQuest = (questId) => {
    if (!profile.sect) return;
    runAction(
      () => sectApi.claimQuest(profile.sect.id, characterId, questId),
      'Đã nhận thưởng nhiệm vụ tông môn'
    );
  };

  if (isLoading) {
    return (
      <div className="sect-page">
        <div className="sect-loading">Đang tải dữ liệu tông môn...</div>
      </div>
    );
  }

  const hasSect = Boolean(profile.sect);

  return (
    <div className="sect-page">
      <section className="sect-hero">
        <div>
          <p className="sect-kicker">Tông môn raid</p>
          <h1>{hasSect ? profile.sect.name : 'Chưa gia nhập tông môn'}</h1>
          <p>
            {hasSect
              ? profile.sect.description || 'Mở raid theo thời gian, phối hợp qua từng phase, tích cống hiến và đổi thưởng tông môn.'
              : 'Sáng lập hoặc gia nhập tông môn để mở khóa raid boss, nhiệm vụ ngày, kho chiến lợi phẩm và shop cống hiến.'}
          </p>
        </div>
        {hasSect && (
          <div className="sect-summary">
            <div>
              <span>Cấp</span>
              <strong>{profile.sect.level}</strong>
            </div>
            <div>
              <span>Thành viên</span>
              <strong>{profile.sect.memberCount}/{profile.sect.maxMembers}</strong>
            </div>
            <div>
              <span>Cống hiến</span>
              <strong>{formatNumber(profile.member?.contribution)}</strong>
            </div>
          </div>
        )}
      </section>

      {!hasSect ? (
        <div className="sect-grid sect-grid-setup">
          <section className="sect-panel">
            <h2>Sáng lập tông môn</h2>
            <form className="sect-form" onSubmit={handleCreateSect}>
              <label>
                Tên tông môn
                <input
                  value={newSect.name}
                  onChange={(event) => setNewSect((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ví dụ: Vân Tiêu Các"
                  maxLength={100}
                />
              </label>
              <label>
                Mô tả
                <textarea
                  value={newSect.description}
                  onChange={(event) => setNewSect((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Tôn chỉ, phong cách hoặc mục tiêu của tông môn"
                  maxLength={500}
                />
              </label>
              <button className="sect-primary-btn" disabled={isSubmitting}>
                <span className="material-symbols-outlined">domain_add</span>
                Sáng lập
              </button>
            </form>
          </section>

          <section className="sect-panel">
            <h2>Danh sách tông môn</h2>
            <div className="sect-list">
              {sectList.length === 0 ? (
                <div className="sect-empty">Chưa có tông môn nào.</div>
              ) : sectList.map((sect) => (
                <article className="sect-row" key={sect.id}>
                  <div>
                    <strong>{sect.name}</strong>
                    <span>Cấp {sect.level} · {sect.memberCount}/{sect.maxMembers} thành viên</span>
                  </div>
                  <button onClick={() => handleJoinSect(sect.id)} disabled={isSubmitting}>
                    Gia nhập
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="sect-grid">
          <section className="sect-panel boss-panel">
            <div className="panel-title-row">
              <h2>Raid boss</h2>
              {activeBoss && <span className="boss-state">Đang mở</span>}
            </div>

            {activeBoss ? (
              <div className="boss-arena">
                <div className={`boss-orb phase-${currentPhase?.name ? 'active' : 'idle'}`}>
                  <span className="material-symbols-outlined">local_fire_department</span>
                </div>
                <div className="boss-info">
                  <div className="boss-title-row">
                    <h3>{activeBoss.name}</h3>
                    <span>Phase: {currentPhase?.name || 'Ổn Định'}</span>
                  </div>
                  <p>{currentPhase?.description || activeBoss.description}</p>
                  <div className="boss-hp-row">
                    <span>HP</span>
                    <strong>{formatNumber(activeBoss.currentHp)} / {formatNumber(activeBoss.maxHp)}</strong>
                  </div>
                  <div className="boss-hp-bar">
                    <div style={{ width: `${bossPercent}%` }} />
                  </div>
                  <div className="raid-meta-grid">
                    <span>Thời gian: {formatDuration(activeBoss.secondsRemaining)}</span>
                    <span>Lượt hôm nay: {formatNumber(attackInfo?.remainingToday)} / {formatNumber(attackInfo?.dailyLimit)}</span>
                    <span>Cần phối hợp: {currentPhase?.requiredParticipants || 1} người</span>
                  </div>
                  <div className="boss-actions">
                    <button className="sect-danger-btn" onClick={handleAttackBoss} disabled={isSubmitting || attackInfo?.remainingToday <= 0}>
                      <span className="material-symbols-outlined">swords</span>
                      Đánh boss
                    </button>
                    <span className="boss-note">Thưởng cuối trận chia theo sát thương; loot treasury vào kho tông môn.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="boss-summon">
                <label>
                  Chọn boss
                  <select value={selectedBoss?.id || ''} onChange={(event) => setSelectedBossId(event.target.value)}>
                    {profile.bossCatalog.map((boss) => (
                      <option key={boss.id} value={boss.id}>
                        {boss.name} · tầng {boss.level} · HP {formatNumber(boss.maxHp)}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedBoss && (
                  <div className="boss-preview">
                    <p>{selectedBoss.description}</p>
                    <div className="raid-meta-grid">
                      <span>Raid: {selectedBoss.rewards?.raidMinutes || 60} phút</span>
                      <span>Lượt/ngày: {selectedBoss.rewards?.dailyAttackLimit || 8}</span>
                      <span>Phase cao nhất cần {Math.max(...(selectedBoss.rewards?.phases || [{ requiredParticipants: 1 }]).map((phase) => phase.requiredParticipants || 1))} người</span>
                    </div>
                    <div className="loot-preview">
                      {(selectedBoss.rewards?.loot || []).map((drop) => (
                        <span key={`${selectedBoss.id}-${drop.itemId}-${drop.mode}`}>
                          {getItemName(drop.itemId)} · {drop.mode === 'treasury' ? 'Kho' : 'MVP'} · {Math.round((drop.chance || 0) * 100)}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <button className="sect-primary-btn" onClick={handleSpawnBoss} disabled={isSubmitting || !selectedBoss || !canManageRaid}>
                  <span className="material-symbols-outlined">flare</span>
                  {canManageRaid ? 'Mở raid' : 'Cần trưởng lão'}
                </button>
              </div>
            )}

            {combatResult && (
              <div className={`combat-result ${combatResult.defeated ? 'defeated' : ''}`}>
                <strong>{combatResult.defeated ? 'Boss đã bị hạ gục' : 'Lượt đánh gần nhất'}</strong>
                <span>Gây {formatNumber(combatResult.damage)} sát thương · mất {formatNumber(combatResult.hpLoss)} HP</span>
                {combatResult.phaseMechanic?.underCoordinated && (
                  <span>Thiếu phối hợp: sát thương chỉ còn {Math.round((combatResult.phaseMechanic.coordinationMultiplier || 1) * 100)}%.</span>
                )}
                {combatResult.lootDrops?.length > 0 && (
                  <div className="loot-drops">
                    {combatResult.lootDrops.map((drop) => (
                      <span key={`${drop.itemId}-${drop.quantity}-${drop.mode}`}>
                        {drop.mode === 'treasury'
                          ? `Kho nhận ${drop.quantity}x ${getItemName(drop.itemId)}`
                          : `${drop.characterName || 'MVP'} nhận ${drop.quantity}x ${getItemName(drop.itemId)}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="sect-panel">
            <h2>Nhiệm vụ ngày</h2>
            <div className="sect-task-list">
              {profile.dailyQuests.length === 0 ? (
                <div className="sect-empty">Chưa có nhiệm vụ tông môn.</div>
              ) : profile.dailyQuests.map((quest) => (
                <article className="sect-task-row" key={quest.id}>
                  <div>
                    <strong>{quest.title}</strong>
                    <span>{quest.description}</span>
                    <div className="task-progress">
                      <div style={{ width: `${Math.min(100, Math.round((quest.progress / quest.target) * 100))}%` }} />
                    </div>
                    <span>{formatNumber(quest.progress)} / {formatNumber(quest.target)}</span>
                  </div>
                  <button
                    onClick={() => handleClaimQuest(quest.id)}
                    disabled={isSubmitting || !quest.completed || quest.claimed}
                  >
                    {quest.claimed ? 'Đã nhận' : 'Nhận'}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="sect-panel">
            <h2>Bảng sát thương</h2>
            <div className="damage-list">
              {damageBoard.length === 0 ? (
                <div className="sect-empty">Chưa có lượt đánh nào.</div>
              ) : damageBoard.map((row, index) => (
                <article className="damage-row" key={row.characterId}>
                  <span className="damage-rank">#{index + 1}</span>
                  <div>
                    <strong>{row.characterName || `Nhân vật #${row.characterId}`}</strong>
                    <span>{formatNumber(row.totalDamage)} sát thương · {Math.round((row.share || 0) * 100)}%</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="sect-panel">
            <h2>Shop cống hiến</h2>
            <div className="sect-shop-list">
              {profile.sectShop.map((item) => (
                <article className="sect-shop-row" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.quantity}x {getItemName(item.itemId)} · {formatNumber(item.contributionCost)} cống hiến</span>
                    {!item.unlocked && <span>Cần tông môn cấp {item.minSectLevel}</span>}
                  </div>
                  <button onClick={() => handleBuyShopItem(item.id)} disabled={isSubmitting || !item.unlocked}>
                    Đổi
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="sect-panel">
            <h2>Kho tông môn</h2>
            <div className="treasury-list">
              {profile.treasury.length === 0 ? (
                <div className="sect-empty">Kho chưa có chiến lợi phẩm.</div>
              ) : profile.treasury.map((item) => (
                <article className="treasury-row" key={`${item.itemId}-${item.enhanceLevel}`}>
                  <strong>{item.itemName || getItemName(item.itemId)}</strong>
                  <span>x{formatNumber(item.quantity)}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="sect-panel">
            <h2>Thành viên</h2>
            <div className="member-list">
              {profile.members.map((member) => (
                <article className="member-row" key={member.id}>
                  <div>
                    <strong>{member.characterName || `Nhân vật #${member.characterId}`}</strong>
                    <span>{getRoleLabel(member.role)}</span>
                  </div>
                  <strong>{formatNumber(member.contribution)}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="sect-panel">
            <h2>Xếp hạng tông môn</h2>
            <div className="sect-leaderboard-list">
              {sectLeaderboard.length === 0 ? (
                <div className="sect-empty">Chưa có dữ liệu xếp hạng.</div>
              ) : sectLeaderboard.slice(0, 5).map((sect) => (
                <article className="sect-rank-row" key={sect.id}>
                  <span>#{sect.rank}</span>
                  <div>
                    <strong>{sect.name}</strong>
                    <span>{formatNumber(sect.weeklyDamage)} sát thương tuần · {sect.weeklyDefeats} boss</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default SectBoss;
