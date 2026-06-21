// SQLite 数据库初始化与迁移集中在这里，保证容器重启后仍能复用 data/ledger.db。
import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ledger.db');
const db: DatabaseType = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      icon TEXT,
      color TEXT,
      is_preset INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      category_id INTEGER NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      source TEXT,
      source_transaction_id TEXT,
      source_merchant_order_id TEXT,
      source_category TEXT,
      source_time TEXT,
      payment_method TEXT,
      source_status TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS transaction_tags (
      transaction_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (transaction_id, tag_id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      amount REAL NOT NULL,
      period TEXT NOT NULL CHECK(period IN ('monthly', 'yearly')),
      start_date TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
  `);

  migrateTransactionImportColumns();
  seedCategories();
}

function migrateTransactionImportColumns(): void {
  const columns = db.prepare('PRAGMA table_info(transactions)').all() as { name: string }[];
  const existingColumns = new Set(columns.map((column) => column.name));
  const importColumns = [
    'source TEXT',
    'source_transaction_id TEXT',
    'source_merchant_order_id TEXT',
    'source_category TEXT',
    'source_time TEXT',
    'payment_method TEXT',
    'source_status TEXT',
  ];

  importColumns.forEach((definition) => {
    const columnName = definition.split(' ')[0];
    if (!existingColumns.has(columnName)) {
      db.prepare(`ALTER TABLE transactions ADD COLUMN ${definition}`).run();
    }
  });

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_source_unique
      ON transactions(source, source_transaction_id)
      WHERE source IS NOT NULL AND source_transaction_id IS NOT NULL;
  `);
}

function seedCategories(): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (count.count > 0) return;

  const expenseCategories = [
    { name: '餐饮', icon: '🍽️', color: '#FF6B6B' },
    { name: '交通', icon: '🚗', color: '#4ECDC4' },
    { name: '购物', icon: '🛒', color: '#45B7D1' },
    { name: '娱乐', icon: '🎮', color: '#96CEB4' },
    { name: '居住', icon: '🏠', color: '#FFEAA7' },
    { name: '医疗', icon: '💊', color: '#DDA0DD' },
    { name: '教育', icon: '📚', color: '#98D8C8' },
    { name: '通讯', icon: '📱', color: '#F7DC6F' },
    { name: '其他', icon: '📦', color: '#BDC3C7' },
  ];

  const incomeCategories = [
    { name: '工资', icon: '💰', color: '#2ECC71' },
    { name: '奖金', icon: '🎁', color: '#27AE60' },
    { name: '投资', icon: '📈', color: '#16A085' },
    { name: '兼职', icon: '💼', color: '#1ABC9C' },
    { name: '其他', icon: '📦', color: '#95A5A6' },
  ];

  const insert = db.prepare(
    'INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES (?, ?, ?, ?, 1, ?)'
  );

  const insertMany = db.transaction((categories: typeof expenseCategories, type: string) => {
    categories.forEach((cat, index) => {
      insert.run(cat.name, type, cat.icon, cat.color, index);
    });
  });

  insertMany(expenseCategories, 'expense');
  insertMany(incomeCategories, 'income');
}

export default db;
