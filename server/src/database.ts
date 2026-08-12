// SQLite 数据库初始化与迁移集中在这里，保证容器重启后仍能复用 data/ledger.db。
import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { repairCategoryColors } from './utils/categoryColor';
import { getDefaultAppTimeZone } from './utils/timeZone';
import { getDefaultThemeMode } from './utils/themeMode';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// LEDGER_DB_PATH 用于让测试/e2e 指向隔离的临时数据库；未设置时默认使用挂载卷内的账本文件。
const dbPath = process.env.LEDGER_DB_PATH
  ? path.resolve(process.env.LEDGER_DB_PATH)
  : path.join(dataDir, 'ledger.db');
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

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
  `);

  migrateTransactionImportColumns();
  seedAppSettings();
  seedCategories();
  repairStoredCategoryColors();
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

function seedAppSettings(): void {
  const insert = db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)');
  // TZ 只作为业务时区首次初始化默认值；用户之后在设置页保存的值不会被重启覆盖。
  insert.run('time_zone', getDefaultAppTimeZone());
  insert.run('theme_mode', getDefaultThemeMode());
}

function seedCategories(): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (count.count > 0) return;

  const expenseCategories = [
    { name: '餐饮', icon: '🍽️', color: '#8A5A61' },
    { name: '交通', icon: '🚗', color: '#5D737E' },
    { name: '购物', icon: '🛒', color: '#6B7A8F' },
    { name: '娱乐', icon: '🎮', color: '#6D597A' },
    { name: '居住', icon: '🏠', color: '#9A7B4F' },
    { name: '医疗', icon: '💊', color: '#7F5F72' },
    { name: '教育', icon: '📚', color: '#4F5D75' },
    { name: '通讯', icon: '📱', color: '#4F6F6B' },
    { name: '其他', icon: '📦', color: '#6E6658' },
  ];

  const incomeCategories = [
    { name: '工资', icon: '💰', color: '#5F6F52' },
    { name: '奖金', icon: '🎁', color: '#7A8450' },
    { name: '投资', icon: '📈', color: '#466A66' },
    { name: '兼职', icon: '💼', color: '#536271' },
    { name: '其他', icon: '📦', color: '#6E6658' },
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

function repairStoredCategoryColors(): void {
  const categories = db.prepare(`
    SELECT id, name, type, color, is_preset
    FROM categories
    ORDER BY type, is_preset DESC, sort_order, id
  `).all() as { id: number; name: string; type: 'income' | 'expense'; color: string | null; is_preset: number }[];

  const updates = repairCategoryColors(categories);
  if (updates.size === 0) return;

  const updateColor = db.prepare('UPDATE categories SET color = ? WHERE id = ?');
  const updateMany = db.transaction((items: [number, string][]) => {
    items.forEach(([id, color]) => updateColor.run(color, id));
  });
  updateMany([...updates.entries()]);
}

export default db;
