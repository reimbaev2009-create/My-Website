// Функция переключения заглавия в шапке
function switchPage(pageName) {
  const btnHome = document.getElementById('btnNavHome');
  const btnSignals = document.getElementById('btnNavSignals');
  const pageTitle = document.getElementById('pageTitle');

  if (pageName === 'home') {
    btnHome.classList.add('active');
    btnSignals.classList.remove('active');
    pageTitle.textContent = 'Главное';
  } else if (pageName === 'signals') {
    btnSignals.classList.add('active');
    btnHome.classList.remove('active');
    pageTitle.textContent = 'Сигналы';
  }
}