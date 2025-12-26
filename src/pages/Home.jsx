import { Link } from 'react-router-dom';
import './Home.css';
import logo from '../assets/logo.png';

function Home() {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              <span className="badge-text">Máy Chủ Mới: Thiên Đạo</span>
            </div>
            
            <h1 className="hero-title">
              Nghịch Thiên <span className="text-primary">Cải Mệnh</span>
              <br />
              Phi Thăng Tiên Giới
            </h1>
            
            <p className="hero-description">
              Hòa mình vào thế giới tu tiên huyền ảo, nơi bạn có thể luyện khí, trúc cơ, kết đan 
              và trở thành bậc chí tôn trong thiên hạ. Con đường đại đạo đang chờ người hữu duyên.
            </p>

            <div className="hero-buttons">
              <Link to="/cultivation" className="btn btn-primary hero-btn">
                <span className="material-symbols-outlined">bolt</span>
                Bắt Đầu Tu Luyện
              </Link>
              <Link to="/world" className="btn btn-secondary hero-btn">
                <span className="material-symbols-outlined">menu_book</span>
                Tìm Hiểu Thêm
              </Link>
            </div>

            <div className="hero-stats">
              <div className="stat-item">
                <p className="stat-value">10K+</p>
                <p className="stat-label">Đạo Hữu</p>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <p className="stat-value">500+</p>
                <p className="stat-label">Tông Môn</p>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <p className="stat-value">1M+</p>
                <p className="stat-label">Linh Thạch</p>
              </div>
            </div>
          </div>

          <div className="hero-image-wrapper">
            <div className="hero-image-glow"></div>
            <div className="hero-image">
              <div 
                className="hero-image-bg"
                style={{
                  backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBteWe4civ2PKV4f7sfTGYtNk8hCvpuqcAr0OyIjrEIvTGGDEZ0eJbuIpEOt-tJFVRcWRYh7RuSh7l19hiAV1nGWpqLsukIGb0h51dUNrh637Y0KmH8Aebpoo_hkOEaoxK_2HH1SEA63qgEn9KQdean0x4msrI0CY7rbDNjBfyEg1kAZHF3ER2A0gQmgIrJ9Qpune6YkvcuI0M3mf7j3G5Zs1im96LAi9E-5nqSPJwADNyiOfUXug9qibQxgPwUO0_4Rw0qkE6Vfys")'
                }}
              ></div>
              <div className="hero-image-overlay"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">
              Con Đường <span className="text-primary">Tu Tiên</span>
            </h2>
            <p className="section-description">
              Trải qua muôn vàn kiếp nạn, từ một phàm nhân bình thường bước chân vào con đường tu đạo, 
              nghịch thiên cải mệnh để đắc đạo thành tiên.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-symbols-outlined">self_improvement</span>
              </div>
              <h3 className="feature-title">Luyện Khí &amp; Trúc Cơ</h3>
              <p className="feature-description">
                Hấp thụ linh khí đất trời, tẩy kinh phạt tủy. Xây dựng nền móng tu đạo vững chắc 
                thông qua việc thiền định hàng ngày.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-symbols-outlined">science</span>
              </div>
              <h3 className="feature-title">Luyện Đan &amp; Chế Khí</h3>
              <p className="feature-description">
                Thu thập thảo dược quý hiếm từ bí cảnh, rèn đúc thần binh lợi khí để gia tăng 
                sức mạnh chiến đấu.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-symbols-outlined">pets</span>
              </div>
              <h3 className="feature-title">Săn Bắt Yêu Thú</h3>
              <p className="feature-description">
                Thử thách bản thân trước những yêu thú hung dữ, đoạt lấy nội đan quý giá để 
                đột phá cảnh giới.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Realms Section */}
      <section className="realms-section">
        <div className="realms-container">
          <div className="section-header section-header-left">
            <h2 className="section-title">Cảnh Giới Tu Luyện</h2>
            <p className="section-description">Hành trình vạn dặm bắt đầu từ một bước chân</p>
          </div>

          <div className="realms-grid">
            {[
              {
                level: 1,
                name: 'Luyện Khí',
                description: 'Cảm nhận linh khí, dẫn khí nhập thể.',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARuBwC3u7Bij-IfDOde9IqsSdBiCNkzTZyzwADhE0-PffHUJe-oJE3MqQu0AeVEbBY2u28EB_Cq8MTslcL6w7VzFlxm4THAdO2I-NgIIhi9z4TIGHDoc_osEd9snZ2O8zq3AbU3cFWrcyEWHaIBGPBG5LFoENU9wGXsXPBFYno9pcHz3ofKBfxrIt_llUJQnqyjiwi3R-P5GqCK787RnzL-U0V_t6EE0lzSTTJZoJXp_73fxkNoHcLQIsVBij9rNDViD1vVeiov-M'
              },
              {
                level: 2,
                name: 'Trúc Cơ',
                description: 'Xây dựng nền móng, cơ thể thoát thai hoán cốt.',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeCJLBHRFyUFKXttl7tp2lGirTzgUSsHNRdoFr6q7d0twWfF9_Uc8qFUDhcU7RiKvIaggritqJa2L_XhGU7pEngt-OyIrNI2wJg9xJD4-LS3vJKvvJSeZs-4BsOcBrwuKw13c8Prj9tj9cAGugULt8KNGyWjOz-BLKdYXm0Q2OWyWx5PyfLCC2_R4UgFLR_JKg8zhGgNP9fBbi6CAH8rSwxJq8yVebA2uKqXBgVPBg_y1yRCWHisfW_pFuIuCAy-r6-Vet4R3A-PE'
              },
              {
                level: 3,
                name: 'Kim Đan',
                description: 'Kết thành kim đan, thọ nguyên ngàn năm.',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAIjy5wI0z8iztDpWeZ-jHsxFWDY0Z7LVD0ZOHgHcHLYewi4LEx5-O5nrG8BTqlRXcg5NQTjsQyKP3EP5Gy6SOv4cL2tuBCa7VLcIptd59giesov_ZBBYhim5cl47w8Fum_dL12XwDOARNd10o91V5sJGE-PhV0msVVpLiNNkDAhrxaVUlnHJKs6wIur_8xBlMXyshO9Wdk9oHomCnTyaAoPZlsPRCBpLFX0hu6PArpHVJ0TigM5jhCY2w1xPNTuAFgkvCStOEYhdQ'
              },
              {
                level: 4,
                name: 'Nguyên Anh',
                description: 'Phá đan thành anh, nguyên thần bất diệt.',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPRoDNJPa34kV6fBfqOs5ziXlZsnRmbCpz07o5UR0-yiIaST3U8woDF6B01t-g7DwEzIwwn9uuWwlW4d8dxRglM65FREJgVimRqZSHgktKBHZ9mbxZFRAzZ43a2GOty7bnkBjXaVIavDQ3fYjrhdupx_vMSv1m51BIfVgy1uT1zDsvb7h-JX3gkLe1S7Uyn7k3zh8sojNZ5vDDjG2GF-CRo7FDjkpzT4l2S5sj9xN1bw286sgWktCSuMBRn1k01utMNmimrdXO0tI'
              }
            ].map((realm) => (
              <div key={realm.level} className="realm-card">
                <div 
                  className="realm-image"
                  style={{ backgroundImage: `url("${realm.image}")` }}
                ></div>
                <div className="realm-overlay"></div>
                <div className="realm-content">
                  <span className="realm-level">Cảnh Giới {realm.level}</span>
                  <h3 className="realm-name">{realm.name}</h3>
                  <p className="realm-description">{realm.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="main-footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="#">Điều Khoản</a>
            <a href="#">Bảo Mật</a>
            <a href="#">Hỗ Trợ</a>
          </div>
          <p className="footer-copyright">© 2026 Tu Tiên Giới. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
