/* ==========================================================================
   CONSTANTS AND UTILITIES
   ========================================================================== */

const API_URL = 'https://project-sotochka.onrender.com';
const HEADER_HEIGHT = 80; // Fixed header height in pixels

/**
 * Shows a notification in the bottom-right corner
 * @param {string} message - The message to display
 * @param {string} type - 'success' or 'error'
 */
function showNotification(message, type = 'success') {
  // Создаём или получаем контейнер для уведомлений
  let container = document.querySelector('.notifications-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'notifications-container';
    document.body.appendChild(container);
  }

  // Создаём новое уведомление
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `<p>${message}</p>`;
  container.appendChild(notification);

  // Вычисляем начальную позицию (внизу контейнера)
  const notifications = container.querySelectorAll('.notification');
  let totalHeight = 0;
  for (let i = 0; i < notifications.length - 1; i++) {
    totalHeight += notifications[i].offsetHeight + 10; // 10px зазор
  }
  notification.style.transform = `translateY(-${totalHeight}px)`;

  // Плавное появление
  setTimeout(() => {
    notification.classList.add('active');
  }, 10);

  // Плавное исчезновение через 3 секунды
  setTimeout(() => {
    notification.classList.remove('active');
    // Ждём завершения анимации исчезновения
    setTimeout(() => {
      notification.remove();
      // Обновляем позиции оставшихся уведомлений
      const remainingNotifications = container.querySelectorAll('.notification');
      let newTotalHeight = 0;
      remainingNotifications.forEach((notif, index) => {
        notif.style.transform = `translateY(-${newTotalHeight}px)`;
        newTotalHeight += notif.offsetHeight + 10;
      });
      // Удаляем контейнер, если он пуст
      if (remainingNotifications.length === 0) {
        container.remove();
      }
    }, 300); // Длительность анимации исчезновения
  }, 3000); // Время отображения
}

/**
 * Utility function to toggle modal visibility
 * @param {HTMLElement} modal - The modal element
 * @param {boolean} show - Whether to show or hide the modal
 */
function toggleModal(modal, show = true) {
  if (show) {
    modal.classList.add('active');
    // Force reflow for animation
    setTimeout(() => {
      modal.classList.remove('active');
      void modal.offsetWidth;
      modal.classList.add('active');
    }, 10);
  } else {
    modal.classList.remove('active');
  }
}

/**
 * Utility function to get selected checkbox values
 * @param {string} name - Name attribute of checkboxes
 * @returns {string[]} - Array of selected values
 */
function getSelectedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value);
}

/* ==========================================================================
   SMOOTH SCROLL
   ========================================================================== */

/**
 * Performs smooth scroll to a target element with header offset
 * @param {string} targetId - The ID of the target element
 */
function smoothScrollTo(targetId) {
  if (targetId === '#header' || targetId === '#') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.pushState(null, null, ' ');
    return;
  }

  const target = document.querySelector(targetId);
  if (!target) return;

  const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = targetPosition - HEADER_HEIGHT - 20; // Учитываем только высоту хедера

  window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
  history.pushState(null, null, targetId);
}

function initializeSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      smoothScrollTo(href);
    });
  });
}

/* ==========================================================================
   AUTHENTICATION
   ========================================================================== */

function initializeAuth() {
  const authModal = document.getElementById('auth-modal');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // Проверка наличия модального окна
  if (!authModal) {
    console.warn('auth-modal отсутствует на странице:', window.location.pathname);
    return;
  }

  // Toggle between login and register forms
  document.getElementById('show-register')?.addEventListener('click', e => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  });

  document.getElementById('show-login')?.addEventListener('click', e => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
  });

  // Modal controls
  document.querySelector('.close-modal')?.addEventListener('click', () => toggleModal(authModal, false));

  // Функция для привязки обработчиков к кнопкам "Вход" и "Регистрация"
  function bindAuthButtons() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    if (loginBtn && registerBtn) {
      loginBtn.removeEventListener('click', openLoginModal);
      registerBtn.removeEventListener('click', openRegisterModal);
      loginBtn.addEventListener('click', openLoginModal);
      registerBtn.addEventListener('click', openRegisterModal);
    }
  }

  function openLoginModal() {
    // Открываем модальное окно только если пользователь явно кликнул на кнопку
    if (!window.location.pathname.includes('account.html')) {
      toggleModal(authModal);
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    }
  }

  function openRegisterModal() {
    // Открываем модальное окно только если пользователь явно кликнул на кнопку
    if (!window.location.pathname.includes('account.html')) {
      toggleModal(authModal);
      registerForm.style.display = 'block';
      loginForm.style.display = 'none';
    }
  }

  // Привязываем обработчики при инициализации
  bindAuthButtons();

  // Close modal on outside click or ESC key
  window.addEventListener('click', e => {
    if (e.target === authModal) toggleModal(authModal, false);
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') toggleModal(authModal, false);
  });

  // Handle login form submission
  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toggleModal(authModal, false);
        await updateHeader(); // Обновляем хедер после входа
        bindAuthButtons(); // Повторно привязываем обработчики
        if (data.user.role === 'admin') console.log('Admin logged in');
        // Перенаправление на страницу личного кабинета после успешного входа
        if (window.location.pathname.includes('account.html')) {
          window.location.reload();
        }
      } else {
        alert(data.message || 'Ошибка входа. Проверьте email и пароль.');
      }
    } catch (error) {
      console.error('Ошибка при входе:', error.message);
      alert('Не удалось подключиться к серверу. Проверьте, запущен ли сервер, и попробуйте снова.');
    }
  });

  // Handle register form submission
  registerForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toggleModal(authModal, false);
        await updateHeader(); // Обновляем хедер после регистрации
        bindAuthButtons(); // Повторно привязываем обработчики
        // Перенаправление на страницу личного кабинета после успешной регистрации
        if (window.location.pathname.includes('account.html')) {
          window.location.reload();
        }
      } else {
        alert(data.message || 'Ошибка регистрации. Проверьте введённые данные.');
      }
    } catch (error) {
      console.error('Ошибка при регистрации:', error.message);
      alert('Не удалось подключиться к серверу. Проверьте, запущен ли сервер, и попробуйте снова.');
    }
  });

  // Проверяем, если пользователь не авторизован и находится на странице личного кабинета
  const token = localStorage.getItem('token');
  if (!token && window.location.pathname.includes('account.html')) {
    // Вместо открытия модального окна перенаправляем на главную страницу
    window.location.href = 'index.html';
  }
}

