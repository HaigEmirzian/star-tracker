type QuarterAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value: string | number };
};

export default function QuarterAxisTick({ x = 0, y = 0, payload }: QuarterAxisTickProps) {
  if (!payload) return null;
  const date = new Date(typeof payload.value === "number" ? payload.value : `${payload.value}-01T00:00:00Z`);
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;

  return (
    <text x={x} y={y + 10} textAnchor="middle" fill="#ffffff80" fontSize={10}>
      <tspan x={x}>Q{quarter}</tspan>
      <tspan x={x} dy={12}>{String(date.getUTCFullYear()).slice(-2)}</tspan>
    </text>
  );
}
