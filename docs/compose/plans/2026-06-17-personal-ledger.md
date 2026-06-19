# 个人记账本实现计划

> 历史说明：本文是 2026-06-17 的初始实现计划，部分技术栈版本、端口和任务勾选状态已经滞后于当前代码。当前运行方式、导入规则和部署说明以根目录 `README.md` 为准。

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个支持多维度筛选、统计图表、预算管理的个人记账应用

**Architecture:** 前后端分离架构，React前端 + Express后端 + SQLite数据库，通过Docker Compose部署

**Tech Stack:** React 18, TypeScript, MUI 5, Zustand, Recharts, Express.js, better-sqlite3, Docker

---

## 文件结构

### 后端文件
```
server/
├── src/
│   ├── index.ts                 # 服务入口
│   ├── database.ts              # 数据库初始化
│   ├── routes/
│   │   ├── transactions.ts      # 收支记录路由
│   │   ├── categories.ts        # 分类路由
│   │   ├── tags.ts              # 标签路由
│   │   ├── budgets.ts           # 预算路由
│   │   └── import-export.ts     # 导入导出路由
│   ├── services/
│   │   ├── transaction.service.ts
│   │   ├── category.service.ts
│   │   ├── tag.service.ts
│   │   └── budget.service.ts
│   └── types/
│       └── index.ts             # 类型定义
├── data/                        # SQLite数据目录
├── package.json
└── tsconfig.json
```

### 前端文件
```
client/
├── src/
│   ├── main.tsx                 # 入口文件
│   ├── App.tsx                  # 根组件
│   ├── api/
│   │   └── index.ts             # API客户端
│   ├── stores/
│   │   ├── transactionStore.ts  # 收支记录状态
│   │   ├── categoryStore.ts     # 分类状态
│   │   ├── tagStore.ts          # 标签状态
│   │   └── themeStore.ts        # 主题状态
│   ├── components/
│   │   ├── Layout/
│   │   │   └── MainLayout.tsx   # 主布局
│   │   ├── TransactionForm.tsx  # 记账表单
│   │   ├── TransactionList.tsx  # 记录列表
│   │   ├── FilterPanel.tsx      # 筛选面板
│   │   ├── StatsCharts.tsx      # 统计图表
│   │   └── BudgetCard.tsx       # 预算卡片
│   ├── pages/
│   │   ├── HomePage.tsx         # 首页
│   │   ├── TransactionsPage.tsx # 收支记录页
│   │   ├── StatisticsPage.tsx   # 统计分析页
│   │   ├── BudgetsPage.tsx      # 预算管理页
│   │   └── SettingsPage.tsx     # 设置页
│   ├── theme/
│   │   └── index.ts             # MUI主题配置
│   └── types/
│       └── index.ts             # 类型定义
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Task 1: 项目初始化

**Covers:** 项目基础结构搭建

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `docker-compose.yml`
- Create: `Dockerfile`

- [ ] **Step 1: 创建后端项目**

```bash
cd server
npm init -y
npm install express better-sqlite3 cors
npm install -D typescript @types/node @types/express @types/cors ts-node nodemon
```

- [ ] **Step 2: 配置后端tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: 创建后端入口文件**

```typescript
// server/src/index.ts
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

- [ ] **Step 4: 创建前端项目**

```bash
cd client
npm create vite@latest . -- --template react-ts
npm install
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
npm install zustand recharts axios react-router-dom
npm install -D @types/react-router-dom
```

- [ ] **Step 5: 配置前端vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 6: 创建前端入口文件**

```tsx
// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: 创建Docker配置**

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/server/data
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
```

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm install --production

COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

COPY server/ ./server/

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
```

- [ ] **Step 8: 测试项目启动**

```bash
# 终端1：启动后端
cd server
npm run dev

# 终端2：启动前端
cd client
npm run dev
```

- [ ] **Step 9: 提交代码**

```bash
git add .
git commit -m "feat: initialize project structure"
```

---

## Task 2: 数据库初始化

**Covers:** 数据库设计和初始化

**Files:**
- Create: `server/src/database.ts`
- Create: `server/src/types/index.ts`

- [ ] **Step 1: 定义TypeScript类型**

```typescript
// server/src/types/index.ts
export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category_id: number;
  note: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon: string | null;
  color: string | null;
  is_preset: number;
  sort_order: number;
}

export interface Tag {
  id: number;
  name: string;
}

export interface TransactionTag {
  transaction_id: number;
  tag_id: number;
}

export interface Budget {
  id: number;
  category_id: number | null;
  amount: number;
  period: 'monthly' | 'yearly';
  start_date: string;
}

export interface TransactionWithDetails extends Transaction {
  category: Category;
  tags: Tag[];
}

export interface TransactionFilter {
  type?: 'income' | 'expense';
  category_id?: number;
  tag_id?: number;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  keyword?: string;
  page?: number;
  limit?: number;
  sort?: 'date' | 'amount';
  order?: 'asc' | 'desc';
}

export interface StatsQuery {
  start_date?: string;
  end_date?: string;
  type?: 'income' | 'expense';
}
```

- [ ] **Step 2: 创建数据库初始化模块**

```typescript
// server/src/database.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ledger.db');
const db = new Database(dbPath);

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

  seedCategories();
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
```

- [ ] **Step 3: 更新后端入口文件**

```typescript
// server/src/index.ts
import express from 'express';
import cors from 'cors';
import { initDatabase } from './database';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initDatabase();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

- [ ] **Step 4: 测试数据库初始化**

```bash
cd server
npm run dev
# 检查控制台输出，确认数据库初始化成功
```

- [ ] **Step 5: 提交代码**

```bash
git add server/src/database.ts server/src/types/index.ts server/src/index.ts
git commit -m "feat: add database initialization with schema and seed data"
```

---

## Task 3: 分类API开发

**Covers:** 分类管理功能

**Files:**
- Create: `server/src/services/category.service.ts`
- Create: `server/src/routes/categories.ts`

- [ ] **Step 1: 创建分类服务**

```typescript
// server/src/services/category.service.ts
import db from '../database';
import { Category } from '../types';

export class CategoryService {
  getAll(type?: 'income' | 'expense'): Category[] {
    if (type) {
      return db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY sort_order').all(type) as Category[];
    }
    return db.prepare('SELECT * FROM categories ORDER BY type, sort_order').all() as Category[];
  }

  getById(id: number): Category | undefined {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
  }

  create(data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }): Category {
    const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM categories WHERE type = ?').get(data.type) as { max: number | null };
    const sortOrder = (maxOrder.max || 0) + 1;

    const result = db.prepare(
      'INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES (?, ?, ?, ?, 0, ?)'
    ).run(data.name, data.type, data.icon || null, data.color || null, sortOrder);

    return this.getById(result.lastInsertRowid as number)!;
  }

  update(id: number, data: { name?: string; icon?: string; color?: string }): Category | null {
    const category = this.getById(id);
    if (!category || category.is_preset) return null;

    if (data.name) {
      db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(data.name, id);
    }
    if (data.icon !== undefined) {
      db.prepare('UPDATE categories SET icon = ? WHERE id = ?').run(data.icon, id);
    }
    if (data.color !== undefined) {
      db.prepare('UPDATE categories SET color = ? WHERE id = ?').run(data.color, id);
    }

    return this.getById(id);
  }

  delete(id: number): boolean {
    const category = this.getById(id);
    if (!category || category.is_preset) return false;

    const transactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(id) as { count: number };
    if (transactionCount.count > 0) return false;

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return true;
  }
}

export const categoryService = new CategoryService();
```

- [ ] **Step 2: 创建分类路由**

```typescript
// server/src/routes/categories.ts
import { Router, Request, Response } from 'express';
import { categoryService } from '../services/category.service';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const type = req.query.type as 'income' | 'expense' | undefined;
  const categories = categoryService.getAll(type);
  res.json(categories);
});

router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const category = categoryService.getById(id);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json(category);
});

router.post('/', (req: Request, res: Response) => {
  const { name, type, icon, color } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }
  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Type must be income or expense' });
  }
  const category = categoryService.create({ name, type, icon, color });
  res.status(201).json(category);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, icon, color } = req.body;
  const category = categoryService.update(id, { name, icon, color });
  if (!category) {
    return res.status(404).json({ error: 'Category not found or is preset' });
  }
  res.json(category);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const success = categoryService.delete(id);
  if (!success) {
    return res.status(400).json({ error: 'Cannot delete category' });
  }
  res.status(204).send();
});

export default router;
```