/**
 * Updates header based on authentication status
 */
async function updateHeader() {
  console.log('updateHeader called on page:', window.location.pathname);
  const token = localStorage.getItem('token');
  const authButtons = document.getElementById('auth-buttons');
  const userProfile = document.getElementById('user-profile');
  const authNav = document.getElementById('auth-nav');

  if (!authNav) {
    console.warn('auth-nav отсутствует в DOM на странице:', window.location.pathname);
    return;
  }

  // Если токена нет, показываем кнопки "Вход" и "Регистрация"
  if (!token) {
    if (authButtons && userProfile) {
      authButtons.style.display = 'flex';
      userProfile.style.display = 'none';
    } else {
      authNav.innerHTML = `
        <div id="auth-buttons" class="auth-buttons">
          <button class="btn btn-outline btn-sm" id="login-btn">Вход</button>
          <button class="btn btn-primary btn-sm" id="register-btn">Регистрация</button>
        </div>
        <div id="user-profile" class="user-profile" style="display: none;"></div>
      `;
    }
    return;
  }

  try {
    console.log('Отправка запроса к серверу для проверки токена');
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      console.error('Ошибка проверки токена:', response.status);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      authNav.innerHTML = `
        <div id="auth-buttons" class="auth-buttons">
          <button class="btn btn-outline btn-sm" id="login-btn">Вход</button>
          <button class="btn btn-primary btn-sm" id="register-btn">Регистрация</button>
        </div>
        <div id="user-profile" class="user-profile" style="display: none;"></div>
      `;
      return;
    }

    const user = await response.json();
    console.log('Получены данные пользователя:', user);
    localStorage.setItem('user', JSON.stringify(user));

    // Проверяем, соответствует ли текущее состояние хедера данным пользователя
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin';
    const expectedHTML = isAdmin
      ? `
        <div id="user-profile" class="user-profile">
          <a href="/admin.html" class="btn btn-outline btn-sm">Администратор</a>
          <button class="btn btn-primary btn-sm" id="logout-btn-header">Выйти</button>
        </div>
      `
      : `
        <div id="user-profile" class="user-profile">
          <a href="/account.html" class="btn btn-outline btn-sm">Профиль</a>
          <button class="btn btn-primary btn-sm" id="logout-btn-header">Выйти</button>
        </div>
      `;

    if (authNav.innerHTML !== expectedHTML) {
      authNav.innerHTML = expectedHTML;
    }

    // Добавляем обработчик для кнопки "Выйти"
    const logoutBtn = document.getElementById('logout-btn-header');
    if (logoutBtn) {
      logoutBtn.removeEventListener('click', logout);
      logoutBtn.addEventListener('click', logout);
      console.log('Обработчик для кнопки Выйти добавлен');
    }
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authNav.innerHTML = `
      <div id="auth-buttons" class="auth-buttons">
        <button class="btn btn-outline btn-sm" id="login-btn">Вход</button>
        <button class="btn btn-primary btn-sm" id="register-btn">Регистрация</button>
      </div>
      <div id="user-profile" class="user-profile" style="display: none;"></div>
    `;
  }
}

/**
 * Logs out the user and redirects to index
 */
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateHeader();
  // Перенаправление в зависимости от текущей страницы
  const isInCourses = window.location.pathname.includes('courses/');
  window.location.href = isInCourses ? '../index.html' : 'index.html';
}

/* ==========================================================================
   PROFILE MANAGEMENT
   ========================================================================== */

