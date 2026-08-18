let myChart = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  initChart();
});

// Переключение страниц
function switchPage(pageName) {
  const btnHome = document.getElementById('btnNavHome');
  const btnSignals = document.getElementById('btnNavSignals');
  const pageTitle = document.getElementById('pageTitle');
  const pageHome = document.getElementById('pageHome');
  const pageSignals = document.getElementById('pageSignals');

  if (pageName === 'home') {
    btnHome.classList.add('active');
    btnSignals.classList.remove('active');
    pageTitle.textContent = 'Главное';
    if (pageHome) pageHome.classList.add('active');
    if (pageSignals) pageSignals.classList.remove('active');
  } else if (pageName === 'signals') {
    btnSignals.classList.add('active');
    btnHome.classList.remove('active');
    pageTitle.textContent = 'Сигналы';
    if (pageHome) pageHome.classList.remove('active');
    if (pageSignals) pageSignals.classList.add('active');
  }
}

// Инициализация графика Chart.js
function initChart() {
  const ctx = document.getElementById('progressChart');
  if (!ctx) return;

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 180);
  gradient.addColorStop(0, 'rgba(124, 58, 237, 0.4)');
  gradient.addColorStop(1, 'rgba(124, 58, 237, 0.0)');

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['18 Apr', '25 Apr', '2 May', '9 May', '16 May'],
      datasets: [{
        label: 'Прибыль ($)',
        data: [200, 450, 400, 850, 1247.50],
        borderColor: '#7c3aed',
        borderWidth: 3,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b', font: { size: 10 } } }
      }
    }
  });
}

// Обновление периода графика
function updateChartPeriod() {
  if (!myChart) return;
  const period = document.getElementById('chartPeriod').value;
  
  if (period === '7') {
    myChart.data.labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    myChart.data.datasets[0].data = [900, 950, 1020, 1100, 1080, 1190, 1247.50];
  } else {
    myChart.data.labels = ['18 Apr', '25 Apr', '2 May', '9 May', '16 May'];
    myChart.data.datasets[0].data = [200, 450, 400, 850, 1247.50];
  }
  myChart.update();
}

// Заглушка сброса статистики
function resetUserStats() {
  if (confirm('Вы действительно хотите сбросить всю статистику?')) {
    alert('Статистика сброшена!');
  }
}