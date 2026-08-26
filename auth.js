// auth.js - Authentication System for BeybarsBot
// 3 gün oturum + cihaz kontrolü + kullanıcı bazlı istatistik

import { store } from './store.js';

const AUTH_USERS_KEY = 'BEYBARS_USERS_V1';
const AUTH_SESSION_KEY = 'BEYBARS_SESSION_V1';
const SESSION_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 gün

// ==================== YARDIMCI FONKSİYONLAR ====================

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getDeviceId() {
  let id = localStorage.getItem('beybars_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('beybars_device_id', id);
  }
  return id;
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

// ==================== AUTH LOGIC ====================

function isSessionValid() {
  const session = getSession();
  if (!session) return false;

  const now = Date.now();
  if (now > session.expiresAt) return false;           // 3 gün geçti
  if (session.deviceId !== getDeviceId()) return false; // farklı cihaz

  return true;
}

async function registerUser(username, password) {
  const users = getUsers();
  const cleanName = username.trim().toLowerCase();

  if (!cleanName || cleanName.length < 3) {
    return { ok: false, error: 'Имя пользователя должно быть минимум 3 символа' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Пароль должен быть минимум 6 символов' };
  }
  if (users[cleanName]) {
    return { ok: false, error: 'Это имя уже занято' };
  }

  const salt = generateSalt();
  const hash = await hashPassword(password, salt);

  users[cleanName] = {
    username: username.trim(),
    salt,
    hash,
    createdAt: Date.now()
  };
  saveUsers(users);

  return { ok: true, username: username.trim() };
}

async function loginUser(username, password) {
  const users = getUsers();
  const cleanName = username.trim().toLowerCase();
  const user = users[cleanName];

  if (!user) {
    return { ok: false, error: 'Неверный логин или пароль' };
  }

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.hash) {
    return { ok: false, error: 'Неверный логин или пароль' };
  }

  // Oturum oluştur
  const session = {
    username: user.username,
    deviceId: getDeviceId(),
    loginAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS
  };
  saveSession(session);

  return { ok: true, username: user.username };
}

function logoutUser() {
  clearSession();
  store.setUser(null);
  location.reload(); // Temiz başlangıç
}

// ==================== UI ====================

function showApp(username) {
  const overlay = document.getElementById('authOverlay');
  const app = document.getElementById('appContainer');
  const welcome = document.getElementById('welcomeOverlay');

  if (overlay) overlay.classList.add('hidden');

  // Welcome animasyonu
  if (welcome) {
    welcome.classList.add('active');
    const textEl = document.getElementById('welcomeText');
    const subEl = document.getElementById('welcomeSub');

    if (textEl) {
      textEl.textContent = '';
      const fullText = 'ДОБРО ПОЖАЛОВАТЬ';
      let i = 0;
      const typeInterval = setInterval(() => {
        textEl.textContent += fullText[i];
        i++;
        if (i >= fullText.length) {
          clearInterval(typeInterval);
        }
      }, 70);
    }
    if (subEl) {
      subEl.textContent = `${username}, добро пожаловать в BeybarsBot`;
    }

    // 2.8 saniye sonra uygulamayı göster
    setTimeout(() => {
      welcome.classList.remove('active');
      if (app) {
        app.style.display = 'flex';
      }
      // Store'u kullanıcıya bağla
      store.setUser(username);
      // UI'yi yenile (istatistikler kullanıcıya özel olsun)
      if (typeof window.renderUI === 'function') {
        window.renderUI();
      } else {
        // script.js henüz yüklenmemişse biraz bekle
        setTimeout(() => {
          if (typeof window.renderUI === 'function') window.renderUI();
        }, 300);
      }
      updateUserMenu(username);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }, 2800);
  } else {
    if (app) app.style.display = 'flex';
    store.setUser(username);
    updateUserMenu(username);
  }
}

function updateUserMenu(username) {
  const letterEl = document.getElementById('userAvatarLetter');
  const nameEl = document.getElementById('userDisplayName');
  const subEl = document.getElementById('userDisplaySub');

  if (letterEl) letterEl.textContent = (username || 'U').charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = username || 'User';
  if (subEl) subEl.textContent = 'Трейдер';
}

function initAuthUI() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const showRegister = document.getElementById('showRegister');
  const showLogin = document.getElementById('showLogin');
  const btnLogin = document.getElementById('btnLogin');
  const btnRegister = document.getElementById('btnRegister');
  const loginError = document.getElementById('loginError');
  const regError = document.getElementById('regError');

  // Form değiştirme
  if (showRegister) {
    showRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm?.classList.remove('active');
      registerForm?.classList.add('active');
      if (loginError) loginError.textContent = '';
    });
  }
  if (showLogin) {
    showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm?.classList.remove('active');
      loginForm?.classList.add('active');
      if (regError) regError.textContent = '';
    });
  }

  // Giriş
  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      const username = document.getElementById('loginUsername')?.value || '';
      const password = document.getElementById('loginPassword')?.value || '';

      btnLogin.classList.add('loading');
      btnLogin.disabled = true;
      if (loginError) loginError.textContent = '';

      const result = await loginUser(username, password);

      btnLogin.classList.remove('loading');
      btnLogin.disabled = false;

      if (result.ok) {
        showApp(result.username);
      } else {
        if (loginError) loginError.textContent = result.error;
      }
    });
  }

  // Kayıt
  if (btnRegister) {
    btnRegister.addEventListener('click', async () => {
      const username = document.getElementById('regUsername')?.value || '';
      const password = document.getElementById('regPassword')?.value || '';
      const password2 = document.getElementById('regPassword2')?.value || '';

      if (password !== password2) {
        if (regError) regError.textContent = 'Пароли не совпадают';
        return;
      }

      btnRegister.classList.add('loading');
      btnRegister.disabled = true;
      if (regError) regError.textContent = '';

      const result = await registerUser(username, password);

      if (result.ok) {
        // Otomatik giriş
        const loginResult = await loginUser(username, password);
        btnRegister.classList.remove('loading');
        btnRegister.disabled = false;

        if (loginResult.ok) {
          showApp(loginResult.username);
        }
      } else {
        btnRegister.classList.remove('loading');
        btnRegister.disabled = false;
        if (regError) regError.textContent = result.error;
      }
    });
  }

  // Enter tuşu
  document.getElementById('loginPassword')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnLogin?.click();
  });
  document.getElementById('regPassword2')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnRegister?.click();
  });

  // Kullanıcı menüsü
  const avatarBtn = document.getElementById('userAvatarBtn');
  const dropdown = document.getElementById('userDropdown');
  const btnLogout = document.getElementById('btnLogout');

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });
    document.addEventListener('click', () => {
      dropdown.classList.remove('active');
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm('Вы уверены, что хотите выйти?')) {
        logoutUser();
      }
    });
  }
}

// ==================== BAŞLANGIÇ ====================

document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();

  if (isSessionValid()) {
    const session = getSession();
    showApp(session.username);
  } else {
    // Oturum yok veya süresi dolmuş → login ekranı açık kalsın
    clearSession();
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.classList.remove('hidden');
  }

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});