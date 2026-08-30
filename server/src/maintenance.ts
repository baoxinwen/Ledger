import { NextFunction, Request, Response } from 'express';

let maintenanceMode = false;

export function setMaintenanceMode(value: boolean): void {
  maintenanceMode = value;
}

export function isMaintenanceMode(): boolean {
  return maintenanceMode;
}

export function rejectDuringMaintenance(_req: Request, res: Response, next: NextFunction): void {
  if (!maintenanceMode) {
    next();
    return;
  }
  res.status(503).json({ error: '系统正在恢复备份，请稍后重试' });
}