async function loadProfile() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html'; // Перенаправляем на главную, если токена нет
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/profile`, { // Исправляем маршрут
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();

    if (response.ok) {
      document.getElementById('profile-name').value = data.name;
      document.getElementById('profile-email').value = data.email;
    } else {
      alert(data.message || 'Ошибка загрузки профиля');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Ошибка при загрузке профиля:', error.message);
    alert('Не удалось подключиться к серверу. Проверьте подключение и попробуйте снова.');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  }
}

function initializeProfile() {
  const profileForm = document.getElementById('profile-form');
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const editBtn = document.getElementById('edit-profile');
  const saveBtn = document.getElementById('save-profile');
  const cancelBtn = document.getElementById('cancel-edit');

  editBtn?.addEventListener('click', () => {
    profileName.disabled = false;
    profileEmail.disabled = false;
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';
  });

  cancelBtn?.addEventListener('click', () => {
    profileName.disabled = true;
    profileEmail.disabled = true;
    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    loadProfile();
  });

  profileForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const name = profileName.value;
    const email = profileEmail.value;

    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email })
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data));
        profileName.disabled = true;
        profileEmail.disabled = true;
        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        alert('Profile updated');
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Server error');
    }
  });
}

/* ==========================================================================
   MOBILE MENU
   ========================================================================== */

function initializeMobileMenu() {
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  mobileMenuBtn?.addEventListener('click', () => {
    const navList = document.querySelector('.nav-list');
    const authNav = document.querySelector('.auth-nav');
    const isOpen = navList.classList.toggle('active');
    authNav.classList.toggle('active', isOpen);
    mobileMenuBtn.textContent = isOpen ? '×' : '☰';
  });
}

/* ==========================================================================
   HONEY DROPS ANIMATION
   ========================================================================== */

function initializeHoneyDrops() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  let dropsContainer = document.querySelector('.honey-drops');
  if (!dropsContainer) {
    dropsContainer = document.createElement('div');
    dropsContainer.className = 'honey-drops';
    hero.appendChild(dropsContainer);
  }

  function createDrop() {
    const drop = document.createElement('div');
    drop.className = 'honey-drop';
    drop.style.left = `${10 + Math.random() * 80}%`;
    const duration = 6 + Math.random() * 2;
    drop.style.animationDuration = `${duration}s`;
    dropsContainer.appendChild(drop);

    setTimeout(() => drop.remove(), duration * 1000);
  }

  // Initial drops
  for (let i = 0; i < 15; i++) {
    setTimeout(createDrop, i * 300);
  }

  // Continuous drops
  setInterval(createDrop, 500);
}

/* ==========================================================================
   BEE ANIMATION
   ========================================================================== */

function initializeBees() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  function createBee() {
    const bee = document.createElement('div');
    bee.className = 'bee';
    const size = 75 + Math.random() * 75;
    bee.style.width = `${size}px`;
    bee.style.height = `${size}px`;

    const animationTypes = ['flyHorizontal', 'flyVertical', 'flyDiagonal1', 'flyDiagonal2'];
    const animation = animationTypes[Math.floor(Math.random() * animationTypes.length)];
    bee.style.animationName = animation;

    switch (animation) {
      case 'flyHorizontal':
        bee.style.top = `${Math.random() * 100}%`;
        bee.style.left = '0';
        break;
      case 'flyVertical':
        bee.style.left = `${Math.random() * 100}%`;
        bee.style.top = '0';
        break;
      case 'flyDiagonal1':
        bee.style.left = '0';
        bee.style.top = '0';
        break;
      case 'flyDiagonal2':
        bee.style.left = '100%';
        bee.style.top = '0';
        break;
    }

    const duration = 8 + Math.random() * 12;
    bee.style.animationDuration = `${duration}s`;
    bee.style.animationDelay = `${Math.random() * 5}s`;
    hero.appendChild(bee);

    setTimeout(() => bee.remove(), (duration + 5) * 1000);
  }

  // Initial bees
  for (let i = 0; i < 3; i++) {
    setTimeout(createBee, i * 1500);
  }

  // Continuous bees
  setInterval(createBee, 2000);
}

/* ==========================================================================
   COURSE FILTERS
   ========================================================================== */

function initializeCourseFilters() {
  const toggleBtn = document.getElementById('filters-toggle');
  const filtersContainer = document.querySelector('.compact-filters');
  const toggleIcon = toggleBtn?.querySelector('.toggle-icon');
  const priceRange = document.getElementById('price-range');
  const priceValues = document.querySelector('.price-values');
  const resetBtn = document.getElementById('reset-filters');
  const applyBtn = document.querySelector('.filter-btn.apply');
  const coursesCount = document.getElementById('courses-count');
  const courseCards = document.querySelectorAll('.course-card');
  const subjectSections = document.querySelectorAll('.subject-section');

  // Initialize collapsed state
  if (toggleBtn && filtersContainer) {
    filtersContainer.classList.add('collapsed');
    toggleIcon.textContent = '▼';
    toggleBtn.innerHTML = '<span class="toggle-icon">►</span> Показать фильтры';

    toggleBtn.addEventListener('click', () => {
      const isCollapsed = filtersContainer.classList.contains('collapsed');
      toggleIcon.textContent = isCollapsed ? '▼' : '▲';
      toggleBtn.innerHTML = isCollapsed
        ? '<span class="toggle-icon">▲</span> Спрятать фильтры'
        : '<span class="toggle-icon">▼</span> Показать фильтры';
      filtersContainer.classList.toggle('collapsed');
    });
  }

  function updatePriceValues() {
    if (!priceRange || !priceValues) return; // Проверка на наличие элементов
    const minPrice = parseInt(priceRange.min);
    const maxPrice = parseInt(priceRange.max);
    const currentPrice = parseInt(priceRange.value);
    const percentage = ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100;

    priceRange.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, var(--text-dark) ${percentage}%, var(--text-dark) 100%)`;
    priceValues.children[0].textContent = 'от 12 900 р';
    priceValues.children[1].textContent = 'до ' + currentPrice.toLocaleString('ru-RU') + ' р';
  }

  // Initialize price slider only if elements exist
  if (priceRange && priceValues) {
    priceRange.value = priceRange.max; // Устанавливаем начальное значение
    updatePriceValues(); // Вызываем для начальной отрисовки
    priceRange.addEventListener('input', updatePriceValues);
  }

  function applyFilters() {
    if (!coursesCount || !courseCards.length || !subjectSections.length) return; // Проверка на наличие элементов
    const selectedSubjects = getSelectedValues('subject');
    const selectedLevels = getSelectedValues('level');
    const selectedTypes = getSelectedValues('type');
    const maxPrice = priceRange ? parseInt(priceRange.value) : Infinity; // Используем Infinity, если priceRange отсутствует
    let visibleCount = 0;

    courseCards.forEach(card => {
      const cardSubject = card.dataset.category;
      const cardLevel = card.dataset.level;
      const cardType = card.dataset.type;
      const cardPrice = parseInt(card.querySelector('.course-price')?.textContent.replace(/\D/g, '') || Infinity);

      const subjectMatch = selectedSubjects.length === 0 || selectedSubjects.includes(cardSubject);
      const levelMatch = selectedLevels.length === 0 || selectedLevels.includes(cardLevel);
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(cardType);
      const priceMatch = cardPrice <= maxPrice;

      card.style.display = subjectMatch && levelMatch && typeMatch && priceMatch ? 'flex' : 'none';
      if (card.style.display === 'flex') visibleCount++;
    });

    coursesCount.textContent = visibleCount;

    subjectSections.forEach(section => {
      const sectionCourses = section.querySelectorAll('.course-card');
      const visibleCourses = Array.from(sectionCourses).filter(card => card.style.display !== 'none');
      section.style.display = visibleCourses.length > 0 ? 'block' : 'none';
    });
  }

  function resetFilters() {
    if (!coursesCount || !courseCards.length || !subjectSections.length) return; // Проверка на наличие элементов
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false;
    });
    if (priceRange) {
      priceRange.value = priceRange.max;
      updatePriceValues();
    }
    courseCards.forEach(card => card.style.display = 'flex');
    subjectSections.forEach(section => section.style.display = 'block');
    coursesCount.textContent = courseCards.length;
  }

  if (applyBtn) applyBtn.addEventListener('click', applyFilters);
  if (resetBtn) resetBtn.addEventListener('click', resetFilters);
  if (coursesCount && courseCards.length) applyFilters();
}

