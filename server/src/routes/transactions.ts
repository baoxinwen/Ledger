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
  const id = parseInt(req.params.id as string);
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
  const id = parseInt(req.params.id as string);
  const { type, amount, category_id, note, date, tag_ids } = req.body;

  const transaction = transactionService.update(id, { type, amount, category_id, note, date, tag_ids });
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const success = transactionService.delete(id);
  if (!success) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.status(204).send();
});

export default router;
