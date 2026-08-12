// 标签路由：标签可手工管理，也会被第三方账单导入自动用于来源标记。
import { Router, Request, Response } from 'express';
import { tagService } from '../services/tag.service';
import { requirePositiveId, requireName } from '../utils/validation';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const tags = tagService.getAll();
  res.json(tags);
});

router.post('/', (req: Request, res: Response) => {
  const name = requireName(req.body.name, '标签名称');
  const tag = tagService.create(name);
  res.status(201).json(tag);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = requirePositiveId(req.params.id);
  const success = tagService.delete(id);
  if (!success) {
    return res.status(404).json({ error: 'Tag not found' });
  }
  res.status(204).send();
});

export default router;
