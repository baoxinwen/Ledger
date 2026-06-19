# Personal Ledger

个人记账本是一个本地优先的中文收支记录应用，支持收支 CRUD、多维筛选、统计图表、预算管理、标准 JSON/CSV 导入导出，以及支付宝 CSV、微信 XLSX 账单导入。

## 技术栈

- 前端：React 19、TypeScript、Vite 6、MUI 7、Zustand、Recharts、Axios、React Router 7
- 后端：Express 5、TypeScript、better-sqlite3、SQLite
- 测试：Jest、ts-jest、Playwright
- 部署：Docker、Docker Compose

## 本地开发

```bash
cd server
npm install
npm run dev
```

```bash
cd client
npm install
npm run dev
```

开发环境后端默认监听 `http://localhost:3000`，前端 Vite 默认监听 `http://localhost:5173`，并将 `/api` 代理到后端。

## Docker 部署

```bash
docker compose pull
docker compose up -d
```

GitHub Actions 会在 `main` 分支推送后构建并发布 `ghcr.io/baoxinwen/ledger:latest`。`docker-compose.yml` 默认使用这个镜像；容器内 Express 会托管前端构建产物和 `/api` 接口，访问 `http://localhost:3000` 即可使用完整应用。SQLite 数据目录通过 `./data:/app/server/data` 挂载持久化。

如果需要本地临时构建镜像，可执行：

```bash
docker build -t ledger:local .
```

## 账单导入规则

- 标准导入：支持现有 JSON/CSV 格式。
- 支付宝导入：支持官方导出的交易明细 CSV，自动跳过说明区并读取 `交易时间,交易分类,...` 表头后的记录。
- 微信导入：支持官方导出的支付账单 XLSX，自动读取首个工作表中的账单明细。
- 现金流规则：只导入 `收入` 和 `支出`；跳过不计收支、中性交易、关闭、失败或取消状态；退款按账单中的收入行导入。
- 去重规则：导入记录保存来源和平台交易单号，重复导入同一账单会跳过已存在记录。
- 分类规则：按平台原始分类/交易类型自动创建自定义分类，并保留原始分类、支付方式、交易状态等元数据。

## 验证命令

```bash
cd server
npm test
npm run build
```

```bash
cd client
npm run build
npm run test:e2e
```
