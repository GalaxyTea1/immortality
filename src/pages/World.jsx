import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import './World.css';

const getDangerStyle = (danger) => {
  switch (danger) {
    case 'high':
      return { bg: 'danger-high', icon: 'skull', label: 'Nguy Hiểm Cao' };
    case 'medium':
      return { bg: 'danger-medium', icon: 'warning', label: 'Nguy Hiểm' };
    case 'safe':
      return { bg: 'danger-safe', icon: 'shield', label: 'An Toàn' };
    case 'pvp':
      return { bg: 'danger-pvp', icon: 'swords', label: 'PvP' };
    default:
      return { bg: '', icon: '', label: '' };
  }
};

// Helper format time
const formatTimeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  return `${Math.floor(seconds / 86400)} ngày trước`;
};

// Chi phí làm mới lượt
const REFRESH_COST = 5000;

function World() {
  const { 
    gameState, 
    setGameState,
    formatNumber, 
    REALMS,
    WORLD_ZONES,
    exploreLocation,
    claimQuestReward,
    meditate,
    getInventoryWithDetails,
    addEvent,
  } = useGame();
  
  const { player, stats, exploration, quests, events, resources } = gameState;
  const currentRealm = REALMS[player.realmIndex];
  
  // State
  const [notification, setNotification] = useState(null);
  const [isExploring, setIsExploring] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  
  // Kiểm tra và reset lượt hằng ngày
  useEffect(() => {
    const lastResetDate = localStorage.getItem('exploration_last_reset');
    const today = new Date().toDateString();
    
    if (lastResetDate !== today) {
      // Reset lượt khám phá
      setGameState(prev => ({
        ...prev,
        exploration: {
          ...prev.exploration,
          explorationCount: 0,
        },
      }));
      localStorage.setItem('exploration_last_reset', today);
    }
  }, [setGameState]);
  
  // Xử lý khám phá với zone mới
  const handleExplore = useCallback((zoneId) => {
    if (isExploring) return;
    
    setIsExploring(true);
    
    setTimeout(() => {
      const result = exploreLocation(zoneId);
      setNotification(result);
      setIsExploring(false);
      
      setTimeout(() => setNotification(null), 4000);
    }, 1000);
  }, [isExploring, exploreLocation]);
  
  const handleRefreshExploration = useCallback(() => {
    if (resources.spiritStones < REFRESH_COST) {
      setNotification({ success: false, message: `Không đủ Linh Thạch! Cần ${formatNumber(REFRESH_COST)}` });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    setGameState(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        spiritStones: prev.resources.spiritStones - REFRESH_COST,
      },
      exploration: {
        ...prev.exploration,
        explorationCount: 0,
      },
    }));
    
    addEvent('info', `Đã làm mới lượt khám phá! -${formatNumber(REFRESH_COST)} Linh Thạch`);
    setNotification({ success: true, message: `Đã làm mới lượt khám phá! -${formatNumber(REFRESH_COST)} Linh Thạch` });
    setShowRefreshModal(false);
    setTimeout(() => setNotification(null), 3000);
  }, [resources.spiritStones, setGameState, addEvent, formatNumber]);
  
  // Xử lý nhận thưởng quest
  const handleClaimQuest = useCallback(() => {
    const result = claimQuestReward();
    setNotification(result);
    setTimeout(() => setNotification(null), 3000);
  }, [claimQuestReward]);
  
  // Xử lý thiền định
  const handleMeditate = useCallback(() => {
    const result = meditate();
    setNotification(result);
    setTimeout(() => setNotification(null), 3000);
  }, [meditate]);
  
  // Kiểm tra có thể vào zone không
  const canEnterZone = (zone) => {
    return player.realmIndex >= zone.minRealm && 
           (player.realmIndex > zone.minRealm || player.level >= zone.minLevel);
  };
  
  // Progress percentages
  const expPercent = Math.floor((player.exp / player.maxExp) * 100);
  const hpPercent = Math.floor((stats.hp / stats.maxHp) * 100);
  const questPercent = quests.active ? Math.floor((quests.active.progress / quests.active.target) * 100) : 0;
  const explorationPercent = Math.floor((exploration.explorationCount / exploration.maxExplorationPerDay) * 100);
  const remainingExploration = exploration.maxExplorationPerDay - exploration.explorationCount;
  
  // Lấy inventory preview
  const inventory = getInventoryWithDetails().slice(0, 4);
  
  // Chuyển zones thành array
  const zones = Object.values(WORLD_ZONES);
  
  return (
    <div className="world-page">
      <div className="world-container">
        {/* Notification */}
        {notification && (
          <div className={`world-notification ${notification.success ? 'success' : 'error'}`}>
            {notification.message}
          </div>
        )}

        {/* Stats Row */}
        <section className="stats-row">
          <div className="stat-box">
            <div className="stat-glow"></div>
            <div className="stat-header">
              <span className="material-symbols-outlined">workspace_premium</span>
              Cảnh Giới
            </div>
            <div className="stat-content">
              <p className="stat-value">{currentRealm.name} - Tầng {player.level}</p>
              <span className="stat-tier">Tier {player.realmIndex + 1}</span>
            </div>
            <div className="stat-progress">
              <div className="stat-progress-fill" style={{ width: `${expPercent}%` }}></div>
            </div>
            <p className="stat-xp">EXP: {formatNumber(player.exp)}/{formatNumber(player.maxExp)}</p>
          </div>

          <div className="stat-box">
            <div className="stat-header">
              <span className="material-symbols-outlined">favorite</span>
              Sinh Lực (HP)
            </div>
            <p className="stat-value">{stats.hp} <span className="stat-max">/ {stats.maxHp}</span></p>
            <div className="stat-progress">
              <div className="stat-progress-fill stat-hp" style={{ width: `${hpPercent}%` }}></div>
            </div>
          </div>

          <div className="stat-box exploration-stat">
            <div className="stat-header">
              <span className="material-symbols-outlined">explore</span>
              Lượt Khám Phá
            </div>
            <p className="stat-value">
              {remainingExploration} <span className="stat-max">/ {exploration.maxExplorationPerDay}</span>
            </p>
            <div className="stat-progress">
              <div className="stat-progress-fill stat-mp" style={{ width: `${explorationPercent}%` }}></div>
            </div>
            {remainingExploration === 0 && (
              <button 
                className="refresh-btn"
                onClick={() => setShowRefreshModal(true)}
              >
                <span className="material-symbols-outlined">refresh</span>
                Làm mới ({formatNumber(REFRESH_COST)})
              </button>
            )}
          </div>

          <div className="stat-box">
            <div className="stat-header">
              <span className="material-symbols-outlined">diamond</span>
              Linh Thạch
            </div>
            <div className="stat-content">
              <p className="stat-value">{formatNumber(resources.spiritStones)}</p>
              <Link to="/shop" className="sect-shop-btn">
                <span className="material-symbols-outlined">storefront</span>
              </Link>
            </div>
          </div>
        </section>

        <div className="world-content">
          {/* Main Area - Locations */}
          <div className="locations-area">
            <div className="section-header">
              <div>
                <h2 className="section-title">Vùng Đất Khám Phá</h2>
                <p className="section-desc">Du hành đến các vùng đất để thu thập tài nguyên, chiến đấu và khám phá bí mật.</p>
              </div>
              <div className="exploration-status">
                <span className="material-symbols-outlined">hiking</span>
                {remainingExploration}/{exploration.maxExplorationPerDay} lượt còn lại
                {remainingExploration === 0 && (
                  <button 
                    className="refresh-inline-btn"
                    onClick={() => setShowRefreshModal(true)}
                    title={`Làm mới với ${formatNumber(REFRESH_COST)} Linh Thạch`}
                  >
                    <span className="material-symbols-outlined">refresh</span>
                  </button>
                )}
              </div>
            </div>

            <div className="locations-grid">
              {zones.map((zone) => {
                const dangerStyle = getDangerStyle(zone.dangerLevel);
                const canExplore = remainingExploration > 0;
                const canEnter = canEnterZone(zone);
                const requiredRealm = REALMS[zone.minRealm]?.name || '';
                
                return (
                  <div key={zone.id} className={`location-card ${isExploring ? 'exploring' : ''} ${!canEnter ? 'locked' : ''}`}>
                    <div className="location-image-wrapper">
                      <div 
                        className="location-image"
                        style={{ 
                          backgroundImage: `url("https://picsum.photos/seed/${zone.id}/400/300")`,
                          filter: !canEnter ? 'grayscale(0.8)' : 'none'
                        }}
                      ></div>
                      <div className="location-overlay"></div>
                      <div className={`danger-badge ${dangerStyle.bg}`}>
                        <span className="material-symbols-outlined">{dangerStyle.icon}</span>
                        {dangerStyle.label}
                      </div>
                      {!canEnter && (
                        <div className="locked-overlay">
                          <span className="material-symbols-outlined">lock</span>
                          <span>Yêu cầu: {requiredRealm} Tầng {zone.minLevel}</span>
                        </div>
                      )}
                    </div>
                    <div className="location-content">
                      <h3 className="location-name">{zone.name}</h3>
                      <p className="location-desc">{zone.description}</p>
                      <div className="location-info">
                        <div className="info-group">
                          <span className="info-label">Phần thưởng</span>
                          <span className="info-value reward">
                            +{zone.baseExpReward} EXP, +{zone.baseStonesReward} 💎
                          </span>
                        </div>
                        <div className="info-divider"></div>
                        <div className="info-group">
                          <span className="info-label">Vật phẩm</span>
                          <span className="info-value">{zone.drops.length} loại</span>
                        </div>
                      </div>
                      <button 
                        className={`travel-btn ${zone.dangerLevel === 'safe' ? 'travel-btn-secondary' : ''} ${!canExplore || !canEnter ? 'disabled' : ''}`}
                        onClick={() => handleExplore(zone.id)}
                        disabled={!canExplore || isExploring || !canEnter}
                      >
                        {isExploring ? (
                          <>
                            <span className="material-symbols-outlined animate-spin">sync</span>
                            Đang khám phá...
                          </>
                        ) : !canEnter ? (
                          <>
                            <span className="material-symbols-outlined">lock</span>
                            Chưa đủ cấp
                          </>
                        ) : (
                          <>
                            {zone.dangerLevel === 'safe' ? 'Vào' : 'Khám Phá'}
                            <span className="material-symbols-outlined">
                              {zone.dangerLevel === 'safe' ? 'meeting_room' : 'arrow_forward'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="world-sidebar">
            {/* Current Quest */}
            {quests.active ? (
              <div className="quest-card">
                <div className="quest-bg-icon">
                  <span className="material-symbols-outlined">assignment_turned_in</span>
                </div>
                <h3 className="quest-title">
                  <span className="quest-dot"></span>
                  Nhiệm Vụ Hiện Tại
                </h3>
                <p className="quest-name">{quests.active.name}</p>
                <p className="quest-desc">{quests.active.description}</p>
                <div className="quest-progress-header">
                  <span>Tiến Độ</span>
                  <span>{quests.active.progress} / {quests.active.target}</span>
                </div>
                <div className="quest-progress-bar">
                  <div className="quest-progress-fill" style={{ width: `${questPercent}%` }}></div>
                </div>
                {quests.active.progress >= quests.active.target ? (
                  <button className="claim-quest-btn" onClick={handleClaimQuest}>
                    <span className="material-symbols-outlined">card_giftcard</span>
                    Nhận Thưởng
                  </button>
                ) : (
                  <button className="track-quest-btn">Theo Dõi</button>
                )}
              </div>
            ) : (
              <div className="quest-card quest-completed">
                <div className="quest-bg-icon">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <h3 className="quest-title">
                  <span className="quest-dot completed"></span>
                  Hoàn Thành!
                </h3>
                <p className="quest-desc">Đã hoàn thành tất cả nhiệm vụ hôm nay.</p>
              </div>
            )}

            {/* Recent Events */}
            <div className="events-card">
              <div className="events-header">
                <h4>Sự Kiện Gần Đây</h4>
                <span className="material-symbols-outlined">rss_feed</span>
              </div>
              <div className="events-list">
                {events.slice(0, 5).map((event) => (
                  <div key={event.id} className="event-item">
                    <div className={`event-icon event-icon-${event.type === 'danger' ? 'red' : event.type === 'success' ? 'green' : event.type === 'quest' ? 'purple' : 'blue'}`}>
                      <span className="material-symbols-outlined">
                        {event.type === 'danger' ? 'warning' : event.type === 'success' ? 'check_circle' : event.type === 'quest' ? 'assignment_turned_in' : 'info'}
                      </span>
                    </div>
                    <div>
                      <p>{event.message}</p>
                      <span className="event-time">{formatTimeAgo(event.time)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bag Preview */}
            <div className="bag-card">
              <div className="bag-header">
                <h4>Túi Đồ</h4>
                <Link to="/inventory" className="view-all-link">Xem Tất Cả</Link>
              </div>
              <div className="bag-grid">
                {inventory.map((item, idx) => (
                  <div key={idx} className={`bag-slot filled rarity-${item.rarity}`}>
                    <span className="material-symbols-outlined">
                      {item.type === 'pill' ? 'medication' : item.type === 'material' ? 'grass' : 'diamond'}
                    </span>
                    {item.quantity > 1 && <span className="slot-count">x{item.quantity}</span>}
                  </div>
                ))}
                {inventory.length < 4 && Array(4 - inventory.length).fill(null).map((_, idx) => (
                  <div key={`empty-${idx}`} className="bag-slot empty"></div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Floating Meditate Button */}
      <button className="floating-action-btn" onClick={handleMeditate}>
        <span className="material-symbols-outlined animate-pulse">self_improvement</span>
        <div className="fab-text">
          <span className="fab-title">Thiền Định</span>
          <span className="fab-subtitle">Hồi Phục HP</span>
        </div>
      </button>
      
      {/* Refresh Exploration Modal */}
      {showRefreshModal && (
        <div className="modal-overlay" onClick={() => setShowRefreshModal(false)}>
          <div className="refresh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="refresh-modal-header">
              <h3>
                <span className="material-symbols-outlined">refresh</span>
                Làm Mới Lượt Khám Phá
              </h3>
              <button className="modal-close" onClick={() => setShowRefreshModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="refresh-modal-content">
              <p>Bạn đã hết lượt khám phá hôm nay!</p>
              <p className="refresh-cost">
                Chi phí: <strong>{formatNumber(REFRESH_COST)} Linh Thạch</strong>
              </p>
              <p className="refresh-balance">
                Số dư: <span className={resources.spiritStones >= REFRESH_COST ? 'text-success' : 'text-danger'}>
                  {formatNumber(resources.spiritStones)}
                </span>
              </p>
              <div className="refresh-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowRefreshModal(false)}
                >
                  Hủy
                </button>
                <button 
                  className="confirm-btn"
                  onClick={handleRefreshExploration}
                  disabled={resources.spiritStones < REFRESH_COST}
                >
                  <span className="material-symbols-outlined">check</span>
                  Xác Nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default World;
