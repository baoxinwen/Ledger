// 测试数据库使用内存 SQLite，避免污染开发或部署时的真实账本文件。
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { migrateDatabase } from '../databaseSchema';

const db: DatabaseType = new Database(':memory:');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

migrateDatabase(db);

export default db;
