import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { treasureHouse as treasureApi } from "../services/api";
import "./TreasureHouse.css";

const formatNumber = (value) => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

const formatShort = (value) => {
    const amount = Number(value) || 0;
    if (amount >= 100000000) return `${Math.floor(amount / 100000000)} ức`;
    if (amount >= 10000) return `${Math.floor(amount / 10000)} vạn`;
    return formatNumber(amount);
};

const getPhaseText = (phase) => {
    if (phase === "betting") return "Đang nhận cược";
    if (phase === "settling") return "Đang tính toán";
    if (phase === "resolving") return "Đang chốt kết quả";
    return "Đang chuẩn bị";
};

const getRoundClock = (activeRound, settings, now) => {
    if (!activeRound || activeRound.status !== "betting") {
        return { phase: "idle", seconds: 0, progress: 0 };
    }

    const closesAt = activeRound.closesAt ? new Date(activeRound.closesAt).getTime() : 0;
    const resolveAt = activeRound.resolveAt ? new Date(activeRound.resolveAt).getTime() : closesAt + (settings?.settleSeconds || 10) * 1000;

    if (closesAt && now < closesAt) {
        const seconds = Math.max(0, Math.ceil((closesAt - now) / 1000));
        const total = Math.max(1, Number(settings?.roundSeconds) || 30);
        return { phase: "betting", seconds, progress: (seconds / total) * 100 };
    }

    if (resolveAt && now < resolveAt) {
        const seconds = Math.max(0, Math.ceil((resolveAt - now) / 1000));
        const total = Math.max(1, Number(settings?.settleSeconds) || 10);
        return { phase: "settling", seconds, progress: (seconds / total) * 100 };
    }

    return { phase: "resolving", seconds: 0, progress: 0 };
};

