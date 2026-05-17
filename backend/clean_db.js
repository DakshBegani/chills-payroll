/**
 * clean_db.js
 * Run once before handing over to client.
 * - Wipes ALL attendance records
 * - Removes all non-system employee rows
 * - Re-seeds the canonical employee list from database.js
 * - Keeps the CEO and Kiosk accounts untouched
 */

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const DB_PATH = path.join(os.homedir(), '.chills-payroll', 'database.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('📂 Database:', DB_PATH);

// ── 1. Wipe all attendance records ──────────────────────────────────────────
const delAttendance = db.prepare('DELETE FROM attendance');
const attendanceResult = delAttendance.run();
console.log(`🗑  Deleted ${attendanceResult.changes} attendance records.`);

// ── 2. Remove all employees (keep CEO and attendance_taker system accounts) ──
const delEmployees = db.prepare("DELETE FROM users WHERE role = 'employee'");
const empResult = delEmployees.run();
console.log(`🗑  Deleted ${empResult.changes} employee rows.`);

// ── 3. Re-seed the canonical employee list ───────────────────────────────────
const employees = [
  { name: 'Laxmi',           wage: 220,  phone: '9302286439' },
  { name: 'Payal',           wage: 200,  phone: '7000396724' },
  { name: 'Damini Sen',      wage: 220,  phone: '7647830773' },
  { name: 'Niket Deshmukh',  wage: 769,  phone: null },
  { name: 'Reshma',          wage: 200,  phone: '7247639463' },
  { name: 'Sushil Janghel',  wage: 623,  phone: '6268654128' },
  { name: 'Dwarika Sahu',    wage: 404,  phone: '6268997404' },
  { name: 'Tinku',           wage: 392,  phone: '9179573093' },
  { name: 'Jaya',            wage: 330,  phone: '6268081405' },
  { name: 'Padma',           wage: 330,  phone: '9179573093' },
  { name: 'Poornima',        wage: 200,  phone: null },
  { name: 'Damini',          wage: 200,  phone: null },
  { name: 'Seema',           wage: 200,  phone: null },
  { name: 'Rajeshwari',      wage: 200,  phone: null },
  { name: 'Sakshi',          wage: 200,  phone: null },
  { name: 'Garima',          wage: 200,  phone: null },
  { name: 'Deepika',         wage: 200,  phone: null },
  { name: 'Komal',           wage: 275,  phone: null },
  { name: 'Pankaj',          wage: 350,  phone: null },
  { name: 'Savitri',         wage: 200,  phone: null },
  { name: 'Sibbi',           wage: 200,  phone: null },
  { name: 'Preeti',          wage: 200,  phone: null },
  { name: 'Rahul',           wage: 300,  phone: null },
  { name: 'Harsh',           wage: 300,  phone: null },
  { name: 'Kamini',          wage: 200,  phone: null },
  { name: 'Dulesh',          wage: 300,  phone: null },
  { name: 'Damini Banjare',  wage: 200,  phone: null },
];

const insertEmployee = db.prepare(
  'INSERT OR IGNORE INTO users (name, username, password, role, salary) VALUES (?, ?, ?, ?, ?)'
);
const insertWithRandom = db.prepare(
  'INSERT INTO users (name, username, password, role, salary) VALUES (?, ?, ?, ?, ?)'
);

let seeded = 0;
for (const emp of employees) {
  const monthlySalary = emp.wage * 30;
  const username = emp.phone || `worker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  try {
    const result = insertEmployee.run(emp.name, username, '0000', 'employee', monthlySalary);
    if (result.changes) seeded++;
  } catch {
    insertWithRandom.run(emp.name, `worker-${Date.now()}-${Math.floor(Math.random() * 1000)}`, '0000', 'employee', monthlySalary);
    seeded++;
  }
}
console.log(`✅ Re-seeded ${seeded} employees.`);

// ── 4. Verify final state ────────────────────────────────────────────────────
const counts = db.prepare(`
  SELECT role, COUNT(*) as count FROM users GROUP BY role
`).all();
console.log('\n📊 Final user counts:');
counts.forEach(r => console.log(`   ${r.role}: ${r.count}`));

const attCount = db.prepare('SELECT COUNT(*) as count FROM attendance').get();
console.log(`   attendance records: ${attCount.count}`);

db.close();
console.log('\n🎉 Database is clean and ready for client handover!');