- [ ] **Step 3: 注册路由到入口文件**

```typescript
// server/src/index.ts (更新)
import express from 'express';
import cors from 'cors';
import { initDatabase } from './database';
import categoryRoutes from './routes/categories';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initDatabase();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/categories', categoryRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

- [ ] **Step 4: 测试分类API**

```bash
# 获取所有分类
curl http://localhost:3000/api/categories

# 获取支出分类
curl http://localhost:3000/api/categories?type=expense

# 创建自定义分类
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "宠物", "type": "expense", "icon": "🐱", "color": "#FF9800"}'
```

- [ ] **Step 5: 提交代码**

```bash
git add server/src/services/category.service.ts server/src/routes/categories.ts server/src/index.ts
git commit -m "feat: add category CRUD API"
```

---

## Task 4: 标签API开发

**Covers:** 标签管理功能

**Files:**
- Create: `server/src/services/tag.service.ts`
- Create: `server/src/routes/tags.ts`

- [ ] **Step 1: 创建标签服务**

```typescript
// server/src/services/tag.service.ts
import db from '../database';
import { Tag } from '../types';

export class TagService {
  getAll(): Tag[] {
    return db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[];
  }

  getById(id: number): Tag | undefined {
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag | undefined;
  }

  getByName(name: string): Tag | undefined {
    return db.prepare('SELECT * FROM tags WHERE name = ?').get(name) as Tag | undefined;
  }

  create(name: string): Tag {
    const existing = this.getByName(name);
    if (existing) return existing;

    const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
    return this.getById(result.lastInsertRowid as number)!;
  }

  delete(id: number): boolean {
    const tag = this.getById(id);
    if (!tag) return false;

    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return true;
  }

  getByTransactionId(transactionId: number): Tag[] {
    return db.prepare(`
      SELECT t.* FROM tags t
      JOIN transaction_tags tt ON t.id = tt.tag_id
      WHERE tt.transaction_id = ?
    `).all(transactionId) as Tag[];
  }
}

export const tagService = new TagService();
```

- [ ] **Step 2: 创建标签路由**

```typescript
// server/src/routes/tags.ts
import { Router, Request, Response } from 'express';
import { tagService } from '../services/tag.service';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const tags = tagService.getAll();
  res.json(tags);
});

router.post('/', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const tag = tagService.create(name);
  res.status(201).json(tag);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const success = tagService.delete(id);
  if (!success) {
    return res.status(404).json({ error: 'Tag not found' });
  }
  res.status(204).send();
});

export default router;
```

- [ ] **Step 3: 注册路由**

```typescript
// server/src/index.ts (更新)
import tagRoutes from './routes/tags';

// ... 其他代码 ...

app.use('/api/tags', tagRoutes);
```

- [ ] **Step 4: 测试标签API**

```bash
# 获取所有标签
curl http://localhost:3000/api/tags

# 创建标签
curl -X POST http://localhost:3000/api/tags \
  -H "Content-Type: application/json" \
  -d '{"name": "午餐"}'
```

- [ ] **Step 5: 提交代码**

```bash
git add server/src/services/tag.service.ts server/src/routes/tags.ts server/src/index.ts
git commit -m "feat: add tag CRUD API"
```

---

## Task 5: 收支记录API开发

**Covers:** 收支记录CRUD和筛选功能

**Files:**
- Create: `server/src/services/transaction.service.ts`
- Create: `server/src/routes/transactions.ts`

- [ ] **Step 1: 创建收支记录服务**

```typescript
// server/src/services/transaction.service.ts
import db from '../database';
import { Transaction, TransactionWithDetails, TransactionFilter } from '../types';
import { categoryService } from './category.service';
import { tagService } from './tag.service';

export class TransactionService {
  getAll(filter: TransactionFilter = {}): { data: TransactionWithDetails[]; total: number } {
    const {
      type,
      category_id,
      tag_id,
      start_date,
      end_date,
      min_amount,
      max_amount,
      keyword,
      page = 1,
      limit = 20,
      sort = 'date',
      order = 'desc'
    } = filter;

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (type) {
      whereClauses.push('t.type = ?');
      params.push(type);
    }
    if (category_id) {
      whereClauses.push('t.category_id = ?');
      params.push(category_id);
    }
    if (start_date) {
      whereClauses.push('t.date >= ?');
      params.push(start_date);
    }
    if (end_date) {
      whereClauses.push('t.date <= ?');
      params.push(end_date);
    }
    if (min_amount !== undefined) {
      whereClauses.push('t.amount >= ?');
      params.push(min_amount);
    }
    if (max_amount !== undefined) {
      whereClauses.push('t.amount <= ?');
      params.push(max_amount);
    }
    if (keyword) {
      whereClauses.push('t.note LIKE ?');
      params.push(`%${keyword}%`);
    }
    if (tag_id) {
      whereClauses.push('EXISTS (SELECT 1 FROM transaction_tags tt WHERE tt.transaction_id = t.id AND tt.tag_id = ?)');
      params.push(tag_id);
    }

    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countSql = `SELECT COUNT(*) as total FROM transactions t ${whereClause}`;
    const total = (db.prepare(countSql).get(...params) as { total: number }).total;

    const sortColumn = sort === 'amount' ? 't.amount' : 't.date';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const dataSql = `
      SELECT t.* FROM transactions t
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const transactions = db.prepare(dataSql).all(...params, limit, offset) as Transaction[];

    const data = transactions.map(t => this.enrichTransaction(t));

    return { data, total };
  }

  getById(id: number): TransactionWithDetails | undefined {
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction | undefined;
    if (!transaction) return undefined;
    return this.enrichTransaction(transaction);
  }

  create(data: {
    type: 'income' | 'expense';
    amount: number;
    category_id: number;
    note?: string;
    date: string;
    tag_ids?: number[];
  }): TransactionWithDetails {
    const result = db.prepare(
      'INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)'
    ).run(data.type, data.amount, data.category_id, data.note || null, data.date);

    const transactionId = result.lastInsertRowid as number;

    if (data.tag_ids && data.tag_ids.length > 0) {
      const insertTag = db.prepare('INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)');
      data.tag_ids.forEach(tagId => {
        insertTag.run(transactionId, tagId);
      });
    }

    return this.getById(transactionId)!;
  }

  update(id: number, data: {
    type?: 'income' | 'expense';
    amount?: number;
    category_id?: number;
    note?: string;
    date?: string;
    tag_ids?: number[];
  }): TransactionWithDetails | null {
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction | undefined;
    if (!existing) return null;

    if (data.type) {
      db.prepare('UPDATE transactions SET type = ? WHERE id = ?').run(data.type, id);
    }
    if (data.amount !== undefined) {
      db.prepare('UPDATE transactions SET amount = ? WHERE id = ?').run(data.amount, id);
    }
    if (data.category_id !== undefined) {
      db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?').run(data.category_id, id);
    }
    if (data.note !== undefined) {
      db.prepare('UPDATE transactions SET note = ? WHERE id = ?').run(data.note, id);
    }
    if (data.date) {
      db.prepare('UPDATE transactions SET date = ? WHERE id = ?').run(data.date, id);
    }

    db.prepare('UPDATE transactions SET updated_at = datetime("now") WHERE id = ?').run(id);

    if (data.tag_ids !== undefined) {
      db.prepare('DELETE FROM transaction_tags WHERE transaction_id = ?').run(id);
      if (data.tag_ids.length > 0) {
        const insertTag = db.prepare('INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)');
        data.tag_ids.forEach(tagId => {
          insertTag.run(id, tagId);
        });
      }
    }

    return this.getById(id);
  }

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getStats(query: { start_date?: string; end_date?: string; type?: 'income' | 'expense' }) {
    const { start_date, end_date, type } = query;

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (start_date) {
      whereClauses.push('date >= ?');
      params.push(start_date);
    }
    if (end_date) {
      whereClauses.push('date <= ?');
      params.push(end_date);
    }
    if (type) {
      whereClauses.push('type = ?');
      params.push(type);
    }

    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const totalIncome = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions ${whereClause} ${whereClauses.length > 0 ? 'AND' : 'WHERE'} type = 'income'
    `).get(...params) as { total: number };

