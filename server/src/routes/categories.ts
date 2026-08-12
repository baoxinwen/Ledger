// 分类路由：管理收入/支出分类，导入账单自动建类时也会复用同一张表。
import { Router, Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import {
  requirePositiveId,
  requireName,
  optionalString,
  requireTransactionType,
} from '../utils/validation';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const rawType = req.query.type;
  const type = rawType === undefined ? undefined : requireTransactionType(rawType);
  const categories = categoryService.getAll(type);
  res.json(categories);
});

router.get('/:id', (req: Request, res: Response) => {
  const id = requirePositiveId(req.params.id);
  const category = categoryService.getById(id);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json(category);
});

router.post('/', (req: Request, res: Response) => {
  const name = requireName(req.body.name, '分类名称', 64);
  const type = requireTransactionType(req.body.type);
  const icon = optionalString(req.body.icon, '图标', 32);
  const color = optionalString(req.body.color, '颜色', 32);

  const category = categoryService.create({ name, type, icon, color });
  res.status(201).json(category);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = requirePositiveId(req.params.id);
  const name = optionalString(req.body.name, '分类名称');
  const icon = optionalString(req.body.icon, '图标');
  const color = optionalString(req.body.color, '颜色');

  const category = categoryService.update(id, { name, icon, color });
  if (!category) {
    return res.status(404).json({ error: 'Category not found or is preset' });
  }
  res.json(category);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = requirePositiveId(req.params.id);
  const success = categoryService.delete(id);
  if (!success) {
    return res.status(400).json({ error: 'Cannot delete category' });
  }
  res.status(204).send();
});

export default router;
