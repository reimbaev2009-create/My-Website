// 1. Инициализация иконок Lucide
lucide.createIcons();

// 2. Логика переключения вкладок (Sidebar и Верхняя шапка)
function switchTab(tabName) {
  // Обновляем кнопки в сайдбаре
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Обновляем ссылки в верхнем меню
  document.querySelectorAll('.top-link').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tabName);
  });

  // Переключаем видимость секций
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });

  const activeSection = document.getElementById(`section-${tabName}`);
  if (activeSection) {
    activeSection.classList.add('active');
  }
}

// Навешиваем клики на все элементы с атрибутом data-tab
document.querySelectorAll('[data-tab]').forEach(element => {
  element.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = element.dataset.tab;
    switchTab(tab);
  });
});

// 3. Функция копирования торговых сигналов
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-action')) {
    const card = e.target.closest('.signal-card');
    const pair = card.querySelector('.pair').textContent;
    const badge = card.querySelector('.badge').textContent;
    const info = Array.from(card.querySelectorAll('.signal-body div'))
                     .map(div => div.textContent.trim())
                     .join('\n');

    const signalText = `Сигнал: ${pair}\nНаправление: ${badge}\n${info}`;

    navigator.clipboard.writeText(signalText).then(() => {
      const originalText = e.target.textContent;
      e.target.textContent = 'Скопировано! ✓';
      e.target.style.background = '#10b981';

      setTimeout(() => {
        e.target.textContent = originalText;
        e.target.style.background = '';
      }, 2000);
    });
  }
});

// 4. Логика кнопки "Настройки"
const settingsBtn = document.querySelector('.settings-btn');
if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    alert('Настройки аккаунта:\n- Режим работы: AI Auto-Analyze\n- Уведомления: Включены\n- API Pocket Option: Подключено');
  });
}

// 5. Построение графика Chart.js
const chartCanvas = document.getElementById('progressChart');
if (chartCanvas) {
  const ctx = chartCanvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 120);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.5)');
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
        pointRadius: 3,
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