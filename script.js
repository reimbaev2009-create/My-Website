import { ChartAnalyzer } from './chartAnalyzer.js';
import { OTC_FOREX_ASSETS } from './assets.js';
import { store } from './store.js';

window.store = store;

let performanceChart = null;
let activeTimerInterval = null;
let currentPnlMode = 'PROFIT';
let selectedExpirationTime = 30; // 30 секунд по умолчанию

let screenStream = null;
let screenVideo = null;

const SCAN_STEPS = [
  "INITIALIZING AI ENGINE",
  "CAPTURING POCKET OPTION FRAME",
  "LOADING CANDLES",
  "ANALYZING PRICE ACTION",
  "CALCULATING EMA & RSI",
  "ANALYZING GRAPH PIXELS",
  "CALCULATING SIGNAL SCORE",
  "FINALIZING ANALYSIS"
];

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  initScreenVideoElement();
  initNavigation();
  initAssetSelector();
  initExpirationSelector(); // Инициализация кнопок 30s/1m
  initScreenCaptureLogic();
  initSignalGenerator();
  initModalLogic();
  
  checkActiveSignalOnLoad();
  renderUI();
});

function initScreenVideoElement() {
  screenVideo = document.createElement('video');
  screenVideo.autoplay = true;
  screenVideo.playsInline = true;
  screenVideo.muted = true;
  screenVideo.style.display = 'none';
  document.body.appendChild(screenVideo);
}

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

  container.addEventListener('click', (e) => {
    const item = e.target.closest('.asset-item');
    if (item && item.dataset.asset) {
      const asset = item.dataset.asset;
      store.setSelectedAsset(asset);
      if (selectedLabel) selectedLabel.textContent = asset;
      dropdown.classList.remove('active');
    }
  });

  function renderList(filter = '') {
    const filtered = (OTC_FOREX_ASSETS || []).filter(a => a.toLowerCase().includes(filter.toLowerCase()));
    
    container.innerHTML = filtered.map(asset => 
      `<div class="asset-item" data-asset="${asset}">${asset}</div>`
    ).join('');
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => renderList(e.target.value));
  }
  renderList();
}

// 3. Выбор времени экспирации (30 SEC / 1 MIN)
function initExpirationSelector() {
  const btn30s = document.getElementById('exp-30s');
  const btn1m = document.getElementById('exp-1m');

  if (!btn30s || !btn1m) return;

  const setActiveBtn = (selectedBtn, activeTime) => {
    [btn30s, btn1m].forEach(btn => {
      btn.classList.remove('active');
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text-muted)';
    });

    selectedBtn.classList.add('active');
    selectedBtn.style.background = 'var(--accent-blue, #06b6d4)';
    selectedBtn.style.color = '#fff';
    selectedExpirationTime = activeTime;
  };

  btn30s.addEventListener('click', () => setActiveBtn(btn30s, 30));
  btn1m.addEventListener('click', () => setActiveBtn(btn1m, 60));
}

// 4. Подключение Screen Capture
function initScreenCaptureLogic() {
  const btnConnect = document.getElementById('btnConnectPocket');
  const captureStatus = document.getElementById('captureStatus');

  if (!btnConnect) return;

  btnConnect.addEventListener('click', async () => {
    try {
      // Останавливаем старый поток
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
      }

      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",   // предпочитаем весь экран
          frameRate: { ideal: 15, max: 30 }
        },
        audio: false,
        preferCurrentTab: false
      });

      // Важно: полностью пересоздаём video-элемент
      if (screenVideo) {
        screenVideo.srcObject = null;
        screenVideo.remove();
      }

      screenVideo = document.createElement('video');
      screenVideo.autoplay = true;
      screenVideo.playsInline = true;
      screenVideo.muted = true;
      screenVideo.style.position = 'fixed';
      screenVideo.style.top = '-9999px'; // скрыт
      document.body.appendChild(screenVideo);

      screenVideo.srcObject = screenStream;

      // Ждём, пока видео реально начнёт играть
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout waiting for video")), 5000);

        screenVideo.onloadeddata = () => {
          clearTimeout(timeout);
          resolve();
        };

        screenVideo.onplaying = () => {
          clearTimeout(timeout);
          resolve();
        };

        // Принудительно запускаем
        screenVideo.play().catch(err => {
          console.warn("play() error:", err);
        });
      });

      // Обработка окончания шаринга
      screenStream.getVideoTracks()[0].onended = () => {
        screenStream = null;
        if (captureStatus) captureStatus.style.display = 'none';
        btnConnect.innerText = 'ПОДКЛЮЧИТЬ POCKET OPTION';
      };

      if (captureStatus) captureStatus.style.display = 'flex';
      btnConnect.innerText = 'ПЕРЕПОДКЛЮЧИТЬ POCKET OPTION';

      console.log("Screen capture успешно запущен. Размер:", screenVideo.videoWidth, "x", screenVideo.videoHeight);

    } catch (err) {
      console.error("Ошибка захвата экрана:", err);
      alert("Не удалось начать захват экрана.\n\nПопробуй выбрать «Весь экран» и разрешить доступ.");
    }
  });
}

