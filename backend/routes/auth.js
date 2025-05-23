const express = require('express');
const jwt = require('jsonwebtoken');

const path = require('path');

const router = express.Router();
const usersFile = path.join(__dirname, '../data/users.json');
const SECRET_KEY = process.env.SECRET_KEY;

const fs = require('fs').promises; // Используем promises вместо sync

// Чтение пользователей из JSON
const readUsers = async () => {
  const data = await fs.readFile(usersFile, 'utf8');
  return JSON.parse(data);
};

// Запись пользователей в JSON
const writeUsers = async (users) => {
  await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
};

// Регистрация
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const users = await readUsers();

    // Проверка, существует ли пользователь
    if (users.find(user => user.email === email)) {
      return res.status(400).json({ message: 'Пользователь уже существует' });
    }

    // Создание нового пользователя
    const newUser = {
      id: users.length + 1,
      name,
      email,
      password, // В реальном проекте хешируйте пароль
      role: 'user' // По умолчанию обычный пользователь
    };

    users.push(newUser);
    await writeUsers(users);

    // Генерация JWT
    const token = jwt.sign({ id: newUser.id, email, role: newUser.role }, SECRET_KEY, { expiresIn: '1h' });

    res.status(201).json({ token, user: { id: newUser.id, name, email, role: newUser.role } });
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Вход
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const users = await readUsers();

    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    // Генерация JWT
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '1h' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение профиля (защищенный маршрут)
router.get('/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Токен отсутствует' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const users = await readUsers(); // Асинхронный вызов
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json(user); // Возвращаем полный объект пользователя, включая courses
  } catch (error) {
    console.error('Ошибка в маршруте /profile:', error);
    res.status(401).json({ message: 'Неверный токен' });
  }
});

// Обновление профиля
router.put('/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Токен отсутствует' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const users = await readUsers(); // Асинхронный вызов
    const userIndex = users.findIndex(u => u.id === decoded.id);

    if (userIndex === -1) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const { name, email } = req.body;
    if (email && users.some(u => u.email === email && u.id !== decoded.id)) {
      return res.status(400).json({ message: 'Email уже используется' });
    }

    users[userIndex].name = name || users[userIndex].name;
    users[userIndex].email = email || users[userIndex].email;
    await writeUsers(users); // Асинхронный вызов

    res.json({ id: users[userIndex].id, name: users[userIndex].name, email: users[userIndex].email, role: users[userIndex].role });
  } catch (error) {
    console.error('Ошибка в маршруте PUT /profile:', error);
    res.status(401).json({ message: 'Неверный токен' });
  }
});

module.exports = router;