require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDB, getDB } = require('./database');
const { startBackupJob } = require('./backup');

const app = express();
const PORT = process.env.PORT || 5001;
const SECRET_KEY = process.env.SECRET_KEY || 'chills_super_secret_key';

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
app.use(helmet());
app.use(express.json());

// Rate Limiter to prevent brute force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// Middleware to authenticate
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check roles
const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

function registerRoutes() {
  // Login Route
  app.post('/api/login', (req, res) => {
    try {
      const { username, password } = req.body;
      const db = getDB();
      const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
      if (user) {
        if (user.role === 'employee') {
          return res.status(403).json({ error: 'Workers do not have dashboard access' });
        }
        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET_KEY);
        res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
      } else {
        res.status(401).json({ error: 'Invalid username or password' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Get all users (CEO and Attendance Taker)
  app.get('/api/users', authenticate, requireRole(['ceo', 'attendance_taker']), (req, res) => {
    try {
      const db = getDB();
      const users = db.prepare('SELECT id, name, username, password, role, hourly_rate, salary FROM users ORDER BY name ASC').all();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Create user (CEO only)
  app.post('/api/users', authenticate, requireRole(['ceo']), (req, res) => {
    try {
      let { name, username, password, role, hourly_rate, salary } = req.body;
      if (role === 'employee' || !role) {
        if (!username) username = `worker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        if (!password) password = '0000';
      }
      const db = getDB();
      const result = db.prepare(
        'INSERT INTO users (name, username, password, role, hourly_rate, salary) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(name, username, password, role || 'employee', hourly_rate || 0, salary || 0);
      res.json({ id: result.lastInsertRowid });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: 'Username already exists or invalid data' });
    }
  });

  // Update user (CEO only)
  app.put('/api/users/:id', authenticate, requireRole(['ceo']), (req, res) => {
    try {
      let { name, username, password, role, hourly_rate, salary } = req.body;
      if (role === 'employee' || !role) {
        if (!username) username = `worker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        if (!password) password = '0000';
      }
      const db = getDB();
      db.prepare(
        'UPDATE users SET name = ?, username = ?, password = ?, role = ?, hourly_rate = ?, salary = ? WHERE id = ?'
      ).run(name, username, password, role, hourly_rate, salary, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Delete user (CEO only)
  app.delete('/api/users/:id', authenticate, requireRole(['ceo']), (req, res) => {
    try {
      const db = getDB();
      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Mark Attendance (CEO or Attendance Taker)
  app.post('/api/attendance', authenticate, requireRole(['ceo', 'attendance_taker']), (req, res) => {
    try {
      const { user_id, date, status } = req.body;
      const db = getDB();
      db.prepare(`
        INSERT INTO attendance (user_id, date, status, logged_by)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET status=excluded.status, logged_by=excluded.logged_by
      `).run(user_id, date, status, req.user.id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Get Attendance Logs
  app.get('/api/attendance', authenticate, (req, res) => {
    try {
      const { start_date, end_date, user_id } = req.query;
      const db = getDB();

      let query = `
        SELECT a.id, a.date, a.status, u.name as employee_name, u.id as user_id
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE a.date >= ? AND a.date <= ?
      `;
      const params = [start_date, end_date];

      if (req.user.role === 'employee') {
        query += ' AND a.user_id = ?';
        params.push(req.user.id);
      } else if (user_id) {
        query += ' AND a.user_id = ?';
        params.push(user_id);
      }

      query += ' ORDER BY a.date DESC';

      const logs = db.prepare(query).all(...params);
      res.json(logs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Get Stats for a specific user
  app.get('/api/attendance/stats/:userId', authenticate, requireRole(['ceo', 'attendance_taker']), (req, res) => {
    try {
      const db = getDB();
      const stats = db.prepare('SELECT status, COUNT(*) as count FROM attendance WHERE user_id = ? GROUP BY status').all(req.params.userId);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });
}

const startServer = () => {
  try {
    initDB();
    startBackupJob();
    registerRoutes();

    return new Promise((resolve) => {
      const server = app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
        resolve({ app, server, port: PORT });
      });
    });
  } catch (err) {
    console.error('Failed to initialize database', err);
    throw err;
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
