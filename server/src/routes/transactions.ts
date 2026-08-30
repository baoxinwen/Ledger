// 交易路由：对外提供收支记录的查询、统计、创建、更新和删除接口。
// 输入统一走 utils/validation 校验，非法请求抛 HttpError(400)，由全局错误中间件转为 JSON。
import { Router, Request, Response } from 'express';
import { transactionService } from '../services/transaction.service';
import { TransactionFilter } from '../types';
import {
  requirePositiveId,
  optionalPositiveId,
  requireNonNegativeAmount,
  optionalNonNegativeAmount,
  requireDate,
  optionalDate,
  optionalString,
  requireTransactionType,
  optionalTransactionType,
  optionalTagIds,
} from '../utils/validation';

const router = Router();

// 列表单页上限，防止客户端传超大 limit 一次性载入过多数据。
const MAX_LIST_LIMIT = 1000;

router.get('/', (req: Request, res: Response) => {
  const filter: TransactionFilter = {
    type: optionalTransactionType(req.query.type),
    category_id: optionalPositiveId(req.query.category_id, '分类'),
    tag_id: optionalPositiveId(req.query.tag_id, '标签'),
    start_date: optionalDate(req.query.start_date),
    end_date: optionalDate(req.query.end_date),
    min_amount: optionalNonNegativeAmount(req.query.min_amount, '最小金额'),
    max_amount: optionalNonNegativeAmount(req.query.max_amount, '最大金额'),
    keyword: optionalString(req.query.keyword, '搜索关键词', 200),
    page: optionalPositiveId(req.query.page, '页码') ?? 1,
    limit: Math.min(optionalPositiveId(req.query.limit, '每页条数') ?? 20, MAX_LIST_LIMIT),
    sort: req.query.sort === 'amount' ? 'amount' : 'date',
    order: req.query.order === 'asc' ? 'asc' : 'desc',
  };

  const result = transactionService.getAll(filter);
  res.json(result);
});

router.get('/stats', (req: Request, res: Response) => {
  const query = {
    start_date: optionalDate(req.query.start_date),
    end_date: optionalDate(req.query.end_date),
    type: optionalTransactionType(req.query.type),
  };

  const stats = transactionService.getStats(query);
  res.json(stats);
});

router.get('/:id', (req: Request, res: Response) => {
  const id = requirePositiveId(req.params.id);
  const transaction = transactionService.getDetailById(id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

router.post('/', (req: Request, res: Response) => {
  const type = requireTransactionType(req.body.type);
  const amount = requireNonNegativeAmount(req.body.amount, '金额');
  const category_id = requirePositiveId(req.body.category_id, '分类');
  const date = requireDate(req.body.date);
  const note = optionalString(req.body.note, '备注');
  const tag_ids = optionalTagIds(req.body.tag_ids);

  const transaction = transactionService.create({ type, amount, category_id, note, date, tag_ids });
  res.status(201).json(transaction);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = requirePositiveId(req.params.id);
  const type = optionalTransactionType(req.body.type);
  const amount = optionalNonNegativeAmount(req.body.amount, '金额');
  const category_id = optionalPositiveId(req.body.category_id, '分类');
  const date = optionalDate(req.body.date);
  const note = optionalString(req.body.note, '备注');
  const tag_ids = optionalTagIds(req.body.tag_ids);

  const transaction = transactionService.update(id, { type, amount, category_id, note, date, tag_ids });
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = requirePositiveId(req.params.id);
  const success = transactionService.delete(id);
  if (!success) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.status(204).send();
});

export default router;
