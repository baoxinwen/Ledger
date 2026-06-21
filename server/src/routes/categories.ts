// 分类路由：管理收入/支出分类，导入账单自动建类时也会复用同一张表。
import { Router, Request, Response } from 'express';
import { categoryService } from '../services/category.service';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const type = req.query.type as 'income' | 'expense' | undefined;
  const categories = categoryService.getAll(type);
  res.json(categories);
});

router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const category = categoryService.getById(id);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json(category);
});

router.post('/', (req: Request, res: Response) => {
  const { name, type, icon, color } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }
  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Type must be income or expense' });
  }
  const category = categoryService.create({ name, type, icon, color });
  res.status(201).json(category);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { name, icon, color } = req.body;
  const category = categoryService.update(id, { name, icon, color });
  if (!category) {
    return res.status(404).json({ error: 'Category not found or is preset' });
  }
  res.json(category);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const success = categoryService.delete(id);
  if (!success) {
    return res.status(400).json({ error: 'Cannot delete category' });
  }
  res.status(204).send();
});

export default router;
