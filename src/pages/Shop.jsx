import { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { shop as shopApi } from '../services/api.js';
import { SHOP_CATALOG } from '../../shared/shopCatalog.js';
import './Shop.css';

const categories = [
  { icon: 'grid_view', label: 'Tất Cả', id: 'all', active: true },
  { icon: 'medication', label: 'Đan Dược', id: 'pill', active: false },
  { icon: 'auto_stories', label: 'Bí Kíp', id: 'book', active: false },
  { icon: 'swords', label: 'Trang Bị', id: 'equipment', active: false },
  { icon: 'nutrition', label: 'Nguyên Liệu', id: 'material', active: false },
];

const getTierStyle = (tier) => {
  switch (tier) {
    // case 'god': return { class: 'tier-god', label: 'Thần Cấp', color: '#fa4a15ff' };
    case 'heaven': return { class: 'tier-heaven', label: 'Thiên Cấp', color: '#facc15' };
    case 'earth': return { class: 'tier-earth', label: 'Địa Cấp', color: '#fb923c' };
    case 'black': return { class: 'tier-black', label: 'Huyền Cấp', color: '#c084fc' };
    case 'yellow': return { class: 'tier-yellow', label: 'Hoàng Cấp', color: '#ffffff' };
    default: return { class: '', label: '', color: '' };
  }
};

function Shop() {
  const {
    gameState,
    buyItem,
    cancelPendingSave,
    characterId,
    formatNumber,
    loadFromServer,
    REALMS,
    ITEM_DEFINITIONS,
    saveToServer,
  } = useGame();
  const { player, resources } = gameState;

  const shopItems = useMemo(() => (
    SHOP_CATALOG.map((catalogItem) => {
      const itemDef = ITEM_DEFINITIONS[catalogItem.itemId] || {};
      return {
        ...catalogItem,
        id: catalogItem.itemId,
        name: itemDef.name || catalogItem.itemId,
        description: itemDef.description || '',
        image: itemDef.image || '',
        category: itemDef.type || catalogItem.category,
      };
    })
  ), [ITEM_DEFINITIONS]);

  // State
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTier, setActiveTier] = useState('all');
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [buyQuantity, setBuyQuantity] = useState({});
  const [buyingItemId, setBuyingItemId] = useState(null);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = shopItems;

    // Filter by category
    if (activeCategory !== 'all') {
      items = items.filter(item => item.category === activeCategory);
    }

    // Filter by tier
    if (activeTier !== 'all') {
      items = items.filter(item => item.tier === activeTier);
    }

    // Filter by search
    if (searchQuery) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return items;
  }, [activeCategory, activeTier, searchQuery, shopItems]);

  // Handle buy
  const handleBuy = async (item) => {
    const qty = buyQuantity[item.id] || 1;
    setBuyingItemId(item.id);

    try {
      if (characterId) {
        cancelPendingSave();
        const result = await shopApi.buy(characterId, item.itemId, qty);
        await loadFromServer();
        setNotification({
          success: true,
          message: result.message || `Mua thành công ${qty}x ${item.name}!`,
        });
      } else {
        const result = buyItem(item.itemId, item.price, qty);
        setNotification(result);
        if (result.success) saveToServer();
      }

      setBuyQuantity(prev => ({ ...prev, [item.id]: 1 }));
    } catch (error) {
      setNotification({
        success: false,
        message: error.message || 'Không thể mua vật phẩm.',
      });
    } finally {
      setBuyingItemId(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Get current realm
  const currentRealm = REALMS[player.realmIndex];
  return (
    <div className="shop-page">
      {/* Header */}
      <header className="shop-header">
        <div className="shop-header-left">
          <div className="shop-logo">
            <span className="material-symbols-outlined">temp_preferences_custom</span>
          </div>
          <h1>Spirit Market</h1>
        </div>

        <div className="shop-header-right">
          <div className="search-bar">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Tìm kiếm vật phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="header-buttons">
            <button className="header-btn">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="header-btn">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
          <div className="divider"></div>
          <div className="user-profile">
            <div
              className="profile-avatar"
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDv-63PQVo5OkaV80GeL6tmyZESKy0fPBw_MMGQRmOeAvWcAVDSzn4-BcHKNhFHplGhCYYpO_w599IBr3wUxxxX_iqcScQ3Jtx8PNvPVhHlx-JR1trzTGI6s-p5fVwwXWaJXEw8EBsaF9O6DetmCyBXm_oqal9voSCiS2XT4selmD2dLXNjFZLAVa3XaA3co2j9SPyh-rueKZweCfOnnzHnsse_Je0GIx7SI9jbntuYGGZCX_QQordNHvNv28-r4CGdYKPu8NF9RGw")' }}
            ></div>
            <div className="profile-info">
              <span className="profile-name">{player.name}</span>
              <span className="profile-realm">{currentRealm.name} - Tầng {player.level}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="shop-content">
        {/* Sidebar */}
        <aside className="shop-sidebar">
          <div className="categories">
            <h3>Danh Mục</h3>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-item ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span className="material-symbols-outlined">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="auction-banner">
            <div
              className="auction-bg"
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD1jzwFYVOfPAP8AFao6QlB04bgVx1vSQxpnfUCiARJJ0M1aruZi2ykoGTGYmfAl84kGyNIZrqa0HVZLjWZWRKYgTUiHqR_tcXYrtjDG5TUesAQ0cKtBZewOtFuonWz8JV0A_bd3iGx2vL0ar1V8ptBXS-_Du2Rd5FCkE6dn6KqbFMvif_J8b7NdilRIygWAajQAhhULVkL6TmnDiy01xZ57QrUsU5p_F9vLoSLTNxcKBqubzJ4QCLQBitb5711SOfIrXQouSk13D4")' }}
            ></div>
            <div className="auction-overlay"></div>
            <div className="auction-content">
              <span className="hot-badge">HOT</span>
              <p className="auction-title">Auction: Heavenly Lotus</p>
              <p className="auction-time">Starts in 2h</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="shop-main">
          <div className="main-header">
            <div className="main-title">
              <h2>
                Linh Thị (Marketplace)
                <span className="material-symbols-outlined animate-pulse">auto_awesome</span>
              </h2>
              <p>Mua bán vật phẩm, trợ giúp con đường tu luyện.</p>
            </div>
            <div className="currency-cards">
              <div className="currency-card">
                <span className="currency-icon material-symbols-outlined text-blue">diamond</span>
                <div className="currency-info">
                  <p className="currency-value">{formatNumber(resources.spiritStones)}</p>
                  <div className="currency-label">
                    <span className="currency-dot blue"></span>
                    <span>Linh Thạch</span>
                  </div>
                </div>
              </div>
              <div className="currency-card">
                <span className="currency-icon material-symbols-outlined text-purple">medication</span>
                <div className="currency-info">
                  <p className="currency-value">{formatNumber(resources.pills)}</p>
                  <div className="currency-label">
                    <span className="currency-dot purple"></span>
                    <span>Đan Dược</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notification */}
          {notification && (
            <div className={`shop-notification ${notification.success ? 'success' : 'error'}`}>
              {notification.message}
            </div>
          )}

          {/* Filters */}
          <div className="filters-bar">
            <div className="tier-filters">
              <button
                className={`tier-btn ${activeTier === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTier('all')}
              >Tất Cả</button>
              <button
                className={`tier-btn tier-heaven-btn ${activeTier === 'heaven' ? 'active' : ''}`}
                onClick={() => setActiveTier('heaven')}
              >
                <span className="tier-dot yellow"></span>
                Thiên Cấp
              </button>
              <button
                className={`tier-btn tier-earth-btn ${activeTier === 'earth' ? 'active' : ''}`}
                onClick={() => setActiveTier('earth')}
              >
                <span className="tier-dot orange"></span>
                Địa Cấp
              </button>
              <button
                className={`tier-btn tier-black-btn ${activeTier === 'black' ? 'active' : ''}`}
                onClick={() => setActiveTier('black')}
              >
                <span className="tier-dot purple"></span>
                Huyền Cấp
              </button>
              <button
                className={`tier-btn tier-yellow-btn ${activeTier === 'yellow' ? 'active' : ''}`}
                onClick={() => setActiveTier('yellow')}
              >
                <span className="tier-dot white"></span>
                Hoàng Cấp
              </button>
            </div>
            <div className="sort-control">
              <span>Sắp xếp:</span>
              <select>
                <option>Giá tăng dần</option>
                <option>Giá giảm dần</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="products-grid">
            {filteredItems.length === 0 ? (
              <div className="no-items">
                <span className="material-symbols-outlined">search_off</span>
                <p>Không tìm thấy vật phẩm nào</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const tierStyle = getTierStyle(item.tier);
                const canAfford = resources.spiritStones >= item.price;
                const isBuying = buyingItemId === item.id;
                return (
                  <div key={item.id} className={`product-card ${tierStyle.class}`}>
                    <div className="product-image-wrapper">
                      <div className="product-gradient"></div>
                      <div
                        className="product-image"
                        style={{ backgroundImage: `url("${item.image}")` }}
                      ></div>
                      <div className={`product-tier ${tierStyle.class}`}>
                        {tierStyle.label}
                      </div>
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{item.name}</h3>
                      <p className="product-desc">{item.description}</p>
                    </div>
                    <div className="product-footer">
                      <div className="product-price">
                        <span className="price-label">Giá</span>
                        <div className={`price-value ${!canAfford ? 'not-afford' : ''}`}>
                          <span>{item.price.toLocaleString()}</span>
                          <span className="material-symbols-outlined text-blue">diamond</span>
                        </div>
                      </div>
                      <button
                        className={`add-cart-btn ${!canAfford || isBuying ? 'disabled' : ''}`}
                        onClick={() => handleBuy(item)}
                        disabled={!canAfford || isBuying}
                        title={canAfford ? 'Mua ngay' : 'Không đủ Linh Thạch'}
                      >
                        <span className="material-symbols-outlined">
                          {isBuying ? 'sync' : canAfford ? 'add_shopping_cart' : 'money_off'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Shop;
