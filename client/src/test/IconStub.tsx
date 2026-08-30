// 测试用图标桩：vitest 把 @mui/icons-material 全部别名到这里，
// 统一导出项目用到的所有图标名，避免新增图标时测试渲染 undefined。

import type { ReactNode } from 'react';

function IconStub(_props: { sx?: unknown; fontSize?: string; children?: ReactNode } & Record<string, unknown>) {
  return <span aria-hidden="true" />;
}

export const AccountBalance = IconStub;
export const AccountBalanceWallet = IconStub;
export const Add = IconStub;
export const ArrowDropDown = IconStub;
export const ArrowDropUp = IconStub;
export const ArrowForward = IconStub;
export const ArrowRightAlt = IconStub;
export const BarChart = IconStub;
export const Brightness4 = IconStub;
export const Brightness7 = IconStub;
export const Close = IconStub;
export const Delete = IconStub;
export const DeleteOutline = IconStub;
export const Download = IconStub;
export const Edit = IconStub;
export const ExpandLess = IconStub;
export const ExpandMore = IconStub;
export const FileDownloadOutlined = IconStub;
export const FilterList = IconStub;
export const Home = IconStub;
export const LockOutlined = IconStub;
export const Logout = IconStub;
export const NorthEast = IconStub;
export const Receipt = IconStub;
export const Restore = IconStub;
export const Save = IconStub;
export const Savings = IconStub;
export const Search = IconStub;
export const Settings = IconStub;
export const SouthWest = IconStub;
export const TrendingDown = IconStub;
export const TrendingUp = IconStub;
export const UploadFile = IconStub;
export const Visibility = IconStub;
export const VisibilityOff = IconStub;
export const Warning = IconStub;
export const WarningAmber = IconStub;
export default IconStub;
