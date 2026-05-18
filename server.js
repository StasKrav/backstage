const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// База данных
const db = new sqlite3.Database('./backstage.db');

// Создаём таблицы
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
  }
});

// === API ===

// Получить все инвайты
app.get('/api/invites', (req, res) => {
  db.all("SELECT * FROM invites", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Создать инвайт
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

// Использовать инвайт
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

// Зарегистрировать пользователя
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

// Получить пользователя
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// Получить посты
app.get('/api/posts', (req, res) => {
  db.all("SELECT * FROM posts WHERE status = 'active' ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Создать пост
app.post('/api/posts', (req, res) => {
  const { id, user_id, type, title, description, tags, created_at, status } = req.body;
  db.run("INSERT INTO posts (id, user_id, type, title, description, tags, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, user_id, type, title, description, JSON.stringify(tags), created_at, status],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.listen(port, () => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
});
