import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import "./Cultivation.css";

function Cultivation() {
  const navigate = useNavigate();
  const {
    gameState,
    addExp,
    getRealmName,
    formatNumber,
    REALMS,
    ALCHEMY_RECIPES,
    TRIBULATION_REQUIREMENTS,
    getInventoryWithDetails,
    getFoundationStatus,
    getInnerDemonStatus,
    recoverFoundation,
    suppressInnerDemon,
    craftPill,
    addReputation,
    addEvent,
    canBreakthrough,
    attemptBreakthrough,
  } = useGame();

  const { player, foundation, innerDemon, reputation, alchemy, stats } = gameState;

  // Nhật ký hoạt động
  const [activityLog, setActivityLog] = useState([
    {
      time: "10:42 AM",
      message:
        'Bạn đã hấp thụ <span class="text-primary">5 Linh Khí</span> từ thiên địa.',
      type: "primary",
    },
  ]);

  // Trạng thái tu luyện
  const [isMeditating, setIsMeditating] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Modal luyện đan
  const [showAlchemyModal, setShowAlchemyModal] = useState(false);
  const [alchemyNotification, setAlchemyNotification] = useState(null);

  // Modal độ kiếp
  const [showBreakthroughModal, setShowBreakthroughModal] = useState(false);
  const [breakthroughResult, setBreakthroughResult] = useState(null);
  const [usePillForBreakthrough, setUsePillForBreakthrough] = useState(true);

  // Hàm thêm log
  const addLog = useCallback((message, type = "") => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setActivityLog((prev) => [
      { time: timeStr, message, type },
      ...prev.slice(0, 19), // Giữ tối đa 20 log
    ]);
  }, []);

  console.log(foundation, "player")

  // Kiểm tra có thể độ kiếp không
  const breakthroughStatus = canBreakthrough();
  const tribInfo = TRIBULATION_REQUIREMENTS[player.realmIndex];
  console.log(tribInfo, "tribInfo")

  // Xử lý độ kiếp
  const handleBreakthrough = useCallback(() => {
    const result = attemptBreakthrough(usePillForBreakthrough);
    setBreakthroughResult(result);
    if (result.success) {
      addLog(
        `<span class="text-success">${result.message}</span>`,
        "success"
      );
      addEvent("success", result.message);
    } else {
      addLog(`<span class="text-danger">${result.message}</span>`, "danger");
      addEvent("danger", result.message);
    }
  }, [attemptBreakthrough, usePillForBreakthrough, addLog, addEvent]);

  // Xử lý click tu luyện (thủ công)
  const handleCultivateClick = useCallback(() => {
    // Tính bonus từ căn cơ
    const foundationStatus = getFoundationStatus();
    let expMultiplier = 1;
    if (foundationStatus.label === "Vững Chắc") expMultiplier = 1.05;
    else if (foundationStatus.label === "Lung Lay") expMultiplier = 0.95;
    else if (foundationStatus.label === "Rất Yếu") expMultiplier = 0.85;

    const baseExp = Math.floor(Math.random() * 5) + 3; // 3-7 EXP mỗi click
    const expGain = Math.floor(baseExp * expMultiplier);
    addExp(expGain);
    setClickCount((prev) => prev + 1);

    // Thêm điểm danh vọng mỗi 10 click
    if ((clickCount + 1) % 10 === 0) {
      addReputation(1, "cultivation");
    }

    // Mỗi 5 click thì log
    if ((clickCount + 1) % 5 === 0) {
      addLog(
        `Bạn đã hấp thụ <span class="text-primary">${
          expGain * 5
        } Linh Khí</span> từ thiên địa.`,
        "primary"
      );
    }
  }, [addExp, clickCount, addLog, getFoundationStatus, addReputation]);

  // Xử lý thiền định (tự động tu luyện)
  const handleMeditation = useCallback(() => {
    setIsMeditating((prev) => !prev);
    if (!isMeditating) {
      addLog("Bắt đầu thiền định...", "primary");
      addEvent("info", "Bắt đầu thiền định");
    } else {
      addLog("Kết thúc thiền định.", "");
    }
  }, [isMeditating, addLog, addEvent]);

  // Auto tu luyện khi thiền định
  useEffect(() => {
    if (!isMeditating) return;

    const interval = setInterval(() => {
      const expGain = (Math.floor(Math.random() * 3) + 1) * stats.cultivationSpeed.toFixed(1);
      addExp(expGain);

      if (Math.random() < 0.2) {
        recoverFoundation(1);
      }

      if (Math.random() < 0.1 && innerDemon.value > 0) {
        suppressInnerDemon(1);
      }

      // Random event
      if (Math.random() < 0.1) {
        addLog(
          `Tâm cảnh ổn định, bạn nhận được <span class="text-success">+${
            expGain * 2 * stats.cultivationSpeed.toFixed(1)
          } Linh Lực</span> bonus!`,
          "success"
        );
        addExp(expGain * 2 * stats.cultivationSpeed.toFixed(1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    isMeditating,
    addExp,
    addLog,
    recoverFoundation,
    suppressInnerDemon,
    innerDemon.value,
  ]);

  // Xử lý luyện đan
  const handleCraft = useCallback(
    (recipeId) => {
      const result = craftPill(recipeId);
      setAlchemyNotification(result);
      if (result.success) {
        addLog(
          `Luyện chế thành công <span class="text-success">${ALCHEMY_RECIPES[recipeId].name}</span>.`,
          "success"
        );
      } else {
        addLog(
          `<span class="text-danger">Luyện đan thất bại!</span> ${result.message}`,
          "danger"
        );
      }
      setTimeout(() => setAlchemyNotification(null), 3000);
    },
    [craftPill, addLog, ALCHEMY_RECIPES]
  );

  // Tính toán tiến độ
  const progressPercent = Math.floor((player.exp / player.maxExp) * 100);
  const currentRealm = REALMS[player.realmIndex];
  const nextRealm = REALMS[player.realmIndex + 1];

  // Lấy trạng thái
  const foundationStatus = getFoundationStatus();
  const demonStatus = getInnerDemonStatus();

  // Lấy inventory
  const inventory = getInventoryWithDetails();
  const inventoryCount = inventory.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <div className="cultivation-page">
      <div className="cultivation-container">
        {/* Left Panel - Activity Log */}
        <aside className="activity-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <span className="material-symbols-outlined">history_edu</span>
              Nhật Ký
            </h3>
            <span className="live-badge">Live</span>
          </div>
          <div className="activity-list">
            {activityLog.map((log, index) => (
              <div
                key={index}
                className={`activity-item ${
                  log.type ? `activity-${log.type}` : ""
                }`}
              >
                <span className="activity-time">{log.time}</span>
                <p dangerouslySetInnerHTML={{ __html: log.message }} />
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content - Cultivation Circle */}
        <main className="cultivation-main">
          <div className="cultivation-status">
            <div
              className={`status-badge ${isMeditating ? "status-active" : ""}`}
            >
              <span className="status-dot"></span>
              {isMeditating ? "Đang thiền định..." : "Nhấn để tu luyện"}
            </div>
            <h1 className="realm-title">
              {currentRealm.name}{" "}
              <span className="text-primary">Tầng {player.level}</span>
            </h1>
            <p className="realm-progress-text">
              Tiến độ:{" "}
              <span className="text-white">
                {formatNumber(player.exp)}/{formatNumber(player.maxExp)} Linh
                Lực
              </span>
            </p>
          </div>

          <div
            className={`meditation-circle ${isMeditating ? "meditating" : ""}`}
            onClick={handleCultivateClick}
            style={{ cursor: "pointer" }}
          >
            <div className="circle-ring ring-outer"></div>
            <div className="circle-ring ring-inner"></div>
            <div className="circle-glow"></div>

            <div className="cultivator-avatar">
              <div
                className="avatar-image"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCF3Aag1dBQdTNq1JiA8_1szNXqCQt-FzK9Uzs6jZudf92MXbO0Arc0ubj1zHSunAuycptSEtSAHCmRDYkpDdxNagipry2wMkR0far7tHtkVUFCf2jbA2TXrEfK6twBb7Sawvn1459UQP6Ls2nGBgBOB-eBSIyukBxA6DtEKczaXWm1kxTmhqdASp_5ih4__XxSgUMeh8iH9YFrJEvMYSNw1A3c5B3k0l-4qwdmQoW4hBkmDzbST7-nit6zBSBd9m37LfVXnhSy83s")',
                }}
              ></div>
              <div className="avatar-overlay"></div>
              <div className="avatar-interact">
                <span className="material-symbols-outlined">touch_app</span>
                <span>Tụ Khí</span>
              </div>
            </div>

            <div className="floating-particle particle-1"></div>
            <div className="floating-particle particle-2"></div>
          </div>

          <div className="progress-card glass-panel">
            <div className="progress-header">
              <div>
                <p className="progress-title">Tiến độ tu luyện</p>
                <p className="progress-subtitle">
                  EXP: {formatNumber(player.exp)} /{" "}
                  {formatNumber(player.maxExp)}
                </p>
              </div>
              <p className="progress-percentage">{progressPercent}%</p>
            </div>
            <div className="progress-bar-wrapper">
              <div className="progress-bar-bg"></div>
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="progress-labels">
              <span>
                {currentRealm.name} Tầng {player.level}
              </span>
              <span>{nextRealm ? `${nextRealm.name} Kỳ` : "Đỉnh Phong"}</span>
            </div>
          </div>

          <div className="action-buttons">
            <button
              className={`action-btn ${
                isMeditating ? "action-btn-danger" : "action-btn-primary"
              }`}
              onClick={handleMeditation}
            >
              <span className="material-symbols-outlined">
                {isMeditating ? "stop_circle" : "self_improvement"}
              </span>
              <span>{isMeditating ? "Dừng Thiền" : "Thiền Định"}</span>
            </button>
            <button
              className="action-btn action-btn-secondary"
              onClick={() => setShowAlchemyModal(true)}
            >
              <span className="material-symbols-outlined">science</span>
              <span>Luyện Đan</span>
            </button>
            <button
              className="action-btn action-btn-secondary"
              onClick={() => navigate("/world")}
            >
              <span className="material-symbols-outlined">explore</span>
              <span>Thám Hiểm</span>
            </button>
            {breakthroughStatus.can && (
              <button
                className="action-btn action-btn-breakthrough"
                onClick={() => setShowBreakthroughModal(true)}
              >
                <span className="material-symbols-outlined">bolt</span>
                <span>Độ Kiếp</span>
              </button>
            )}
          </div>
        </main>

        {/* Right Panel - Stats */}
        <aside className="stats-panel">
          <div className="stat-card">
            <div className="stat-header">
              <span
                className={`material-symbols-outlined stat-icon stat-icon-${
                  foundationStatus.color === "success"
                    ? "primary"
                    : foundationStatus.color
                }`}
              >
                fitness_center
              </span>
              <p className="stat-label">Căn Cơ</p>
            </div>
            <div className="stat-value-row">
              <p className="stat-value">{foundationStatus.label}</p>
              <span
                className={`stat-bonus stat-bonus-${foundationStatus.color}`}
              >
                {foundationStatus.bonus}
              </span>
            </div>
            <div className="stat-bar">
              <div
                className={`stat-bar-fill stat-bar-${foundationStatus.color}`}
                style={{ width: `${foundation.value}%` }}
              ></div>
            </div>
            <p className="stat-hint">
              Thiền định hồi phục, dùng đan giảm căn cơ
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span
                className={`material-symbols-outlined stat-icon stat-icon-${
                  demonStatus.color === "success" ? "primary" : "danger"
                }`}
              >
                psychology_alt
              </span>
              <p className="stat-label">Tâm Ma</p>
            </div>
            <div className="stat-value-row">
              <p className="stat-value">{innerDemon.value}%</p>
              <span className={`stat-status stat-status-${demonStatus.color}`}>
                {demonStatus.label}
              </span>
            </div>
            <div className="stat-bar">
              <div
                className="stat-bar-fill stat-bar-danger"
                style={{ width: `${innerDemon.value}%` }}
              ></div>
            </div>
            <p className="stat-hint">
              Luyện đan thất bại, dùng đan nhiều tăng tâm ma
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="material-symbols-outlined stat-icon stat-icon-warning">
                hotel_class
              </span>
              <p className="stat-label">Danh Vọng</p>
            </div>
            <div className="stat-value-row">
              <p className="stat-value">{reputation.title}</p>
              <span className="stat-status">Cấp {reputation.level}</span>
            </div>
            <p className="stat-points">{formatNumber(reputation.value)} điểm</p>
            <p className="stat-hint">
              Tu luyện, khám phá, quest tăng danh vọng
            </p>
          </div>

          <Link to="/inventory" className="inventory-link glass-panel">
            <div className="inventory-link-content">
              <div className="inventory-icon">
                <span className="material-symbols-outlined">backpack</span>
              </div>
              <div>
                <p className="inventory-title">Túi Đồ</p>
                <p className="inventory-count">{inventoryCount}/50 vật phẩm</p>
              </div>
            </div>
            <span className="material-symbols-outlined chevron">
              chevron_right
            </span>
          </Link>
        </aside>
      </div>

      {/* Mobile Activity Log */}
      <div className="mobile-activity glass-panel">
        <div className="mobile-activity-header">
          <p>Nhật ký gần đây</p>
          <span className="text-primary">Xem tất cả</span>
        </div>
        <div className="mobile-activity-content">
          &gt;{" "}
          {activityLog[0]?.message.replace(/<[^>]*>/g, "") ||
            "Không có hoạt động"}
        </div>
      </div>

      {/* Alchemy Modal */}
      {showAlchemyModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAlchemyModal(false)}
        >
          <div className="alchemy-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span className="material-symbols-outlined">science</span>
                Luyện Đan
              </h2>
              <button
                className="modal-close"
                onClick={() => setShowAlchemyModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="alchemy-info">
              <div className="alchemy-level">
                <span>Cấp Luyện Đan:</span>
                <strong>Lv.{alchemy.level}</strong>
              </div>
              <div className="alchemy-exp">
                <span>EXP:</span>
                <div className="alchemy-exp-bar">
                  <div
                    className="alchemy-exp-fill"
                    style={{
                      width: `${(alchemy.exp / alchemy.maxExp) * 100}%`,
                    }}
                  ></div>
                </div>
                <span>
                  {alchemy.exp}/{alchemy.maxExp}
                </span>
              </div>
            </div>

            {alchemyNotification && (
              <div
                className={`alchemy-notification ${
                  alchemyNotification.success ? "success" : "error"
                }`}
              >
                {alchemyNotification.message}
              </div>
            )}

            <div className="recipe-list">
              {Object.values(ALCHEMY_RECIPES).map((recipe) => {
                const canCraft = alchemy.level >= recipe.minLevel;
                const hasMaterials = recipe.materials.every((mat) => {
                  const inv = inventory.find((i) => i.itemId === mat.itemId);
                  return inv && inv.quantity >= mat.quantity;
                });

                return (
                  <div
                    key={recipe.id}
                    className={`recipe-card ${!canCraft ? "locked" : ""}`}
                  >
                    <div className="recipe-header">
                      <h3>{recipe.name}</h3>
                      <span className="recipe-level">Lv.{recipe.minLevel}</span>
                    </div>
                    <div className="recipe-materials">
                      {recipe.materials.map((mat, idx) => {
                        const inv = inventory.find(
                          (i) => i.itemId === mat.itemId
                        );
                        const hasEnough = inv && inv.quantity >= mat.quantity;
                        return (
                          <span
                            key={idx}
                            className={`material-tag ${
                              hasEnough ? "" : "missing"
                            }`}
                          >
                            {mat.quantity}x {mat.itemId.replace(/_/g, " ")}
                          </span>
                        );
                      })}
                    </div>
                    <div className="recipe-footer">
                      <span className="success-rate">
                        Tỷ lệ: {Math.floor(recipe.baseSuccessRate * 100)}%
                      </span>
                      <button
                        className="craft-btn"
                        disabled={!canCraft || !hasMaterials}
                        onClick={() => handleCraft(recipe.id)}
                      >
                        {!canCraft
                          ? "Chưa đủ cấp"
                          : !hasMaterials
                          ? "Thiếu NL"
                          : "Luyện Chế"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Breakthrough Modal */}
      {showBreakthroughModal && tribInfo && (
        <div
          className="modal-overlay"
          onClick={() => setShowBreakthroughModal(false)}
        >
          <div
            className="breakthrough-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                <span className="material-symbols-outlined">bolt</span>
                {tribInfo.name}
              </h2>
              <button
                className="modal-close"
                onClick={() => setShowBreakthroughModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="breakthrough-content">
              {breakthroughResult ? (
                <div
                  className={`breakthrough-result ${
                    breakthroughResult.success ? "success" : "failure"
                  }`}
                >
                  <p>{breakthroughResult.message}</p>
                  <button
                    className="action-btn action-btn-primary"
                    onClick={() => {
                      setBreakthroughResult(null);
                      if (breakthroughResult.success)
                        setShowBreakthroughModal(false);
                    }}
                  >
                    {breakthroughResult.success ? "Đóng" : "Thử Lại"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="breakthrough-info">
                    <div className="info-row">
                      <span>Cảnh giới hiện tại:</span>
                      <strong>
                        {REALMS[player.realmIndex].name} Tầng {player.level}
                      </strong>
                    </div>
                    <div className="info-row">
                      <span>Cảnh giới đột phá:</span>
                      <strong className="text-primary">
                        {REALMS[player.realmIndex + 1]?.name || "Đỉnh Phong"}
                      </strong>
                    </div>
                    <div className="info-row">
                      <span>Chi phí Linh Thạch:</span>
                      <strong>{formatNumber(tribInfo.spiritStonesCost)}</strong>
                    </div>
                  </div>

                  <div className="success-rate-display">
                    <div className="rate-header">
                      <span>Tỷ lệ thành công:</span>
                      <strong
                        className={usePillForBreakthrough ? "text-success" : ""}
                      >
                        {Math.floor(
                          (tribInfo.baseSuccessRate +
                            (usePillForBreakthrough ? tribInfo.pillBonus : 0)) *
                            100
                        )}
                        %
                      </strong>
                    </div>
                    <div className="rate-bar">
                      <div
                        className="rate-fill"
                        style={{
                          width: `${
                            (tribInfo.baseSuccessRate +
                              (usePillForBreakthrough
                                ? tribInfo.pillBonus
                                : 0)) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <label className="pill-toggle">
                    <input
                      type="checkbox"
                      checked={usePillForBreakthrough}
                      onChange={(e) =>
                        setUsePillForBreakthrough(e.target.checked)
                      }
                    />
                    <span>
                      Sử dụng {tribInfo.pillName} (+
                      {Math.floor(tribInfo.pillBonus * 100)}%)
                    </span>
                  </label>

                  <div className="warning-box">
                    <span className="material-symbols-outlined">warning</span>
                    <p>
                      Thất bại sẽ mất{" "}
                      {Math.floor(tribInfo.failurePenalty.exp * 100)}% EXP và +
                      {tribInfo.failurePenalty.innerDemon} Tâm Ma!
                    </p>
                  </div>

                  <button
                    className="action-btn action-btn-breakthrough full-width"
                    onClick={handleBreakthrough}
                    disabled={
                      gameState.resources.spiritStones <
                      tribInfo.spiritStonesCost
                    }
                  >
                    <span className="material-symbols-outlined">bolt</span>
                    <span>Bắt Đầu Độ Kiếp</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cultivation;
