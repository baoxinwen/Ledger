// 预算路由：负责预算 CRUD 以及预算执行状态查询。
import { Router, Request, Response } from 'express';
import { budgetService } from '../services/budget.service';
import { HttpError } from '../utils/errors';
import {
  requirePositiveId,
  optionalPositiveId,
  requireNonNegativeAmount,
  optionalNonNegativeAmount,
  requireDate,
  optionalDate,
  requireBudgetPeriod,
  optionalBudgetPeriod,
} from '../utils/validation';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const budgets = budgetService.getAll();
  res.json(budgets);
});

router.get('/status', (req: Request, res: Response) => {
  const month = typeof req.query.month === 'string' ? req.query.month : '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ error: '月份格式无效，应为 YYYY-MM' });
  }
  const status = budgetService.getBudgetStatus(month);
  res.json(status);
});

router.get('/:id', (req: Request, res: Response) => {
  const id = requirePositiveId(req.params.id);
  const budget = budgetService.getById(id);
  if (!budget) {
    return res.status(404).json({ error: 'Budget not found' });
  }
  res.json(budget);
});

router.post('/', (req: Request, res: Response) => {
  const category_id = optionalPositiveId(req.body.category_id, '分类');
  const amount = requireNonNegativeAmount(req.body.amount, '预算金额');
  if (amount <= 0) {
    throw new HttpError(400, '预算金额必须大于 0');
  }
  const period = requireBudgetPeriod(req.body.period);
  const start_date = requireDate(req.body.start_date);

  const budget = budgetService.create({ category_id, amount, period, start_date });
  res.status(201).json(budget);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = requirePositiveId(req.params.id);
  // 显式 null 表示"改回总预算"：不能被 optionalPositiveId 折叠成 undefined（否则更新被静默跳过，
  // 前端提示成功但预算仍挂在原分类下）。
  const category_id = req.body.category_id === null ? null : optionalPositiveId(req.body.category_id, '分类');
  const amount = optionalNonNegativeAmount(req.body.amount, '预算金额');
  if (amount !== undefined && amount <= 0) {
    throw new HttpError(400, '预算金额必须大于 0');
  }
  const period = optionalBudgetPeriod(req.body.period);
  const start_date = optionalDate(req.body.start_date);

  const budget = budgetService.update(id, { category_id, amount, period, start_date });
  if (!budget) {
    return res.status(404).json({ error: 'Budget not found' });
  }
  res.json(budget);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = requirePositiveId(req.params.id);
  const success = budgetService.delete(id);
  if (!success) {
    return res.status(404).json({ error: 'Budget not found' });
  }
  res.status(204).send();
});

export default router;