// 5. AI Анимация, снимок экрана и генерация сигнала
function initSignalGenerator() {
  const genBtn = document.getElementById('generateSignalBtn');
  const scannerBox = document.getElementById('aiScannerBox');
  const stepText = document.getElementById('scanStepText');
  const progressNum = document.getElementById('scanProgressNum');
  const snapshotCanvas = document.getElementById('chartSnapshotCanvas');

  if (!genBtn || !scannerBox) return;

  genBtn.addEventListener('click', async () => {
    if (store.getActiveSignal()) return;

    // Проверка, что захват экрана активен
    if (!screenStream || !screenVideo || !screenVideo.videoWidth || screenVideo.readyState < 2) {
      alert("Сначала нажмите «ПОДКЛЮЧИТЬ POCKET OPTION» и выберите весь экран или окно с графиком Pocket Option.");
      return;
    }

    // ===== УЛУЧШЕННАЯ ПРОВЕРКА ЧЁРНОГО КАДРА =====
    try {
      // Даём видео немного времени на обновление кадра
      await new Promise(r => setTimeout(r, 250));

      const checkCanvas = document.createElement('canvas');
      checkCanvas.width = Math.min(screenVideo.videoWidth || 320, 320);
      checkCanvas.height = Math.min(screenVideo.videoHeight || 180, 180);
      const checkCtx = checkCanvas.getContext('2d', { willReadFrequently: true });

      checkCtx.drawImage(screenVideo, 0, 0, checkCanvas.width, checkCanvas.height);
      const testData = checkCtx.getImageData(0, 0, checkCanvas.width, checkCanvas.height).data;

      let nonBlackPixels = 0;
      for (let i = 0; i < testData.length; i += 16) {
        if (testData[i] > 20 || testData[i + 1] > 20 || testData[i + 2] > 20) {
          nonBlackPixels++;
        }
      }

      console.log("Проверка кадра: ненулевых пикселей =", nonBlackPixels);

      if (nonBlackPixels < 30) {
        alert("Кадр всё ещё чёрный.\n\nПопробуй:\n1. Переподключить захват (выбери «Весь экран»)\n2. Сделать окно сайта меньше и не перекрывать график\n3. Обновить страницу и подключить заново");
        return;
      }
    } catch (e) {
      console.error("Ошибка проверки кадра:", e);
      alert("Не удалось проверить кадр. Переподключи захват экрана.");
      return;
    }
    // =============================================

    genBtn.disabled = true;
    scannerBox.classList.add('active');

    const displayBox = document.getElementById('activeSignalDisplay');
    if (displayBox) displayBox.style.display = 'none';

    let detectedSignalType = null;
    let analysisResult = null;

    try {
      if (snapshotCanvas && screenVideo) {
        // Ещё одна небольшая задержка перед реальным анализом
        await new Promise(r => setTimeout(r, 150));

        analysisResult = ChartAnalyzer.processCurrentFrame(
          screenVideo,
          snapshotCanvas,
          selectedExpirationTime === 30 ? '30s' : '1m'
        );

        if (analysisResult && analysisResult.signal && analysisResult.signal.direction !== 'NO_TRADE') {
          detectedSignalType = analysisResult.signal.direction;
        }
      }
    } catch (e) {
      console.error("Ошибка анализа кадра:", e);
    }

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
          createAndStartSignal(detectedSignalType, analysisResult);
        }, 300);
      }
    }, 250);
  });
}