/* ==========================================================================
   COURSE PURCHASE
   ========================================================================== */

function initializePurchase() {
  window.initiatePurchase = courseId => {
      const token = localStorage.getItem('token');
      if (!token) {
          toggleModal(document.getElementById('auth-modal'));
          return;
      }

      let courseTitle = 'этот курс';
      let coursePrice = 'неизвестной цены';

      // Проверяем, находимся ли на странице курса (course-*.html)
      const courseDetails = document.querySelector('.course-details');
      if (courseDetails) {
          // Название курса из section-title
          const titleElement = courseDetails.querySelector('.section-title');
          // Цена из course-meta-item, где первый span содержит 💰
          const metaItems = courseDetails.querySelectorAll('.course-meta-item');
          let priceElement = null;
          metaItems.forEach(item => {
              const firstSpan = item.querySelector('span:first-child');
              if (firstSpan?.textContent.trim() === '💰') {
                  priceElement = item.querySelector('span:last-child');
              }
          });
          courseTitle = titleElement?.textContent.trim() || courseTitle;
          coursePrice = priceElement?.textContent.trim() || coursePrice;
      } else {
          // Проверяем, находимся ли на главной странице (index.html)
          const courseCard = document.querySelector(`.course-card[data-course-id="${courseId}"]`);
          if (courseCard) {
              // Название курса из course-title
              const titleElement = courseCard.querySelector('.course-title');
              // Цена из course-price
              const priceElement = courseCard.querySelector('.course-price');
              courseTitle = titleElement?.textContent.trim() || courseTitle;
              coursePrice = priceElement?.textContent.trim() || coursePrice;
          }
      }

      console.log('courseId:', courseId, 'courseTitle:', courseTitle, 'coursePrice:', coursePrice);

      const modal = document.getElementById('purchase-confirm-modal');
      modal.querySelector('p').textContent = `Подтвердить покупку курса "${courseTitle}" за ${coursePrice}?`;
      togglePurchaseConfirmModal(true, courseId);
  };

  // Функция purchaseCourse остаётся неизменной, но добавляем showNotification
  async function purchaseCourse(courseId) {
      const token = localStorage.getItem('token');
      if (!token) {
          toggleModal(document.getElementById('auth-modal'));
          return;
      }
      console.log('Отправка заявки на покупку курса:', courseId);
      try {
          const response = await fetch(`${API_URL}/purchases`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ courseId })
          });
          const data = await response.json();
          console.log('Ответ сервера:', data);
          if (response.ok) {
              showNotification('Заявка на покупку отправлена!', 'success');
          } else {
              showNotification(data.message || 'Ошибка при отправке заявки', 'error');
          }
      } catch (error) {
          console.error('Ошибка при отправке заявки:', error);
          showNotification('Не удалось подключиться к серверу', 'error');
      }
  }

  window.closePurchaseConfirmModal = () => togglePurchaseConfirmModal(false);

  function togglePurchaseConfirmModal(show = true, courseId = null) {
    const modal = document.getElementById('purchase-confirm-modal');
    if (show) {
      modal.classList.add('active');
      modal.dataset.courseId = courseId;
    } else {
      modal.classList.remove('active');
      delete modal.dataset.courseId;
    }
  }

  // Привязываем обработчики к кнопкам "Записаться"
  document.querySelectorAll('.enroll-btn').forEach(button => {
    const courseCard = button.closest('.course-card');
    if (courseCard) {
      const courseId = courseCard.dataset.courseId;
      button.addEventListener('click', () => window.initiatePurchase(courseId));
    }
  });
}

/* ==========================================================================
   COURSE REVIEWS
   ========================================================================== */