    const totalExpense = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions ${whereClause} ${whereClauses.length > 0 ? 'AND' : 'WHERE'} type = 'expense'
    `).get(...params) as { total: number };

    const categoryStats = db.prepare(`
      SELECT c.name, c.icon, c.color, SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY total DESC
    `).all(...params) as { name: string; icon: string; color: string; total: number }[];

    const dailyStats = db.prepare(`
      SELECT date, type, SUM(amount) as total
      FROM transactions
      ${whereClause}
      GROUP BY date, type
      ORDER BY date
    `).all(...params) as { date: string; type: string; total: number }[];

    return {
      totalIncome: totalIncome.total,
      totalExpense: totalExpense.total,
      balance: totalIncome.total - totalExpense.total,
      categoryStats,
      dailyStats,
    };
  }

  private enrichTransaction(transaction: Transaction): TransactionWithDetails {
    const category = categoryService.getById(transaction.category_id)!;
    const tags = tagService.getByTransactionId(transaction.id);
    return { ...transaction, category, tags };
  }
}

export const transactionService = new TransactionService();
```

- [ ] **Step 2: 创建收支记录路由**

```typescript
// server/src/routes/transactions.ts
import { Router, Request, Response } from 'express';
import { transactionService } from '../services/transaction.service';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const filter = {
    type: req.query.type as 'income' | 'expense' | undefined,
    category_id: req.query.category_id ? parseInt(req.query.category_id as string) : undefined,
    tag_id: req.query.tag_id ? parseInt(req.query.tag_id as string) : undefined,
    start_date: req.query.start_date as string | undefined,
    end_date: req.query.end_date as string | undefined,
    min_amount: req.query.min_amount ? parseFloat(req.query.min_amount as string) : undefined,
    max_amount: req.query.max_amount ? parseFloat(req.query.max_amount as string) : undefined,
    keyword: req.query.keyword as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    sort: req.query.sort as 'date' | 'amount' | undefined,
    order: req.query.order as 'asc' | 'desc' | undefined,
  };

  const result = transactionService.getAll(filter);
  res.json(result);
});

router.get('/stats', (req: Request, res: Response) => {
  const query = {
    start_date: req.query.start_date as string | undefined,
    end_date: req.query.end_date as string | undefined,
    type: req.query.type as 'income' | 'expense' | undefined,
  };

  const stats = transactionService.getStats(query);
  res.json(stats);
});

router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const transaction = transactionService.getById(id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

router.post('/', (req: Request, res: Response) => {
  const { type, amount, category_id, note, date, tag_ids } = req.body;

  if (!type || amount === undefined || !category_id || !date) {
    return res.status(400).json({ error: 'Type, amount, category_id and date are required' });
  }

  const transaction = transactionService.create({ type, amount, category_id, note, date, tag_ids });
  res.status(201).json(transaction);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { type, amount, category_id, note, date, tag_ids } = req.body;

  const transaction = transactionService.update(id, { type, amount, category_id, note, date, tag_ids });
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const success = transactionService.delete(id);
  if (!success) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.status(204).send();
});

export default router;
```

- [ ] **Step 3: 注册路由**

```typescript
// server/src/index.ts (更新)
import transactionRoutes from './routes/transactions';

// ... 其他代码 ...

app.use('/api/transactions', transactionRoutes);
```

- [ ] **Step 4: 测试收支记录API**

```bash
# 创建记录
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"type": "expense", "amount": 25, "category_id": 1, "note": "午餐", "date": "2024-01-15"}'

# 查询记录
curl "http://localhost:3000/api/transactions?type=expense&start_date=2024-01-01&end_date=2024-01-31"

# 获取统计
curl "http://localhost:3000/api/transactions/stats?start_date=2024-01-01&end_date=2024-01-31"
```

- [ ] **Step 5: 提交代码**

```bash
git add server/src/services/transaction.service.ts server/src/routes/transactions.ts server/src/index.ts
git commit -m "feat: add transaction CRUD API with filtering and stats"
```

---

## Task 6: 预算API开发

**Covers:** 预算管理功能

**Files:**
- Create: `server/src/services/budget.service.ts`
- Create: `server/src/routes/budgets.ts`

- [ ] **Step 1: 创建预算服务**

```typescript
// server/src/services/budget.service.ts
import db from '../database';
import { Budget } from '../types';

export class BudgetService {
  getAll(): Budget[] {
    return db.prepare('SELECT * FROM budgets ORDER BY start_date DESC').all() as Budget[];
  }

  getById(id: number): Budget | undefined {
    return db.prepare('SELECT * FROM budgets WHERE id = ?').get(id) as Budget | undefined;
  }

  create(data: { category_id?: number; amount: number; period: 'monthly' | 'yearly'; start_date: string }): Budget {
    const result = db.prepare(
      'INSERT INTO budgets (category_id, amount, period, start_date) VALUES (?, ?, ?, ?)'
    ).run(data.category_id || null, data.amount, data.period, data.start_date);

    return this.getById(result.lastInsertRowid as number)!;
  }

  update(id: number, data: { category_id?: number; amount?: number; period?: 'monthly' | 'yearly'; start_date?: string }): Budget | null {
    const existing = this.getById(id);
    if (!existing) return null;

    if (data.category_id !== undefined) {
      db.prepare('UPDATE budgets SET category_id = ? WHERE id = ?').run(data.category_id, id);
    }
    if (data.amount !== undefined) {
      db.prepare('UPDATE budgets SET amount = ? WHERE id = ?').run(data.amount, id);
    }
    if (data.period) {
      db.prepare('UPDATE budgets SET period = ? WHERE id = ?').run(data.period, id);
    }
    if (data.start_date) {
      db.prepare('UPDATE budgets SET start_date = ? WHERE id = ?').run(data.start_date, id);
    }

    return this.getById(id);
  }

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getBudgetStatus(month: string): { budget: Budget; spent: number; remaining: number }[] {
    const budgets = this.getAll();
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    return budgets.map(budget => {
      let spent = 0;

      if (budget.category_id) {
        const result = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM transactions
          WHERE category_id = ? AND type = 'expense' AND date >= ? AND date <= ?
        `).get(budget.category_id, startDate, endDate) as { total: number };
        spent = result.total;
      } else {
        const result = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM transactions
          WHERE type = 'expense' AND date >= ? AND date <= ?
        `).get(startDate, endDate) as { total: number };
        spent = result.total;
      }

      return {
        budget,
        spent,
        remaining: budget.amount - spent,
      };
    });
  }
}

export const budgetService = new BudgetService();
```

- [ ] **Step 2: 创建预算路由**

```typescript
// server/src/routes/budgets.ts
import { Router, Request, Response } from 'express';
import { budgetService } from '../services/budget.service';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const budgets = budgetService.getAll();
  res.json(budgets);
});

router.get('/status', (req: Request, res: Response) => {
  const month = req.query.month as string;
  if (!month) {
    return res.status(400).json({ error: 'Month is required (YYYY-MM format)' });
  }
  const status = budgetService.getBudgetStatus(month);
  res.json(status);
});

router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const budget = budgetService.getById(id);
  if (!budget) {
    return res.status(404).json({ error: 'Budget not found' });
  }
  res.json(budget);
});

router.post('/', (req: Request, res: Response) => {
  const { category_id, amount, period, start_date } = req.body;

  if (!amount || !period || !start_date) {
    return res.status(400).json({ error: 'Amount, period and start_date are required' });
  }

  const budget = budgetService.create({ category_id, amount, period, start_date });
  res.status(201).json(budget);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { category_id, amount, period, start_date } = req.body;

  const budget = budgetService.update(id, { category_id, amount, period, start_date });
  if (!budget) {
    return res.status(404).json({ error: 'Budget not found' });
  }
  res.json(budget);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const success = budgetService.delete(id);
  if (!success) {
    return res.status(404).json({ error: 'Budget not found' });
  }
  res.status(204).send();
});

export default router;
```

- [ ] **Step 3: 注册路由**

```typescript
// server/src/index.ts (更新)
import budgetRoutes from './routes/budgets';

// ... 其他代码 ...

app.use('/api/budgets', budgetRoutes);
```

- [ ] **Step 4: 测试预算API**

```bash
# 创建预算
curl -X POST http://localhost:3000/api/budgets \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "period": "monthly", "start_date": "2024-01-01"}'

# 获取预算状态
curl "http://localhost:3000/api/budgets/status?month=2024-01"
```

- [ ] **Step 5: 提交代码**

```bash
git add server/src/services/budget.service.ts server/src/routes/budgets.ts server/src/index.ts
git commit -m "feat: add budget management API"
```

---

## Task 7: 导入导出API开发

**Covers:** 数据导入导出功能

**Files:**
- Create: `server/src/routes/import-export.ts`

- [ ] **Step 1: 创建导入导出路由**

```typescript
// server/src/routes/import-export.ts
import { Router, Request, Response } from 'express';
import { transactionService } from '../services/transaction.service';
import { categoryService } from '../services/category.service';
import { tagService } from '../services/tag.service';

const router = Router();

router.get('/export', (req: Request, res: Response) => {
  const format = req.query.format as 'json' | 'csv' || 'json';

  const { data } = transactionService.getAll({ limit: 10000 });

  if (format === 'csv') {
    const header = '日期,类型,分类,金额,标签,备注\n';
    const rows = data.map(t => {
      const tags = t.tags.map(tag => tag.name).join(';');
      return `${t.date},${t.type},${t.category.name},${t.amount},${tags},${t.note || ''}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ledger-export.csv');
    res.send(header + rows);
  } else {
    const exportData = {
      transactions: data.map(t => ({
        date: t.date,
        type: t.type,
        category: t.category.name,
        amount: t.amount,
        tags: t.tags.map(tag => tag.name),
        note: t.note,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=ledger-export.json');
    res.json(exportData);
  }
});

router.post('/import', (req: Request, res: Response) => {
  const { transactions } = req.body;

  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Invalid import data' });
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  transactions.forEach((t, index) => {
    try {
      const category = categoryService.getAll(t.type).find(c => c.name === t.category);
      if (!category) {
        results.errors.push(`Row ${index + 1}: Category "${t.category}" not found`);
        results.failed++;
        return;
      }

      const tagIds = (t.tags || []).map((tagName: string) => {
        const tag = tagService.create(tagName);
        return tag.id;
      });

      transactionService.create({
        type: t.type,
        amount: t.amount,
        category_id: category.id,
        note: t.note,
        date: t.date,
        tag_ids: tagIds,
      });

      results.success++;
    } catch (error) {
      results.errors.push(`Row ${index + 1}: ${(error as Error).message}`);
      results.failed++;
    }
  });

  res.json(results);
});

export default router;
```

- [ ] **Step 2: 注册路由**

```typescript
// server/src/index.ts (更新)
import importExportRoutes from './routes/import-export';

// ... 其他代码 ...

app.use('/api', importExportRoutes);
```

- [ ] **Step 3: 测试导入导出**

```bash
# 导出JSON
curl http://localhost:3000/api/export?format=json -o export.json

# 导出CSV
curl http://localhost:3000/api/export?format=csv -o export.csv

# 导入数据
curl -X POST http://localhost:3000/api/import \
  -H "Content-Type: application/json" \
  -d '{"transactions": [{"date": "2024-01-15", "type": "expense", "category": "餐饮", "amount": 25, "tags": ["午餐"], "note": "工作餐"}]}'
```

- [ ] **Step 4: 提交代码**

```bash
git add server/src/routes/import-export.ts server/src/index.ts
git commit -m "feat: add data import/export API"
```

---

## Task 8: 前端基础框架搭建

**Covers:** 前端项目结构和主题配置

**Files:**
- Create: `client/src/types/index.ts`
- Create: `client/src/api/index.ts`
- Create: `client/src/theme/index.ts`
- Create: `client/src/App.tsx`

- [ ] **Step 1: 定义前端类型**

```typescript
// client/src/types/index.ts
export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category_id: number;
  note: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon: string | null;
  color: string | null;
  is_preset: number;
  sort_order: number;
}

export interface Tag {
  id: number;
  name: string;
}

export interface TransactionWithDetails extends Transaction {
  category: Category;
  tags: Tag[];
}

export interface TransactionFilter {
  type?: 'income' | 'expense';
  category_id?: number;
  tag_id?: number;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  keyword?: string;
  page?: number;
  limit?: number;
  sort?: 'date' | 'amount';
  order?: 'asc' | 'desc';
}

export interface StatsData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categoryStats: { name: string; icon: string; color: string; total: number }[];
  dailyStats: { date: string; type: string; total: number }[];
}

