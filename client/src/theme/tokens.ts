// 设计 token：全站颜色、字体、密度、动效的唯一来源。
// theme/index.ts 从这里生成 light/dark 两套 MUI 主题；
// 组件内一律 import token，不再硬编码颜色/字体/缓动。
import { alpha } from '@mui/material/styles';

// ── 动效 ────────────────────────────────────────────────────────────────
// UI 交互用强 ease-out 而非默认弱缓动，让反馈更即时。
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

// ── 字体 ────────────────────────────────────────────────────────────────
export const FONT_SERIF = '"Playfair Display", Georgia, serif';
export const FONT_SANS = '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif';

// 金额/数字统一等宽数字，避免表格里数值抖动。
export const NUMERIC_TEXT = {
  fontVariantNumeric: 'tabular-nums',
} as const;

// ── 布局密度 ────────────────────────────────────────────────────────────
export const SIDEBAR_WIDTH = 240;
export const MOBILE_BOTTOM_NAV_HEIGHT = 60;
export const TABLE_DENSE_CELL_PADDING = '10px 12px';
// 表格紧凑行内图标/徽章的统一高度。
export const CHIP_HEIGHT = 20;

// ── 色板 token ──────────────────────────────────────────────────────────
export interface PaletteTokens {
  // 品牌色
  ink: string; // 主文字 / 深色实心按钮
  inkHover: string;
  gold: string; // 强调金
  goldLight: string;
  goldDark: string;
  goldOn: string; // 金色底上的文字
  goldSoft: string; // 金色浅背景（选中态、高亮底）
  // 语义色（收入/支出/警示）
  income: string;
  incomeSoft: string;
  expense: string;
  expenseSoft: string;
  warning: string;
  warningSoft: string;
  overBudget: string; // 超支专用深红，与普通 expense 错误区分层级
  // 表面
  page: string; // 页面底色（暖纸/深空）
  paper: string; // 卡片
  subcard: string; // 卡片内嵌套面板
  overlayBar: string; // 吸顶栏半透明底
  hover: string;
  selected: string;
  divider: string;
  // 文字
  text: string;
  textSecondary: string;
  textDisabled: string;
  // 图表
  chartGrid: string;
  chartAxis: string;
  chartPanel: string;
  chartIncome: string;
  chartExpense: string;
  tooltipBg: string;
  // 阴影
  shadowCard: string;
  shadowDialog: string;
}

export const lightTokens: PaletteTokens = {
  ink: '#1a1a2e',
  inkHover: '#16213e',
  gold: '#c9a84c',
  goldLight: '#d4b96e',
  goldDark: '#b8952e',
  goldOn: '#0a0a0f',
  goldSoft: 'rgba(201, 168, 76, 0.12)',
  income: '#2d6a4f',
  incomeSoft: 'rgba(45, 106, 79, 0.10)',
  expense: '#9b2226',
  expenseSoft: 'rgba(155, 34, 38, 0.08)',
  warning: '#ca6702',
  warningSoft: 'rgba(202, 103, 2, 0.10)',
  overBudget: '#7f1d1d',
  page: '#faf9f7',
  paper: '#ffffff',
  subcard: '#f7f5f1',
  overlayBar: 'rgba(250, 249, 247, 0.88)',
  hover: '#f5f3ef',
  selected: '#ede9e3',
  divider: '#e5e2db',
  text: '#1a1a2e',
  textSecondary: '#6b7280',
  textDisabled: '#a8a29a',
  chartGrid: '#e8e2d8',
  chartAxis: '#746f66',
  chartPanel: '#fbfaf7',
  chartIncome: '#5F6F52',
  chartExpense: '#8A5A61',
  tooltipBg: '#ffffff',
  shadowCard: '0 4px 24px rgba(201, 168, 76, 0.08)',
  shadowDialog: '0 24px 48px rgba(26, 26, 46, 0.12)',
};

export const darkTokens: PaletteTokens = {
  ink: '#faf9f7',
  inkHover: '#e5e2db',
  gold: '#c9a84c',
  goldLight: '#d4b96e',
  goldDark: '#b8952e',
  goldOn: '#0a0a0f',
  goldSoft: 'rgba(201, 168, 76, 0.16)',
  income: '#52b788',
  incomeSoft: 'rgba(82, 183, 136, 0.14)',
  expense: '#e5383b',
  expenseSoft: 'rgba(229, 56, 59, 0.14)',
  warning: '#f4a261',
  warningSoft: 'rgba(244, 162, 97, 0.14)',
  overBudget: '#ef4444',
  page: '#0a0a0f',
  paper: '#12121a',
  subcard: '#1a1a26',
  overlayBar: 'rgba(18, 18, 26, 0.88)',
  hover: '#1f1f2e',
  selected: '#2a2a3e',
  divider: '#1f1f2e',
  text: '#faf9f7',
  textSecondary: '#9ca3af',
  textDisabled: '#5d5d6e',
  chartGrid: '#252536',
  chartAxis: '#a8a29a',
  chartPanel: '#171720',
  chartIncome: '#7A8450',
  chartExpense: '#B06D73',
  tooltipBg: '#1a1a26',
  shadowCard: '0 4px 24px rgba(201, 168, 76, 0.05)',
  shadowDialog: '0 24px 48px rgba(0, 0, 0, 0.4)',
};

// ── 语义辅助 ────────────────────────────────────────────────────────────
// 分类图标的兜底色：分类没有 color 字段时按收支类型给一个柔和的编辑风颜色。
export function fallbackCategoryColor(t: PaletteTokens, type: 'income' | 'expense'): string {
  return type === 'income' ? t.chartIncome : t.chartExpense;
}

// 徽章/图标块上的半透明底色。
export function softBackground(hexColor: string, alphaValue = 0.12): string {
  return alpha(hexColor, alphaValue);
}
