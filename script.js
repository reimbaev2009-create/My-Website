import { OTC_FOREX_ASSETS } from './assets.js';
import { store } from './store.js';

let performanceChart = null;
let activeTimerInterval = null;
let currentPnlMode = 'PROFIT';

const SCAN_STEPS = [
  "INITIALIZING AI ENGINE",
  "CONNECTING TO MARKET DATA",
  "LOADING CANDLES",
  "ANALYZING PRICE ACTION",
  "CALCULATING EMA",
  "CALCULATING RSI",
  "ANALYZING MACD",
  "ANALYZING MOMENTUM",
  "ANALYZING MARKET STRUCTURE",
  "CHECKING SIGNAL CONFIRMATIONS",
  "CALCULATING SIGNAL SCORE",
  "FINALIZING ANALYSIS"
];

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  initNavigation();
  initAssetSelector();
  initSignalGenerator();
  initModalLogic();
  
  // Проверка активного сигнала после перезагрузки
  checkActiveSignalOnLoad();
  
  // Обновление UI
  renderUI();
});

// 1. Навигация
function initNavigation() {
  window.switchTab = function(tabName) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.content-section').forEach(sec => {
      sec.classList.remove('active');
      sec.style.display = 'none';
    });

    const activeSec = document.getElementById(`section-${tabName}`);
    if (activeSec) {
      activeSec.classList.add('active');
      activeSec.style.display = 'block';
    }

    if (tabName === 'home') {
      renderChart();
    }
  };

  document.querySelectorAll('[data-tab]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      window.switchTab(el.dataset.tab);
    });
  });
}

