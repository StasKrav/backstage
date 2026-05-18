const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// CORS — разрешаем запросы с твоего Vercel-домена
app.use(cors({
  origin: 'https://backstage-beta.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.options('*', cors());
app.use(express.json());

// Подключение к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // обязательно для Render
});

// === ИНИЦИАЛИЗАЦИЯ ТАБЛИЦ ===
async function initTables() {
  try {
    // Таблица инвайтов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invites (
        code TEXT PRIMARY KEY,
        created_by TEXT,
        used_by TEXT,
        used_at BIGINT,
        created_at BIGINT
      )
    `);
    
    // Таблица пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        instruments TEXT,
        city TEXT,
        about TEXT,
        created_at BIGINT
      )
    `);
    
    // Таблица постов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        type TEXT,
        title TEXT,
        description TEXT,
        tags TEXT,
        created_at BIGINT,
        status TEXT
      )
    `);
    
    // Мастер-инвайт
    const result = await pool.query("SELECT * FROM invites WHERE code = 'BACKSTAGE2026'");
    if (result.rows.length === 0) {
      await pool.query(
        "INSERT INTO invites (code, created_by, created_at) VALUES ('BACKSTAGE2026', 'system', $1)",
        [Date.now()]
      );
      console.log('✅ Создан мастер-инвайт BACKSTAGE2026');
    }
    
    console.log('✅ Таблицы созданы/проверены');
  } catch (err) {
    console.error('Ошибка инициализации БД:', err);
  }
}

initTables();

// ========== API ИНВАЙТОВ ==========
app.get('/api/invites', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM invites");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invites', async (req, res) => {
  const { code, created_by } = req.body;
  try {
    await pool.query(
      "INSERT INTO invites (code, created_by, created_at) VALUES ($1, $2, $3)",
      [code, created_by, Date.now()]
    );
    res.json({ success: true, code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/invites/:code/use', async (req, res) => {
  const { code } = req.params;
  const { used_by } = req.body;
  try {
    await pool.query(
      "UPDATE invites SET used_by = $1, used_at = $2 WHERE code = $3",
      [used_by, Date.now(), code]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== API ПОЛЬЗОВАТЕЛЕЙ ==========
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, instruments, city, about, created_at FROM users");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, name, instruments, city, about, created_at FROM users WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { id, name, instruments, city, about, created_at } = req.body;
  try {
    await pool.query(
      "INSERT INTO users (id, name, instruments, city, about, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [id, name, instruments, city, about, created_at]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, instruments, city, about } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET name = $1, instruments = $2, city = $3, about = $4 WHERE id = $5",
      [name, instruments, city, about, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== API ПОСТОВ ==========
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM posts WHERE status = 'active' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', async (req, res) => {
  const { id, user_id, type, title, description, tags, created_at, status } = req.body;
  try {
    await pool.query(
      "INSERT INTO posts (id, user_id, type, title, description, tags, created_at, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [id, user_id, type, title, description, tags, created_at, status]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, tags } = req.body;
  try {
    const result = await pool.query(
      "UPDATE posts SET title = $1, description = $2, tags = $3 WHERE id = $4",
      [title, description, JSON.stringify(tags), id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Пост не найден' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE posts SET status = 'deleted' WHERE id = $1",
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
});
