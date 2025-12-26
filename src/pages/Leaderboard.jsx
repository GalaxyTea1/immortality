import './Leaderboard.css';

const topCultivators = [
  {
    rank: 1,
    name: 'Hàn Lập',
    sect: 'Hoàng Phong Cốc',
    realm: 'Nguyên Anh Hậu Kỳ',
    power: 9850000,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOdcCxkFC2lHat1l8dNHy206ddjNbQo8Fb1gZ4UEjiNuxv4HyQNqIrnu-Dc9fwP-aLyB4CZau3HwyxOeudCGAJaB2LRgSK9UdMvqyFcaBROUxGEOkZPI8kULUX5akbDqBbeWXQZOqYEyYZkJw0WIZSoBUfKnJsDwv4rhz75SR4hpm2fv3bESZsqzgex1LnCMFSQrjVwk3fyYcSOSjrg_uD3hM0EpgfrKMYsLk6uFiPCPVWrikraz9L6JMExZpv0HuU1uybOLm9kog'
  },
  {
    rank: 2,
    name: 'Bạch Tiểu Thuần',
    sect: 'Linh Khê Tông',
    realm: 'Nguyên Anh Trung Kỳ',
    power: 9200000,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHkI3xDAKiaHJD8y-ec9cOEpsOqiomGAiJOdvcu57cQFVr4BCgzKb8cDp0vyzEqgV-bDpyFto9cjMFDX8HypbLrtkhSu_V5J6c4eLyOWRVyELduRF06_osSI9QAIRvEHwPMRJK1yKf7O5mo6LwgGwhZD2u-I34fMLOasMZQSsFMgoCRetyQ4L-EiWwZ81ezTF3YP_sxF9emqWWijyHTJ7hn8ROkR3yhL1ZKWtv_CHD3x-HTs57PygAWhH_ibH-5pRLMqXv8gYta8U'
  },
  {
    rank: 3,
    name: 'Vương Lâm',
    sect: 'Hằng Nhạc Phái',
    realm: 'Nguyên Anh Sơ Kỳ',
    power: 8900000,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDIGLXNQyrSRrwekkE1XuTyZ1UO58Gmjq7tCioDH4dJrq5nwtcYzKZjbuIWf2s7MMCYkCy4wYgMxT4KQI2r3tM-cC5yc9wlgG6ImCM9Vd0qlMDwdRUFsyDyWX1ot7KGVMEXpN6cUQBNBULKUFjLyETRZU6O7ndveRX9M_1Bnp581AhErZfzlO8_KVf5tvl4ybwzynISVhogwv8Y4eXs-NPhU-bmu4vhTQClSUNMIzP9D61VXoGRBnXr5niab7Yq01Q0GtJ2IHtAkR0'
  }
];