// 2. Выбор OTC Актива
function initAssetSelector() {
  const toggleBtn = document.getElementById('selectorToggleBtn');
  const dropdown = document.getElementById('assetDropdown');
  const searchInput = document.getElementById('assetSearchInput');
  const container = document.getElementById('assetListContainer');
  const selectedLabel = document.getElementById('selectedAssetLabel');

  if (!toggleBtn || !dropdown || !container) return;

  if (selectedLabel) {
    selectedLabel.textContent = store.getSelectedAsset();
  }

  toggleBtn.addEventListener('click', () => {
    dropdown.classList.toggle('active');
    if (dropdown.classList.contains('active') && searchInput) {
      searchInput.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!toggleBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  function renderList(filter = '') {
    container.innerHTML = '';
    const filtered = (OTC_FOREX_ASSETS || []).filter(a => a.toLowerCase().includes(filter.toLowerCase()));
    
    filtered.forEach(asset => {
      const item = document.createElement('div');
      item.className = 'asset-item';
      item.textContent = asset;
      item.addEventListener('click', () => {
        store.setSelectedAsset(asset);
        if (selectedLabel) selectedLabel.textContent = asset;
        dropdown.classList.remove('active');
      });
      container.appendChild(item);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => renderList(e.target.value));
  }
  renderList();
}

// 3. AI Анимация & Генератор сигналов
function initSignalGenerator() {
  const genBtn = document.getElementById('generateSignalBtn');
  const scannerBox = document.getElementById('aiScannerBox');
  const stepText = document.getElementById('scanStepText');
  const progressNum = document.getElementById('scanProgressNum');

  if (!genBtn || !scannerBox) return;

  genBtn.addEventListener('click', () => {
    if (store.getActiveSignal()) return;

    genBtn.disabled = true;
    scannerBox.classList.add('active');
    
    const displayBox = document.getElementById('activeSignalDisplay');
    if (displayBox) displayBox.style.display = 'none';

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = Math.min(Math.round((currentStep / SCAN_STEPS.length) * 100), 100);
      
      if (stepText) stepText.textContent = SCAN_STEPS[currentStep - 1] || "FINALIZING ANALYSIS";
      if (progressNum) progressNum.textContent = `${progress}%`;

      if (currentStep >= SCAN_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => {
          scannerBox.classList.remove('active');
          createAndStartSignal();
        }, 500);
      }
    }, 250);
  });
}

function createAndStartSignal() {
  const asset = store.getSelectedAsset();
  const isCall = Math.random() > 0.5;
  const now = Date.now();
  const expires = now + 60000; // 1 минута

  const signal = {
    id: 'sig_' + now,
    asset,
    type: isCall ? 'CALL' : 'PUT',
    entry: (1 + Math.random() * 100).toFixed(5),
    confidence: Math.floor(75 + Math.random() * 20) + '%',
    generatedAt: now,
    expirationAt: expires,
    status: 'ACTIVE',
    result: null,
    factors: [
      { name: 'EMA 20 / EMA 50', status: 'Bullish confirmation ✓' },
      { name: 'RSI (14)', status: 'Momentum aligned ✓' },
      { name: 'MACD', status: 'Signal line crossover ✓' },
      { name: 'Price Action', status: 'Key level reaction ✓' }
    ]
  };

  store.setActiveSignal(signal);
  renderActiveSignal(signal);
  renderUI();
}

function renderActiveSignal(signal) {
  const displayBox = document.getElementById('activeSignalDisplay');
  const genBtn = document.getElementById('generateSignalBtn');
  
  if (displayBox) displayBox.style.display = 'block';
  if (genBtn) genBtn.disabled = true;

  const sigAsset = document.getElementById('sigAsset');
  if (sigAsset) sigAsset.textContent = signal.asset;

  const badge = document.getElementById('sigTypeBadge');
  if (badge) {
    badge.textContent = `${signal.type} ${signal.type === 'CALL' ? '↑' : '↓'}`;
    badge.className = `signal-type-badge ${signal.type}`;
  }

  const sigConf = document.getElementById('sigConf');
  if (sigConf) sigConf.textContent = signal.confidence;

  const sigEntry = document.getElementById('sigEntry');
  if (sigEntry) sigEntry.textContent = signal.entry;

  const factorsContainer = document.getElementById('factorsList');
  if (factorsContainer) {
    factorsContainer.innerHTML = signal.factors.map(f => `
      <div style="display:flex; justify-content:space-between; color: var(--text-muted);">
        <span>${f.name}</span>
        <span style="color:#fff; font-weight:600;">${f.status}</span>
      </div>
    `).join('');
  }

  startSignalTimer(signal);
}

function startSignalTimer(signal) {
  if (activeTimerInterval) clearInterval(activeTimerInterval);

  const timerText = document.getElementById('timerText');
  const progressCircle = document.getElementById('timerProgressCircle');
  const statusText = document.getElementById('signalStatusText');
  const resultBtnRow = document.getElementById('resultBtnRow');
  const circumference = 339.29; // 2 * PI * 54

  activeTimerInterval = setInterval(() => {
    const remainingMs = signal.expirationAt - Date.now();
    
    if (remainingMs <= 0) {
      clearInterval(activeTimerInterval);
      if (timerText) timerText.textContent = "00:00";
      if (progressCircle) progressCircle.style.strokeDashoffset = circumference;
      if (statusText) {
        statusText.textContent = "SIGNAL EXPIRED - SELECT RESULT";
        statusText.style.color = "var(--accent-red)";
      }
      if (resultBtnRow) resultBtnRow.style.display = "flex";
      return;
    }

    const seconds = Math.ceil(remainingMs / 1000);
    const formattedSec = seconds < 10 ? `0${seconds}` : seconds;
    if (timerText) timerText.textContent = `00:${formattedSec}`;

    if (progressCircle) {
      const progressFraction = (60000 - remainingMs) / 60000;
      progressCircle.style.strokeDashoffset = circumference * progressFraction;
    }
  }, 200);
}

window.handleSignalResult = function(result) {
  const activeSig = store.getActiveSignal();
  if (!activeSig) return;

  store.resolveSignalResult(activeSig.id, result);
  
  if (activeTimerInterval) clearInterval(activeTimerInterval);
  
  const displayBox = document.getElementById('activeSignalDisplay');
  if (displayBox) displayBox.style.display = 'none';

  const genBtn = document.getElementById('generateSignalBtn');
  if (genBtn) genBtn.disabled = false;
  
  renderUI();
};

function checkActiveSignalOnLoad() {
  const activeSig = store.getActiveSignal();
  if (activeSig) {
    if (Date.now() > activeSig.expirationAt + 300000) {
      store.setActiveSignal(null);
    } else {
      renderActiveSignal(activeSig);
    }
  }
}

// 4. Модальное окно и заведение сессии P&L
function initModalLogic() {
  const triggerBtn = document.getElementById('btn-end-session-trigger');
  const modal = document.getElementById('endSessionModal');

  if (triggerBtn && modal) {
    triggerBtn.addEventListener('click', () => modal.classList.add('active'));
  }

  window.setPnlMode = function(mode) {
    currentPnlMode = mode;
    document.querySelectorAll('.btn-pnl-choice').forEach(b => b.classList.remove('active'));
    
    const inputContainer = document.getElementById('pnlAmountContainer');
    if (mode === 'PROFIT') {
      document.getElementById('btnPnlProfit')?.classList.add('active');
      if (inputContainer) inputContainer.style.display = 'block';
    } else if (mode === 'LOSS') {
      document.getElementById('btnPnlLoss')?.classList.add('active');
      if (inputContainer) inputContainer.style.display = 'block';
    } else {
      document.getElementById('btnPnlZero')?.classList.add('active');
      if (inputContainer) inputContainer.style.display = 'none';
    }
  };

  window.saveDailySession = function() {
    const inputEl = document.getElementById('pnlAmountInput');
    const rawVal = parseFloat(inputEl ? inputEl.value : 0) || 0;
    let finalPnl = 0;
    
    if (currentPnlMode === 'PROFIT') finalPnl = Math.abs(rawVal);
    else if (currentPnlMode === 'LOSS') finalPnl = -Math.abs(rawVal);
    else finalPnl = 0;

    store.endDailySession(finalPnl);
    if (modal) modal.classList.remove('active');
    renderUI();
  };
}

// 5. Рендеринг интерфейса
function renderUI() {
  const overall = store.getOverallStats();
  const today = store.getTodayStats();
  const totalPnl = store.getTotalPnL();

  // Dashboard Stats
  const dashTrades = document.getElementById('dash-today-trades');
  if (dashTrades) dashTrades.textContent = today.trades;

  const dashWr = document.getElementById('dash-today-wr');
  if (dashWr) dashWr.textContent = `${today.winRate}%`;
  
  const todayPnlEl = document.getElementById('dash-today-pnl');
  if (todayPnlEl) {
    todayPnlEl.textContent = `${today.pnl >= 0 ? '+' : ''}$${today.pnl.toFixed(2)}`;
    todayPnlEl.className = `stat-value ${today.pnl > 0 ? 'text-green' : today.pnl < 0 ? 'text-red' : ''}`;
  }

  const totalPnlEl = document.getElementById('dash-total-pnl');
  if (totalPnlEl) {
    totalPnlEl.textContent = `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`;
    totalPnlEl.className = `stat-value ${totalPnl > 0 ? 'text-green' : totalPnl < 0 ? 'text-red' : ''}`;
  }

  // Signal Stats
  const sigWr = document.getElementById('sig-total-wr');
  if (sigWr) sigWr.textContent = `${overall.winRate}%`;

  const sigWins = document.getElementById('sig-wins');
  if (sigWins) sigWins.textContent = overall.wins;

  const sigLosses = document.getElementById('sig-losses');
  if (sigLosses) sigLosses.textContent = overall.losses;

  const sigCallWr = document.getElementById('sig-call-wr');
  if (sigCallWr) sigCallWr.textContent = `${overall.callWinRate}%`;

  const sigPutWr = document.getElementById('sig-put-wr');
  if (sigPutWr) sigPutWr.textContent = `${overall.putWinRate}%`;

  // Signal History
  const tbody = document.getElementById('signalHistoryTableBody');
  if (tbody) {
    if (!store.state.signalsHistory || store.state.signalsHistory.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">No signals generated yet</td></tr>`;
    } else {
      tbody.innerHTML = store.state.signalsHistory.map(s => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
          <td style="padding: 10px; font-weight:600;">${s.asset}</td>
          <td style="padding: 10px; color: ${s.type === 'CALL' ? 'var(--accent-green)' : 'var(--accent-red)'}">${s.type}</td>
          <td style="padding: 10px; color: var(--text-muted);">${new Date(s.generatedAt).toLocaleTimeString()}</td>
          <td style="padding: 10px;">${s.confidence}</td>
          <td style="padding: 10px; font-weight:700; color: ${s.result === 'WIN' ? 'var(--accent-green)' : 'var(--accent-red)'}">${s.result || 'EXPIRED'}</td>
        </tr>
      `).join('');
    }
  }

  // Daily History List
  const historyContainer = document.getElementById('daily-history-container');
  if (historyContainer) {
    if (!store.state.dailySessions || store.state.dailySessions.length === 0) {
      historyContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No trading sessions yet</p>`;
    } else {
      historyContainer.innerHTML = store.state.dailySessions.map(ds => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px; background: rgba(255,255,255,0.02); border-radius:10px; margin-bottom:8px;">
          <div>
            <strong style="font-size:14px;">${ds.displayDate}</strong>
            <div style="font-size:11px; color: var(--text-muted);">${ds.trades} trades (${ds.wins}W / ${ds.losses}L) | WR: ${ds.winRate}%</div>
          </div>
          <div style="font-size:16px; font-weight:800; color: ${ds.pnl > 0 ? 'var(--accent-green)' : ds.pnl < 0 ? 'var(--accent-red)' : '#fff'};">
            ${ds.pnl >= 0 ? '+' : ''}$${ds.pnl.toFixed(2)}
          </div>
        </div>
      `).join('');
    }
  }

  renderChart();
}

// 6. График Chart.js
function renderChart() {
  const canvas = document.getElementById('performanceChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const sessions = [...(store.state.dailySessions || [])].reverse();

  if (sessions.length === 0) {
    canvas.style.display = 'none';
    return;
  }

  canvas.style.display = 'block';

  let runningPnL = 0;
  const labels = sessions.map(s => s.displayDate);
  const dataPoints = sessions.map(s => {
    runningPnL += s.pnl;
    return runningPnL;
  });

  if (performanceChart) {
    performanceChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
  gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

  performanceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Total P&L ($)',
        data: dataPoints,
        borderColor: '#06b6d4',
        borderWidth: 2.5,
        fill: true,
        backgroundColor: gradient,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#06b6d4'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }
      }
    }
  });
}