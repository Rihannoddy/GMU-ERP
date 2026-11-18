import React, { useState } from 'react';

export interface BarDatum {
  label: string;
  value: number;
  sublabel?: string;
}

export function BarChart({
  data,
  height = 210,
  barColor = '#172332',
  highlightColor = '#D99A32',
  unit = '',
}: {
  data: BarDatum[];
  height?: number;
  barColor?: string;
  highlightColor?: string;
  unit?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data || data.length === 0) {
    return <div className="py-12 text-center text-xs text-[#738091]">No chart data available for the selected filters.</div>;
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const chartH = height - 42;
  const barWidth = Math.min(44, Math.max(18, Math.floor(420 / data.length) - 12));
  const gap = Math.max(14, Math.floor(460 / data.length) - barWidth);
  const svgWidth = Math.max(360, data.length * (barWidth + gap) + 32);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} ${height}`}
        className="w-full h-auto min-w-[320px]"
        role="img"
        aria-label="Bar chart"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((tick, idx) => {
          const y = chartH - tick * (chartH - 18) + 8;
          return (
            <line
              key={idx}
              x1={16}
              x2={svgWidth - 8}
              y1={y}
              y2={y}
              stroke="#E5E9EF"
              strokeDasharray={tick === 0 ? undefined : '3 3'}
              strokeWidth={1}
            />
          );
        })}

        {data.map((d, i) => {
          const h = Math.max(4, (d.value / maxVal) * (chartH - 22));
          const x = 24 + i * (barWidth + gap);
          const y = chartH - h + 8;
          const isHot = hovered === i;
          return (
            <g
              key={d.label + i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={3}
                fill={isHot ? highlightColor : barColor}
                className="transition-colors duration-150"
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill={isHot ? '#202B38' : '#738091'}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {d.value}
                {unit}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 12}
                textAnchor="middle"
                fontSize={11}
                fill="#738091"
              >
                {d.label.length > 10 ? `${d.label.slice(0, 9)}…` : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function LineTrendChart({
  data,
  height = 210,
  strokeColor = '#D99A32',
  unit = '%',
}: {
  data: BarDatum[];
  height?: number;
  strokeColor?: string;
  unit?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data || data.length === 0) {
    return <div className="py-12 text-center text-xs text-[#738091]">No trend data available.</div>;
  }

  const width = 520;
  const padX = 34;
  const padTop = 22;
  const padBottom = 34;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const maxVal = Math.max(...data.map((d) => d.value), 10);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = Math.max(1, maxVal - minVal);

  const pts = data.map((d, idx) => {
    const x = padX + (data.length === 1 ? innerW / 2 : (idx / (data.length - 1)) * innerW);
    const y = padTop + innerH - ((d.value - minVal) / range) * innerH;
    return { x, y, ...d };
  });

  const pathD = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[320px]" role="img" aria-label="Trend line chart">
        {[0, 0.5, 1].map((t, i) => {
          const y = padTop + innerH * (1 - t);
          return <line key={i} x1={padX} x2={width - padX} y1={y} y2={y} stroke="#E5E9EF" strokeDasharray={t === 0 ? undefined : '3 3'} />;
        })}
        <path d={areaD} fill={strokeColor} fillOpacity={0.09} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={2.2} strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} className="cursor-pointer">
            <circle cx={p.x} cy={p.y} r={hovered === i ? 5.5 : 3.8} fill="#FFFFFF" stroke={strokeColor} strokeWidth={2.2} />
            {(hovered === i || i === pts.length - 1 || i === 0) && (
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="#202B38"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {p.value}
                {unit}
              </text>
            )}
            {(i === 0 || i === pts.length - 1 || i % Math.max(1, Math.floor(pts.length / 5)) === 0) && (
              <text x={p.x} y={height - 10} textAnchor="middle" fontSize={10.5} fill="#738091">
                {p.label.length > 7 ? p.label.slice(5) : p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function DonutChart({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  if (total === 0) {
    return <div className="py-10 text-center text-xs text-[#738091]">No distribution records yet.</div>;
  }

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          {segments.map((seg, i) => {
            const pct = seg.value / total;
            const dash = pct * circumference;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle
                key={i}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-currentOffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-[#202B38] tabular-nums">{total}</span>
          <span className="text-[11px] text-[#738091]">Total</span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2.5">
        {segments.map((seg, i) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-[#202B38] capitalize truncate">{seg.label}</span>
              </div>
              <span className="font-mono tabular-nums text-[#738091]">
                {seg.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  threshold = 75,
  showValue = true,
}: {
  value: number;
  threshold?: number;
  showValue?: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, Number(value || 0)));
  const color = clamped >= threshold ? '#26865B' : clamped >= threshold - 10 ? '#D99A32' : '#D9534F';

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2 bg-[#E5E9EF] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      {showValue && (
        <span className="text-xs font-mono font-medium tabular-nums text-[#202B38] w-11 text-right">
          {clamped.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