const tableData = [
  { rank: 4, name: 'Lý Thất Dạ', realm: 'Kim Đan Viên Mãn', realmClass: 'blue', sect: 'Tẩy Nhan Cổ Phái', power: 9500000, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9-AWEueaWqTgjVR7jacvBBtPCAZahcVxc-yluL0R5eQg3z1vxack_pSvnfwjDB_6AYdu5XnX6GTcSJjnaXmIHyFMT4JsRgpmSGskxftI_uK0Wr36Ye6Z1NIycUi_bsTx25eT9gh3dNyw6tItgRzyWznFN57mUBRoiPUFzkOAjEQS28PWl6FszX51NYJeYlKuCtN2NIoPtoGOu28Q5XzHxINxBT-SaTB61si1p41nIPn9cFGnufQesWDBakw9uZ3snI6Dt7AanJUg' },
  { rank: 5, name: 'Phương Nguyên', realm: 'Kim Đan Hậu Kỳ', realmClass: 'purple', sect: 'Cổ Nguyệt Sơn Trại', power: 9200000, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZLy5oG208MCB_-1GzmhGup-xD06JQT7dEhdaVG9sUUXgjfvyfnYfKrrjHTjT4jsLsqvKSarzuacwOw_hSeQofq1f_dtHHdpw4POve2p1jtxEM0DSjb4NdmGeKLS47VHsRRuCAMzPlJid5-LvJLKU7aLvpagkbre99sIfVltpc0Or9LvvIC-XF--lFOeU3gjGCDWZlpcfsyVmJ-fmzaf88-PlrrPHcIYfEYhIsXvLB9ZLX5xYOXxn37acIFaO75acsj3mvfQsorDs' },
  { rank: 6, name: 'Trần Phàm', realm: 'Kim Đan Trung Kỳ', realmClass: 'purple', sect: 'Bắc Huyền Tông', power: 8900000, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVWYFUTn56iqdZ_2nYrPmhUxZhkTNe9cgBoxYXBStG2GVUqsN9KPEOKbb-V07HQEfIFMB8XtFZpFqgdkRR4bBPFNgWnAukbn0T0qff5KnV1Wlc4T7FSfVFDvorwcy8_Awp4c8ZhZmMQm_3EhqEZJN4fqkGfJSIsu8PEB94JZiGkPD91-jKZINn5hqGfBKawYoAdnhYonTy9MSbXI3pV214zfDXm9d4EHUoXCpqXfCxzcHXjDOtJ6hIdV2vFvjgpD7JlbSH4skBmsA' },
  { rank: 7, name: 'Diệp Phàm', realm: 'Kim Đan Sơ Kỳ', realmClass: 'purple', sect: 'Thiên Đình', power: 8700000, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHPC4mlAekUYRF3IoL9qV7OsYgRP73IZwN_EOPwwXQpyX1oEQW_7dU9pem0pnjLQQd2SoMoN9VBaFy9XIlcv7er5Y2Uq42wXghlAwe3eBaln68HA56lLdM8mLBeipDZKdXFMAKHDOPUhzVMLy6wbIn0oZv-GNGfU7e8kqQNoPRZJVOsXACCzNhh5H1OowYb7qsQWKWgU0ccnPrMnGUaFmlk80Li49tUbmnblpdiAZT8LGJKWMgKD1mWDQhYP9OMH_KmI1hRBK18iM' },
  { rank: 8, name: 'Thạch Hạo', realm: 'Trúc Cơ Viên Mãn', realmClass: 'green', sect: 'Hư Thần Giới', power: 8500000, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDj2LUE8bR-IlDRx7Iw7rkYw3EtMOlfuF6hCCdZVF544PDb7Wu29VcF3FRKLNHB4bzju2B8edVSpo54dOsRDWgM1EQv4g-CK3r9UTBSHTE1fzSWK_2DvyQoMt3fMzNPuEpa_41ZM_haW3sA0XnHD6ofa8MaQwsOsg9EZim3S_7chgIgTpeJWhzxG6f3_pe9yN2quwRQ88hAoig7igG-0yZseTrsQnmu7RWVtiSouQsH2sVuBhifm_VnJhbRzAOYB_KLUZQo0b6Xf9A' },
];

const news = [
  { icon: 'celebration', iconClass: 'yellow', text: '<span class="text-primary">Tiêu Viêm</span> vừa đột phá lên cảnh giới <span class="text-yellow">Đấu Tông</span>!', time: '2 phút trước' },
  { icon: 'swords', iconClass: 'red', text: '<span class="text-white font-bold">Đường Tam</span> đã đánh bại <span class="text-muted">Thú Vương</span> tại Tinh Đấu Đại Lâm.', time: '15 phút trước' },
  { icon: 'group_add', iconClass: 'blue', text: 'Tông môn <span class="text-blue font-bold">Vân Lam Tông</span> đang tuyển đệ tử mới.', time: '1 giờ trước' },
];

function Leaderboard() {
  return (
    <div className="leaderboard-page">
      <div className="leaderboard-container">
        {/* Header */}
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title glow-text">Thiên Địa Bảng</h1>
            <span className="season-badge">Mùa giải 12</span>
          </div>
          <p className="page-description">
            Vinh danh những bậc đại năng cái thế trong giới tu chân. Nơi hội tụ tinh hoa của trời đất.
          </p>
        </div>

        <div className="header-actions">
          <button className="action-btn-secondary">
            <span className="material-symbols-outlined">filter_list</span>
            <span>Lọc</span>
          </button>
          <button className="action-btn-primary">
            <span className="material-symbols-outlined">emoji_events</span>
            <span>Phần Thưởng</span>
          </button>
        </div>

        {/* Top 3 Podium */}
        <div className="podium">
          {/* Rank 2 */}
          <div className="podium-card rank-2">
            <div className="podium-glow silver"></div>
            <div className="podium-content">
              <div className="rank-badge silver">2</div>
              <div className="podium-avatar silver">
                <div 
                  className="avatar-img"
                  style={{ backgroundImage: `url("${topCultivators[1].avatar}")` }}
                ></div>
              </div>
              <h3 className="cultivator-name">{topCultivators[1].name}</h3>
              <p className="cultivator-sect">{topCultivators[1].sect}</p>
              <span className="realm-badge silver">{topCultivators[1].realm}</span>
              <div className="power-display">
                <span className="material-symbols-outlined">bolt</span>
                <span>{topCultivators[1].power.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Rank 1 */}
          <div className="podium-card rank-1 animate-float">
            <span className="material-symbols-outlined crown">crown</span>
            <div className="podium-glow gold"></div>
            <div className="podium-content">
              <div className="rank-badge gold">1</div>
              <div className="podium-avatar gold">
                <div 
                  className="avatar-img"
                  style={{ backgroundImage: `url("${topCultivators[0].avatar}")` }}
                ></div>
                <div className="verified-badge">
                  <span className="material-symbols-outlined">verified</span>
                </div>
              </div>
              <h3 className="cultivator-name gradient-text">{topCultivators[0].name}</h3>
              <p className="cultivator-sect text-primary">{topCultivators[0].sect}</p>
              <span className="realm-badge gold">{topCultivators[0].realm}</span>
              <div className="power-display gold">
                <span className="material-symbols-outlined filled">bolt</span>
                <span>{topCultivators[0].power.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Rank 3 */}
          <div className="podium-card rank-3">
            <div className="podium-glow bronze"></div>
            <div className="podium-content">
              <div className="rank-badge bronze">3</div>
              <div className="podium-avatar bronze">
                <div 
                  className="avatar-img"
                  style={{ backgroundImage: `url("${topCultivators[2].avatar}")` }}
                ></div>
              </div>
              <h3 className="cultivator-name">{topCultivators[2].name}</h3>
              <p className="cultivator-sect">{topCultivators[2].sect}</p>
              <span className="realm-badge bronze">{topCultivators[2].realm}</span>
              <div className="power-display">
                <span className="material-symbols-outlined">bolt</span>
                <span>{topCultivators[2].power.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="leaderboard-content">
          {/* Table Section */}
          <div className="table-section">
            <div className="tabs">
              <button className="tab active">
                Tu Vi
                <span className="tab-indicator"></span>
              </button>
              <button className="tab">Chiến Lực</button>
              <button className="tab">Tông Môn</button>
            </div>

            <div className="table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Hạng</th>
                    <th>Đạo Hữu</th>
                    <th>Cảnh Giới</th>
                    <th className="hide-mobile">Tông Môn</th>
                    <th className="text-right">Chiến Lực</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <tr key={row.rank}>
                      <td>
                        <span className="rank-number">#{row.rank}</span>
                      </td>
                      <td>
                        <div className="user-cell">
                          <div 
                            className="table-avatar"
                            style={{ backgroundImage: `url("${row.avatar}")` }}
                          ></div>
                          <span className="user-name">{row.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`realm-tag ${row.realmClass}`}>{row.realm}</span>
                      </td>
                      <td className="hide-mobile sect-name">{row.sect}</td>
                      <td className="text-right power-cell">{row.power.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button className="page-btn" disabled>
                <span className="material-symbols-outlined">arrow_back_ios_new</span>
              </button>
              <button className="page-btn active">1</button>
              <button className="page-btn">2</button>
              <button className="page-btn">3</button>
              <span className="page-dots">...</span>
              <button className="page-btn">
                <span className="material-symbols-outlined">arrow_forward_ios</span>
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="sidebar">
            {/* My Stats */}
            <div className="my-stats-card">
              <h4>
                <span className="material-symbols-outlined text-primary">person</span>
                Tu Vi Của Bạn
              </h4>
              <div className="my-profile">
                <div 
                  className="my-avatar"
                  style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBJu_ptbTajUE7FCY7SDrRSaZI0qO6P5NPGmTpwPfZrcFC2nFDzME3BXeOUotm57WBKv90x6YEGksQuOvwKXsv6UHs8VSHz3QGrRkWXqivgvoPnCnQB2leH2Sj80ORDhlYqXdWnEco80wNjV8z0kxeWwSDTNXX9vzFkdtXw64ZURR36yW2ZV5_Y296LiACytkLZoTeBXePVFg4qOqw6-wLsAy4NUXLS-jbVNs27ptrv_L0ggZt0QVq8MVyio5AuvctLDeYsxLGtDmA")' }}
                ></div>
                <div>
                  <div className="my-name">Lăng Tiếu</div>
                  <div className="my-realm">Trúc Cơ Sơ Kỳ</div>
                </div>
              </div>
              <div className="xp-bar">
                <div className="xp-header">
                  <span>Kinh nghiệm</span>
                  <span>8,402 / 10,000</span>
                </div>
                <div className="xp-progress">
                  <div className="xp-fill" style={{ width: '84%' }}></div>
                </div>
              </div>
              <div className="my-stats-grid">
                <div className="my-stat">
                  <span className="stat-label">Hạng</span>
                  <span className="stat-value">#1,204</span>
                </div>
                <div className="my-stat">
                  <span className="stat-label">Uy Danh</span>
                  <span className="stat-value">540</span>
                </div>
              </div>
            </div>

            {/* News Feed */}
            <div className="news-card">
              <div className="news-header">
                <h4>Tin Tức Giang Hồ</h4>
                <span className="material-symbols-outlined">rss_feed</span>
              </div>
              <div className="news-list">
                {news.map((item, idx) => (
                  <div key={idx} className="news-item">
                    <div className={`news-icon ${item.iconClass}`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div>
                      <p dangerouslySetInnerHTML={{ __html: item.text }}></p>
                      <span className="news-time">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="view-all-btn">Xem tất cả</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