export interface Budget {
  id: number;
  category_id: number | null;
  amount: number;
  period: 'monthly' | 'yearly';
  start_date: string;
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
}
```

- [ ] **Step 2: 创建API客户端**

```typescript
// client/src/api/index.ts
import axios from 'axios';
import { TransactionFilter, TransactionWithDetails, Category, Tag, StatsData, Budget, BudgetStatus } from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const transactionApi = {
  getAll: (filter: TransactionFilter = {}) =>
    api.get<{ data: TransactionWithDetails[]; total: number }>('/transactions', { params: filter }),
  getById: (id: number) =>
    api.get<TransactionWithDetails>(`/transactions/${id}`),
  create: (data: { type: 'income' | 'expense'; amount: number; category_id: number; note?: string; date: string; tag_ids?: number[] }) =>
    api.post<TransactionWithDetails>('/transactions', data),
  update: (id: number, data: Partial<TransactionWithDetails>) =>
    api.put<TransactionWithDetails>(`/transactions/${id}`, data),
  delete: (id: number) =>
    api.delete(`/transactions/${id}`),
  getStats: (params: { start_date?: string; end_date?: string; type?: 'income' | 'expense' }) =>
    api.get<StatsData>('/transactions/stats', { params }),
};

export const categoryApi = {
  getAll: (type?: 'income' | 'expense') =>
    api.get<Category[]>('/categories', { params: { type } }),
  create: (data: { name: string; type: 'income' | 'expense'; icon?: string; color?: string }) =>
    api.post<Category>('/categories', data),
  update: (id: number, data: { name?: string; icon?: string; color?: string }) =>
    api.put<Category>(`/categories/${id}`, data),
  delete: (id: number) =>
    api.delete(`/categories/${id}`),
};

export const tagApi = {
  getAll: () =>
    api.get<Tag[]>('/tags'),
  create: (name: string) =>
    api.post<Tag>('/tags', { name }),
  delete: (id: number) =>
    api.delete(`/tags/${id}`),
};

export const budgetApi = {
  getAll: () =>
    api.get<Budget[]>('/budgets'),
  getStatus: (month: string) =>
    api.get<BudgetStatus[]>('/budgets/status', { params: { month } }),
  create: (data: { category_id?: number; amount: number; period: 'monthly' | 'yearly'; start_date: string }) =>
    api.post<Budget>('/budgets', data),
  update: (id: number, data: Partial<Budget>) =>
    api.put<Budget>(`/budgets/${id}`, data),
  delete: (id: number) =>
    api.delete(`/budgets/${id}`),
};

export const importExportApi = {
  export: (format: 'json' | 'csv') =>
    api.get('/export', { params: { format }, responseType: 'blob' }),
  import: (transactions: any[]) =>
    api.post('/import', { transactions }),
};
```

- [ ] **Step 3: 配置MUI主题**

```typescript
// client/src/theme/index.ts
import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#303030',
      paper: '#424242',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});
```

- [ ] **Step 4: 创建根组件**

```tsx
// client/src/App.tsx
import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lightTheme, darkTheme } from './theme';
import MainLayout from './components/Layout/MainLayout';
import HomePage from './pages/HomePage';
import TransactionsPage from './pages/TransactionsPage';
import StatisticsPage from './pages/StatisticsPage';
import BudgetsPage from './pages/BudgetsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <BrowserRouter>
        <MainLayout isDarkMode={isDarkMode} onThemeToggle={() => setIsDarkMode(!isDarkMode)}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
```

- [ ] **Step 5: 测试前端启动**

```bash
cd client
npm run dev
```

- [ ] **Step 6: 提交代码**

```bash
git add client/src/types/index.ts client/src/api/index.ts client/src/theme/index.ts client/src/App.tsx
git commit -m "feat: setup frontend base with types, API client, and theme"
```

---

## Task 9: 前端布局和导航

**Covers:** 页面布局和路由导航

**Files:**
- Create: `client/src/components/Layout/MainLayout.tsx`

- [ ] **Step 1: 创建主布局组件**

```tsx
// client/src/components/Layout/MainLayout.tsx
import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Home as HomeIcon,
  Receipt as TransactionsIcon,
  BarChart as StatisticsIcon,
  AccountBalance as BudgetsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface MainLayoutProps {
  children: React.ReactNode;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

const drawerWidth = 240;

const menuItems = [
  { text: '首页', icon: <HomeIcon />, path: '/' },
  { text: '收支记录', icon: <TransactionsIcon />, path: '/transactions' },
  { text: '统计分析', icon: <StatisticsIcon />, path: '/statistics' },
  { text: '预算管理', icon: <BudgetsIcon />, path: '/budgets' },
  { text: '设置', icon: <SettingsIcon />, path: '/settings' },
];

export default function MainLayout({ children, isDarkMode, onThemeToggle }: MainLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          个人记账本
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (isMobile) setMobileOpen(false);
            }}
            selected={location.pathname === item.path}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find((item) => item.path === location.pathname)?.text || '个人记账本'}
          </Typography>
          <IconButton color="inherit" onClick={onThemeToggle}>
            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: 创建占位页面**

