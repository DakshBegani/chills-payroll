const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.chills-payroll');
const DB_FILE = path.join(DATA_DIR, 'database.sqlite');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const performBackup = () => {
  if (!fs.existsSync(DB_FILE)) return;

  const date = new Date();
  const dateString = date.toISOString().split('T')[0];
  const backupPath = path.join(BACKUP_DIR, `database_backup_${dateString}.sqlite`);

  try {
    fs.copyFileSync(DB_FILE, backupPath);
    console.log(`[Backup] Successfully backed up database to ${backupPath}`);
    
    // Optional: Keep only last 30 days of backups to save space
    cleanOldBackups();
  } catch (error) {
    console.error(`[Backup] Failed to backup database:`, error);
  }
};

const cleanOldBackups = () => {
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > THIRTY_DAYS) {
      fs.unlinkSync(filePath);
      console.log(`[Backup] Deleted old backup: ${file}`);
    }
  });
};

// Run backup every day at 11:59 PM
const startBackupJob = () => {
  cron.schedule('59 23 * * *', () => {
    console.log('[Backup] Running daily backup...');
    performBackup();
  });
  console.log('[Backup] Daily backup job scheduled for 11:59 PM');
};

module.exports = { startBackupJob, performBackup };