function initializeReviews() {
  const modal = document.getElementById('review-modal');
  const closeModal = document.querySelector('#review-modal .close-modal');
  const stars = document.querySelectorAll('#review-rating .star');
  const ratingInput = document.getElementById('rating-value');

  // Отладка: проверяем наличие элементов
  console.log('initializeReviews: modal=', modal);
  console.log('initializeReviews: closeModal=', closeModal);
  console.log('initializeReviews: stars count=', stars.length);
  console.log('initializeReviews: ratingInput=', ratingInput);

  if (!modal) {
    console.warn('Модальное окно для отзыва (#review-modal) не найдено');
    return;
  }

  // Обработка кнопки закрытия
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      console.log('Кнопка закрытия нажата');
      toggleReviewModal(false);
    });
  } else {
    console.warn('Кнопка закрытия (.close-modal) не найдена в #review-modal');
  }

  // Обработка выбора звёзд
  if (stars.length === 0) {
    console.warn('Звёзды (#review-rating .star) не найдены');
  }
  stars.forEach(star => {
    star.addEventListener('mouseover', () => {
      const rating = parseInt(star.dataset.value);
      stars.forEach(s => {
        if (parseInt(s.dataset.value) <= rating) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
    });
    star.addEventListener('mouseout', () => {
      const currentRating = parseInt(ratingInput.value) || 0;
      stars.forEach(s => {
        if (parseInt(s.dataset.value) <= currentRating) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
    });
    star.addEventListener('click', () => {
      const rating = parseInt(star.dataset.value);
      console.log(`Звезда выбрана: rating=${rating}`);
      ratingInput.value = rating;
      stars.forEach(s => {
        if (parseInt(s.dataset.value) <= rating) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
    });
  });

  // Добавление обработчика формы
  const reviewForm = document.getElementById('review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async e => {
      e.preventDefault();
      await submitReview();
    });
  } else {
    console.warn('Форма #review-form не найдена');
  }

  async function submitReview() {
    const token = localStorage.getItem('token');
    const courseId = modal.dataset.courseId;
    const text = document.getElementById('review-text').value;
    const rating = parseInt(ratingInput.value);

    console.log('submitReview: courseId=', courseId, 'text=', text, 'rating=', rating);

    if (!text) {
      alert('Пожалуйста, напишите отзыв');
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      alert('Пожалуйста, выберите оценку (1–5 звёзд)');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ courseId, text, rating })
      });
      const data = await response.json();

      if (response.ok) {
        const newReview = data;
        alert('Отзыв отправлен на модерацию!');
        toggleReviewModal(false);
        document.getElementById('review-form').reset();
        stars.forEach(s => s.classList.remove('active'));
        ratingInput.value = '';

        // Периодическая проверка статуса отзыва
        const checkReviewStatus = setInterval(async () => {
          try {
            const response = await fetch(`${API_URL}/reviews?courseId=${courseId}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const reviews = await response.json();
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userReview = reviews.find(r => r.userId === user.id && r.id === newReview.id);
            if (userReview && userReview.status !== 'pending') {
              showNotification(
                `Ваш отзыв ${userReview.status === 'approved' ? 'одобрен' : 'отклонён'}`,
                userReview.status === 'approved' ? 'success' : 'error'
              );
              clearInterval(checkReviewStatus);
              if (window.location.pathname.match(/course-\d+\.html/)) {
                loadReviews(); // Обновляем список отзывов на странице курса
              }
            }
          } catch (error) {
            console.error('Ошибка проверки статуса отзыва:', error);
            clearInterval(checkReviewStatus);
          }
        }, 5000);
      } else {
        alert(data.message || 'Ошибка при отправке отзыва');
      }
    } catch (error) {
      console.error('Ошибка при отправке отзыва:', error);
      alert('Ошибка сервера');
    }
  }
}

async function loadReviews() {
  const reviewsList = document.getElementById('reviews-list');
  if (!reviewsList) {
    console.warn('Элемент #reviews-list не найден на странице:', window.location.pathname);
    return;
  }

  const path = window.location.pathname;
  const match = path.match(/course-(\d+)\.html/);
  const courseId = match ? `course-${match[1]}` : null;
  if (!courseId) {
    console.warn('Не удалось определить courseId из пути:', path);
    reviewsList.innerHTML = '<p>Ошибка: курс не найден.</p>';
    return;
  }

  console.log('Загрузка отзывов для courseId:', courseId);
  try {
    const response = await fetch(`${API_URL}/reviews?courseId=${courseId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status} ${response.statusText}`);
    }
    const reviews = await response.json();
    console.log('Получены отзывы:', reviews);
    
    if (!Array.isArray(reviews) || reviews.length === 0) {
      reviewsList.innerHTML = '<p>Пока нет отзывов.</p>';
      return;
    }

    reviewsList.innerHTML = '';
    for (const review of reviews) {
      if (review.status !== 'approved') continue; // Показываем только одобренные отзывы
      const user = await fetchUser(review.userId);
      const stars = Array(5)
        .fill('')
        .map((_, i) => `<span class="star ${i < review.rating ? 'filled' : ''}">★</span>`)
        .join('');
      reviewsList.innerHTML += `
        <div class="review-card">
          <div class="review-author">
            <div class="review-author-info">
              <h4>${user.name}</h4>
              <p>Ученик</p>
            </div>
          </div>
          <div class="review-rating">${stars}</div>
          <p class="review-text">${review.text}</p>

        </div>
      `;
    }
  } catch (error) {
    console.error('Ошибка загрузки отзывов:', error.message);
    reviewsList.innerHTML = '<p>Ошибка загрузки отзывов.</p>';
  }
}

async function fetchUser(userId) {
  try {
    const token = localStorage.getItem('token') || '';
    const response = await fetch(`${API_URL}/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Не удалось загрузить пользователя ${userId}`);
    }
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Ошибка загрузки пользователя:', error.message);
    return { name: 'Неизвестный пользователь' };
  }
}

/**
 * Toggles the review modal visibility
 * @param {boolean} show - Whether to show or hide the modal
 * @param {string|null} courseId - The ID of the course for which the review is being written
 */
function toggleReviewModal(show = true, courseId = null) {
  const modal = document.getElementById('review-modal');
  if (!modal) {
    console.warn('Модальное окно #review-modal не найдено на странице:', window.location.pathname);
    return;
  }

  if (show) {
    modal.classList.add('active');
    if (courseId) {
      modal.dataset.courseId = courseId; // Сохраняем courseId в data-атрибуте
      console.log('Открытие модального окна для отзыва, courseId:', courseId);
    }
  } else {
    modal.classList.remove('active');
    delete modal.dataset.courseId; // Удаляем courseId при закрытии
  }
}

/* ==========================================================================
   USER COURSES
   ========================================================================== */

/* Предыдущий код остаётся без изменений до функции loadCourses */

async function loadCourses() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('Токен отсутствует, перенаправление на index.html');
    window.location.href = 'index.html';
    return;
  }

  try {
    // Загружаем данные пользователя
    const userResponse = await fetch(`${API_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!userResponse.ok) {
      throw new Error(`Ошибка загрузки профиля: ${userResponse.status} ${userResponse.statusText}`);
    }
    const user = await userResponse.json();
    console.log('Получены данные пользователя:', user);

    // Проверяем наличие courses
    const courses = user.courses || [];
    console.log('Список курсов пользователя:', courses);

    // Загружаем данные о курсах
    const coursesResponse = await fetch(`${API_URL}/courses`);
    if (!coursesResponse.ok) {
      throw new Error(`Ошибка загрузки курсов: ${coursesResponse.status} ${coursesResponse.statusText}`);
    }
    const allCourses = await coursesResponse.json();
    console.log('Получены данные курсов:', allCourses);

    // Проверяем наличие элемента my-courses
    const coursesGrid = document.getElementById('my-courses');
    if (!coursesGrid) {
      console.error('Элемент #my-courses не найден в DOM');
      alert('Ошибка: элемент для отображения курсов не найден на странице.');
      return;
    }

    // Очищаем содержимое перед рендерингом
    coursesGrid.innerHTML = '';
    console.log('Элемент #my-courses очищен');

    // Сохраняем курсы и индекс текущего курса
    let currentCourseIndex = 0;
    const userCourses = courses
      .map(courseId => {
        const course = allCourses.find(c => c.id === courseId);
        if (course) {
          // Добавляем заглушки для прогресса, так как их нет в courses.json
          return {
            ...course,
            image: course.image.replace('../images/', '/images/'), // Исправляем путь
            progress: course.progress || 0, // Замените на реальные данные
            lessonsCompleted: course.lessonsCompleted || 0,
            lessonsTotal: course.lessonsTotal || 50, // Примерное значение
            averageScore: course.averageScore || 0
          };
        }
        return null;
      })
      .filter(course => course);

    // Элементы управления
    const prevButton = document.getElementById('prev-course');
    const nextButton = document.getElementById('next-course');

    // Функция для обновления прогресса
    function updateProgress(course) {
      const progressValue = document.getElementById('progress-value');
      const progressFill = document.getElementById('progress-fill');
      const lessonsCompleted = document.getElementById('lessons-completed');
      const lessonsTotal = document.getElementById('lessons-total');
      const averageScore = document.getElementById('average-score');

      const progress = course?.progress || 0;
      const completed = course?.lessonsCompleted || 0;
      const total = course?.lessonsTotal || 0;
      const score = course?.averageScore || 0;

      progressValue.textContent = `${progress}%`;
      progressFill.style.width = `${progress}%`;
      lessonsCompleted.textContent = completed;
      lessonsTotal.textContent = total;
      averageScore.textContent = `${score}%`;
    }

    // Функция для рендеринга текущего курса
    function renderCourse() {
      coursesGrid.innerHTML = '';
      if (userCourses.length === 0) {
        coursesGrid.innerHTML = '<p>У вас пока нет курсов.</p>';
        updateProgress(null);
        prevButton.disabled = true;
        nextButton.disabled = true;
        return;
      }

      const course = userCourses[currentCourseIndex];
      console.log(`Рендеринг курса: ${course.title} (ID: ${course.id})`);
      coursesGrid.innerHTML = `
        <div class="course-card" data-category="${course.subject}" data-level="${course.level}" data-type="${course.type}">
          <div class="course-image">
            <img src="${course.image}" alt="${course.title}">
          </div>
          <div class="course-content">
            <h3 class="course-title">${course.title}</h3>
            <p class="feature-text">${course.description}</p>
            <div class="course-actions">
              <a href="../courses/${course.id}.html" class="btn btn-outline btn-sm">Продолжить</a>
              <button class="btn btn-primary btn-sm" onclick="toggleReviewModal(true, '${course.id}')">Оставить отзыв</button>
            </div>
          </div>
        </div>
      `;

      // Обновляем прогресс
      updateProgress(course);

      // Обновляем состояние кнопок
      prevButton.disabled = currentCourseIndex === 0;
      nextButton.disabled = currentCourseIndex === userCourses.length - 1;
    }

    // Рендерим начальный курс
    renderCourse();

    // Обработчики для кнопок
    prevButton.addEventListener('click', () => {
      if (currentCourseIndex > 0) {
        currentCourseIndex--;
        renderCourse();
      }
    });

    nextButton.addEventListener('click', () => {
      if (currentCourseIndex < userCourses.length - 1) {
        currentCourseIndex++;
        renderCourse();
      }
    });

  } catch (error) {
    console.error('Ошибка при загрузке курсов:', error.message);
    alert('Не удалось загрузить курсы. Проверьте подключение к серверу и попробуйте снова.');
  }
}
/* Остальной код остаётся без изменений */

/* ==========================================================================
   ADMIN PANEL
   ========================================================================== */

async function loadAdminPanel() {
  const token = localStorage.getItem('token');
  if (!token || !window.location.pathname.includes('admin.html')) return;

  try {
    console.log('Попытка загрузки профиля пользователя с токеном:', token);
    const userResponse = await fetch(`${API_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!userResponse.ok) {
      throw new Error(`Ошибка HTTP! Статус: ${userResponse.status}, Сообщение: ${userResponse.statusText}`);
    }

    const user = await userResponse.json();
    console.log('Получены данные пользователя:', user);

    if (!user.role || user.role !== 'admin') {
      console.warn('Пользователь не админ или роль отсутствует:', user);
      window.location.href = 'index.html';
      return;
    }

    // Загрузка пользователей
    const usersResponse = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!usersResponse.ok) {
      throw new Error(`Не удалось загрузить пользователей. Статус: ${usersResponse.status}`);
    }
    const users = await usersResponse.json();
    document.getElementById('users-list').innerHTML = users
      .map(u => `
        <div class="user-item">
          <p><strong>${u.name}</strong> (${u.email}, ${u.role})</p>
        </div>
      `)
      .join('');

    // Загрузка курсов
    const coursesResponse = await fetch(`${API_URL}/courses`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!coursesResponse.ok) {
      throw new Error(`Не удалось загрузить курсы. Статус: ${coursesResponse.status}`);
    }
    const courses = await coursesResponse.json();

    // Загрузка заявок
    const purchasesResponse = await fetch(`${API_URL}/purchases`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!purchasesResponse.ok) {
      throw new Error(`Не удалось загрузить заявки. Статус: ${purchasesResponse.status}`);
    }
    const purchases = await purchasesResponse.json();
    document.getElementById('purchases-list').innerHTML = purchases
      .map(p => {
        const user = users.find(u => u.id === p.userId) || { name: 'Неизвестный пользователь' };
        const course = courses.find(c => c.id === p.courseId) || { title: 'Неизвестный курс' };
        return `
          <div class="purchase-item">
            <span class="close-item" onclick="deletePurchase(${p.id})">&times;</span>
            <p>Пользователь: ${user.name}</p>
            <p>Курс: ${course.title}</p>
            <p>Статус: ${p.status}</p>
            ${p.status === 'pending' ? `
              <button class="btn btn-primary btn-sm" onclick="updatePurchase(${p.id}, 'approved')">Одобрить</button>
              <button class="btn btn-outline btn-sm" onclick="updatePurchase(${p.id}, 'rejected')">Отклонить</button>
            ` : ''}
          </div>
        `;
      })
      .join('');
    // Загрузка отзывов
    const reviewsResponse = await fetch(`${API_URL}/reviews`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!reviewsResponse.ok) {
      throw new Error(`Не удалось загрузить отзывы. Статус: ${reviewsResponse.status}`);
    }
    const reviews = await reviewsResponse.json();
    document.getElementById('admin-reviews-list').innerHTML = reviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Сортировка: новые сверху
      .map(r => {
        const user = users.find(u => u.id === r.userId) || { name: 'Неизвестный пользователь' };
        const course = courses.find(c => c.id === r.courseId) || { title: 'Неизвестный курс' };
        const stars = Array(5)
          .fill('')
          .map((_, i) => `<span class="star ${i < r.rating ? 'filled' : ''}">★</span>`)
          .join('');
        return `
          <div class="review-item">
            <span class="close-item" onclick="deleteReview(${r.id})">&times;</span>
            <div class="review-details">
              <p class="review-field"><span class="review-label">Пользователь:</span> ${user.name}</p>
              <p class="review-field"><span class="review-label">Курс:</span> ${course.title}</p>
              <p class="review-field"><span class="review-label">Оценка:</span> <span class="review-rating">${stars}</p>
              <p class="review-field"><span class="review-label">Текст:</span> ${r.text}</p>
              <p class="review-field"><span class="review-label">Статус:</span> ${r.status === 'pending' ? 'Ожидает' : r.status === 'approved' ? 'Одобрено' : 'Отклонено'}</p>
            </div>
            <div class="review-actions">
              ${r.status === 'pending' ? `
                <button class="btn btn-primary btn-sm" onclick="updateReview(${r.id}, 'approved')">Одобрить</button>
                <button class="btn btn-outline btn-sm" onclick="updateReview(${r.id}, 'rejected')">Отклонить</button>
              ` : ''}
            </div>
          </div>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Ошибка загрузки панели администратора:', error.message);
    alert('Ошибка загрузки панели администратора. Проверьте консоль для деталей.');
  }
}

// Добавляем функцию для обновления статуса заявки
async function updatePurchase(id, status) {
  const token = localStorage.getItem('token');
  try {
    console.log(`Обновление статуса заявки ID ${id} на ${status}`);
    const response = await fetch(`${API_URL}/purchases/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (response.ok) {
      showNotification(`Заявка ${status === 'approved' ? 'одобрена' : 'отклонена'}!`, 'success');
      loadAdminPanel(); // Перезагружаем панель для обновления списка
    } else {
      showNotification(data.message || 'Ошибка при обновлении заявки', 'error');
    }
  } catch (error) {
    console.error('Ошибка при обновлении заявки:', error);
    showNotification('Не удалось подключиться к серверу', 'error');
  }
}

async function deletePurchase(id) {
  const token = localStorage.getItem('token');
  try {
    console.log(`Удаление заявки ID ${id}`);
    const response = await fetch(`${API_URL}/purchases/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    // Проверяем тип ответа
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Сервер вернул не JSON-ответ');
    }
    const data = await response.json();
    if (response.ok) {
      showNotification('Заявка удалена!', 'success');
      loadAdminPanel(); // Перезагружаем панель
    } else {
      showNotification(data.message || `Ошибка при удалении заявки (код ${response.status})`, 'error');
    }
  } catch (error) {
    console.error('Ошибка при удалении заявки:', error.message);
    showNotification(`Не удалось удалить заявку: ${error.message}`, 'error');
  }
}

async function updateReview(id, status) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_URL}/reviews/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();

    if (response.ok) {
      showNotification(`Отзыв ${status === 'approved' ? 'одобрен' : 'отклонён'}!`, 'success');
      loadAdminPanel(); // Перезагружаем панель
      if (status === 'approved') {
        // Уведомляем страницу курса
        loadReviews(); // Обновляем отзывы на странице курса
      }
    }
  } catch (error) {
    console.error('Ошибка при обновлении отзыва:', error.message);
    showNotification('Не удалось подключиться к серверу', 'error');
  }
}

async function deleteReview(id) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_URL}/reviews/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (response.ok) {
      showNotification(data.message, 'success');
      loadAdminPanel(); // Перезагружаем панель
    } else {
      showNotification(data.message || 'Ошибка при удалении отзыва', 'error');
    }
  } catch (error) {
    console.error('Ошибка при удалении отзыва:', error.message);
    showNotification('Не удалось подключиться к серверу', 'error');
  }
}



