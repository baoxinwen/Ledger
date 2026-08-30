// 迷你趋势线：KPI 卡与状态卡里的纯 SVG 折线，不引入 recharts 开销。
interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  /** 基线填充（面积感），默认关闭 */
  filled?: boolean;
}

export default function Sparkline({
  values,
  width = 96,
  height = 28,
  color = 'currentColor',
  filled = false,
}: SparklineProps) {
  if (values.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((value, index) => {
    const x = index * stepX;
    const y = height - 2 - ((value - min) / span) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = `M${points.join(' L')}`;
  const areaD = `${pathD} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      style={{ display: 'block', color }}
    >
      {filled && <path d={areaD} fill="currentColor" opacity={0.12} stroke="none" />}
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
