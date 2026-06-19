# 个人记账本应用设计文档

## 1. 项目概述

### 1.1 项目名称
个人记账本 (Personal Ledger)

### 1.2 项目目标
开发一个个人日常收支记录应用，支持多维度筛选、统计图表、预算管理和数据导入导出功能。

### 1.3 目标用户
个人用户，用于日常收支记录和消费分析。

### 1.4 核心价值
- 简洁高效的收支记录
- 多维度数据筛选和统计
- 可视化消费趋势分析
- 灵活的预算管理
- 数据导入导出支持

---

## 2. 功能需求

### 2.1 核心功能

#### 2.1.1 收支记录
- **记录类型**: 收入 (income) / 支出 (expense)
- **记录字段**:
  - 金额 (必填)
  - 分类 (必填，预设+自定义)
  - 标签 (可选，支持多个)
  - 备注 (可选)
  - 日期 (必填，默认今天)
- **操作**: 新增、编辑、删除

#### 2.1.2 多维度筛选
- 按类型: 收入/支出
- 按分类: 选择特定分类
- 按标签: 选择特定标签
- 按日期范围: 开始日期 ~ 结束日期
- 按金额范围: 最小金额 ~ 最大金额
- 关键字搜索: 搜索备注内容
- 排序: 按日期、金额排序
- 分页: 支持分页加载

#### 2.1.3 统计图表
- **饼图/环形图**: 各分类支出/收入占比
- **折线图**: 每日/月收支趋势
- **柱状图**: 月度收支对比
- **条形图**: 分类支出排行
- **时间维度**: 本月、本季、本年、自定义日期范围

#### 2.1.4 预算管理
- 设置月度/年度预算
- 支持按分类设置预算
- 预算使用进度展示
- 超支预警提醒

#### 2.1.5 数据导入导出
- **导入格式**: 标准 CSV、JSON，支付宝交易明细 CSV，微信支付账单 XLSX
- **导出格式**: CSV、JSON
- **导入规则**: 支付宝/微信导入按现金流处理，跳过不计收支/中性/关闭/失败/取消交易，并通过来源交易单号去重

### 2.2 分类体系

#### 预设支出分类
| 分类名称 | 图标 | 颜色 |
|---------|------|------|
| 餐饮 | 🍽️ | #FF6B6B |
| 交通 | 🚗 | #4ECDC4 |
| 购物 | 🛒 | #45B7D1 |
| 娱乐 | 🎮 | #96CEB4 |
| 居住 | 🏠 | #FFEAA7 |
| 医疗 | 💊 | #DDA0DD |
| 教育 | 📚 | #98D8C8 |
| 通讯 | 📱 | #F7DC6F |
| 其他 | 📦 | #BDC3C7 |

#### 预设收入分类
| 分类名称 | 图标 | 颜色 |
|---------|------|------|
| 工资 | 💰 | #2ECC71 |
| 奖金 | 🎁 | #27AE60 |
| 投资 | 📈 | #16A085 |
| 兼职 | 💼 | #1ABC9C |
| 其他 | 📦 | #95A5A6 |

#### 自定义分类
- 用户可新增自定义分类
- 可设置分类名称、图标、颜色
- 可编辑/删除自定义分类（预设分类不可删除）

### 2.3 标签体系
- 用户可自由创建标签
- 每条记录可添加多个标签
- 支持标签管理（增删改）

### 2.4 账户体系
- 单账户模式，不区分资金来源
- 简化记录流程

### 2.5 主题与语言
- **语言**: 中文
- **主题**: 深色模式 / 浅色模式切换
- **主题切换**: 顶部导航栏快捷切换

---

## 3. 技术架构

### 3.1 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 前端框架 | React | 19 | UI构建 |
| 类型系统 | TypeScript | 5.x | 类型安全 |
| UI组件库 | MUI (Material-UI) | 7.x | Material Design组件 |
| 状态管理 | Zustand | 5.x | 轻量级状态管理 |
| 图表库 | Recharts | 2.x | 数据可视化 |
| HTTP客户端 | Axios | 1.x | API请求 |
| 路由 | React Router | 7.x | 页面路由 |
| 后端框架 | Express.js | 5.x | API服务 |
| 数据库 | better-sqlite3 | 12.x | 本地SQLite数据库 |
| 容器化 | Docker + Docker Compose | - | 部署 |

### 3.2 项目结构

