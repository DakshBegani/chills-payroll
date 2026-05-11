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
  origin: true, // Allow all origins (covers capacitor://, localhost, 192.168.x.x)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors()); // Handle preflight requests
app.use(helmet()); // Secure HTTP headers
app.use(express.json());

// Rate Limiter to prevent brute force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
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

const startServer = () => {
  return initDB().then(() => {
    startBackupJob();
    
    // Login Route
    app.post('/api/login', async (req, res) => {
      const { username, password } = req.body;
      const db = getDB();
      const user = await db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
      
      if (user) {
        if (user.role === 'employee') {
          return res.status(403).json({ error: 'Workers do not have dashboard access' });
        }
        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET_KEY);
        res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
      } else {
        res.status(401).json({ error: 'Invalid username or password' });
      }
    });

    // Get all users (CEO and Attendance Taker)
    app.get('/api/users', authenticate, requireRole(['ceo', 'attendance_taker']), async (req, res) => {
      const db = getDB();
      const users = await db.all('SELECT id, name, username, password, role, hourly_rate, salary FROM users ORDER BY name ASC');
      res.json(users);
    });

    // Create user (CEO only)
    app.post('/api/users', authenticate, requireRole(['ceo']), async (req, res) => {
      let { name, username, password, role, hourly_rate, salary } = req.body;
      if (role === 'employee' || !role) {
        if (!username) username = `worker-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        if (!password) password = '0000';
      }
      const db = getDB();
      try {
        const result = await db.run(
          'INSERT INTO users (name, username, password, role, hourly_rate, salary) VALUES (?, ?, ?, ?, ?, ?)',
          [name, username, password, role || 'employee', hourly_rate || 0, salary || 0]
        );
        res.json({ id: result.lastID });
      } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Username already exists or invalid data' });
      }
    });

    // Update user (CEO only)
    app.put('/api/users/:id', authenticate, requireRole(['ceo']), async (req, res) => {
      let { name, username, password, role, hourly_rate, salary } = req.body;
      if (role === 'employee' || !role) {
        if (!username) username = `worker-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        if (!password) password = '0000';
      }
      const db = getDB();
      await db.run(
        'UPDATE users SET name = ?, username = ?, password = ?, role = ?, hourly_rate = ?, salary = ? WHERE id = ?',
        [name, username, password, role, hourly_rate, salary, req.params.id]
      );
      res.json({ success: true });
    });

    // Delete user (CEO only)
    app.delete('/api/users/:id', authenticate, requireRole(['ceo']), async (req, res) => {
      const db = getDB();
      await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    });

    // Mark Attendance (CEO or Attendance Taker)
    app.post('/api/attendance', authenticate, requireRole(['ceo', 'attendance_taker']), async (req, res) => {
      const { user_id, date, status } = req.body;
      const db = getDB();
      try {
        await db.run(
          `INSERT INTO attendance (user_id, date, status, logged_by) 
           VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id, date) DO UPDATE SET status=excluded.status, logged_by=excluded.logged_by`,
          [user_id, date, status, req.user.id]
        );
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: 'Database error' });
      }
    });

    // Get Weekly Logs
    app.get('/api/attendance', authenticate, async (req, res) => {
      const { start_date, end_date, user_id } = req.query;
      const db = getDB();
      
      let query = `
        SELECT a.id, a.date, a.status, u.name as employee_name, u.id as user_id
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE a.date >= ? AND a.date <= ?
      `;
      let params = [start_date, end_date];

      // Employees can only see their own logs
      if (req.user.role === 'employee') {
        query += ' AND a.user_id = ?';
        params.push(req.user.id);
      } else if (user_id) {
        // CEO/Attendance taker filtering by specific user
        query += ' AND a.user_id = ?';
        params.push(user_id);
      }

      query += ' ORDER BY a.date DESC';

      const logs = await db.all(query, params);
      res.json(logs);
    });

    // Get Stats for a specific user
    app.get('/api/attendance/stats/:userId', authenticate, requireRole(['ceo', 'attendance_taker']), async (req, res) => {
      const db = getDB();
      const stats = await db.all('SELECT status, COUNT(*) as count FROM attendance WHERE user_id = ? GROUP BY status', [req.params.userId]);
      res.json(stats);
    });

    return new Promise((resolve) => {
      const server = app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
        resolve({ app, server, port: PORT });
      });
    });

  }).catch(err => {
    console.error('Failed to initialize database', err);
    throw err;
  });
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