function TreasureHouse() {
    const { user } = useAuth();
    const { characterId, loadFromServer } = useGame();
    const [status, setStatus] = useState(null);
    const [sideAmounts, setSideAmounts] = useState({ 1: "", 2: "" });
    const [depositAmount, setDepositAmount] = useState("1000000");
    const [settingsForm, setSettingsForm] = useState({
        minBet: 100,
        maxBet: 50000,
        roundSeconds: 30,
        settleSeconds: 10,
        payoutMultiplier: 1.8,
    });
    const [isBusy, setIsBusy] = useState(false);
    const [now, setNow] = useState(Date.now());

    const activeRound = status?.activeRound;
    const settings = status?.settings;
    const userBet = status?.userBet;
    const recentRounds = status?.recentRounds || [];
    const latestResult = recentRounds[0]?.resultSide || "?";
    const clock = useMemo(() => getRoundClock(activeRound, settings, now), [activeRound, settings, now]);
    const isBettingOpen = clock.phase === "betting";
    const canAdminResolve = ["settling", "resolving"].includes(clock.phase);

    const applyStatus = useCallback((payload) => {
        setStatus(payload);
        if (payload?.settings) {
            setSettingsForm({
                minBet: payload.settings.minBet,
                maxBet: payload.settings.maxBet,
                roundSeconds: payload.settings.roundSeconds,
                settleSeconds: payload.settings.settleSeconds || 10,
                payoutMultiplier: payload.settings.payoutMultiplier,
            });
        }
    }, []);

    const loadStatus = useCallback(
        async ({ silent = false } = {}) => {
            if (!characterId) return;
            try {
                applyStatus(await treasureApi.getStatus(characterId));
            } catch (error) {
                if (!silent) toast.error(error.message || "Không thể tải Tụ Bảo Trai");
            }
        },
        [applyStatus, characterId]
    );

    useEffect(() => {
        loadStatus();
        const poll = setInterval(() => loadStatus({ silent: true }), 2500);
        const clockTimer = setInterval(() => setNow(Date.now()), 1000);
        return () => {
            clearInterval(poll);
            clearInterval(clockTimer);
        };
    }, [loadStatus]);

    const runAction = useCallback(
        async (action, fallbackMessage) => {
            setIsBusy(true);
            try {
                const payload = await action();
                applyStatus(payload);
                await loadFromServer?.();
                toast.success(payload?.message || fallbackMessage);
            } catch (error) {
                toast.error(error.message || "Thao tác thất bại");
            } finally {
                setIsBusy(false);
            }
        },
        [applyStatus, loadFromServer]
    );

    const getBetAmount = (side) => Number(sideAmounts[side]);

    const canPlaceBet = (side) => {
        const amount = getBetAmount(side);
        return (
            Boolean(activeRound) &&
            isBettingOpen &&
            !userBet &&
            Number.isInteger(amount) &&
            amount >= Number(settings?.minBet || 1) &&
            amount <= Number(settings?.maxBet || 1) &&
            !isBusy
        );
    };

    const placeBet = (side) => {
        if (!canPlaceBet(side)) return;
        runAction(() => treasureApi.placeBet(characterId, activeRound.id, side, getBetAmount(side)), "Đã đặt cược");
    };

    const forceResult = (side) => {
        if (!activeRound) return;
        runAction(() => treasureApi.forceRound(activeRound.id, side), side ? `Đã chỉnh lượt này ra ${side}` : "Đã bỏ chỉnh kết quả");
    };

    const resolveRound = () => {
        if (!activeRound) return;
        runAction(() => treasureApi.resolveRound(activeRound.id), "Đã chốt lượt");
    };

    const depositPot = () => {
        runAction(() => treasureApi.depositPot(Number(depositAmount)), "Đã nạp hũ");
    };

    const saveSettings = (event) => {
        event.preventDefault();
        runAction(
            () =>
                treasureApi.updateSettings({
                    minBet: Number(settingsForm.minBet),
                    maxBet: Number(settingsForm.maxBet),
                    roundSeconds: Number(settingsForm.roundSeconds),
                    settleSeconds: Number(settingsForm.settleSeconds),
                    payoutMultiplier: Number(settingsForm.payoutMultiplier),
                }),
            "Đã cập nhật cấu hình"
        );
    };

    return (
        <div className='treasure-page'>
            <div className='treasure-shell'>
                <header className='treasure-hero'>
                    <h1>Tụ Bảo Trai</h1>
                    <div className='treasure-pot-card'>
                        <span>Hũ hiện tại</span>
                        <strong>{formatShort(settings?.potAmount || 0)}</strong>
                        <small>
                            Giới hạn cược: {formatShort(settings?.minBet || 0)} - {formatShort(settings?.maxBet || 0)}
                        </small>
                    </div>
                </header>

                <section className='treasure-board' aria-label='Bàn Tụ Bảo Trai'>
                    <div className='treasure-history'>
                        <span className='history-more'>[...]</span>
                        {recentRounds
                            .reverse()
                            .slice(0, 12)
                            .map((round) => (
                                <span key={round.id} className={`result-chip result-${round.resultSide}`}>
                                    {round.resultSide}
                                </span>
                            ))}
                    </div>

                    <div className='treasure-result'>
                        Kết quả gần nhất: <strong>[{latestResult}]</strong>
                    </div>

                    <div className={`treasure-timer-bar ${clock.phase}`}>
                        <div style={{ width: `${Math.max(0, Math.min(100, clock.progress))}%` }} />
                    </div>

                    <div className='treasure-core'>
                        <div className='treasure-side side-one'>
                            <span>[1]</span>
                            <strong>{formatShort(status?.activeSideTotals?.[1] || 0)}</strong>
                            <b>{sideAmounts[1] ? formatShort(sideAmounts[1]) : "--"}</b>
                        </div>

                        <div className='treasure-center'>
                            <strong>Hũ: [{formatShort(settings?.potAmount || 0)}]</strong>
                            {/* Số dư linh thạch của user */}
                            <span>Số dư: </span>
                            <div className='treasure-count'>{clock.seconds}</div>
                            <p>{getPhaseText(clock.phase)}</p>
                            {/* {activeRound?.forcedResultSide && (
                                <small className='forced-note'>Admin đã chỉnh kết quả: [{activeRound.forcedResultSide}]</small>
                            )} */}
                        </div>

                        <div className='treasure-side side-two'>
                            <span>[2]</span>
                            <strong>{formatShort(status?.activeSideTotals?.[2] || 0)}</strong>
                            <b>{sideAmounts[2] ? formatShort(sideAmounts[2]) : "--"}</b>
                        </div>
                    </div>

                    <div className='treasure-bet-row'>
                        <input
                            value={sideAmounts[1]}
                            type='number'
                            min={settings?.minBet || 1}
                            max={settings?.maxBet || 1}
                            onChange={(event) => setSideAmounts((current) => ({ ...current, 1: event.target.value }))}
                            disabled={isBusy || Boolean(userBet) || !isBettingOpen}
                            aria-label='Linh thạch cược cửa 1'
                        />
                        <input
                            value={sideAmounts[2]}
                            type='number'
                            min={settings?.minBet || 1}
                            max={settings?.maxBet || 1}
                            onChange={(event) => setSideAmounts((current) => ({ ...current, 2: event.target.value }))}
                            disabled={isBusy || Boolean(userBet) || !isBettingOpen}
                            aria-label='Linh thạch cược cửa 2'
                        />
                    </div>

                    <div className='treasure-action-row'>
                        <button className='bet-one' onClick={() => placeBet(1)} disabled={!canPlaceBet(1)}>
                            Đặt/Đoán
                        </button>
                        <button className='bet-two' onClick={() => placeBet(2)} disabled={!canPlaceBet(2)}>
                            Đặt/Đoán
                        </button>
                    </div>
                </section>

                {/* <div className='treasure-grid'>
                    <section className='treasure-panel'>
                        <h2>Vinh danh thắng lớn</h2>
                        <div className='leader-list'>
                            {(status?.leaderboard?.winners || []).map((row, index) => (
                                <div key={row.characterId} className='leader-row'>
                                    <span>
                                        #{index + 1} {row.characterName}
                                    </span>
                                    <strong>+{formatShort(row.netWon)}</strong>
                                </div>
                            ))}
                            {(status?.leaderboard?.winners || []).length === 0 && <p>Chưa có dữ liệu.</p>}
                        </div>
                    </section>

                    <section className='treasure-panel'>
                        <h2>Vinh danh góp hũ</h2>
                        <div className='leader-list'>
                            {(status?.leaderboard?.losers || []).map((row, index) => (
                                <div key={row.characterId} className='leader-row'>
                                    <span>
                                        #{index + 1} {row.characterName}
                                    </span>
                                    <strong>{formatShort(row.totalLost)}</strong>
                                </div>
                            ))}
                            {(status?.leaderboard?.losers || []).length === 0 && <p>Chưa có dữ liệu.</p>}
                        </div>
                    </section>
                </div> */}

                {user?.isAdmin && (
                    <section className='treasure-admin-panel'>
                        <div className='admin-heading'>
                            <div className='admin-force-row'>
                                <button onClick={() => forceResult(1)} disabled={isBusy || !activeRound}>
                                    Ra 1
                                </button>
                                <button onClick={() => forceResult(2)} disabled={isBusy || !activeRound}>
                                    Ra 2
                                </button>
                                <button onClick={() => forceResult(null)} disabled={isBusy || !activeRound}>
                                    Random
                                </button>
                                <button onClick={resolveRound} disabled={isBusy || !activeRound || !canAdminResolve}>
                                    Chốt
                                </button>
                            </div>
                        </div>

                        <div className='admin-forms'>
                            <label>
                                Nạp hũ
                                <div className='inline-form'>
                                    <input value={depositAmount} type='number' min='1' onChange={(event) => setDepositAmount(event.target.value)} />
                                    <button onClick={depositPot} disabled={isBusy || Number(depositAmount) <= 0}>
                                        Nạp
                                    </button>
                                </div>
                            </label>

                            <form className='settings-form' onSubmit={saveSettings}>
                                <label>
                                    Cược tối thiểu
                                    <input
                                        value={settingsForm.minBet}
                                        type='number'
                                        min='1'
                                        onChange={(event) => setSettingsForm((current) => ({ ...current, minBet: event.target.value }))}
                                    />
                                </label>
                                <label>
                                    Cược tối đa
                                    <input
                                        value={settingsForm.maxBet}
                                        type='number'
                                        min='1'
                                        onChange={(event) => setSettingsForm((current) => ({ ...current, maxBet: event.target.value }))}
                                    />
                                </label>
                                <label>
                                    Giây nhận cược
                                    <input
                                        value={settingsForm.roundSeconds}
                                        type='number'
                                        min='10'
                                        max='300'
                                        onChange={(event) => setSettingsForm((current) => ({ ...current, roundSeconds: event.target.value }))}
                                    />
                                </label>
                                <label>
                                    Giây tính toán
                                    <input
                                        value={settingsForm.settleSeconds}
                                        type='number'
                                        min='3'
                                        max='120'
                                        onChange={(event) => setSettingsForm((current) => ({ ...current, settleSeconds: event.target.value }))}
                                    />
                                </label>
                                <label>
                                    Tỉ lệ trả thưởng
                                    <input
                                        value={settingsForm.payoutMultiplier}
                                        type='number'
                                        min='1'
                                        step='0.1'
                                        onChange={(event) => setSettingsForm((current) => ({ ...current, payoutMultiplier: event.target.value }))}
                                    />
                                </label>
                                <button type='submit' disabled={isBusy}>
                                    Lưu cấu hình
                                </button>
                            </form>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

export default TreasureHouse;