/* ==========================================================================
   TESTIMONIALS CAROUSEL
   ========================================================================== */

function initializeTestimonialsCarousel() {
  const slider = document.getElementById('testimonials-slider');
  if (!slider) {
    console.error('Элемент карусели отзывов не найден. Проверьте ID #testimonials-slider в HTML.');
    return;
  }

  const cards = slider.querySelectorAll('.testimonial-card');
  if (cards.length === 0) {
    console.error('Карточки отзывов не найдены. Проверьте наличие элементов с классом .testimonial-card.');
    return;
  }

  const originalCardCount = cards.length / 2; // Половина карточек — дубликаты
  let cardWidth = window.innerWidth <= 576 ? 330 : 380; // Ширина карточки + отступ
  let isAutoScrolling = false; // Изначально false, включаем после инициализации
  let scrollPosition = 0;
  const scrollSpeed = 50; // Пикселей в секунду
  let animationFrameId = null;
  let lastTimestamp = null;

  // Обновление ширины карточки при изменении размера окна
  function updateCardWidth() {
    cardWidth = window.innerWidth <= 576 ? 330 : 380;
    console.log('Обновлена ширина карточки:', cardWidth);
  }

  window.addEventListener('resize', updateCardWidth);

  // Функция для автоматической прокрутки
  function autoScroll(timestamp) {
    if (!isAutoScrolling) {
      console.log('autoScroll остановлен');
      return;
    }

    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = (timestamp - lastTimestamp) / 1000; // Время в секундах
    lastTimestamp = timestamp;

    scrollPosition += scrollSpeed * deltaTime;
    const maxScroll = cardWidth * originalCardCount; // Ширина оригинального набора

    if (scrollPosition >= maxScroll) {
      scrollPosition = 0; // Сбрасываем для бесконечной прокрутки
      slider.scrollTo({ left: 0, behavior: 'instant' });
    } else {
      slider.scrollLeft = scrollPosition;
    }
    animationFrameId = requestAnimationFrame(autoScroll);
  }

  // Функция для центрирования карточки
  function centerCard(cardIndex) {
    const isDuplicate = cardIndex >= originalCardCount;
    const originalIndex = isDuplicate ? cardIndex - originalCardCount : cardIndex;
    const scrollPosition = originalIndex * cardWidth - (slider.clientWidth - cardWidth) / 2;

    cards.forEach(card => card.classList.remove('active'));
    cards[originalIndex].classList.add('active');
    if (isDuplicate) {
      cards[originalIndex + originalCardCount].classList.add('active');
    }

    slider.scrollTo({
      left: scrollPosition,
      behavior: 'smooth',
    });

    console.log('Центрирование карточки:', { cardIndex, originalIndex, scrollPosition });
  }

  // Остановка автопрокрутки
  function stopAutoScroll() {
    if (!isAutoScrolling) return;
    isAutoScrolling = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    slider.classList.remove('auto-scrolling');
    console.log('Автопрокрутка остановлена');
  }

  // Запуск автопрокрутки
  function startAutoScroll() {
    if (isAutoScrolling) {
      console.log('startAutoScroll пропущен: уже выполняется');
      return;
    }
    isAutoScrolling = true;
    slider.classList.add('auto-scrolling');
    cards.forEach(card => card.classList.remove('active'));
    lastTimestamp = null;
    scrollPosition = slider.scrollLeft; // Сохраняем текущую позицию
    animationFrameId = requestAnimationFrame(autoScroll);
    console.log('Автопрокрутка запущена');
  }

  // Обработчики событий для карточек
  cards.forEach((card, index) => {
    card.addEventListener('mouseenter', () => {
      console.log('Наведение на карточку:', index);
      stopAutoScroll();
      centerCard(index);
    });
  });

  // Возобновление прокрутки при уходе курсора
  slider.addEventListener('mouseleave', (event) => {
    if (!slider.contains(event.relatedTarget)) {
      console.log('Курсор покинул слайдер');
      startAutoScroll();
    }
  });

  // Предотвращение остановки при случайном наведении
  slider.addEventListener('mouseover', () => {
    console.log('Курсор над слайдером');
  });

  // Инициализация автопрокрутки
  try {
    slider.classList.add('auto-scrolling');
    isAutoScrolling = true;
    animationFrameId = requestAnimationFrame(autoScroll);
    console.log('Карусель отзывов инициализирована', { cardCount: cards.length });
  } catch (error) {
    console.error('Ошибка инициализации карусели отзывов:', error);
  }

  // Обновление при изменении размера окна
  window.addEventListener('resize', () => {
    updateCardWidth();
    if (!isAutoScrolling) {
      const activeCard = slider.querySelector('.testimonial-card.active');
      if (activeCard) {
        const index = Array.from(cards).indexOf(activeCard);
        centerCard(index);
      }
    }
  });
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  initializeSmoothScroll();
  initializeAuth();
  initializeMobileMenu();
  initializeHoneyDrops();
  initializeBees();
  initializeCourseFilters();
  initializePurchase();
  initializeReviews();
  initializeTestimonialsCarousel();
  await updateHeader();

  document.querySelectorAll('.consultation-btn').forEach(button => {
    button.addEventListener('click', () => {
      smoothScrollTo('#contacts');
      const contactItems = document.querySelectorAll('#footer-col .footer-anim');
      contactItems.forEach((item, index) => {
        setTimeout(() => {
          item.classList.add('highlight');
          setTimeout(() => {
            item.classList.remove('highlight');
          }, 1500);
        }, index * 300);
      });
    });
  });

  if (window.location.pathname.includes('account.html')) {
    loadProfile();
    initializeProfile();
    loadCourses();
  }

  if (window.location.pathname.includes('admin.html')) {
    loadAdminPanel();
  }

  if (window.location.pathname.match(/course-\d+\.html/)) {
    loadReviews();
  }

  window.addEventListener('storage', async (event) => {
    if (event.key === 'token' || event.key === 'user') {
      await updateHeader();
    }
  });
});