const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const usersFile = path.join(__dirname, '../data/users.json');
const SECRET_KEY = 'your-secret-key'; // В реальных проектах храните в .env

// Чтение пользователей из JSON
const readUsers = () => {
  const data = fs.readFileSync(usersFile);
  return JSON.parse(data);
};

// Запись пользователей в JSON
const writeUsers = (users) => {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

// Регистрация
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  const users = readUsers();

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
  writeUsers(users);

  // Генерация JWT
  const token = jwt.sign({ id: newUser.id, email, role: newUser.role }, SECRET_KEY, { expiresIn: '1h' });

  res.status(201).json({ token, user: { id: newUser.id, name, email, role: newUser.role } });
});

// Вход
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Неверный email или пароль' });
  }

  // Генерация JWT
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '1h' });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// Получение профиля (защищенный маршрут)
router.get('/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Токен отсутствует' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const users = readUsers();
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json(user); // Возвращаем полный объект пользователя, включая courses
  } catch (error) {
    res.status(401).json({ message: 'Неверный токен' });
  }
});

// Обновление профиля
router.put('/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Токен отсутствует' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const users = readUsers();
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
    writeUsers(users);

    res.json({ id: users[userIndex].id, name: users[userIndex].name, email: users[userIndex].email, role: users[userIndex].role });
  } catch (error) {
    res.status(401).json({ message: 'Неверный токен' });
  }
});

module.exports = router;