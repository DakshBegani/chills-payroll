const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const DATA_DIR = path.join(os.homedir(), '.chills-payroll');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'database.sqlite');

let db;

function initDB() {
  db = new Database(DB_PATH);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create tables only if they don't exist — NEVER drop them
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      hourly_rate REAL DEFAULT 0,
      salary REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      logged_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(logged_by) REFERENCES users(id)
    );
  `);

  // Ensure essential system accounts always exist
  const insertSystemUser = db.prepare('INSERT OR IGNORE INTO users (name, username, password, role) VALUES (?, ?, ?, ?)');
  insertSystemUser.run('Pritesh Begani (CEO)', 'priteshbegani', '1984', 'ceo');
  insertSystemUser.run('Attendance Kiosk', 'chillsicecream', '1978', 'attendance_taker');

  // Seed employee data only if the database is completely fresh
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  // We check if count <= 2 because the 2 system users above were just inserted
  if (userCount.count <= 2) {

    // Seed Employees
    const employees = [
      { name: 'Laxmi', wage: 220, phone: '9302286439' },
      { name: 'Payal', wage: 200, phone: '7000396724' },
      { name: 'Damini Sen', wage: 220, phone: '7647830773' },
      { name: 'Niket Deshmukh', wage: 769, phone: null },
      { name: 'Reshma', wage: 200, phone: '7247639463' },
      { name: 'Sushil Janghel', wage: 623, phone: '6268654128' },
      { name: 'Dwarika Sahu', wage: 404, phone: '6268997404' },
      { name: 'Tinku', wage: 392, phone: '9179573093' },
      { name: 'Jaya', wage: 330, phone: '6268081405' },
      { name: 'Padma', wage: 330, phone: '9179573093' },
      { name: 'Poornima', wage: 200, phone: null },
      { name: 'Damini', wage: 200, phone: null },
      { name: 'Seema', wage: 200, phone: null },
      { name: 'Rajeshwari', wage: 200, phone: null },
      { name: 'Sakshi', wage: 200, phone: null },
      { name: 'Garima', wage: 200, phone: null },
      { name: 'Deepika', wage: 200, phone: null },
      { name: 'Komal', wage: 275, phone: null },
      { name: 'Pankaj', wage: 350, phone: null },
      { name: 'Savitri', wage: 200, phone: null },
      { name: 'Sibbi', wage: 200, phone: null },
      { name: 'Preeti', wage: 200, phone: null },
      { name: 'Rahul', wage: 300, phone: null },
      { name: 'Harsh', wage: 300, phone: null },
      { name: 'Kamini', wage: 200, phone: null },
      { name: 'Dulesh', wage: 300, phone: null },
      { name: 'Damini Banjare', wage: 200, phone: null }
    ];

    const insertEmployee = db.prepare(
      'INSERT OR IGNORE INTO users (name, username, password, role, salary) VALUES (?, ?, ?, ?, ?)'
    );
    const insertWithRandom = db.prepare(
      'INSERT INTO users (name, username, password, role, salary) VALUES (?, ?, ?, ?, ?)'
    );

    for (const emp of employees) {
      const monthlySalary = emp.wage * 30;
      const username = emp.phone || `worker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      try {
        insertEmployee.run(emp.name, username, '0000', 'employee', monthlySalary);
      } catch {
        insertWithRandom.run(emp.name, `worker-${Date.now()}-${Math.floor(Math.random() * 1000)}`, '0000', 'employee', monthlySalary);
      }
    }
  }

  console.log('Database initialized successfully.');
  return db;
}

function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initDB, getDB };
