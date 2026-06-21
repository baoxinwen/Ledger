// 服务入口：负责初始化数据库、挂载 API 路由，并在生产环境托管前端构建产物。
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './database';
import categoryRoutes from './routes/categories';
import tagRoutes from './routes/tags';
import transactionRoutes from './routes/transactions';
import budgetRoutes from './routes/budgets';
import importExportRoutes from './routes/import-export';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

try {
  initDatabase();
  console.log('Database initialized successfully');
} catch (err) {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api', importExportRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
  const indexPath = path.join(clientDistPath, 'index.html');

  if (fs.existsSync(indexPath)) {
    app.use(express.static(clientDistPath));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(indexPath);
    });
  }
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

export default app;