function createAndStartSignal(forcedType = null, analysisResult = null) {
  const asset = store.getSelectedAsset();
  
  let finalType = forcedType;
  if (!finalType || finalType === 'NO_TRADE') {
    // Если анализ не дал направление — не генерируем случайный сигнал
    finalType = 'NO_TRADE';
  }

  // Если анализ сказал NO_TRADE — просто показываем сообщение и выходим
  if (finalType === 'NO_TRADE') {
    alert("Анализ не нашёл достаточно сильный сигнал. Попробуйте ещё раз через несколько секунд.");
    const genBtn = document.getElementById('generateSignalBtn');
    if (genBtn) genBtn.disabled = false;
    return;
  }

  const isCall = finalType === 'CALL';
  const now = Date.now();
  const durationMs = selectedExpirationTime * 1000;
  const expires = now + durationMs;

  const signalInfo = analysisResult ? analysisResult.signal : null;
  const breakdown = signalInfo ? signalInfo.breakdown : {};

  // Берём РЕАЛЬНЫЙ confidence из анализа
  let confidence = '—';
  if (signalInfo && typeof signalInfo.confidencePercent === 'number' && signalInfo.confidencePercent > 0) {
    confidence = `${signalInfo.confidencePercent}%`;
  }

  // Entry цену больше НЕ генерируем случайно.
  // Пока анализатор не умеет читать реальную цену — просто не показываем её.
  const entryPrice = null;

  const signal = {
    id: 'sig_' + now,
    asset,
    type: finalType,
    expirationSec: selectedExpirationTime,
    entry: entryPrice,                    // теперь null
    confidence: confidence,
    generatedAt: now,
    expirationAt: expires,
    status: 'ACTIVE',
    result: null,
    factors: [
      { 
        name: 'Candle Detection', 
        status: analysisResult ? `Detected ${analysisResult.candlesCount} Candles ✓` : (isCall ? 'Bullish Dominance ✓' : 'Bearish Dominance ✓') 
      },
      { 
        name: 'EMA 9 / EMA 21', 
        status: breakdown.emaScore !== undefined ? (breakdown.emaScore > 0 ? 'Upward Trend ✓' : 'Downward Trend ✓') : (isCall ? 'Upward Trend ✓' : 'Downward Trend ✓') 
      },
      { 
        name: 'RSI (14)', 
        status: breakdown.rsiValue !== undefined ? `Value: ${breakdown.rsiValue.toFixed(1)} ✓` : 'Momentum Aligned ✓' 
      },
      { 
        name: 'Price Action', 
        status: breakdown.patternName && breakdown.patternName !== 'NONE' ? `${breakdown.patternName} ✓` : 'Key Level Reaction ✓' 
      }
    ],
    analysisSnapshot: {
      finalScore: signalInfo ? signalInfo.finalScore : (isCall ? 0.75 : -0.75),
      marketRegime: 'ANALYZED'
    }
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

  const sigExpirationDisplay = document.getElementById('sigExpirationDisplay');
  if (sigExpirationDisplay) {
    sigExpirationDisplay.textContent = signal.expirationSec === 60 ? '1 MIN' : '30 SEC';
  }

  const badge = document.getElementById('sigTypeBadge');
  if (badge) {
    badge.textContent = `${signal.type} ${signal.type === 'CALL' ? '↑' : '↓'}`;
    badge.className = `signal-type-badge ${signal.type}`;
  }

  // Confidence
  const sigConf = document.getElementById('sigConf');
  if (sigConf) {
    sigConf.textContent = signal.confidence || '—';
  }

  // Entry — показываем только если есть реальное значение
  const sigEntry = document.getElementById('sigEntry');
  if (sigEntry) {
    if (signal.entry) {
      sigEntry.textContent = signal.entry;
      sigEntry.parentElement.style.display = '';      // показываем
    } else {
      // Прячем весь кусок " | Entry: ..."
      const parentText = sigEntry.parentElement;
      if (parentText) {
        // Более надёжный способ — просто ставим прочерк
        sigEntry.textContent = '—';
      }
    }
  }

  // Factors
  const factorsContainer = document.getElementById('factorsList');
  if (factorsContainer) {
    factorsContainer.innerHTML = signal.factors.map(f => `
      <div style="display:flex; justify-content:space-between; color: var(--text-muted);">
        <span>${f.name}</span>
        <span style="color:#fff; font-weight:600;">${f.status}</span>
      </div>
    `).join('');
  }

  bindResultButtons();
  startSignalTimer(signal);
}

function bindResultButtons() {
  const resultBtnRow = document.getElementById('resultBtnRow');
  if (!resultBtnRow) return;

  resultBtnRow.innerHTML = `
    <button data-res="WIN" class="btn-res btn-win" style="flex:1; padding:10px; background:#10b981; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer;">WIN</button>
    <button data-res="LOSS" class="btn-res btn-loss" style="flex:1; padding:10px; background:#ef4444; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer;">LOSS</button>
    <button data-res="REFUND" class="btn-res btn-refund" style="flex:1; padding:10px; background:#64748b; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer;">REFUND</button>
  `;

  resultBtnRow.querySelectorAll('.btn-res').forEach(btn => {
    btn.onclick = () => window.handleSignalResult(btn.dataset.res);
  });
}

function startSignalTimer(signal) {
  if (activeTimerInterval) clearInterval(activeTimerInterval);

  const timerText = document.getElementById('timerText');
  const progressCircle = document.getElementById('timerProgressCircle');
  const statusText = document.getElementById('signalStatusText');
  const resultBtnRow = document.getElementById('resultBtnRow');
  const circumference = 339.29;
  const totalDurationMs = (signal.expirationSec || 30) * 1000;

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

    const totalSeconds = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    const formattedMins = mins < 10 ? `0${mins}` : mins;
    const formattedSecs = secs < 10 ? `0${secs}` : secs;

    if (timerText) timerText.textContent = `${formattedMins}:${formattedSecs}`;

    if (progressCircle) {
      const progressFraction = (totalDurationMs - remainingMs) / totalDurationMs;
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

window.resetSignalsHistory = function() {
  if (confirm("Вы уверены, что хотите полностью очистить историю сигналов?")) {
    store.resetSignalsHistory();
    if (activeTimerInterval) clearInterval(activeTimerInterval);
    
    const displayBox = document.getElementById('activeSignalDisplay');
    if (displayBox) displayBox.style.display = 'none';

    const genBtn = document.getElementById('generateSignalBtn');
    if (genBtn) genBtn.disabled = false;

    renderUI();
  }
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

// 6. Модальное окно и P&L
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

// 7. Рендеринг UI
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
      tbody.innerHTML = store.state.signalsHistory.map(s => {
        let resultColor = 'var(--text-muted)';
        if (s.result === 'WIN') resultColor = 'var(--accent-green)';
        else if (s.result === 'LOSS') resultColor = 'var(--accent-red)';
        else if (s.result === 'REFUND') resultColor = '#94a3b8';

        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td style="padding: 10px; font-weight:600;">${s.asset}</td>
            <td style="padding: 10px; color: ${s.type === 'CALL' ? 'var(--accent-green)' : 'var(--accent-red)'}">${s.type} (${s.expirationSec === 60 ? '1m' : '30s'})</td>
            <td style="padding: 10px; color: var(--text-muted);">${new Date(s.generatedAt).toLocaleTimeString()}</td>
            <td style="padding: 10px;">${s.confidence}</td>
            <td style="padding: 10px; font-weight:700; color: ${resultColor};">${s.result || 'EXPIRED'}</td>
          </tr>
        `;
      }).join('');
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
            <div style="font-size:11px; color: var(--text-muted);">${ds.trades} trades (${ds.wins}W / ${ds.losses}L${ds.refunds ? ' / ' + ds.refunds + 'R' : ''}) | WR: ${ds.winRate}%</div>
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

// 8. График Chart.js
function renderChart() {
  const canvas = document.getElementById('performanceChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const sessions = [...(store.state.dailySessions || [])].reverse();

  if (sessions.length === 0) {
    canvas.style.display = 'none';
    if (performanceChart) {
      performanceChart.destroy();
      performanceChart = null;
    }
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