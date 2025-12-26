import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import './World.css';

const locations = [
  {
    id: 1,
    name: 'Linh Thú Sơn',
    nameEn: 'Spirit Beast Mountain',
    description: 'Vùng núi hiểm trở có nhiều linh thú cổ đại. Lý tưởng để săn lõi thú.',
    danger: 'high',
    resources: ['herbs', 'ores'],
    level: 'Trúc Cơ+',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYussLE_qqaf_CIlch6xN6XM3Qvbs1490hCNvrpzDeMfRUdy0Bsfh8P4Qep6uerLgHmgiLsNiHlk0llo-RCxZ6W_U4n7lIPyMIuKDnCQzJvgY62DY3Bf0royNxDavuBBneA6QeHOasZkIaYMQMoneqUpO-rzPrS1syGlRkdpgXJv7NNAQbwmv3dkazUWMCUg_vo4TIE6RXPjHlKF95-KiW7Ai6LOn9ORN3iK-RbbhMyf6S6R-VIIlSpiKSw5tqu53Jr3C0EishTHs'
  },
  {
    id: 2,
    name: 'U Minh Lâm',
    nameEn: 'Dark Mist Forest',
    description: 'Rừng sương mù vĩnh cửu. Có thể tìm thấy thảo dược quý hiếm.',
    danger: 'medium',
    resources: ['herbs'],
    level: 'Luyện Khí',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAiLd-VAUFRlZjSAl3yQ_WpBM3tAT8vSKC7oc2DAN-aDz9BM9NH6xXvleotVip8LbMDTmSp4-MnGJdcBFPUiT4G2z1JhwvdqVA9DbBJw1ghSv9f5pOXLA7zmkag0aU84yfdTt_klyStlTFJr5I_ITglv2J1b8C6CwofmUunLqGAQly91wqj57uS81rS3ZY9lUpaQFTOHPAFXW6A_h5ssx_MVdlex84-u2TPywpjgOos-_olFS8DfQNV0yYfiswuVhu09fwfk3iIyXI'
  },
  {
    id: 3,
    name: 'Thiên Kiếm Tông',
    nameEn: 'Heavenly Sword Sect',
    description: 'Môn phái chính đạo uy tín. Giao dịch, nghỉ ngơi và nhận nhiệm vụ.',
    danger: 'safe',
    resources: ['shop', 'quest'],
    level: 'Bất kỳ',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwM-VkgoDWWO1_R5VcbIOEzqlqbRBwkZF9WepMMse8aoYjgvA6l5IRFMkJy1a1x-jVeXrq0jBI0FYUPRSlid9ESaZhE50DAmvVsvKUJ3jfTNNiaFHNnrs2Yd_m_rmyCcOui51y2N-uJI-SXu9AVfGFSG_-9pRDlshtxfy-91S7zFJiKEgg6msN35BIL6fBg0CO42F4a9QYNJc3OgDst7-gOzOG34QT2vxrDfnNnrqc0BX7E1NEj2S5Fk0KMA_hHTYQkmhHCW9Un4U'
  },
  {
    id: 4,
    name: 'Cổ Chiến Trường',
    nameEn: 'Ancient Battlefield',
    description: 'Tàn tích của cuộc chiến thần cấp. Có thể gặp linh hồn nguy hiểm.',
    danger: 'pvp',
    resources: ['artifacts'],
    level: 'Kim Đan',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDghHgyJjRILVcFo1fGvaC9_lJuncBvYq0kvFle5EB2aT08JScaM6zUF7fiWEfrz5UqvdQ-dtlas-kYD5HlgMPlKPDJ23aA9gWZlfkgyWYpvAj9wogmUOGTfSfBpd1ecPokYeRb_Eyedysqqd16c5qgQH_-AUDNmlwQQd_r_L3EaWrCtl40UrCeRQ7OOSmfzUpZ9SYCf58JQQCLyU8GiQllBgn7-pws1LvMXqm89dMJIH7-aS5fdp6YvzVThsp-D5W4PNmu6HPMqxY'
  }
];

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