```
ledger/
├── client/                    # React前端
│   ├── src/
│   │   ├── components/        # 通用组件
│   │   │   ├── Layout/        # 布局组件
│   │   │   ├── common/        # 通用UI组件
│   │   │   └── charts/        # 图表组件
│   │   ├── features/          # 功能模块
│   │   │   ├── transactions/  # 收支记录
│   │   │   ├── statistics/    # 统计图表
│   │   │   ├── budget/        # 预算管理
│   │   │   └── settings/      # 设置
│   │   ├── hooks/             # 自定义hooks
│   │   ├── services/          # API调用服务
│   │   ├── stores/            # Zustand状态管理
│   │   ├── theme/             # MUI主题配置
│   │   ├── types/             # TypeScript类型定义
│   │   ├── utils/             # 工具函数
│   │   ├── App.tsx            # 根组件
│   │   └── main.tsx           # 入口文件
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                    # Node.js后端
│   ├── src/
│   │   ├── routes/            # Express路由
│   │   │   ├── transactions.ts
│   │   │   ├── categories.ts
│   │   │   ├── tags.ts
│   │   │   ├── budgets.ts
│   │   │   └── import-export.ts
│   │   ├── controllers/       # 控制器
│   │   ├── models/            # 数据模型
│   │   ├── services/          # 业务逻辑
│   │   ├── middleware/        # 中间件
│   │   ├── utils/             # 工具函数
│   │   └── index.ts           # 服务入口
│   ├── data/                  # SQLite数据文件
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

### 3.3 数据库设计

#### 收支记录表 (transactions)
```sql
CREATE TABLE transactions (
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

CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE UNIQUE INDEX idx_transactions_source_unique
  ON transactions(source, source_transaction_id)
  WHERE source IS NOT NULL AND source_transaction_id IS NOT NULL;
```

#### 分类表 (categories)
```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  is_preset INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);
```

#### 标签表 (tags)
```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
```

#### 收支-标签关联表 (transaction_tags)
```sql
CREATE TABLE transaction_tags (
  transaction_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (transaction_id, tag_id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

#### 预算表 (budgets)
```sql
CREATE TABLE budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  amount REAL NOT NULL,
  period TEXT NOT NULL CHECK(period IN ('monthly', 'yearly')),
  start_date TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### 3.4 API设计

#### 基础路径
```
/api
```

#### 收支记录 API
```
GET    /api/transactions          # 查询记录（支持筛选、分页）
POST   /api/transactions          # 新增记录
PUT    /api/transactions/:id      # 更新记录
DELETE /api/transactions/:id      # 删除记录
GET    /api/transactions/stats    # 统计数据
```

#### 分类 API
```
GET    /api/categories            # 获取所有分类
POST   /api/categories            # 新增自定义分类
PUT    /api/categories/:id        # 更新分类
DELETE /api/categories/:id        # 删除分类
```

#### 标签 API
```
GET    /api/tags                  # 获取所有标签
POST   /api/tags                  # 新增标签
DELETE /api/tags/:id              # 删除标签
```

#### 预算 API
```
GET    /api/budgets               # 获取预算列表
POST   /api/budgets               # 新增预算
PUT    /api/budgets/:id           # 更新预算
DELETE /api/budgets/:id           # 删除预算
```

#### 导入导出 API
```
POST   /api/import                # 导入数据
POST   /api/import/file           # 导入标准/支付宝/微信账单文件
GET    /api/export                # 导出数据
```

#### 筛选参数
```
GET /api/transactions?
  type=expense|income           # 按类型
  category_id=1                 # 按分类
  tag_id=1                      # 按标签
  start_date=2024-01-01         # 开始日期
  end_date=2024-01-31           # 结束日期
  min_amount=100                # 最小金额
  max_amount=1000               # 最大金额
  keyword=午餐                  # 关键字搜索（备注）
  page=1                        # 页码
  limit=20                      # 每页数量
  sort=date                     # 排序字段
  order=desc                    # 排序方向
```

---

## 4. 页面设计

### 4.1 页面路由

| 页面 | 功能 | 路由 |
|------|------|------|
| 首页/仪表盘 | 本月概览、快速记账、最近记录 | `/` |
| 收支记录 | 记录列表、筛选、新增/编辑 | `/transactions` |
| 统计分析 | 图表展示、趋势分析 | `/statistics` |
| 预算管理 | 预算设置、超支提醒 | `/budgets` |
| 设置 | 分类管理、标签管理、导入导出、主题切换 | `/settings` |

### 4.2 首页布局

```
┌─────────────────────────────────────────────┐
│  个人记账本              [深色/浅色切换] [设置] │
├─────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐         │
│  │ 本月收入      │  │ 本月支出      │         │
│  │ ¥12,500      │  │ ¥8,320       │         │
│  └──────────────┘  └──────────────┘         │
│  ┌──────────────────────────────────────┐   │
│  │ 本月结余: ¥4,180                      │   │
│  │ 预算剩余: ¥1,680 (68%)               │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  [快速记账按钮]                               │
│                                             │
│  最近记录:                                    │
│  ┌──────────────────────────────────────┐   │
│  │ 🍽️ 午餐    餐饮   -¥25    01-15     │   │
│  │ 🚗 加油    交通   -¥300   01-14     │   │
│  │ 💰 工资    收入   +¥8000  01-10     │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 4.3 统计页面布局

```
┌─────────────────────────────────────────────┐
│  统计分析                                     │
├─────────────────────────────────────────────┤
│  [本月] [本季] [本年] [自定义日期范围]          │
│                                             │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ 支出分类占比   │  │ 收入分类占比   │         │
│  │   [饼图]      │  │   [饼图]      │         │
│  └──────────────┘  └──────────────┘         │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ 每日收支趋势                           │   │
│  │         [折线图]                       │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ 月度收支对比                           │   │
│  │         [柱状图]                       │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ 分类支出排行                           │   │
│  │         [条形图]                       │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 5. Docker部署

### 5.1 docker-compose.yml
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

### 5.2 Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装后端依赖
COPY server/package*.json ./server/
RUN cd server && npm install --production

# 安装前端依赖并构建
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# 复制后端代码
COPY server/ ./server/

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server/src/index.js"]
```

### 5.3 数据持久化
- SQLite数据库文件: `./data/ledger.db`
- 通过Docker Volume挂载到宿主机

---

## 6. 非功能需求

### 6.1 性能要求
- 页面加载时间 < 2秒
- API响应时间 < 200ms
- 支持10000+条记录流畅查询

### 6.2 数据安全
- 数据本地存储，不上传云端
- 支持数据导出备份
- 无用户认证（个人使用）

### 6.3 浏览器兼容性
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 6.4 响应式设计
- 支持桌面端 (1024px+)
- 支持平板端 (768px-1023px)
- 支持移动端 (< 768px)

---

## 7. 开发计划

### 7.1 阶段一：基础框架搭建
- [ ] 初始化前后端项目
- [ ] 配置TypeScript、ESLint、Prettier
- [ ] 搭建Express服务框架
- [ ] 配置SQLite数据库
- [ ] 实现基础CRUD API

### 7.2 阶段二：核心功能开发
- [ ] 收支记录增删改查
- [ ] 分类管理（预设+自定义）
- [ ] 标签管理
- [ ] 多维度筛选功能
- [ ] 分页查询

### 7.3 阶段三：统计与图表
- [ ] 统计API开发
- [ ] 饼图/环形图组件
- [ ] 折线图组件
- [ ] 柱状图组件
- [ ] 条形图组件

### 7.4 阶段四：预算与导入导出
- [ ] 预算管理功能
- [ ] CSV导入导出
- [ ] JSON导入导出

### 7.5 阶段五：UI优化与部署
- [ ] 深色/浅色主题
- [ ] 响应式布局优化
- [ ] Docker打包
- [ ] 文档编写

---

## 8. 验收标准

### 8.1 功能验收
- [ ] 能够新增、编辑、删除收支记录
- [ ] 能够按类型、分类、标签、日期、金额、关键字筛选记录
- [ ] 能够查看四种统计图表
- [ ] 能够设置和管理预算
- [ ] 能够导入导出CSV和JSON数据
- [ ] 能够切换深色/浅色主题
- [ ] 能够通过Docker Compose部署

### 8.2 性能验收
- [ ] 首页加载时间 < 2秒
- [ ] 筛选查询响应时间 < 200ms
- [ ] 支持10000+条记录

### 8.3 兼容性验收
- [ ] Chrome、Firefox、Safari、Edge最新版本正常运行
- [ ] 桌面端、平板端、移动端响应式布局正常

---

## 附录

### A. 预设分类数据
```json
{
  "expense": [
    { "name": "餐饮", "icon": "🍽️", "color": "#FF6B6B" },
    { "name": "交通", "icon": "🚗", "color": "#4ECDC4" },
    { "name": "购物", "icon": "🛒", "color": "#45B7D1" },
    { "name": "娱乐", "icon": "🎮", "color": "#96CEB4" },
    { "name": "居住", "icon": "🏠", "color": "#FFEAA7" },
    { "name": "医疗", "icon": "💊", "color": "#DDA0DD" },
    { "name": "教育", "icon": "📚", "color": "#98D8C8" },
    { "name": "通讯", "icon": "📱", "color": "#F7DC6F" },
    { "name": "其他", "icon": "📦", "color": "#BDC3C7" }
  ],
  "income": [
    { "name": "工资", "icon": "💰", "color": "#2ECC71" },
    { "name": "奖金", "icon": "🎁", "color": "#27AE60" },
    { "name": "投资", "icon": "📈", "color": "#16A085" },
    { "name": "兼职", "icon": "💼", "color": "#1ABC9C" },
    { "name": "其他", "icon": "📦", "color": "#95A5A6" }
  ]
}
```

### B. CSV导入导出格式
```csv
日期,类型,分类,金额,标签,备注
2024-01-15,expense,餐饮,25.00,午餐,工作日午餐
2024-01-10,income,工资,8000.00,,1月工资
```

### C. JSON导入导出格式
```json
{
  "transactions": [
    {
      "date": "2024-01-15",
      "type": "expense",
      "category": "餐饮",
      "amount": 25.00,
      "tags": ["午餐"],
      "note": "工作日午餐"
    }
  ]
}
```
