import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import './Inventory.css';

// Định nghĩa 6 slots trang bị
const EQUIPMENT_SLOTS = [
  { key: 'spirit', label: 'Thần Thức', icon: 'psychology' },
  { key: 'weapon', label: 'Sát Thương', icon: 'swords' },
  { key: 'armor', label: 'Giáp', icon: 'shield' },
  { key: 'vip', label: 'Đồ VIP', icon: 'diamond' },
  { key: 'speed', label: 'Tốc Độ', icon: 'speed' },
  { key: 'fashion', label: 'Thời Trang', icon: 'checkroom' },
];

const menuItems = [
  { icon: 'person', label: 'Nhân Vật', link: '#' },
  { icon: 'backpack', label: 'Túi Đồ', link: '/inventory', active: true },
  { icon: 'temple_buddhist', label: 'Tu Luyện', link: '/cultivation' },
  { icon: 'public', label: 'Thế Giới', link: '/world' },
  { icon: 'storefront', label: 'Cửa Hàng', link: '/shop' },
  { icon: 'settings', label: 'Cài Đặt', link: '#' },
];

// Tabs cho bộ lọc
const TABS = [
  { id: 'all', label: 'Tất Cả' },
  { id: 'equipment', label: 'Trang Bị' },
  { id: 'pill', label: 'Đan Dược' },
  { id: 'material', label: 'Nguyên Liệu' },
  { id: 'book', label: 'Bí Kíp' },
];

