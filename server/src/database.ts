// SQLite 数据库初始化与迁移集中在这里，保证容器重启后仍能复用 data/ledger.db。
import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { repairCategoryColors } from './utils/categoryColor';
import { getDefaultAppTimeZone } from './utils/timeZone';
import { getDefaultThemeMode } from './utils/themeMode';
import { migrateDatabase } from './databaseSchema';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// LEDGER_DB_PATH 用于让测试/e2e 指向隔离的临时数据库；未设置时默认使用挂载卷内的账本文件。
export const dbPath = process.env.LEDGER_DB_PATH
  ? path.resolve(process.env.LEDGER_DB_PATH)
  : path.join(dataDir, 'ledger.db');
let currentDb: DatabaseType = openDatabase(dbPath);

// 服务统一持有稳定代理；恢复数据库时只替换代理背后的连接，现有 service 无需重新实例化。
const db: DatabaseType = new Proxy({} as DatabaseType, {
  get(_target, property) {
    const value = Reflect.get(currentDb, property);
    return typeof value === 'function' ? value.bind(currentDb) : value;
  },
  set(_target, property, value) {
    return Reflect.set(currentDb, property, value);
  },
});

function openDatabase(filename: string): DatabaseType {
  const database = new Database(filename);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  return database;
}

export function getDatabase(): DatabaseType {
  return currentDb;
}

export function closeDatabase(): void {
  if (currentDb.open) currentDb.close();
}

export function reopenDatabase(): DatabaseType {
  if (currentDb.open) currentDb.close();
  currentDb = openDatabase(dbPath);
  return currentDb;
}

export function initDatabase(): void {
  migrateDatabase(getDatabase());
  seedAppSettings();
  seedCategories();
  repairStoredCategoryColors();
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
