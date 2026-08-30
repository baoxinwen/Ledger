// 偏好设置组件：管理影响全局日期计算和界面主题的应用级偏好。
import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Divider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSnackbarStore } from '../../stores/snackbarStore';
import type { ThemeMode } from '../../types';
import { DEFAULT_TIME_ZONE, getSupportedTimeZones, isValidTimeZone } from '../../utils/format';
import { SectionCard } from '../ui';

export default function PreferenceManager() {
  const { settings, loading, fetchSettings, updateSettings } = useSettingsStore();
  const { showSnackbar } = useSnackbarStore();
  const [timeZone, setTimeZone] = useState(settings.time_zone);
  const [themeMode, setThemeMode] = useState<ThemeMode>(settings.theme_mode);
  const timeZoneOptions = useMemo(() => getSupportedTimeZones(), []);
  const normalizedTimeZone = timeZone || DEFAULT_TIME_ZONE;
  const isTimeZoneValid = isValidTimeZone(normalizedTimeZone);
  const hasChanges = normalizedTimeZone !== settings.time_zone || themeMode !== settings.theme_mode;

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setTimeZone(settings.time_zone);
    setThemeMode(settings.theme_mode);
  }, [settings.theme_mode, settings.time_zone]);

  const handleSave = async () => {
    try {
      await updateSettings({ time_zone: normalizedTimeZone, theme_mode: themeMode });
      showSnackbar('偏好设置已保存', 'success');
    } catch (error) {
      console.error('保存偏好设置失败:', error);
      showSnackbar('保存偏好设置失败，请检查输入内容', 'error');
    }
  };

  const handleThemeModeChange = async (nextThemeMode: ThemeMode | null) => {
    if (!nextThemeMode || nextThemeMode === themeMode) return;

    setThemeMode(nextThemeMode);
    try {
      await updateSettings({ theme_mode: nextThemeMode });
      showSnackbar('主题设置已保存', 'success');
    } catch (error) {
      console.error('保存主题设置失败:', error);
      showSnackbar('保存主题设置失败，请重试', 'error');
    }
  };

  return (
    <SectionCard
      title="偏好设置"
      subtitle="管理界面主题、业务时区和日期计算规则"
    >
          <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
            <Box>
              <Typography variant="h6">界面主题</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75, mb: 1.5 }}>
                跟随系统会读取设备的浅色或深色偏好；右上角按钮会写入同一份主题设置。
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={themeMode}
                onChange={(_, value: ThemeMode | null) => {
                  void handleThemeModeChange(value);
                }}
                size="small"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: { xs: 0.75, sm: 0 },
                  '& .MuiToggleButtonGroup-grouped': {
                    borderRight: { sm: '1px solid' },
                    borderRightColor: { sm: 'divider' },
                    borderRadius: 0,
                    mx: '0 !important',
                  },
                }}
              >
                <ToggleButton value="system">跟随系统</ToggleButton>
                <ToggleButton value="light">浅色模式</ToggleButton>
                <ToggleButton value="dark">深色模式</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6">业务时区</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                交易日期仍按账本里的本地日期保存，这里只决定“今天、本月、本季、本年”的计算方式。
              </Typography>
            </Box>

            {/* 受限下拉而非自由输入：IANA 时区名易拼错，从列表选择可避免无效值 */}
            <Autocomplete
              options={timeZoneOptions}
              value={normalizedTimeZone}
              onChange={(_, value) => setTimeZone(value || DEFAULT_TIME_ZONE)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="时区"
                  placeholder="Asia/Shanghai"
                  error={Boolean(normalizedTimeZone) && !isTimeZoneValid}
                  helperText={isTimeZoneValid ? 'Docker 首次部署默认使用 TZ，保存后以这里为准' : '请选择有效的 IANA 时区'}
                />
              )}
            />

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={loading || !isTimeZoneValid || !hasChanges}
              sx={{ height: 40, alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
            >
              保存偏好
            </Button>
          </Stack>
    </SectionCard>
  );
}
