import { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import './Shop.css';

// Shop items với itemId mapping đến ITEM_DEFINITIONS trong context
const shopItems = [
  {
    id: 1,
    itemId: 'kim_dan_dan', // Map to context item
    name: 'Kim Đan Đan',
    description: 'Đan dược thượng phẩm, tăng 500 EXP tu luyện.',
    tier: 'heaven',
    price: 2000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMc7qKuJp6nJadwXsSBJAZ86biCkK5GZUSuBOBsrdHYblX18Ky6lsp7u5y56w9jvq242_oka6NMtbCUo7pcWjkWQlw-hJDlDHZiAsGMG00Wuu1OQ2wmygBlxWdoj9O2NobVIwrYLlb9r96kG3p-E4fiWGRVS-N_4NxxaEXV-pkS57nCblch89h321A1N51dCnwU9UiUTgTBpZczH-RQSELSXynU_tOdr3_MXzQUsl_C0yv96r86126FGk5fNFEHYUfh704HVar9jI'
  },
  {
    id: 2,
    itemId: 'tu_ha_bi_dien',
    name: 'Tử Hà Bí Điển',
    description: 'Công pháp thượng cổ, tăng tốc độ tu luyện +10%.',
    tier: 'earth',
    price: 5000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAywGvbe58JVysUnb3mB3oiOf99f-pWBGtpx_1J1cTSRZnbePwT_iWHjxAzv_Gesw5hRqN0xnf8UAv6CmdgkGqRRgI9pkQVOrjt_l_QMv1y8fSckUfF1QYv52Uqsi9slZ988ztgHbTdO9cD2mLstvk1V9Wsj9AmL-JWCJNH1nObitb1q9F9ZkBDRQotKEmUSUPUT3hruEAL96GbuE_rmnnDuhVOta0l5nET-FEShjP-wf6f2XwDz560VkOfSB5tNoXDxeKmYpv6bb8'
  },
  {
    id: 3,
    itemId: 'huyet_ma_kiem',
    name: 'Huyết Ma Kiếm',
    description: 'Kiếm ma đạo, tăng 50 điểm công kích.',
    tier: 'heaven',
    price: 10000,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmig9T3VNe8tsp4kjHeELlD5bgAc6jgjbqBN0_roLlswhGNPkYCyzS3sO61vMqqCmeuiJaUP5vQiP29pDGiqbKwf2qME758M-oiJe8CqGIspgspzmm7fa9VKDhom2xw8alMHQh6K_DFYzsAYI4ylooOBW_sAkpzMqXksmIjr3iPeyzAzIgQY_JmX0gb-A-EeA5ENa19k25ug_phao3mXOl1oJb1OpHtKI3vMO7B8KRQWtf89l67C-A5owdx_ECxTMlh3lD2YW42Ik'
  },
  {
    id: 4,
    itemId: 'thao_duoc',
    name: 'Thảo Dược',
    description: 'Nguyên liệu luyện đan cơ bản.',
    tier: 'yellow',
    price: 10,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjTgNqYNBE8w4O8_4AeqhuJO85e4eHh1hflKHmhxg1hSXCQNT6R5QRt0GCXMWmdkpKbx02CQpxN3LGM42rT4t0vK1veU0avXYEsB64D2u3OGcjhXu-FykMVVNYaZbgmHQfD1oQsOxXiFXMAfFaHOKxu9v_Uu_WnOQUll0gPH5JxupJZQRamZDpN8RVJHBKGT6o0ljoZrXVMdevFq9ObAFF_AWQ_d4I1BCP4MokJ3UBcz0GaYMuTl_-3qj0TG85Ez93hf_H8Papujg'
  },
  {
    id: 5,
    itemId: 'truc_co_dan',
    name: 'Trúc Cơ Đan',
    description: 'Đan dược quý hiếm, tăng 100 EXP tu luyện.',
    tier: 'black',
    price: 500,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAv7fQxKJuPGAaf0fVLszZvwE15BBGaBdB-cigmMKrUbN9oGGSTNot5tYOYn1dUEW9ay2BJWRJrA3QuhvcH6NhT3Su6lO1zM35EjxSS-IB9OwDgw3P3qTGlS-NN_LLMYkWINjqyHl01wr_BxU1_1sisua7GPc0yW1AXqwlojefRfVIiTHw-m8kRnlwr6UdRIjo8RGGUfDPCIayNjntw2JPCb148k3Phn_yVDPuFDtuGB61iYFyoZvMaiiz9nVVIBpg6Z4nB2o8F284'
  },
  {
    id: 6,
    itemId: 'tieu_hoan_dan',
    name: 'Tiểu Hoàn Đan',
    description: 'Đan dược cấp thấp, hồi phục 50 HP.',
    tier: 'yellow',
    price: 50,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcUSF5Jp1KCMM4AmFyXCH_QNUDiZASzxBk8mCYH6mBB3lfH7SLmX_nLf4M9hMi2gemTMH7mwIbyYHPiouVTSzzAHLYw8IEcOagQ5s5uI2udgsdZwK2IFp_IyuLixyX-U2_b6wEUZWaMuP2nFJJtwxeARFlYnoKxcZv2QsVTscWINbz2qBldhl4bCsw9qrNBUNFNydp9QAY5d6nMAyBEG3RI7sQnC6LJI6lJqyCMVaBUtuCKBn1JT2W0jqaqh5DXrrABuImCMURNqs'
  },
  {
    id: 7,
    itemId: 'tu_khi_dan',
    name: 'Tụ Khí Đan',
    description: 'Tăng 20 EXP tu luyện.',
    tier: 'yellow',
    price: 100,
    image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=200'
  },
  {
    id: 8,
    itemId: 'ngoc_boi',
    name: 'Ngọc Bội',
    description: 'Trang sức phòng thủ, tăng 20 điểm phòng.',
    tier: 'black',
    price: 800,
    image: 'https://images.unsplash.com/photo-1601342630318-7b4c6e4e083c?q=80&w=200'
  },
  {
    id: 9,
    itemId: 'cuong_hoa_thach',
    name: 'Cường Hóa Thạch',
    description: 'Đá cường hóa trang bị, có thể nâng cấp vũ khí lên +1.',
    tier: 'black',
    price: 500,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=200'
  },
];

const categories = [
  { icon: 'grid_view', label: 'Tất Cả', id: 'all', active: true },
  { icon: 'medication', label: 'Đan Dược', id: 'pill', active: false },
  { icon: 'auto_stories', label: 'Bí Kíp', id: 'book', active: false },
  { icon: 'swords', label: 'Trang Bị', id: 'equipment', active: false },
  { icon: 'nutrition', label: 'Nguyên Liệu', id: 'material', active: false },
];

const getTierStyle = (tier) => {
  switch (tier) {
    case 'heaven': return { class: 'tier-heaven', label: 'Thiên Cấp', color: '#facc15' };
    case 'earth': return { class: 'tier-earth', label: 'Địa Cấp', color: '#fb923c' };
    case 'black': return { class: 'tier-black', label: 'Huyền Cấp', color: '#c084fc' };
    case 'yellow': return { class: 'tier-yellow', label: 'Hoàng Cấp', color: '#ffffff' };
    default: return { class: '', label: '', color: '' };
  }
};

function Shop() {
  const { gameState, buyItem, formatNumber, getRealmName, REALMS, ITEM_DEFINITIONS } = useGame();
  const { player, resources } = gameState;
  
  // State
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTier, setActiveTier] = useState('all');
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [buyQuantity, setBuyQuantity] = useState({});

  // Filter items
  const filteredItems = useMemo(() => {
    let items = shopItems;
    
    // Filter by category (based on itemId's type in ITEM_DEFINITIONS)
    if (activeCategory !== 'all') {
      items = items.filter(item => {
        const def = ITEM_DEFINITIONS[item.itemId];
        return def && def.type === activeCategory;
      });
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
  }, [activeCategory, activeTier, searchQuery, ITEM_DEFINITIONS]);

  // Handle buy
  const handleBuy = (item) => {
    const qty = buyQuantity[item.id] || 1;
    const result = buyItem(item.itemId, item.price, qty);
    
    setNotification(result);
    setTimeout(() => setNotification(null), 3000);
    
    if (result.success) {
      setBuyQuantity(prev => ({ ...prev, [item.id]: 1 }));
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
                        className={`add-cart-btn ${!canAfford ? 'disabled' : ''}`}
                        onClick={() => handleBuy(item)}
                        disabled={!canAfford}
                        title={canAfford ? 'Mua ngay' : 'Không đủ Linh Thạch'}
                      >
                        <span className="material-symbols-outlined">
                          {canAfford ? 'add_shopping_cart' : 'money_off'}
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
