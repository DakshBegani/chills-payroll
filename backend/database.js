const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db;

async function initDB() {
  db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  // Drop existing tables to enforce the new schema
  await db.exec(`
    DROP TABLE IF EXISTS attendance;
    DROP TABLE IF EXISTS users;
  `);

  // Create tables
  await db.exec(`
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
      status TEXT NOT NULL, -- 'present', 'absent', 'half-day'
      logged_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(logged_by) REFERENCES users(id)
    );
  `);

  // Seed data if DB is fresh
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    // Insert CEO
    await db.run(
      'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
      ['Pritesh Begani (CEO)', 'priteshbegani', '1984', 'ceo']
    );

    // Insert Attendance Kiosk
    await db.run(
      'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
      ['Attendance Kiosk', 'chillsicecream', '1978', 'attendance_taker']
    );

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

    for (const emp of employees) {
      // Create a unique username for each employee in case they ever need to log in (or just random)
      const empUsername = `worker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const empPassword = '0000'; // default password
      const monthlySalary = emp.wage * 30;
      // We can store the phone number in username temporarily if we want, or just generate one, 
      // but since the schema expects username to be unique, we'll use a random string.
      // Or we can add back the phone column. Given the table has contact info, let's just make their username their phone number if it exists, otherwise random.
      let username = emp.phone ? emp.phone : empUsername;
      
      // Handle duplicates in phone numbers (e.g., Tinku and Padma have the same number)
      try {
        await db.run(
          'INSERT INTO users (name, username, password, role, salary) VALUES (?, ?, ?, ?, ?)',
          [emp.name, username, empPassword, 'employee', monthlySalary]
        );
      } catch (err) {
        // If unique constraint fails (like duplicate phone number), fallback to random username
        username = empUsername;
        await db.run(
          'INSERT INTO users (name, username, password, role, salary) VALUES (?, ?, ?, ?, ?)',
          [emp.name, username, empPassword, 'employee', monthlySalary]
        );
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