```tsx
// client/src/pages/HomePage.tsx
import React from 'react';
import { Typography, Box } from '@mui/material';

export default function HomePage() {
  return (
    <Box>
      <Typography variant="h4">首页</Typography>
      <Typography>欢迎使用个人记账本</Typography>
    </Box>
  );
}
```

```tsx
// client/src/pages/TransactionsPage.tsx
import React from 'react';
import { Typography, Box } from '@mui/material';

export default function TransactionsPage() {
  return (
    <Box>
      <Typography variant="h4">收支记录</Typography>
    </Box>
  );
}
```

```tsx
// client/src/pages/StatisticsPage.tsx
import React from 'react';
import { Typography, Box } from '@mui/material';

export default function StatisticsPage() {
  return (
    <Box>
      <Typography variant="h4">统计分析</Typography>
    </Box>
  );
}
```

```tsx
// client/src/pages/BudgetsPage.tsx
import React from 'react';
import { Typography, Box } from '@mui/material';

export default function BudgetsPage() {
  return (
    <Box>
      <Typography variant="h4">预算管理</Typography>
    </Box>
  );
}
```

```tsx
// client/src/pages/SettingsPage.tsx
import React from 'react';
import { Typography, Box } from '@mui/material';

export default function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4">设置</Typography>
    </Box>
  );
}
```

- [ ] **Step 3: 测试导航功能**

```bash
cd client
npm run dev
# 点击导航菜单，验证页面切换正常
```

- [ ] **Step 4: 提交代码**

```bash
git add client/src/components/Layout/MainLayout.tsx client/src/pages/
git commit -m "feat: add main layout with navigation drawer"
```

---

## Task 10: 首页仪表盘

**Covers:** 首页概览和快速记账

**Files:**
- Modify: `client/src/pages/HomePage.tsx`
- Create: `client/src/stores/transactionStore.ts`

- [ ] **Step 1: 创建状态管理Store**

```typescript
// client/src/stores/transactionStore.ts
import { create } from 'zustand';
import { transactionApi } from '../api';
import { TransactionWithDetails, TransactionFilter, StatsData } from '../types';

interface TransactionState {
  transactions: TransactionWithDetails[];
  total: number;
  stats: StatsData | null;
  loading: boolean;
  filter: TransactionFilter;
  fetchTransactions: (filter?: TransactionFilter) => Promise<void>;
  fetchStats: (params?: { start_date?: string; end_date?: string }) => Promise<void>;
  setFilter: (filter: TransactionFilter) => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  total: 0,
  stats: null,
  loading: false,
  filter: { page: 1, limit: 20 },

  fetchTransactions: async (filter?: TransactionFilter) => {
    set({ loading: true });
    try {
      const currentFilter = filter || get().filter;
      const response = await transactionApi.getAll(currentFilter);
      set({
        transactions: response.data.data,
        total: response.data.total,
        filter: currentFilter,
      });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async (params?: { start_date?: string; end_date?: string }) => {
    try {
      const response = await transactionApi.getStats(params || {});
      set({ stats: response.data });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },

  setFilter: (filter: TransactionFilter) => {
    set({ filter });
  },
}));
```

- [ ] **Step 2: 实现首页仪表盘**

```tsx
// client/src/pages/HomePage.tsx
import React, { useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  AccountBalance as BalanceIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/transactionStore';

export default function HomePage() {
  const navigate = useNavigate();
  const { transactions, stats, fetchTransactions, fetchStats, loading } = useTransactionStore();

  useEffect(() => {
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

    fetchStats({ start_date: startDate, end_date: endDate });
    fetchTransactions({ page: 1, limit: 5, sort: 'date', order: 'desc' });
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        本月概览
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <IncomeIcon color="success" sx={{ mr: 1 }} />
                <Typography color="text.secondary">本月收入</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {stats ? formatAmount(stats.totalIncome) : '¥0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ExpenseIcon color="error" sx={{ mr: 1 }} />
                <Typography color="text.secondary">本月支出</Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {stats ? formatAmount(stats.totalExpense) : '¥0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BalanceIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary">本月结余</Typography>
              </Box>
              <Typography variant="h4" color="primary.main">
                {stats ? formatAmount(stats.balance) : '¥0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">最近记录</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/transactions')}
        >
          快速记账
        </Button>
      </Box>

      <Card>
        <List>
          {transactions.map((transaction) => (
            <ListItem key={transaction.id} divider>
              <ListItemIcon>
                <Typography>{transaction.category.icon}</Typography>
              </ListItemIcon>
              <ListItemText
                primary={transaction.note || transaction.category.name}
                secondary={transaction.date}
              />
              <Chip
                label={`${transaction.type === 'expense' ? '-' : '+'}${formatAmount(transaction.amount)}`}
                color={transaction.type === 'expense' ? 'error' : 'success'}
                variant="outlined"
              />
            </ListItem>
          ))}
          {transactions.length === 0 && (
            <ListItem>
              <ListItemText primary="暂无记录" secondary="点击上方按钮开始记账" />
            </ListItem>
          )}
        </List>
      </Card>
    </Box>
  );
}
```

- [ ] **Step 3: 测试首页功能**

```bash
cd client
npm run dev
# 验证首页显示本月概览和最近记录
```

- [ ] **Step 4: 提交代码**

```bash
git add client/src/stores/transactionStore.ts client/src/pages/HomePage.tsx
git commit -m "feat: implement home page dashboard with stats overview"
```

---

## Task 11: 收支记录页面

**Covers:** 收支记录列表、筛选、新增/编辑

**Files:**
- Modify: `client/src/pages/TransactionsPage.tsx`
- Create: `client/src/components/TransactionForm.tsx`
- Create: `client/src/components/TransactionList.tsx`
- Create: `client/src/components/FilterPanel.tsx`
- Create: `client/src/stores/categoryStore.ts`
- Create: `client/src/stores/tagStore.ts`

- [ ] **Step 1: 创建分类和标签Store**

```typescript
// client/src/stores/categoryStore.ts
import { create } from 'zustand';
import { categoryApi } from '../api';
import { Category } from '../types';

interface CategoryState {
  categories: Category[];
  loading: boolean;
  fetchCategories: (type?: 'income' | 'expense') => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,

  fetchCategories: async (type?: 'income' | 'expense') => {
    set({ loading: true });
    try {
      const response = await categoryApi.getAll(type);
      set({ categories: response.data });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      set({ loading: false });
    }
  },
}));
```

```typescript
// client/src/stores/tagStore.ts
import { create } from 'zustand';
import { tagApi } from '../api';
import { Tag } from '../types';

interface TagState {
  tags: Tag[];
  loading: boolean;
  fetchTags: () => Promise<void>;
  createTag: (name: string) => Promise<Tag | null>;
}

export const useTagStore = create<TagState>((set) => ({
  tags: [],
  loading: false,

  fetchTags: async () => {
    set({ loading: true });
    try {
      const response = await tagApi.getAll();
      set({ tags: response.data });
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      set({ loading: false });
    }
  },

  createTag: async (name: string) => {
    try {
      const response = await tagApi.create(name);
      set((state) => ({ tags: [...state.tags, response.data] }));
      return response.data;
    } catch (error) {
      console.error('Failed to create tag:', error);
      return null;
    }
  },
}));
```

- [ ] **Step 2: 创建筛选面板组件**