const getResourceIcon = (resource) => {
  switch (resource) {
    case 'herbs': return { icon: 'grass', color: 'text-green' };
    case 'ores': return { icon: 'diamond', color: 'text-blue' };
    case 'shop': return { icon: 'storefront', color: 'text-yellow' };
    case 'quest': return { icon: 'assignment', color: 'text-purple' };
    case 'artifacts': return { icon: 'swords', color: 'text-orange' };
    default: return { icon: '', color: '' };
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

function World() {
  const { 
    gameState, 
    formatNumber, 
    getRealmName, 
    REALMS,
    exploreLocation,
    claimQuestReward,
    restoreHp,
    getInventoryWithDetails,
  } = useGame();
  
  const { player, stats, exploration, quests, events, resources } = gameState;
  const currentRealm = REALMS[player.realmIndex];
  
  // State
  const [notification, setNotification] = useState(null);
  const [isExploring, setIsExploring] = useState(false);
  
  // Xử lý khám phá
  const handleExplore = useCallback((location) => {
    if (isExploring) return;
    
    setIsExploring(true);
    
    // Giả lập thời gian khám phá
    setTimeout(() => {
      const result = exploreLocation(location.id, location.name, location.danger);
      setNotification(result);
      setIsExploring(false);
      
      setTimeout(() => setNotification(null), 4000);
    }, 1000);
  }, [isExploring, exploreLocation]);
  
  // Xử lý nhận thưởng quest
  const handleClaimQuest = useCallback(() => {
    const result = claimQuestReward();
    setNotification(result);
    setTimeout(() => setNotification(null), 3000);
  }, [claimQuestReward]);
  
  // Xử lý thiền định
  const handleMeditate = useCallback(() => {
    const healAmount = Math.floor(stats.maxHp * 0.2);
    restoreHp(healAmount);
    setNotification({ success: true, message: `Thiền định hồi phục ${healAmount} HP!` });
    setTimeout(() => setNotification(null), 2000);
  }, [restoreHp, stats.maxHp]);
  
  // Progress percentages
  const expPercent = Math.floor((player.exp / player.maxExp) * 100);
  const hpPercent = Math.floor((stats.hp / stats.maxHp) * 100);
  const questPercent = quests.active ? Math.floor((quests.active.progress / quests.active.target) * 100) : 0;
  
  // Lấy inventory preview
  const inventory = getInventoryWithDetails().slice(0, 4);
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

          <div className="stat-box">
            <div className="stat-header">
              <span className="material-symbols-outlined">explore</span>
              Lượt Khám Phá
            </div>
            <p className="stat-value">{exploration.explorationCount} <span className="stat-max">/ {exploration.maxExplorationPerDay}</span></p>
            <div className="stat-progress">
              <div className="stat-progress-fill stat-mp" style={{ width: `${(exploration.explorationCount / exploration.maxExplorationPerDay) * 100}%` }}></div>
            </div>
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
                {exploration.explorationCount}/{exploration.maxExplorationPerDay} lượt
              </div>
            </div>

            <div className="locations-grid">
              {locations.map((location) => {
                const dangerStyle = getDangerStyle(location.danger);
                const canExplore = exploration.explorationCount < exploration.maxExplorationPerDay;
                return (
                  <div key={location.id} className={`location-card ${isExploring ? 'exploring' : ''}`}>
                    <div className="location-image-wrapper">
                      <div 
                        className="location-image"
                        style={{ backgroundImage: `url("${location.image}")` }}
                      ></div>
                      <div className="location-overlay"></div>
                      <div className={`danger-badge ${dangerStyle.bg}`}>
                        <span className="material-symbols-outlined">{dangerStyle.icon}</span>
                        {dangerStyle.label}
                      </div>
                    </div>
                    <div className="location-content">
                      <h3 className="location-name">{location.name}</h3>
                      <p className="location-desc">{location.description}</p>
                      <div className="location-info">
                        <div className="info-group">
                          <span className="info-label">Tài Nguyên</span>
                          <div className="resource-icons">
                            {location.resources.map((res, idx) => {
                              const resource = getResourceIcon(res);
                              return (
                                <span 
                                  key={idx} 
                                  className={`material-symbols-outlined ${resource.color}`}
                                  title={res}
                                >
                                  {resource.icon}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="info-divider"></div>
                        <div className="info-group">
                          <span className="info-label">Cấp Độ</span>
                          <span className="info-value">{location.level}</span>
                        </div>
                      </div>
                      <button 
                        className={`travel-btn ${location.danger === 'safe' ? 'travel-btn-secondary' : ''} ${!canExplore ? 'disabled' : ''}`}
                        onClick={() => handleExplore(location)}
                        disabled={!canExplore || isExploring}
                      >
                        {isExploring ? (
                          <>
                            <span className="material-symbols-outlined animate-spin">sync</span>
                            Đang khám phá...
                          </>
                        ) : (
                          <>
                            {location.danger === 'safe' ? 'Vào' : 'Khám Phá'}
                            <span className="material-symbols-outlined">
                              {location.danger === 'safe' ? 'meeting_room' : 'arrow_forward'}
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
    </div>
  );
}

export default World;
