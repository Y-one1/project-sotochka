require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = 3000;
const SECRET_KEY = process.env.SECRET_KEY;

// Middleware
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

// Путь к JSON-файлам
const usersFile = path.join(__dirname, 'data', 'users.json');
const purchasesFile = path.join(__dirname, 'data', 'purchases.json');
const reviewsFile = path.join(__dirname, 'data', 'reviews.json');

// Middleware для проверки токена
const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization'] ? req.headers['authorization'].split(' ')[1]: undefined;
  if (!token) return res.status(401).json({ message: 'Токен отсутствует' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // Декодированные данные: { id, email, role }
    next();
  } catch (error) {
    res.status(403).json({ message: 'Недействительный токен' });
  }
};

// Middleware для проверки роли админа
const isAdmin = async (req, res, next) => {
  const users = JSON.parse(await fs.readFile(usersFile));
  const user = users.find(u => u.id === req.user.id);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ запрещён: требуется роль администратора' });
  }
  req.userData = user;
  next();
};

// Routes
app.use('/api/auth', authRoutes);

// Получение текущего пользователя
app.get('/api/user', authenticateToken, async (req, res) => {
  const users = JSON.parse(await fs.readFile(usersFile));
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  res.json(user);
});

// Получение профиля текущего пользователя
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  const users = JSON.parse(await fs.readFile(usersFile));
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  res.json(user);
});

// Получение списка курсов
app.get('/api/courses', async (req, res) => {
  const courses = JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'courses.json')));
  res.json(courses);
});

// Создание заявки на покупку курса
app.post('/api/purchases', authenticateToken, async (req, res) => {
  const { courseId } = req.body;
  console.log('Получена заявка на покупку:', { userId: req.user.id, courseId }); // Добавьте лог
  const purchases = JSON.parse(await fs.readFile(purchasesFile));
  const newPurchase = {
    id: purchases.length + 1,
    userId: req.user.id,
    courseId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  purchases.push(newPurchase);
  try {
    await fs.writeFile(purchasesFile, JSON.stringify(purchases, null, 2));
    console.log('Заявка сохранена:', newPurchase); // Добавьте лог
    res.json(newPurchase);
  } catch (error) {
    console.error('Ошибка записи в purchases.json:', error); // Добавьте лог
    res.status(500).json({ message: 'Ошибка сохранения заявки' });
  }
});

// Подтверждение/отклонение заявки админом
app.patch('/api/purchases/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' или 'rejected'
  const purchases = JSON.parse(await fs.readFile(purchasesFile));
  const purchase = purchases.find(p => p.id === parseInt(id));
  if (!purchase) return res.status(404).json({ message: 'Заявка не найдена' });

  purchase.status = status;
  console.log(`Обновление заявки ID ${id}: статус изменён на ${status}`);

  if (status === 'approved') {
    const users = JSON.parse(await fs.readFile(usersFile));
    const user = users.find(u => u.id === purchase.userId);
    if (!user) {
      console.error(`Пользователь с ID ${purchase.userId} не найден`);
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    if (!user.courses) user.courses = [];
    if (!user.courses.includes(purchase.courseId)) {
      user.courses.push(purchase.courseId);
      console.log(`Курс ${purchase.courseId} добавлен пользователю ${user.name} (ID: ${user.id})`);
    } else {
      console.log(`Курс ${purchase.courseId} уже есть у пользователя ${user.name}`);
    }
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
    console.log('users.json обновлён:', JSON.stringify(users, null, 2));
  }
  await fs.writeFile(purchasesFile, JSON.stringify(purchases, null, 2));
  res.json(purchase);
  // Логируем обновление статуса
  console.log(`Отзыв ID ${id} обновлён: статус=${status}, userId=${review.userId}`);
});

// Отправка отзыва
app.post('/api/reviews', authenticateToken, async (req, res) => {
  const { courseId, text, rating } = req.body;
  const users = JSON.parse(await fs.readFile(usersFile));
  const user = users.find(u => u.id === req.user.id);

  // Проверка, есть ли курс у пользователя
  if (!user.courses || !user.courses.includes(courseId)) {
    return res.status(403).json({ message: 'Вы не приобрели этот курс' });
  }

  // Проверка рейтинга
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Рейтинг должен быть от 1 до 5' });
  }

  const reviews = JSON.parse(await fs.readFile(reviewsFile));
  const newReview = {
    id: reviews.length + 1,
    userId: req.user.id,
    courseId,
    text,
    rating: parseInt(rating),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  reviews.push(newReview);
  await fs.writeFile(reviewsFile, JSON.stringify(reviews, null, 2));
  res.json(newReview);
});

// Модерация отзыва админом
app.patch('/api/reviews/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' или 'rejected'
  const reviews = JSON.parse(await fs.readFile(reviewsFile));
  const review = reviews

.find(r => r.id === parseInt(id));
  if (!review) return res.status(404).json({ message: 'Отзыв не найден' });
  review.status = status;
  await fs.writeFile(reviewsFile, JSON.stringify(reviews, null, 2));
  res.json(review);
});

// Получение всех пользователей (для админа)
app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
  const users = JSON.parse(await fs.readFile(usersFile));
  res.json(users);
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const users = JSON.parse(await fs.readFile(usersFile));
    const user = users.find(u => u.id === parseInt(id));
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error('Ошибка при загрузке пользователя:', error.message);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение всех заявок (для админа)
app.get('/api/purchases', authenticateToken, isAdmin, async (req, res) => {
  const purchases = JSON.parse(await fs.readFile(purchasesFile));
  res.json(purchases);
});

// Удаление отзыва
app.delete('/api/reviews/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const reviews = JSON.parse(await fs.readFile(reviewsFile));
  const reviewIndex = reviews.findIndex(r => r.id === parseInt(id));
  if (reviewIndex === -1) return res.status(404).json({ message: 'Отзыв не найден' });

  reviews.splice(reviewIndex, 1);
  await fs.writeFile(reviewsFile, JSON.stringify(reviews, null, 2));
  res.json({ message: 'Отзыв удалён' });
});

// Удаление заявки
app.delete('/api/purchases/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const purchases = JSON.parse(await fs.readFile(purchasesFile));
  const purchaseIndex = purchases.findIndex(p => p.id === parseInt(id));
  if (purchaseIndex === -1) return res.status(404).json({ message: 'Заявка не найдена' });

  purchases.splice(purchaseIndex, 1);
  await fs.writeFile(purchasesFile, JSON.stringify(purchases, null, 2));
  res.json({ message: 'Заявка удалена' });
});

// Получение всех отзывов (для админа и страницы курса)
app.get('/api/reviews', async (req, res) => {
  const reviews = JSON.parse(await fs.readFile(reviewsFile));
  const { courseId } = req.query;
  if (courseId) {
    const filteredReviews = reviews.filter(r => r.courseId === courseId && r.status === 'approved');
    res.json(filteredReviews);
  } else {
    res.json(reviews); // Для админа
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});