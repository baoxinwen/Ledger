// 标签路由：标签可手工管理，也会被第三方账单导入自动用于来源标记。
import { Router, Request, Response } from 'express';
import { tagService } from '../services/tag.service';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const tags = tagService.getAll();
  res.json(tags);
});

router.post('/', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const tag = tagService.create(name);
  res.status(201).json(tag);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const success = tagService.delete(id);
  if (!success) {
    return res.status(404).json({ error: 'Tag not found' });
  }
  res.status(204).send();
});

export default router;
