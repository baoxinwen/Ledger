import { Router, Request, Response } from 'express';
import { transactionService } from '../services/transaction.service';
import { categoryService } from '../services/category.service';
import { tagService } from '../services/tag.service';

const router = Router();

router.get('/export', (req: Request, res: Response) => {
  const format = (req.query.format as 'json' | 'csv') || 'json';

  const { data } = transactionService.getAll({ limit: 10000 });

  if (format === 'csv') {
    const header = '日期,类型,分类,金额,标签,备注\n';
    const rows = data.map(t => {
      const tags = t.tags.map(tag => tag.name).join(';');
      return `${t.date},${t.type},${t.category.name},${t.amount},${tags},${t.note || ''}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ledger-export.csv');
    res.send(header + rows);
  } else {
    const exportData = {
      transactions: data.map(t => ({
        date: t.date,
        type: t.type,
        category: t.category.name,
        amount: t.amount,
        tags: t.tags.map(tag => tag.name),
        note: t.note,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=ledger-export.json');
    res.json(exportData);
  }
});

router.post('/import', (req: Request, res: Response) => {
  const { transactions } = req.body;

  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Invalid import data' });
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  transactions.forEach((t, index) => {
    try {
      const category = categoryService.getAll(t.type).find(c => c.name === t.category);
      if (!category) {
        results.errors.push(`Row ${index + 1}: Category "${t.category}" not found`);
        results.failed++;
        return;
      }

      const tagIds = (t.tags || []).map((tagName: string) => {
        const tag = tagService.create(tagName);
        return tag.id;
      });

      transactionService.create({
        type: t.type,
        amount: t.amount,
        category_id: category.id,
        note: t.note,
        date: t.date,
        tag_ids: tagIds,
      });

      results.success++;
    } catch (error) {
      results.errors.push(`Row ${index + 1}: ${(error as Error).message}`);
      results.failed++;
    }
  });

  res.json(results);
});

export default router;
