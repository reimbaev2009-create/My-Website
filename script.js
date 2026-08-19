lucide.createIcons();

// 1. Плавная смена вкладок
function switchTab(tabName) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.top-link').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tabName);
  });

  const sections = document.querySelectorAll('.content-section');
  
  sections.forEach(section => {
    if (section.classList.contains('active')) {
      section.style.opacity = '0';
      section.style.transform = 'translateY(15px)';
      
      setTimeout(() => {
        section.classList.remove('active');
        const targetSection = document.getElementById(`section-${tabName}`);
        if (targetSection) {
          targetSection.classList.add('active');
          setTimeout(() => {
            targetSection.style.opacity = '1';
            targetSection.style.transform = 'translateY(0)';
          }, 50);
        }
      }, 300);
    }
  });
}

document.querySelectorAll('[data-tab]').forEach(element => {
  element.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab(element.dataset.tab);
  });
});

// 2. Копирование сигналов с плавной обратной связью
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-action')) {
    const card = e.target.closest('.signal-card');
    const pair = card.querySelector('.pair').textContent;
    const badge = card.querySelector('.badge').textContent;

    navigator.clipboard.writeText(`Сигнал: ${pair} | Направление: ${badge}`).then(() => {
      const origText = e.target.textContent;
      e.target.textContent = 'Скопировано! ✓';
      e.target.style.background = '#10b981';
      e.target.style.borderColor = '#10b981';

      setTimeout(() => {
        e.target.textContent = origText;
        e.target.style.background = '';
        e.target.style.borderColor = '';
      }, 2000);
    });
  }
});

// 3. Динамическая генерация сигналов
const pairs = ['GBP/USD', 'USD/JPY', 'AUD/USD', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'];
const generateBtn = document.getElementById('generateSignalBtn');

if (generateBtn) {
  generateBtn.addEventListener('click', () => {
    generateBtn.disabled = true;
    generateBtn.style.opacity = '0.7';
    generateBtn.innerHTML = '<i data-lucide="loader"></i> Анализ рынка...';
    lucide.createIcons();

    setTimeout(() => {
      const isBuy = Math.random() > 0.5;
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      const accuracy = (76 + Math.random() * 18).toFixed(1);
      const entry = (1 + Math.random() * 100).toFixed(4);

      const newCard = document.createElement('div');
      newCard.className = `signal-card ${isBuy ? 'buy' : 'sell'}`;
      newCard.innerHTML = `
        <div class="signal-head">
          <span class="pair">${pair}</span>
          <span class="badge ${isBuy ? 'buy' : 'sell'}">${isBuy ? 'CALL (ВВЕРХ)' : 'PUT (ВНИЗ)'}</span>
        </div>
        <div class="signal-body">
          <div><span>Время экспирации:</span> <strong>3 мин</strong></div>
          <div><span>Точность:</span> <strong>${accuracy}%</strong></div>
          <div><span>Вход:</span> <strong>${entry}</strong></div>
        </div>
        <button class="btn-action">Копировать сигнал</button>
      `;

      document.getElementById('signalsGrid').prepend(newCard);

      generateBtn.disabled = false;
      generateBtn.style.opacity = '1';
      generateBtn.innerHTML = '<i data-lucide="refresh-cw"></i> Запросить AI Сигнал';
      lucide.createIcons();
    }, 1000);
  });
}

// 4. Модальное окно настроек
const modal = document.getElementById('settingsModal');
document.getElementById('openSettings')?.addEventListener('click', () => modal.classList.add('active'));
document.getElementById('closeSettings')?.addEventListener('click', () => modal.classList.remove('active'));

modal?.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('active');
});

// 5. Построение графика
const chartCanvas = document.getElementById('progressChart');
if (chartCanvas) {
  const ctx = chartCanvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 120);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['18 Apr', '25 Apr', '2 May', '9 May', '16 May'],
      datasets: [{
        data: [300, 450, 400, 800, 1247.50],
        borderColor: '#6366f1',
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#6366f1'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af', font: { size: 10 } } }
      }
    }
  });
}