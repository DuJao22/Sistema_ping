import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(path.join(dbDir, 'pingmonitor.db'));

export function initDb() {
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS monitored_sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      db_url TEXT,
      description TEXT,
      check_interval INTEGER NOT NULL DEFAULT 300,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS site_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      response_time INTEGER,
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (site_id) REFERENCES monitored_sites(id) ON DELETE CASCADE
    );
  `);

  // Migration for existing databases
  try {
    db.exec('ALTER TABLE monitored_sites ADD COLUMN db_url TEXT;');
  } catch (e) {
    // Column likely already exists
  }
}