```tsx
// client/src/components/FilterPanel.tsx
import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Grid,
  Button,
  Chip,
} from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import { TransactionFilter, Category, Tag } from '../types';

interface FilterPanelProps {
  filter: TransactionFilter;
  categories: Category[];
  tags: Tag[];
  onFilterChange: (filter: TransactionFilter) => void;
  onClear: () => void;
}

export default function FilterPanel({ filter, categories, tags, onFilterChange, onClear }: FilterPanelProps) {
  const handleChange = (field: keyof TransactionFilter, value: any) => {
    onFilterChange({ ...filter, [field]: value, page: 1 });
  };

  const hasFilters = filter.type || filter.category_id || filter.tag_id || filter.start_date || filter.end_date || filter.keyword;

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            fullWidth
            label="类型"
            value={filter.type || ''}
            onChange={(e) => handleChange('type', e.target.value || undefined)}
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="income">收入</MenuItem>
            <MenuItem value="expense">支出</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            fullWidth
            label="分类"
            value={filter.category_id || ''}
            onChange={(e) => handleChange('category_id', e.target.value ? Number(e.target.value) : undefined)}
          >
            <MenuItem value="">全部</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            fullWidth
            label="标签"
            value={filter.tag_id || ''}
            onChange={(e) => handleChange('tag_id', e.target.value ? Number(e.target.value) : undefined)}
          >
            <MenuItem value="">全部</MenuItem>
            {tags.map((tag) => (
              <MenuItem key={tag.id} value={tag.id}>
                {tag.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="关键字搜索"
            value={filter.keyword || ''}
            onChange={(e) => handleChange('keyword', e.target.value || undefined)}
            placeholder="搜索备注"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            type="date"
            label="开始日期"
            value={filter.start_date || ''}
            onChange={(e) => handleChange('start_date', e.target.value || undefined)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            type="date"
            label="结束日期"
            value={filter.end_date || ''}
            onChange={(e) => handleChange('end_date', e.target.value || undefined)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            type="number"
            label="最小金额"
            value={filter.min_amount || ''}
            onChange={(e) => handleChange('min_amount', e.target.value ? Number(e.target.value) : undefined)}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            type="number"
            label="最大金额"
            value={filter.max_amount || ''}
            onChange={(e) => handleChange('max_amount', e.target.value ? Number(e.target.value) : undefined)}
          />
        </Grid>

        {hasFilters && (
          <Grid item xs={12}>
            <Button
              startIcon={<ClearIcon />}
              onClick={onClear}
              color="secondary"
            >
              清除筛选
            </Button>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 3: 创建记账表单组件**

```tsx
// client/src/components/TransactionForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
  Chip,
  Autocomplete,
} from '@mui/material';
import { TransactionWithDetails, Category, Tag } from '../types';

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  transaction?: TransactionWithDetails | null;
  categories: Category[];
  tags: Tag[];
  onCreateTag: (name: string) => Promise<Tag | null>;
}

