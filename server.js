const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;

// НАСТРОЙКА CORS — РАЗРЕШАЕМ ЗАПРОСЫ С ЛЮБОГО ДОМЕНА (для теста)
app.use(cors({
  origin: '*',  // Временно разрешаем всем, потом можно ограничить
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Обрабатываем preflight запросы
app.options('*', cors());

app.use(express.json());

// База данных
const db = new sqlite3.Database('./backstage.db');

// === ИНИЦИАЛИЗАЦИЯ ТАБЛИЦ ===
db.run(`
  CREATE TABLE IF NOT EXISTS invites (
    code TEXT PRIMARY KEY,
    created_by TEXT,
    used_by TEXT,
    used_at INTEGER,
    created_at INTEGER
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    instruments TEXT,
    city TEXT,
    about TEXT,
    created_at INTEGER
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    title TEXT,
    description TEXT,
    tags TEXT,
    created_at INTEGER,
    status TEXT
  )
`);

// Добавляем мастер-инвайт если нет
db.get("SELECT * FROM invites WHERE code = 'BACKSTAGE2026'", (err, row) => {
  if (!row) {
    db.run("INSERT INTO invites (code, created_by, created_at) VALUES ('BACKSTAGE2026', 'system', ?)", [Date.now()]);
    console.log('✅ Создан мастер-инвайт BACKSTAGE2026');
  }
});

// ========== API ИНВАЙТОВ ==========
app.get('/api/invites', (req, res) => {
  db.all("SELECT * FROM invites", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/invites', (req, res) => {
  const { code, created_by } = req.body;
  db.run("INSERT INTO invites (code, created_by, created_at) VALUES (?, ?, ?)", 
    [code, created_by, Date.now()], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, code });
    }
  );
});

app.put('/api/invites/:code/use', (req, res) => {
  const { code } = req.params;
  const { used_by } = req.body;
  db.run("UPDATE invites SET used_by = ?, used_at = ? WHERE code = ?", 
    [used_by, Date.now(), code], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// ========== API ПОЛЬЗОВАТЕЛЕЙ ==========
app.get('/api/users', (req, res) => {
  db.all("SELECT id, name, instruments, city, about, created_at FROM users", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT id, name, instruments, city, about, created_at FROM users WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(row);
  });
});

app.post('/api/users', (req, res) => {
  const { id, name, instruments, city, about, created_at } = req.body;
  db.run("INSERT INTO users (id, name, instruments, city, about, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, name, instruments, city, about, created_at],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, instruments, city, about } = req.body;
  db.run("UPDATE users SET name = ?, instruments = ?, city = ?, about = ? WHERE id = ?",
    [name, instruments, city, about, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Пользователь не найден' });
      res.json({ success: true });
    }
  );
});

// ========== API ПОСТОВ ==========
app.get('/api/posts', (req, res) => {
  db.all("SELECT * FROM posts WHERE status = 'active' ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/posts', (req, res) => {
  const { id, user_id, type, title, description, tags, created_at, status } = req.body;
  db.run("INSERT INTO posts (id, user_id, type, title, description, tags, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, user_id, type, title, description, tags, created_at, status],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.put('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, tags } = req.body;
  db.run("UPDATE posts SET title = ?, description = ?, tags = ? WHERE id = ?",
    [title, description, JSON.stringify(tags), id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Пост не найден' });
      res.json({ success: true });
    }
  );
});

app.delete('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  db.run("UPDATE posts SET status = 'deleted' WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(port, () => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
});
