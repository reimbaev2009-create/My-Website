// store.js - State Engine (v3.1 с поддержкой 30s/1m таймфреймов, REFUND, сброса и аналитики)
const STORAGE_KEY = 'BEYBARS_BOT_STATE_V3';

const defaultState = {
  activeSignal: null, // { id, asset, timeframe, type, entry, confidence, generatedAt, expirationAt, status, factors, analysisSnapshot }
  signalsHistory: [],
  dailySessions: [],  // { id, date, displayDate, trades, wins, losses, refunds, winRate, pnl }
  selectedAsset: 'EUR/USD OTC',
  selectedTimeframe: '30s' // По умолчанию включен быстрый таймфрейм 30s
};

class AppStore {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return { ...defaultState };
      const parsed = JSON.parse(saved);
      return { ...defaultState, ...parsed };
    } catch (e) {
      console.error("Ошибка чтения localStorage", e);
      return { ...defaultState };
    }
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error("Ошибка записи в localStorage", e);
    }
  }

  // --- Управление активами и таймфреймами ---

  getSelectedAsset() {
    return this.state.selectedAsset;
  }

  setSelectedAsset(asset) {
    this.state.selectedAsset = asset;
    this.saveState();
  }

  getSelectedTimeframe() {
    return this.state.selectedTimeframe || '30s';
  }

  setSelectedTimeframe(tf) {
    this.state.selectedTimeframe = tf;
    this.saveState();
  }

  // --- Управление сигналами ---

  getActiveSignal() {
    return this.state.activeSignal;
  }

  setActiveSignal(signal) {
    this.state.activeSignal = signal;
    this.saveState();
  }

  addSignalToHistory(signal) {
    // Предотвращение дубликатов по ID
    const exists = this.state.signalsHistory.some(s => s.id === signal.id);
    if (!exists) {
      this.state.signalsHistory.unshift(signal);
    } else {
      const idx = this.state.signalsHistory.findIndex(s => s.id === signal.id);
      if (idx !== -1) this.state.signalsHistory[idx] = signal;
    }
    this.saveState();
  }

  // Очистка истории сигналов
  resetSignalsHistory() {
    this.state.signalsHistory = [];
    this.state.activeSignal = null;
    this.saveState();
  }

  resolveSignalResult(signalId, result) {
    // Нормализация результатов: WIN, LOSS, REFUND (RETURN -> REFUND)
    const normalizedResult = (result === 'RETURN') ? 'REFUND' : result;

    if (this.state.activeSignal && this.state.activeSignal.id === signalId) {
      this.state.activeSignal.status = 'COMPLETED';
      this.state.activeSignal.result = normalizedResult;
      this.addSignalToHistory({ ...this.state.activeSignal });
      this.state.activeSignal = null;
    } else {
      const item = this.state.signalsHistory.find(s => s.id === signalId);
      if (item) {
        item.result = normalizedResult;
        item.status = 'COMPLETED';
      }
    }
    this.saveState();
  }

  // --- Расчет статистики ---

  getOverallStats() {
    const completed = this.state.signalsHistory.filter(s => ['WIN', 'LOSS', 'REFUND'].includes(s.result));
    const wins = completed.filter(s => s.result === 'WIN').length;
    const losses = completed.filter(s => s.result === 'LOSS').length;
    const refunds = completed.filter(s => s.result === 'REFUND').length;
    
    // Чистый Win Rate без учета возвратов
    const effectiveTotal = wins + losses;
    const winRate = effectiveTotal > 0 ? ((wins / effectiveTotal) * 100).toFixed(2) : "0.00";

    const callSignals = completed.filter(s => s.type === 'CALL');
    const callWins = callSignals.filter(s => s.result === 'WIN').length;
    const callLosses = callSignals.filter(s => s.result === 'LOSS').length;
    const callEffective = callWins + callLosses;
    const callWinRate = callEffective > 0 ? ((callWins / callEffective) * 100).toFixed(1) : "0.0";

    const putSignals = completed.filter(s => s.type === 'PUT');
    const putWins = putSignals.filter(s => s.result === 'WIN').length;
    const putLosses = putSignals.filter(s => s.result === 'LOSS').length;
    const putEffective = putWins + putLosses;
    const putWinRate = putEffective > 0 ? ((putWins / putEffective) * 100).toFixed(1) : "0.0";

    return {
      total: completed.length,
      effectiveTotal,
      wins,
      losses,
      refunds,
      winRate: parseFloat(winRate),
      callCount: callSignals.length,
      callWinRate,
      putCount: putSignals.length,
      putWinRate
    };
  }

  getTodayStats() {
    const todayStr = new Date().toLocaleDateString('en-CA'); // Формат YYYY-MM-DD в локальном часовом поясе
    const todayCompleted = this.state.signalsHistory.filter(s => {
      if (!s.generatedAt) return false;
      const dateStr = new Date(s.generatedAt).toLocaleDateString('en-CA');
      return dateStr === todayStr && ['WIN', 'LOSS', 'REFUND'].includes(s.result);
    });

    const wins = todayCompleted.filter(s => s.result === 'WIN').length;
    const losses = todayCompleted.filter(s => s.result === 'LOSS').length;
    const refunds = todayCompleted.filter(s => s.result === 'REFUND').length;
    const trades = todayCompleted.length;
    
    const effectiveTrades = wins + losses;
    const winRate = effectiveTrades > 0 ? ((wins / effectiveTrades) * 100).toFixed(2) : "0.00";

    const todaySession = this.state.dailySessions.find(ds => ds.date === todayStr);

    return {
      trades,
      wins,
      losses,
      refunds,
      winRate: parseFloat(winRate),
      pnl: todaySession ? todaySession.pnl : 0
    };
  }

  getTotalPnL() {
    return this.state.dailySessions.reduce((acc, curr) => acc + (curr.pnl || 0), 0);
  }

  endDailySession(pnlValue) {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const stats = this.getTodayStats();

    const newSession = {
      id: 'session_' + Date.now(),
      date: todayStr,
      displayDate: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }),
      trades: stats.trades,
      wins: stats.wins,
      losses: stats.losses,
      refunds: stats.refunds,
      winRate: stats.winRate,
      pnl: parseFloat(pnlValue)
    };

    const existingIndex = this.state.dailySessions.findIndex(s => s.date === todayStr);
    if (existingIndex >= 0) {
      this.state.dailySessions[existingIndex] = newSession;
    } else {
      this.state.dailySessions.unshift(newSession);
    }

    this.saveState();
    return newSession;
  }

  // --- Глубинный анализ рынка ---

  getDetailedAnalytics() {
    const history = this.state.signalsHistory.filter(s => ['WIN', 'LOSS'].includes(s.result));
    
    const regimeStats = {};
    const scoreRangeStats = { '0.4-0.6': { w: 0, l: 0 }, '0.6-0.8': { w: 0, l: 0 }, '0.8-1.0': { w: 0, l: 0 } };

    history.forEach(sig => {
      const snap = sig.analysisSnapshot;
      if (!snap) return;

      const regime = snap.marketRegime || 'UNKNOWN';
      if (!regimeStats[regime]) regimeStats[regime] = { wins: 0, losses: 0 };
      if (sig.result === 'WIN') regimeStats[regime].wins++;
      else regimeStats[regime].losses++;

      const absScore = Math.abs(snap.finalScore || 0);
      if (absScore >= 0.8) {
        if (sig.result === 'WIN') scoreRangeStats['0.8-1.0'].w++; else scoreRangeStats['0.8-1.0'].l++;
      } else if (absScore >= 0.6) {
        if (sig.result === 'WIN') scoreRangeStats['0.6-0.8'].w++; else scoreRangeStats['0.6-0.8'].l++;
      } else if (absScore >= 0.4) {
        if (sig.result === 'WIN') scoreRangeStats['0.4-0.6'].w++; else scoreRangeStats['0.4-0.6'].l++;
      }
    });

    return { regimeStats, scoreRangeStats };
  }
}

export const store = new AppStore();