export default function TransactionForm({
  open,
  onClose,
  onSubmit,
  transaction,
  categories,
  tags,
  onCreateTag,
}: TransactionFormProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setCategoryId(transaction.category_id);
      setNote(transaction.note || '');
      setDate(transaction.date);
      setSelectedTags(transaction.tags);
    } else {
      setType('expense');
      setAmount('');
      setCategoryId('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedTags([]);
    }
  }, [transaction]);

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = () => {
    if (!amount || !categoryId || !date) return;

    onSubmit({
      type,
      amount: parseFloat(amount),
      category_id: categoryId,
      note: note || undefined,
      date,
      tag_ids: selectedTags.map((t) => t.id),
    });

    onClose();
  };

  const handleCreateTag = async (name: string) => {
    const newTag = await onCreateTag(name);
    if (newTag) {
      setSelectedTags([...selectedTags, newTag]);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{transaction ? '编辑记录' : '新增记录'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, value) => value && setType(value)}
            fullWidth
          >
            <ToggleButton value="expense">支出</ToggleButton>
            <ToggleButton value="income">收入</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="金额"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            fullWidth
          />

          <TextField
            select
            label="分类"
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            required
            fullWidth
          >
            {filteredCategories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </MenuItem>
            ))}
          </TextField>

          <Autocomplete
            multiple
            options={tags}
            value={selectedTags}
            onChange={(_, value) => setSelectedTags(value)}
            getOptionLabel={(option) => option.name}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option.name} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="标签" placeholder="选择或创建标签" />
            )}
            freeSolo
            onInputChange={(_, value, reason) => {
              if (reason === 'input' && value) {
                const existing = tags.find((t) => t.name === value);
                if (!existing) {
                  handleCreateTag(value);
                }
              }
            }}
          />

          <TextField
            label="备注"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />

          <TextField
            label="日期"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!amount || !categoryId || !date}>
          {transaction ? '保存' : '添加'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 4: 创建记录列表组件**

```tsx
// client/src/components/TransactionList.tsx
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  TablePagination,
  Box,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { TransactionWithDetails } from '../types';

interface TransactionListProps {
  transactions: TransactionWithDetails[];
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onEdit: (transaction: TransactionWithDetails) => void;
  onDelete: (id: number) => void;
}

export default function TransactionList({
  transactions,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>日期</TableCell>
              <TableCell>分类</TableCell>
              <TableCell>备注</TableCell>
              <TableCell>标签</TableCell>
              <TableCell align="right">金额</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.date}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ mr: 1 }}>{transaction.category.icon}</Typography>
                    {transaction.category.name}
                  </Box>
                </TableCell>
                <TableCell>{transaction.note || '-'}</TableCell>
                <TableCell>
                  {transaction.tags.map((tag) => (
                    <Chip key={tag.id} label={tag.name} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell align="right">
                  <Typography
                    color={transaction.type === 'expense' ? 'error' : 'success'}
                    fontWeight="bold"
                  >
                    {transaction.type === 'expense' ? '-' : '+'}
                    {formatAmount(transaction.amount)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => onEdit(transaction)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete(transaction.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    暂无记录
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page - 1}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="每页条数"
      />
    </Paper>
  );
}
```

- [ ] **Step 5: 实现收支记录页面**

```tsx
// client/src/pages/TransactionsPage.tsx
import React, { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useTransactionStore } from '../stores/transactionStore';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';
import { TransactionWithDetails, TransactionFilter } from '../types';
import { transactionApi } from '../api';
import FilterPanel from '../components/FilterPanel';
import TransactionList from '../components/TransactionList';
import TransactionForm from '../components/TransactionForm';

export default function TransactionsPage() {
  const { transactions, total, filter, loading, fetchTransactions, setFilter } = useTransactionStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { tags, fetchTags, createTag } = useTagStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    fetchTags();
  }, []);

  const handleFilterChange = (newFilter: TransactionFilter) => {
    setFilter(newFilter);
    fetchTransactions(newFilter);
  };

  const handleClearFilter = () => {
    const defaultFilter: TransactionFilter = { page: 1, limit: 20 };
    setFilter(defaultFilter);
    fetchTransactions(defaultFilter);
  };

  const handlePageChange = (page: number) => {
    handleFilterChange({ ...filter, page });
  };

  const handleRowsPerPageChange = (limit: number) => {
    handleFilterChange({ ...filter, limit, page: 1 });
  };

  const handleCreate = async (data: any) => {
    await transactionApi.create(data);
    fetchTransactions();
  };

  const handleUpdate = async (data: any) => {
    if (editingTransaction) {
      await transactionApi.update(editingTransaction.id, data);
      fetchTransactions();
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      await transactionApi.delete(id);
      fetchTransactions();
    }
  };

  const handleEdit = (transaction: TransactionWithDetails) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingTransaction(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">收支记录</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setFormOpen(true)}
        >
          新增记录
        </Button>
      </Box>

      <FilterPanel
        filter={filter}
        categories={categories}
        tags={tags}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilter}
      />

      <TransactionList
        transactions={transactions}
        total={total}
        page={filter.page || 1}
        rowsPerPage={filter.limit || 20}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <TransactionForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={editingTransaction ? handleUpdate : handleCreate}
        transaction={editingTransaction}
        categories={categories}
        tags={tags}
        onCreateTag={createTag}
      />
    </Box>
  );
}
```

- [ ] **Step 6: 测试收支记录功能**

```bash
cd client
npm run dev
# 测试筛选、新增、编辑、删除功能
```

- [ ] **Step 7: 提交代码**

```bash
git add client/src/stores/ client/src/components/ client/src/pages/TransactionsPage.tsx
git commit -m "feat: implement transaction list with filtering and CRUD operations"
```

---

## Task 12: 统计图表页面

**Covers:** 统计图表展示

**Files:**
- Modify: `client/src/pages/StatisticsPage.tsx`
- Create: `client/src/components/StatsCharts.tsx`

- [ ] **Step 1: 创建统计图表组件**

```tsx
// client/src/components/StatsCharts.tsx
import React from 'react';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { StatsData } from '../types';

interface StatsChartsProps {
  stats: StatsData;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BDC3C7'];

export default function StatsCharts({ stats }: StatsChartsProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  const categoryData = stats.categoryStats.map((item, index) => ({
    name: item.name,
    value: item.total,
    color: item.color || COLORS[index % COLORS.length],
  }));

  const dailyData = stats.dailyStats.reduce((acc, item) => {
    const existing = acc.find((d) => d.date === item.date);
    if (existing) {
      existing[item.type] = item.total;
    } else {
      acc.push({ date: item.date, [item.type]: item.total });
    }
    return acc;
  }, [] as any[]);

  const monthlyData = stats.dailyStats.reduce((acc, item) => {
    const month = item.date.substring(0, 7);
    const existing = acc.find((d) => d.month === month);
    if (existing) {
      existing[item.type] = (existing[item.type] || 0) + item.total;
    } else {
      acc.push({ month, [item.type]: item.total });
    }
    return acc;
  }, [] as any[]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              支出分类占比
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatAmount(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              收支概览
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography color="success.main" variant="h4">
                  {formatAmount(stats.totalIncome)}
                </Typography>
                <Typography color="text.secondary">总收入</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography color="error.main" variant="h4">
                  {formatAmount(stats.totalExpense)}
                </Typography>
                <Typography color="text.secondary">总支出</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography color="primary.main" variant="h4">
                  {formatAmount(stats.balance)}
                </Typography>
                <Typography color="text.secondary">结余</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              每日收支趋势
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatAmount(value as number)} />
                <Legend />
                <Line type="monotone" dataKey="income" name="收入" stroke="#4CAF50" />
                <Line type="monotone" dataKey="expense" name="支出" stroke="#F44336" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              月度收支对比
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatAmount(value as number)} />
                <Legend />
                <Bar dataKey="income" name="收入" fill="#4CAF50" />
                <Bar dataKey="expense" name="支出" fill="#F44336" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              分类支出排行
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value) => formatAmount(value as number)} />
                <Bar dataKey="value" fill="#8884d8">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
```

- [ ] **Step 2: 实现统计页面**

```tsx
// client/src/pages/StatisticsPage.tsx
import React, { useEffect, useState } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, TextField, Grid } from '@mui/material';
import { useTransactionStore } from '../stores/transactionStore';
import StatsCharts from '../components/StatsCharts';

export default function StatisticsPage() {
  const { stats, fetchStats, loading } = useTransactionStore();
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const now = new Date();
    let start = '';
    let end = '';

    switch (period) {
      case 'month':
        start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = `${now.getFullYear()}-${String(quarter * 3 + 1).padStart(2, '0')}-01`;
        end = `${now.getFullYear()}-${String((quarter + 1) * 3).padStart(2, '0')}-31`;
        break;
      case 'year':
        start = `${now.getFullYear()}-01-01`;
        end = `${now.getFullYear()}-12-31`;
        break;
      case 'custom':
        start = startDate;
        end = endDate;
        break;
    }

    if (start && end) {
      fetchStats({ start_date: start, end_date: end });
    }
  }, [period, startDate, endDate]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        统计分析
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, value) => value && setPeriod(value)}
        >
          <ToggleButton value="month">本月</ToggleButton>
          <ToggleButton value="quarter">本季</ToggleButton>
          <ToggleButton value="year">本年</ToggleButton>
          <ToggleButton value="custom">自定义</ToggleButton>
        </ToggleButtonGroup>

        {period === 'custom' && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              type="date"
              label="开始日期"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <TextField
              type="date"
              label="结束日期"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Box>
        )}
      </Box>

      {stats ? (
        <StatsCharts stats={stats} />
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          加载中...
        </Typography>
      )}
    </Box>
  );
}
```

- [ ] **Step 3: 测试统计图表功能**

```bash
cd client
npm run dev
# 验证图表正确显示，切换时间维度正常
```

- [ ] **Step 4: 提交代码**

```bash
git add client/src/components/StatsCharts.tsx client/src/pages/StatisticsPage.tsx
git commit -m "feat: implement statistics page with charts"
```

---

## Task 13: 预算管理页面

**Covers:** 预算管理功能

**Files:**
- Modify: `client/src/pages/BudgetsPage.tsx`
- Create: `client/src/components/BudgetCard.tsx`

- [ ] **Step 1: 创建预算卡片组件**

```tsx
// client/src/components/BudgetCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  IconButton,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { BudgetStatus, Category } from '../types';

interface BudgetCardProps {
  budgetStatus: BudgetStatus;
  categories: Category[];
  onEdit: (budget: BudgetStatus['budget']) => void;
  onDelete: (id: number) => void;
}

export default function BudgetCard({ budgetStatus, categories, onEdit, onDelete }: BudgetCardProps) {
  const { budget, spent, remaining } = budgetStatus;
  const percentage = Math.min((spent / budget.amount) * 100, 100);
  const isOverBudget = spent > budget.amount;

  const category = categories.find((c) => c.id === budget.category_id);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6">
              {category ? `${category.icon} ${category.name}` : '总预算'}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {budget.period === 'monthly' ? '月度预算' : '年度预算'}
            </Typography>
          </Box>
          <Box>
            <IconButton size="small" onClick={() => onEdit(budget)}>
              <EditIcon />
            </IconButton>
            <IconButton size="small" onClick={() => onDelete(budget.id)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              已花费: {formatAmount(spent)}
            </Typography>
            <Typography variant="body2">
              预算: {formatAmount(budget.amount)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={percentage}
            color={isOverBudget ? 'error' : 'primary'}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography
            variant="body2"
            color={isOverBudget ? 'error' : 'success'}
          >
            {isOverBudget ? '超支' : '剩余'}: {formatAmount(Math.abs(remaining))}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {percentage.toFixed(1)}%
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 实现预算管理页面**

```tsx
// client/src/pages/BudgetsPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { budgetApi } from '../api';
import { useCategoryStore } from '../stores/categoryStore';
import { Budget, BudgetStatus } from '../types';
import BudgetCard from '../components/BudgetCard';

export default function BudgetsPage() {
  const { categories, fetchCategories } = useCategoryStore();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [formData, setFormData] = useState({
    category_id: '' as number | '',
    amount: '',
    period: 'monthly' as 'monthly' | 'yearly',
    start_date: new Date().toISOString().substring(0, 7) + '-01',
  });

  const currentMonth = new Date().toISOString().substring(0, 7);

  useEffect(() => {
    fetchCategories();
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const [budgetsRes, statusRes] = await Promise.all([
        budgetApi.getAll(),
        budgetApi.getStatus(currentMonth),
      ]);
      setBudgets(budgetsRes.data);
      setBudgetStatuses(statusRes.data);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const data = {
        category_id: formData.category_id || undefined,
        amount: parseFloat(formData.amount),
        period: formData.period,
        start_date: formData.start_date,
      };

      if (editingBudget) {
        await budgetApi.update(editingBudget.id, data);
      } else {
        await budgetApi.create(data);
      }

      setFormOpen(false);
      setEditingBudget(null);
      resetForm();
      loadBudgets();
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      category_id: budget.category_id || '',
      amount: String(budget.amount),
      period: budget.period,
      start_date: budget.start_date,
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除这个预算吗？')) {
      await budgetApi.delete(id);
      loadBudgets();
    }
  };

  const resetForm = () => {
    setFormData({
      category_id: '',
      amount: '',
      period: 'monthly',
      start_date: new Date().toISOString().substring(0, 7) + '-01',
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">预算管理</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setEditingBudget(null);
            setFormOpen(true);
          }}
        >
          新增预算
        </Button>
      </Box>

      <Grid container spacing={3}>
        {budgetStatuses.map((status) => (
          <Grid item xs={12} sm={6} md={4} key={status.budget.id}>
            <BudgetCard
              budgetStatus={status}
              categories={categories}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </Grid>
        ))}
        {budgetStatuses.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              暂无预算，点击上方按钮创建
            </Typography>
          </Grid>
        )}
      </Grid>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBudget ? '编辑预算' : '新增预算'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="分类（留空为总预算）"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : '' })}
              fullWidth
            >
              <MenuItem value="">总预算</MenuItem>
              {categories.filter((c) => c.type === 'expense').map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="预算金额"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              fullWidth
            />

            <TextField
              select
              label="周期"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value as 'monthly' | 'yearly' })}
              fullWidth
            >
              <MenuItem value="monthly">月度</MenuItem>
              <MenuItem value="yearly">年度</MenuItem>
            </TextField>

            <TextField
              label="开始日期"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.amount}>
            {editingBudget ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 3: 测试预算管理功能**

```bash
cd client
npm run dev
# 测试创建、编辑、删除预算，查看预算状态
```

- [ ] **Step 4: 提交代码**

```bash
git add client/src/components/BudgetCard.tsx client/src/pages/BudgetsPage.tsx
git commit -m "feat: implement budget management page"
```

---

## Task 14: 设置页面

**Covers:** 分类管理、标签管理、导入导出

**Files:**
- Modify: `client/src/pages/SettingsPage.tsx`

- [ ] **Step 1: 实现设置页面**

```tsx
// client/src/pages/SettingsPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useCategoryStore } from '../stores/categoryStore';
import { useTagStore } from '../stores/tagStore';
import { categoryApi, importExportApi } from '../api';
import { Category } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const { categories, fetchCategories } = useCategoryStore();
  const { tags, fetchTags, createTag } = useTagStore();
  const [tabValue, setTabValue] = useState(0);

  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: '',
    color: '#1976d2',
  });

  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, []);

  const handleCreateCategory = async () => {
    try {
      await categoryApi.create(categoryForm);
      setCategoryFormOpen(false);
      resetCategoryForm();
      fetchCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    try {
      await categoryApi.update(editingCategory.id, {
        name: categoryForm.name,
        icon: categoryForm.icon,
        color: categoryForm.color,
      });
      setCategoryFormOpen(false);
      setEditingCategory(null);
      resetCategoryForm();
      fetchCategories();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (window.confirm('确定要删除这个分类吗？')) {
      await categoryApi.delete(id);
      fetchCategories();
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await createTag(newTagName.trim());
    setNewTagName('');
  };

  const handleDeleteTag = async (id: number) => {
    const { tagApi } = await import('../api');
    await tagApi.delete(id);
    fetchTags();
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await importExportApi.export(format);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ledger-export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      let transactions;
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        transactions = data.transactions || data;
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n');
        const header = lines[0].split(',');
        transactions = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',');
          return {
            date: values[0],
            type: values[1],
            category: values[2],
            amount: parseFloat(values[3]),
            tags: values[4] ? values[4].split(';') : [],
            note: values[5] || '',
          };
        });
      }

      if (transactions) {
        const result = await importExportApi.import(transactions);
        alert(`导入完成: 成功 ${result.data.success} 条, 失败 ${result.data.failed} 条`);
        fetchCategories();
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to import:', error);
      alert('导入失败，请检查文件格式');
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      type: 'expense',
      icon: '',
      color: '#1976d2',
    });
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        设置
      </Typography>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="分类管理" />
        <Tab label="标签管理" />
        <Tab label="数据导入导出" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5">支出分类</Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={() => {
              resetCategoryForm();
              setEditingCategory(null);
              setCategoryFormOpen(true);
            }}
          >
            新增分类
          </Button>
        </Box>

        <Grid container spacing={2}>
          {expenseCategories.map((cat) => (
            <Grid item xs={12} sm={6} md={4} key={cat.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h5" sx={{ mr: 1 }}>{cat.icon}</Typography>
                      <Typography>{cat.name}</Typography>
                    </Box>
                    <Box>
                      {!cat.is_preset && (
                        <>
                          <IconButton size="small" onClick={() => {
                            setEditingCategory(cat);
                            setCategoryForm({
                              name: cat.name,
                              type: cat.type,
                              icon: cat.icon || '',
                              color: cat.color || '#1976d2',
                            });
                            setCategoryFormOpen(true);
                          }}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteCategory(cat.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4, mb: 2 }}>
          <Typography variant="h5">收入分类</Typography>
        </Box>

        <Grid container spacing={2}>
          {incomeCategories.map((cat) => (
            <Grid item xs={12} sm={6} md={4} key={cat.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h5" sx={{ mr: 1 }}>{cat.icon}</Typography>
                      <Typography>{cat.name}</Typography>
                    </Box>
                    <Box>
                      {!cat.is_preset && (
                        <>
                          <IconButton size="small" onClick={() => {
                            setEditingCategory(cat);
                            setCategoryForm({
                              name: cat.name,
                              type: cat.type,
                              icon: cat.icon || '',
                              color: cat.color || '#1976d2',
                            });
                            setCategoryFormOpen(true);
                          }}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteCategory(cat.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h5" gutterBottom>标签管理</Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="新标签名称"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            size="small"
          />
          <Button variant="contained" onClick={handleCreateTag} disabled={!newTagName.trim()}>
            添加标签
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {tags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              onDelete={() => handleDeleteTag(tag.id)}
            />
          ))}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="h5" gutterBottom>数据导入导出</Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>导出数据</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  将所有收支记录导出为文件
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport('json')}
                  >
                    导出 JSON
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport('csv')}
                  >
                    导出 CSV
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>导入数据</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  从 JSON 或 CSV 文件导入收支记录
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                >
                  选择文件
                  <input
                    type="file"
                    hidden
                    accept=".json,.csv"
                    onChange={handleImport}
                  />
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <Dialog open={categoryFormOpen} onClose={() => setCategoryFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategory ? '编辑分类' : '新增分类'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="分类名称"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              required
              fullWidth
            />

            {!editingCategory && (
              <TextField
                select
                label="类型"
                value={categoryForm.type}
                onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value as 'income' | 'expense' })}
                fullWidth
              >
                <MenuItem value="expense">支出</MenuItem>
                <MenuItem value="income">收入</MenuItem>
              </TextField>
            )}

            <TextField
              label="图标（emoji）"
              value={categoryForm.icon}
              onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
              fullWidth
            />

            <TextField
              label="颜色"
              type="color"
              value={categoryForm.color}
              onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryFormOpen(false)}>取消</Button>
          <Button
            onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
            variant="contained"
            disabled={!categoryForm.name}
          >
            {editingCategory ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 2: 测试设置页面功能**

```bash
cd client
npm run dev
# 测试分类管理、标签管理、导入导出功能
```

- [ ] **Step 3: 提交代码**

```bash
git add client/src/pages/SettingsPage.tsx
git commit -m "feat: implement settings page with category, tag management and import/export"
```

---

## Task 15: Docker部署配置

**Covers:** Docker部署

**Files:**
- Modify: `docker-compose.yml`
- Modify: `Dockerfile`
- Create: `server/package.json` (update scripts)
- Create: `client/package.json` (update scripts)

- [ ] **Step 1: 更新后端package.json**

```json
{
  "name": "ledger-server",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "better-sqlite3": "^9.0.0",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.2"
  }
}
```

- [ ] **Step 2: 更新前端package.json**

```json
{
  "name": "ledger-client",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "@mui/icons-material": "^5.15.0",
    "@mui/material": "^5.15.0",
    "axios": "^1.6.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "recharts": "^2.10.3",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@types/react-router-dom": "^5.3.3",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.2",
    "vite": "^5.0.8"
  }
}
```

- [ ] **Step 3: 更新Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制后端依赖并安装
COPY server/package*.json ./server/
RUN cd server && npm install

# 复制前端依赖并安装
COPY client/package*.json ./client/
RUN cd client && npm install

# 复制所有源代码
COPY server/ ./server/
COPY client/ ./client/

# 构建前端
RUN cd client && npm run build

# 构建后端
RUN cd server && npm run build

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server/dist/index.js"]
```

