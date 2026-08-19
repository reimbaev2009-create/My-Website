// store.js - State Engine
const STORAGE_KEY = 'BEYBARS_BOT_STATE_V2';

const defaultState = {
  activeSignal: null, // { id, asset, type, entry, confidence, generatedAt, expirationAt, status, factors }
  signalsHistory: [],
  dailySessions: [], // { id, date, trades, wins, losses, winRate, pnl }
  selectedAsset: 'EUR/USD OTC'
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

  getSelectedAsset() {
    return this.state.selectedAsset;
  }

  setSelectedAsset(asset) {
    this.state.selectedAsset = asset;
    this.saveState();
  }

  getActiveSignal() {
    return this.state.activeSignal;
  }

  setActiveSignal(signal) {
    this.state.activeSignal = signal;
    this.saveState();
  }

  addSignalToHistory(signal) {
    this.state.signalsHistory.unshift(signal);
    this.saveState();
  }

  resolveSignalResult(signalId, result) {
    if (this.state.activeSignal && this.state.activeSignal.id === signalId) {
      this.state.activeSignal.status = 'COMPLETED';
      this.state.activeSignal.result = result;
      this.addSignalToHistory({ ...this.state.activeSignal });
      this.state.activeSignal = null;
    } else {
      const item = this.state.signalsHistory.find(s => s.id === signalId);
      if (item) item.result = result;
    }
    this.saveState();
  }

  // Расчет общей статистики по сигналам
  getOverallStats() {
    const completed = this.state.signalsHistory.filter(s => s.result === 'WIN' || s.result === 'LOSS');
    const wins = completed.filter(s => s.result === 'WIN').length;
    const losses = completed.filter(s => s.result === 'LOSS').length;
    const total = completed.length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : "0.00";

    const callSignals = completed.filter(s => s.type === 'CALL');
    const callWins = callSignals.filter(s => s.result === 'WIN').length;
    const callWinRate = callSignals.length > 0 ? ((callWins / callSignals.length) * 100).toFixed(1) : "0.0";

    const putSignals = completed.filter(s => s.type === 'PUT');
    const putWins = putSignals.filter(s => s.result === 'WIN').length;
    const putWinRate = putSignals.length > 0 ? ((putWins / putSignals.length) * 100).toFixed(1) : "0.0";

    return {
      total,
      wins,
      losses,
      winRate: parseFloat(winRate),
      callCount: callSignals.length,
      callWinRate,
      putCount: putSignals.length,
      putWinRate
    };
  }

  // Статистика за текущую незакрытую сессию
  getTodayStats() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCompleted = this.state.signalsHistory.filter(s => {
      const dateStr = new Date(s.generatedAt).toISOString().split('T')[0];
      return dateStr === todayStr && (s.result === 'WIN' || s.result === 'LOSS');
    });

    const wins = todayCompleted.filter(s => s.result === 'WIN').length;
    const losses = todayCompleted.filter(s => s.result === 'LOSS').length;
    const trades = todayCompleted.length;
    const winRate = trades > 0 ? ((wins / trades) * 100).toFixed(2) : "0.00";

    // Ищем сохраненную сегодня сессию, если есть
    const todaySession = this.state.dailySessions.find(ds => ds.date === todayStr);

    return {
      trades,
      wins,
      losses,
      winRate: parseFloat(winRate),
      pnl: todaySession ? todaySession.pnl : 0
    };
  }

  // Расчет Total P&L
  getTotalPnL() {
    return this.state.dailySessions.reduce((acc, curr) => acc + (curr.pnl || 0), 0);
  }

  // Завершение дневной сессии
  endDailySession(pnlValue) {
    const todayStr = new Date().toISOString().split('T')[0];
    const stats = this.getTodayStats();

    const newSession = {
      id: 'session_' + Date.now(),
      date: todayStr,
      displayDate: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }),
      trades: stats.trades,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.winRate,
      pnl: parseFloat(pnlValue)
    };

    // Заменяем если за сегодня уже закрывали
    const existingIndex = this.state.dailySessions.findIndex(s => s.date === todayStr);
    if (existingIndex >= 0) {
      this.state.dailySessions[existingIndex] = newSession;
    } else {
      this.state.dailySessions.unshift(newSession);
    }

    this.saveState();
    return newSession;
  }

  getAssetStats() {
    const map = {};
    const completed = this.state.signalsHistory.filter(s => s.result === 'WIN' || s.result === 'LOSS');
    
    completed.forEach(s => {
      if (!map[s.asset]) {
        map[s.asset] = { trades: 0, wins: 0, losses: 0 };
      }
      map[s.asset].trades++;
      if (s.result === 'WIN') map[s.asset].wins++;
      else map[s.asset].losses++;
    });

    return Object.keys(map).map(asset => {
      const item = map[asset];
      const winRate = ((item.wins / item.trades) * 100).toFixed(1);
      return { asset, trades: item.trades, winRate: parseFloat(winRate) };
    });
  }
}

export const store = new AppStore();