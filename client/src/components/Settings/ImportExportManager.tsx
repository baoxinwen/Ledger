// 导入导出组件：展示导入摘要，并把完整诊断信息输出到浏览器控制台。
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  MenuItem,
  Alert,
  Stack,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { importExportApi } from '../../api';
import { useSnackbarStore } from '../../stores/snackbarStore';
import type { ImportFileSource, ImportResult } from '../../types';

interface ImportExportManagerProps {
  onImportComplete: () => void;
}

export default function ImportExportManager({ onImportComplete }: ImportExportManagerProps) {
  const { showSnackbar } = useSnackbarStore();
  const [importSource, setImportSource] = useState<ImportFileSource>('auto');
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await importExportApi.export(format);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ledger-export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSnackbar('导出成功', 'success');
    } catch (error) {
      console.error('Failed to export:', error);
      showSnackbar('导出失败，请重试', 'error');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setLastImportResult(null);
      const result = await importExportApi.importFile(file, importSource);
      setLastImportResult(result.data);
      logImportDiagnostics(file.name, result.data);
      showSnackbar(
        `导入完成: 成功 ${result.data.success} 条, 重复 ${result.data.duplicates} 条, 失败 ${result.data.failed} 条`,
        result.data.failed > 0 ? 'warning' : 'success'
      );
      onImportComplete();
    } catch (error) {
      console.error('Failed to import:', error);
      showSnackbar('导入失败，请检查文件格式', 'error');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>数据导入导出</Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>导出数据</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                将所有收支记录导出为文件
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('json')}
                >
                  导出 JSON
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('csv')}
                >
                  导出 CSV
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>导入数据</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                从标准 JSON/CSV、支付宝 CSV 或微信 XLSX 文件导入收支记录
              </Typography>
              <Stack spacing={2}>
                <TextField
                  select
                  label="导入类型"
                  size="small"
                  value={importSource}
                  onChange={(event) => setImportSource(event.target.value as ImportFileSource)}
                  fullWidth
                >
                  <MenuItem value="auto">自动识别</MenuItem>
                  <MenuItem value="standard">标准 JSON/CSV</MenuItem>
                  <MenuItem value="alipay">支付宝 CSV</MenuItem>
                  <MenuItem value="wechat">微信 XLSX</MenuItem>
                </TextField>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  disabled={importing}
                >
                  {importing ? '导入中...' : '选择文件'}
                  <input
                    type="file"
                    hidden
                    accept=".json,.csv,.xlsx"
                    onChange={handleImport}
                  />
                </Button>
              </Stack>
              {lastImportResult && (
                <Alert
                  severity={lastImportResult.failed > 0 ? 'warning' : 'success'}
                  sx={{ mt: 2 }}
                >
                  <Typography variant="body2">
                    成功 {lastImportResult.success} 条，重复 {lastImportResult.duplicates} 条，
                    跳过 {lastImportResult.skipped} 条，失败 {lastImportResult.failed} 条，
                    新增分类 {lastImportResult.createdCategories} 个
                  </Typography>
                  {lastImportResult.errors.length > 0 && (
                    <Box component="ul" sx={{ pl: 2, my: 1 }}>
                      {lastImportResult.errors.slice(0, 5).map((error, index) => (
                        <li key={`${error}-${index}`}>{error}</li>
                      ))}
                    </Box>
                  )}
                  {lastImportResult.diagnostics?.length > 0 && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>
                        诊断明细（前 {Math.min(lastImportResult.diagnostics.length, 20)} 条，共 {lastImportResult.diagnostics.length} 条）
                      </Typography>
                      <Box component="ul" sx={{ pl: 2, my: 0 }}>
                        {lastImportResult.diagnostics.slice(0, 20).map((diagnostic, index) => (
                          <li key={`${diagnostic.outcome}-${diagnostic.row ?? index}-${index}`}>
                            第 {diagnostic.row ?? '-'} 行：
                            {formatDiagnosticOutcome(diagnostic.outcome)}
                            {diagnostic.reason}
                            {diagnostic.source_transaction_id ? `，订单号 ${diagnostic.source_transaction_id}` : ''}
                          </li>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function logImportDiagnostics(filename: string, result: ImportResult): void {
  // 浏览器控制台保留完整诊断，页面只展示前几条，避免长账单把界面撑得太高。
  console.groupCollapsed(`[账单导入] ${filename}`);
  console.info('导入汇总', result);
  if (result.diagnostics?.length) {
    console.table(result.diagnostics);
  }
  console.groupEnd();
}

function formatDiagnosticOutcome(outcome: ImportResult['diagnostics'][number]['outcome']): string {
  if (outcome === 'failed') return '失败，';
  if (outcome === 'duplicate') return '重复，';
  return '跳过，';
}
