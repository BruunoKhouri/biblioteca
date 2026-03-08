const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let db;

async function initDb() {
  if (db) return db;

  db = await open({
    filename: path.join(__dirname, '..', 'library.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      isbn TEXT UNIQUE,
      publisher TEXT,
      published_year INTEGER,
      category TEXT,
      language TEXT,
      shelf_location TEXT,
      status TEXT DEFAULT 'nao_lido',
      cover_url TEXT,
      notes TEXT,
      estimated_price REAL,
      price_currency TEXT DEFAULT 'BRL',
      price_source TEXT,
      price_confidence TEXT,
      price_updated_at TEXT,
      metadata_source TEXT,
      metadata_updated_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'BRL',
      source TEXT,
      confidence TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TRIGGER IF NOT EXISTS trg_books_updated_at
    AFTER UPDATE ON books
    FOR EACH ROW
    BEGIN
      UPDATE books SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `);

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Banco ainda não inicializado.');
  }
  return db;
}

module.exports = { initDb, getDb };
