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
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
