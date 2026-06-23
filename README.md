# Personal Ledger

个人记账本是一个本地优先的中文收支记录应用，适合自己部署、自己维护。它支持收支记录、筛选查询、统计图表、预算管理、偏好设置、标准 JSON/CSV 导入导出，以及支付宝 CSV、微信 XLSX 账单导入。

## 功能概览

- 收支记录：新增、编辑、删除、按日期/分类/标签/金额/备注筛选。
- 统计分析：查看收支概览、趋势图、分类金额占比、分类排行和关键指标。
- 预算管理：支持月度/年度预算，并按当前业务时区计算本月预算状态。
- 账单导入：支持标准 JSON/CSV、支付宝 CSV、微信 XLSX。
- 偏好设置：支持业务时区和界面主题设置。
- Docker 部署：GitHub Actions 构建镜像，Docker Compose 一键启动。

## 技术栈

- 前端：React 19、TypeScript、Vite 6、MUI 7、Zustand、Recharts、Axios、React Router 7
- 后端：Express 5、TypeScript、better-sqlite3、SQLite
- 测试：Jest、ts-jest、Playwright
- 部署：Docker、Docker Compose

## 快速开始

如果只是部署使用，推荐直接看“Docker 部署”。如果需要改代码、调试页面或运行测试，再看“本地开发”和“验证命令”。

## Docker 部署

在服务器或 NAS 上进入项目目录后执行：

```bash
docker compose pull
docker compose up -d
```

启动后访问：

```text
http://localhost:3000
```

如果是在局域网服务器上部署，把 `localhost` 换成服务器 IP，例如：

```text
http://192.168.31.254:3000
```

`docker-compose.yml` 默认使用镜像：

```text
ghcr.io/baoxinwen/ledger:latest
```

GitHub Actions 会在 `main` 分支推送后构建并发布这个镜像。容器内 Express 会同时托管前端构建产物和 `/api` 接口。SQLite 数据通过下面的挂载目录持久化：

```text
./data:/app/server/data
```

默认部署使用中国时区：

- `TZ=Asia/Shanghai`：容器系统时区，同时作为应用业务时区首次初始化默认值。
- 之后如果在设置页“偏好设置”中保存了时区，以设置页保存的值为准。
- 界面主题默认跟随系统，也可以在设置页切换为浅色或深色模式。

## 常用 Docker 命令

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 启动或更新后重启 | `docker compose up -d` | 后台启动服务。 |
| 查看日志 | `docker compose logs -f app` | 排查导入失败、启动失败、接口错误时最常用。 |
| 拉取最新镜像 | `docker compose pull` | 从 GitHub Container Registry 拉取最新镜像。 |
| 更新到最新镜像 | `docker compose pull && docker compose up -d` | 拉取镜像后重新创建容器。 |
| 停止服务 | `docker compose down` | 停止并删除容器，不删除 `./data` 数据。 |
| 本地临时构建镜像 | `docker build -t ledger:local .` | 用当前代码在本机打一个测试镜像。 |

## 本地开发

本地开发需要分别启动后端和前端，建议打开两个终端窗口。

后端：

```bash
cd server
npm install
npm run dev
```

后端默认监听：

```text
http://localhost:3000
```

前端：

```bash
cd client
npm install
npm run dev
```

前端默认监听：

```text
http://localhost:5173
```

开发环境下，Vite 会把 `/api` 请求代理到后端 `http://localhost:3000`。所以本地调试页面时访问前端地址 `http://localhost:5173`。

## 验证命令

“验证命令”是给开发和提交代码前用的，用来确认代码没有明显坏掉。只用 Docker 部署时，通常不需要运行这些命令；部署排错优先看：

```bash
docker compose logs -f app
```

推荐提交前按这个顺序验证：

```bash
cd server
npm test
npm run build
```

```bash
cd client
npm run build
```

如果这次改动涉及页面交互，再额外运行：

```bash
cd client
npm run test:e2e
```

每条命令的含义如下：

| 命令 | 什么时候运行 | 检查什么 |
| --- | --- | --- |
| `cd server && npm test` | 改了后端逻辑、导入解析、预算、设置、数据库时运行 | 运行 Jest 单元测试，确认后端核心逻辑符合预期。 |
| `cd server && npm run build` | 改了后端 TypeScript 文件后运行 | 检查后端能否编译到 `server/dist`。 |
| `cd client && npm run build` | 改了前端页面、组件、store、工具函数后运行 | 检查前端 TypeScript 和 Vite 生产构建是否通过。 |
| `cd client && npm run test:e2e` | 改了页面交互、布局、路由、导入导出界面时运行 | 启动 Playwright 浏览器测试，验证真实页面交互。 |

常见现象：

- `npm run build` 只要最后显示成功，就算通过。
- Vite 提示 `Some chunks are larger than 500 kB` 是体积警告，不是构建失败。
- Playwright 需要能启动浏览器和本地 Vite 服务；如果本机权限限制浏览器启动，可能会出现 `spawn EPERM`。
- 如果只改 README 这类文档，一般不需要跑测试。

## 账单导入规则

- 标准导入：支持现有 JSON/CSV 格式。
- 支付宝导入：支持官方导出的交易明细 CSV，自动跳过说明区并读取 `交易时间,交易分类,...` 表头后的记录。
- 微信导入：支持官方导出的支付账单 XLSX，自动读取首个工作表中的账单明细。
- 现金流规则：只导入 `收入` 和 `支出`；跳过不计收支、中性交易、关闭、失败或取消状态；退款按账单中的收入行导入。
- 去重规则：导入记录保存来源和平台交易单号，重复导入同一账单会跳过已存在记录。
- 分类规则：按平台原始分类/交易类型自动创建自定义分类，并保留原始分类、支付方式、交易状态等元数据。

## 提交和镜像发布

当前仓库推送到 `main` 后，GitHub Actions 会构建 Docker 镜像并发布到：

```text
ghcr.io/baoxinwen/ledger:latest
```

服务器使用 Docker Compose 部署时，更新流程通常是：

```bash
docker compose pull
docker compose up -d
docker compose logs -f app
```
