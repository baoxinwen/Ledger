// 设置路由：提供应用级偏好配置，目前包含全局业务时区。
import { Router, Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { getErrorMessage } from '../utils/errors';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(settingsService.getSettings());
});

router.put('/', (req: Request, res: Response) => {
  try {
    res.json(settingsService.updateSettings({
      time_zone: req.body.time_zone,
      theme_mode: req.body.theme_mode,
    }));
  } catch (error) {
    res.status(400).json({
      error: getErrorMessage(error) || '保存设置失败',
    });
  }
});

export default router;
