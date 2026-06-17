import express from 'express';
import cors from 'cors';
import { initDatabase } from './database';
import categoryRoutes from './routes/categories';
import tagRoutes from './routes/tags';
import transactionRoutes from './routes/transactions';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initDatabase();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/transactions', transactionRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