function Inventory() {
  const { 
    gameState, 
    getInventoryWithDetails, 
    getEquippedItems,
    useItem, 
    unequipItem,
    upgradeEquipment,
    formatNumber, 
    getRealmName,
    REALMS 
  } = useGame();
  
  const { player, resources, stats, baseStats, equipment, learnedSkills } = gameState;
  
  // State cho UI
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [useQuantity, setUseQuantity] = useState(1);

  // Lấy inventory với details
  const inventoryItems = useMemo(() => {
    let items = getInventoryWithDetails();
    
    // Lọc theo tab
    if (activeTab !== 'all') {
      items = items.filter(item => item.type === activeTab);
    }
    
    // Lọc theo search
    if (searchQuery) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return items;
  }, [getInventoryWithDetails, activeTab, searchQuery]);

  const equippedItems = useMemo(() => {
    const result = getEquippedItems();
    console.log('[Inventory] equippedItems:', result);
    return result;
  }, [getEquippedItems]);

  // Đếm số items theo loại
  const itemCounts = useMemo(() => {
    const items = getInventoryWithDetails();
    return {
      all: items.length,
      equipment: items.filter(i => i.type === 'equipment').reduce((sum, i) => sum + i.quantity, 0),
      pill: items.filter(i => i.type === 'pill').reduce((sum, i) => sum + i.quantity, 0),
      material: items.filter(i => i.type === 'material').reduce((sum, i) => sum + i.quantity, 0),
      book: items.filter(i => i.type === 'book').reduce((sum, i) => sum + i.quantity, 0),
    };
  }, [getInventoryWithDetails]);

  // Hiển thị thông báo
  const showNotification = useCallback((result) => {
    setNotification(result);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Xử lý sử dụng item
  const handleUseItem = useCallback((itemId, qty = 1) => {
    const result = useItem(itemId, qty);
    showNotification(result);
    
    if (result.success) {
      setSelectedItem(null);
      setUseQuantity(1);
    }
  }, [useItem, showNotification]);

  // Xử lý tháo trang bị
  const handleUnequip = useCallback((slot) => {
    const result = unequipItem(slot);
    showNotification(result);
    setSelectedSlot(null);
  }, [unequipItem, showNotification]);

  // Xử lý cường hóa
  const handleUpgrade = useCallback((slot) => {
    const result = upgradeEquipment(slot);
    showNotification(result);
  }, [upgradeEquipment, showNotification]);

  // Tính toán tiến độ tu luyện
  const currentRealm = REALMS[player.realmIndex];
  const progressPercent = Math.floor((player.exp / player.maxExp) * 100);

  // Tính bonus từ equipment (bao gồm cả enhance level)
  const equipmentBonus = useMemo(() => {
    const bonus = { attack: 0, defense: 0, agility: 0, spirit: 0, maxHp: 0, cultivationSpeed: 0 };
    for (const equipped of Object.values(equippedItems)) {
      if (equipped && equipped.effect) {
        for (const [stat, value] of Object.entries(equipped.effect)) {
          if (bonus[stat] !== undefined) {
            // Tính cả bonus từ enhance level (10% mỗi cấp)
            const enhanceBonus = Math.floor(value * (equipped.enhanceLevel || 0) * 0.1);
            bonus[stat] += value + enhanceBonus;
          }
        }
      }
    }
    return bonus;
  }, [equippedItems]);

  return (
    <div className="inventory-page">
      {/* Sidebar */}
      <aside className="inventory-sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <div 
              className="user-avatar-lg"
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCr_ChlCM2nOEuTodzG8E4zklR2G1qXN0BVvOtuPEuZefXf_kLi8RBQycLw-urtHaCVtW0q2tKPbgpWLT7os7J8AsZqY6aCeRRHONFW60lZsdm7GDP0j1LkXULL68wHir15SejK9PHLDUdhHGkYKztDhobIuXv3z69j2tEUvZaZhxkruB2uDQA6O4xUXhXcORioMtJZ-z6hUyki5e6BItH17xPmh5eX7pmjGSc5vnZ-mx-mxkLv3LH9Ld08fKRZOhQ0n5bFY7GFSoI")' }}
            ></div>
            <div>
              <h1 className="user-name">{player.name}</h1>
              <p className="user-realm">{currentRealm.name} - Tầng {player.level}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, idx) => (
            <Link 
              key={idx}
              to={item.link}
              className={`nav-item ${item.active ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="cultivation-progress-card">
            <span className="progress-label">Tiến Độ Tu Luyện</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="progress-info">
              <span>{progressPercent}%</span>
              <span>{formatNumber(player.exp)}/{formatNumber(player.maxExp)}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="inventory-main">
        {/* Decorative blurs */}
        <div className="blur-decoration blur-1"></div>
        <div className="blur-decoration blur-2"></div>

        {/* Header */}
        <header className="inventory-header">
          <div className="header-left">
            <Link to="/" className="back-btn">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h2 className="page-title">
              <span className="material-symbols-outlined">token</span>
              Túi Càn Khôn
            </h2>
          </div>

          <div className="header-right">
            <div className="currency-display">
              <div className="currency-item">
                <span className="material-symbols-outlined text-blue">diamond</span>
                <span>{formatNumber(resources.spiritStones)}</span>
              </div>
              <div className="currency-item">
                <span className="material-symbols-outlined text-yellow">hotel_class</span>
                <span>{formatNumber(resources.pills)}</span>
              </div>
            </div>

            <div className="search-box">
              <span className="material-symbols-outlined search-icon">search</span>
              <input 
                type="text" 
                placeholder="Tìm kiếm pháp bảo..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="inventory-content">
          {/* Character Panel */}
          <div className="character-panel">
            <div className="character-card">
              <div className="character-glow"></div>
              <div className="character-avatar-wrapper">
                <div 
                  className="character-avatar"
                  style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBK_CGgF7iJ2caJrsq-HO-ikK231RQXbvuLykXdONLzCQ-zzIrj54gS9O9odURhDBIGM8eenxQGOxET0I4faKvw3MJC8kSPEkGA5a4lRzNkT7-xZ1p0k6Pl2VnI3EqQqoRx2GYZ8CONamEJViG7-PiRMNMF5pmYjbKoM0YbAZXw3zZ-t4P9Wc5wMbd6CQJFDiTWzmx-WjzEW39W1LrUhKTSxbDBRs7bM6TtIpDpTJstzLxUElaTJWUyEyFOZtI3WMFqmjb_X3old6A")' }}
                ></div>
                <div className="realm-badge">
                  <span className="realm-dot"></span>
                  <span>{currentRealm.name}</span>
                </div>
              </div>
              <h3 className="character-name">{player.name}</h3>
              <p className="character-title">"Tu Tiên Giả"</p>

              {/* 6 Equipment Slots */}
              <div className="equipment-slots">
                {EQUIPMENT_SLOTS.map((slot) => {
                  const equipped = equippedItems[slot.key];
                  const isSelected = selectedSlot === slot.key;
                  
                  return (
                    <div 
                      key={slot.key} 
                      className={`equipment-slot ${equipped ? 'equipped' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedSlot(isSelected ? null : slot.key)}
                      title={equipped ? `${equipped.name} (+${equipped.enhanceLevel || 0})` : slot.label}
                    >
                      {equipped ? (
                        <>
                          <div 
                            className="slot-item-bg"
                            style={{ backgroundImage: `url("${equipped.image}")` }}
                          ></div>
                          {equipped.enhanceLevel > 0 && (
                            <span className="slot-level">+{equipped.enhanceLevel}</span>
                          )}
                        </>
                      ) : (
                        <span className="material-symbols-outlined">{slot.icon}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected Slot Actions */}
              {selectedSlot && equippedItems[selectedSlot] && (
                <div className="slot-actions">
                  <p className="slot-info">
                    {equippedItems[selectedSlot].name} 
                    <span className="enhance-level">+{equippedItems[selectedSlot].enhanceLevel || 0}</span>
                  </p>
                  <div className="slot-btns">
                    <button className="slot-btn unequip" onClick={() => handleUnequip(selectedSlot)}>
                      <span className="material-symbols-outlined">close</span>
                      Tháo
                    </button>
                    <button className="slot-btn upgrade" onClick={() => handleUpgrade(selectedSlot)}>
                      <span className="material-symbols-outlined">upgrade</span>
                      Cường Hóa
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="stats-card">
              <div className="stats-header">
                <span>Chỉ Số</span>
                <span className="power-value">{formatNumber(stats.attack + stats.defense + stats.agility + stats.spirit)}</span>
              </div>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Sinh Lực (HP)</span>
                  <span className="stat-value text-green">
                    {stats.hp}/{stats.maxHp}
                    {equipmentBonus.maxHp > 0 && <span className="stat-bonus">+{equipmentBonus.maxHp}</span>}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Công Kích</span>
                  <span className="stat-value text-red">
                    {baseStats.attack}
                    {equipmentBonus.attack > 0 && <span className="stat-bonus">+{equipmentBonus.attack}</span>}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Phòng Thủ</span>
                  <span className="stat-value text-yellow">
                    {baseStats.defense}
                    {equipmentBonus.defense > 0 && <span className="stat-bonus">+{equipmentBonus.defense}</span>}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Nhanh Nhẹn</span>
                  <span className="stat-value text-blue">
                    {baseStats.agility}
                    {equipmentBonus.agility > 0 && <span className="stat-bonus">+{equipmentBonus.agility}</span>}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Tinh Thần</span>
                  <span className="stat-value text-purple">
                    {baseStats.spirit}
                    {equipmentBonus.spirit > 0 && <span className="stat-bonus">+{equipmentBonus.spirit}</span>}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Tốc Tu Luyện</span>
                  <span className="stat-value text-primary">
                    x{stats.cultivationSpeed.toFixed(1)}
                  </span>
                </div>
              </div>
              
              {learnedSkills.length > 0 && (
                <div className="learned-skills">
                  <p className="skills-label">Bí kíp đã học: {learnedSkills.length}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notification */}
          {notification && (
            <div className={`inventory-notification ${notification.success ? 'success' : 'error'}`}>
              {notification.message}
            </div>
          )}

          {/* Items Grid */}
          <div className="items-panel">
            <div className="tabs-header">
              {TABS.map((tab) => (
                <button 
                  key={tab.id}
                  className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.label}</span>
                  {tab.id === 'all' && <span className="tab-count">{itemCounts.all}</span>}
                </button>
              ))}

              <div className="tabs-actions">
                <span className="sort-label">Sắp xếp:</span>
                <select className="sort-select">
                  <option>Độ hiếm</option>
                  <option>Mới nhất</option>
                </select>
              </div>
            </div>

            <div className="items-grid">
              {inventoryItems.map((item, index) => {
                // Equipment dùng uid, pills/materials dùng itemId
                const itemKey = item.uid || item.itemId;
                const isSelected = selectedItem === itemKey;
                
                return (
                  <button 
                    key={`${itemKey}-${index}`} 
                    className={`item-slot rarity-${item.rarity} ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedItem(isSelected ? null : itemKey);
                      setUseQuantity(1);
                    }}
                    onDoubleClick={() => handleUseItem(itemKey, 1)}
                    title={`${item.name}${item.enhanceLevel > 0 ? ` (+${item.enhanceLevel})` : ''}\n${item.description}\nNhấn đúp để sử dụng`}
                  >
                    <div 
                      className="item-image"
                      style={{ backgroundImage: `url("${item.image}")` }}
                    ></div>
                    <div className="item-gradient"></div>
                    <p className="item-name">{item.name}</p>
                    {item.quantity > 1 && <span className="item-count">x{item.quantity}</span>}
                    {item.type === 'equipment' && item.enhanceLevel > 0 && (
                      <span className="item-enhance-level">+{item.enhanceLevel}</span>
                    )}
                    <div className="rarity-indicator"></div>
                  </button>
                );
              })}
              
              {/* Empty slots */}
              {inventoryItems.length < 20 && Array(Math.max(0, 8 - inventoryItems.length)).fill(null).map((_, idx) => (
                <div key={`empty-${idx}`} className="item-slot empty">
                  {idx === 0 && inventoryItems.length === 0 && <span className="material-symbols-outlined">add</span>}
                </div>
              ))}
            </div>

            {/* Selected Item Actions */}
            {selectedItem && (
              <div className="item-actions">
                {(() => {
                  // Tìm theo uid hoặc itemId
                  const item = inventoryItems.find(i => 
                    (i.uid && i.uid === selectedItem) || (!i.uid && i.itemId === selectedItem)
                  );
                  if (!item) return null;
                  
                  const itemKey = item.uid || item.itemId;
                  
                  return (
                    <>
                      <div className="item-detail">
                        <p className="item-detail-name">
                          {item.name}
                          {item.enhanceLevel > 0 && <span className="enhance-badge">+{item.enhanceLevel}</span>}
                        </p>
                        <p className="item-detail-desc">{item.description}</p>
                      </div>
                      
                      {item.type === 'pill' && item.quantity > 1 && (
                        <div className="quantity-selector">
                          <label>Số lượng:</label>
                          <input 
                            type="number" 
                            min="1" 
                            max={item.quantity}
                            value={useQuantity}
                            onChange={(e) => setUseQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), item.quantity))}
                          />
                          <span>/ {item.quantity}</span>
                        </div>
                      )}
                      
                      <div className="action-btns">
                        <button 
                          className="action-btn use-btn"
                          onClick={() => handleUseItem(itemKey, item.type === 'pill' ? useQuantity : 1)}
                        >
                          <span className="material-symbols-outlined">
                            {item.type === 'equipment' ? 'checkroom' : item.type === 'book' ? 'menu_book' : 'play_arrow'}
                          </span>
                          {item.type === 'equipment' ? 'Trang Bị' : item.type === 'book' ? 'Học' : 'Sử dụng'}
                        </button>
                        <button 
                          className="action-btn info-btn"
                          onClick={() => {
                            setSelectedItem(null);
                            setUseQuantity(1);
                          }}
                        >
                          <span className="material-symbols-outlined">close</span>
                          Đóng
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="items-footer">
              <div>Sức chứa: <span className="text-white font-bold">{inventoryItems.length}/100</span></div>
              <div className="footer-stats">
                <span>Trang bị: {itemCounts.equipment}</span>
                <span>Đan dược: {itemCounts.pill}</span>
                <span>Nguyên liệu: {itemCounts.material}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Inventory;