- [ ] **Step 4: 更新docker-compose.yml**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/server/data
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
```

- [ ] **Step 5: 测试Docker构建**

```bash
docker-compose build
docker-compose up
# 访问 http://localhost:3000 验证应用正常运行
```

- [ ] **Step 6: 提交代码**

```bash
git add docker-compose.yml Dockerfile server/package.json client/package.json
git commit -m "feat: add Docker deployment configuration"
```

---

## Task 16: 最终测试和优化

**Covers:** 完整功能测试

- [ ] **Step 1: 测试所有功能**

```bash
# 启动应用
docker-compose up -d

# 测试清单：
# 1. 首页仪表盘 - 查看本月概览
# 2. 收支记录 - 新增、编辑、删除、筛选
# 3. 统计分析 - 查看各类图表
# 4. 预算管理 - 创建、编辑、删除预算
# 5. 设置 - 分类管理、标签管理、导入导出
# 6. 主题切换 - 深色/浅色模式
# 7. 响应式布局 - 不同屏幕尺寸
```

- [ ] **Step 2: 性能测试**

```bash
# 测试大量数据下的性能
# 导入测试数据
curl -X POST http://localhost:3000/api/import \
  -H "Content-Type: application/json" \
  -d @test-data.json

# 测试筛选响应时间
time curl "http://localhost:3000/api/transactions?type=expense&start_date=2024-01-01&end_date=2024-12-31"
```

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "chore: final testing and optimization"
```

---

## 完成

实现计划完成！现在可以使用 `compose:subagent` 或 `compose:execute` 来执行这个计划。
