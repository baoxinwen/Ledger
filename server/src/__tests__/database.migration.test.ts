import Database from 'better-sqlite3';
import {
  LEDGER_APPLICATION_ID,
  CURRENT_SCHEMA_VERSION,
  migrateDatabase,
} from '../databaseSchema';

describe('database schema migrations', () => {
  it('creates the current integer-cent schema for an empty database', () => {
    const database = new Database(':memory:');

    migrateDatabase(database);

    const transactionColumns = database.prepare('PRAGMA table_info(transactions)').all() as { name: string; type: string }[];
    const budgetColumns = database.prepare('PRAGMA table_info(budgets)').all() as { name: string; type: string }[];
    const importBatchColumns = database.prepare('PRAGMA table_info(import_batches)').all() as { name: string; type: string }[];
    expect(transactionColumns).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'amount_cents', type: 'INTEGER' })]));
    expect(transactionColumns.some((column) => column.name === 'amount')).toBe(false);
    expect(budgetColumns).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'amount_cents', type: 'INTEGER' })]));
    expect(importBatchColumns).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'excluded_count', type: 'INTEGER' })]));
    expect(database.pragma('application_id', { simple: true })).toBe(LEDGER_APPLICATION_ID);
    expect(database.pragma('user_version', { simple: true })).toBe(CURRENT_SCHEMA_VERSION);
    database.close();
  });

  it('adds excluded_count when migrating a version 2 database', () => {
    const database = new Database(':memory:');
    database.exec(`
      CREATE TABLE import_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        excluded_count INTEGER_PLACEHOLDER
      );
    `.replace(',\n        excluded_count INTEGER_PLACEHOLDER', ''));
    database.exec(`
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY,
        type TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        source TEXT,
        source_transaction_id TEXT,
        import_batch_id INTEGER,
        import_fingerprint TEXT
      );
    `);
    database.pragma(`application_id = ${LEDGER_APPLICATION_ID}`);
    database.pragma('user_version = 2');

    migrateDatabase(database);

    const columns = database.prepare('PRAGMA table_info(import_batches)').all() as { name: string; type: string }[];
    expect(columns).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'excluded_count', type: 'INTEGER' })]));
    expect(database.pragma('user_version', { simple: true })).toBe(CURRENT_SCHEMA_VERSION);
    database.close();
  });

  it('migrates an unversioned REAL database and preserves rounded values', () => {
    const database = new Database(':memory:');
    database.pragma('foreign_keys = ON');
    database.exec(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        is_preset INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      );
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
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
      CREATE TABLE tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
      CREATE TABLE transaction_tags (
        transaction_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (transaction_id, tag_id),
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
      CREATE TABLE budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        amount REAL NOT NULL,
        period TEXT NOT NULL,
        start_date TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );
      CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT);
      CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT);
      CREATE TABLE sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT);
      INSERT INTO categories (id, name, type) VALUES (1, '餐饮', 'expense');
      INSERT INTO transactions (id, type, amount, category_id, date) VALUES (7, 'expense', 12.345, 1, '2026-01-01');
      INSERT INTO budgets (id, amount, period, start_date) VALUES (9, 1000.005, 'monthly', '2026-01-01');
    `);

    migrateDatabase(database);

    expect(database.prepare('SELECT id, amount_cents FROM transactions').get()).toEqual({ id: 7, amount_cents: 1235 });
    expect(database.prepare('SELECT id, amount_cents FROM budgets').get()).toEqual({ id: 9, amount_cents: 100001 });
    expect(() => migrateDatabase(database)).not.toThrow();
    database.close();
  });

  it('migrates a version 1 integer-cent database to the current schema', () => {
    const database = new Database(':memory:');
    database.pragma('foreign_keys = ON');
    database.exec(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        is_preset INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      );
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
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
      CREATE TABLE tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
      CREATE TABLE transaction_tags (
        transaction_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (transaction_id, tag_id),
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
      CREATE TABLE budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        amount_cents INTEGER NOT NULL,
        period TEXT NOT NULL,
        start_date TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );
      INSERT INTO categories (id, name, type) VALUES (1, '餐饮', 'expense');
      INSERT INTO transactions (id, type, amount_cents, category_id, date)
      VALUES (3, 'expense', 1234, 1, '2026-01-01');
      INSERT INTO budgets (id, amount_cents, period, start_date)
      VALUES (4, 56789, 'monthly', '2026-01-01');
    `);
    database.pragma(`application_id = ${LEDGER_APPLICATION_ID}`);
    database.pragma('user_version = 1');

    migrateDatabase(database);

    expect(database.prepare('SELECT id, amount_cents FROM transactions').get()).toEqual({ id: 3, amount_cents: 1234 });
    expect(database.prepare('SELECT id, amount_cents FROM budgets').get()).toEqual({ id: 4, amount_cents: 56789 });
    expect(database.pragma('user_version', { simple: true })).toBe(CURRENT_SCHEMA_VERSION);
    database.close();
  });
});
