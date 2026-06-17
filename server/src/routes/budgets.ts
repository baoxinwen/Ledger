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
  const id = parseInt(req.params.id as string);
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
  const id = parseInt(req.params.id as string);
  const { category_id, amount, period, start_date } = req.body;

  const budget = budgetService.update(id, { category_id, amount, period, start_date });
  if (!budget) {
    return res.status(404).json({ error: 'Budget not found' });
  }
  res.json(budget);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const success = budgetService.delete(id);
  if (!success) {
    return res.status(404).json({ error: 'Budget not found' });
  }
  res.status(204).send();
});

export default router;
