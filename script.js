lucide.createIcons();

function switchTab(tabName) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.top-link').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tabName);
  });

  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });

  const activeSection = document.getElementById(`section-${tabName}`);
  if (activeSection) {
    activeSection.classList.add('active');
  }
}

document.querySelectorAll('[data-tab]').forEach(element => {
  element.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = element.dataset.tab;
    switchTab(tab);
  });
});

const ctx = document.getElementById('progressChart').getContext('2d');
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