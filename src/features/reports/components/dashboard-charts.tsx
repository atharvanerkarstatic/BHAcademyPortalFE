"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

export interface ChartDataPoint {
  label: string;
  passed: number;
  failed: number;
  total: number;
}

export function CollapsibleChartCard({
  title,
  children,
  badgeText,
}: {
  title: string;
  children: React.ReactNode;
  badgeText?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Blue Header Bar matching screenshot */}
      <div className="bg-[#0088ff] text-white px-4 py-2.5 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide">
          {title}
          {badgeText && <span className="ml-2 font-bold">{badgeText}</span>}
        </h3>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="text-white hover:bg-blue-600/50 rounded p-1 transition-colors"
          aria-label={collapsed ? "Expand card" : "Collapse card"}
        >
          {collapsed ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && <div className="p-4 sm:p-6">{children}</div>}
    </div>
  );
}

export function GroupedBarChart({
  data,
  passedLabel = "Passed",
  failedLabel = "Failed",
  passedColor = "#3b82f6", // Blue
  failedColor = "#ef4444", // Red
  height = 280,
}: {
  data: ChartDataPoint[];
  passedLabel?: string;
  failedLabel?: string;
  passedColor?: string;
  failedColor?: string;
  height?: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        No assessment data available to chart.
      </div>
    );
  }

  // Calculate clean max value
  const rawMax = Math.max(...data.map((d) => Math.max(d.passed, d.failed, 1)), 2);
  const maxVal = Math.ceil(rawMax * 1.1);

  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 20;
  const paddingBottom = 60;
  const chartHeight = height - paddingTop - paddingBottom;

  const barGroupWidth = 56;
  const barWidth = 18;
  const totalWidth = Math.max(data.length * barGroupWidth + paddingLeft + paddingRight, 650);
  const chartWidth = totalWidth - paddingLeft - paddingRight;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => Math.round(maxVal * pct * 10) / 10);

  return (
    <div className="w-full space-y-3">
      {/* Legend matching screenshot */}
      <div className="flex items-center justify-center gap-6 text-xs text-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded-xs" style={{ backgroundColor: passedColor }} />
          <span>{passedLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded-xs" style={{ backgroundColor: failedColor }} />
          <span>{failedLabel}</span>
        </div>
      </div>

      {/* SVG Canvas with horizontal scroll if wide */}
      <div className="overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${totalWidth} ${height}`}
          className="w-full min-w-[600px]"
          style={{ height: `${height}px` }}
        >
          {/* Horizontal Grid lines & Y-axis labels */}
          {yTicks.map((val) => {
            const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={totalWidth - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748b"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={totalWidth - paddingRight}
            y2={paddingTop + chartHeight}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />

          {/* Grouped Bars */}
          {data.map((item, idx) => {
            const groupX =
              paddingLeft +
              (idx / (data.length || 1)) * chartWidth +
              (chartWidth / (data.length || 1) - barGroupWidth) / 2;

            const passedH = Math.max((item.passed / maxVal) * chartHeight, 0);
            const failedH = Math.max((item.failed / maxVal) * chartHeight, 0);

            const passedY = paddingTop + chartHeight - passedH;
            const failedY = paddingTop + chartHeight - failedH;

            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={item.label + idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Background highlight on hover */}
                {isHovered && (
                  <rect
                    x={groupX - 6}
                    y={paddingTop}
                    width={barGroupWidth + 12}
                    height={chartHeight}
                    fill="#f1f5f9"
                    opacity="0.7"
                    rx="4"
                  />
                )}

                {/* Passed Bar */}
                <rect
                  x={groupX + 4}
                  y={passedY}
                  width={barWidth}
                  height={passedH}
                  fill={passedColor}
                  rx="1"
                />

                {/* Failed Bar */}
                <rect
                  x={groupX + barWidth + 8}
                  y={failedY}
                  width={barWidth}
                  height={failedH}
                  fill={failedColor}
                  rx="1"
                />

                {/* Tooltip on top of bar on hover */}
                {isHovered && (
                  <g>
                    <rect
                      x={groupX - 10}
                      y={Math.min(passedY, failedY) - 28}
                      width={barGroupWidth + 20}
                      height={22}
                      rx="4"
                      fill="#1e293b"
                    />
                    <text
                      x={groupX + barGroupWidth / 2}
                      y={Math.min(passedY, failedY) - 13}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="600"
                    >
                      P: {item.passed} | F: {item.failed}
                    </text>
                  </g>
                )}

                {/* X-axis Label */}
                <text
                  x={groupX + barGroupWidth / 2}
                  y={paddingTop + chartHeight + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#475569"
                  className="select-none"
                >
                  {item.label.length > 14 ? `${item.label.slice(0, 12)}…` : item.label}
                  <title>{item.label}</title>
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function DonutPieChart({
  passed = 0,
  failed = 0,
  passedLabel = "Passed",
  failedLabel = "Failed",
  passedColor = "#10b981", // Green matching screenshot
  failedColor = "#ef4444", // Red matching screenshot
}: {
  passed: number;
  failed: number;
  passedLabel?: string;
  failedLabel?: string;
  passedColor?: string;
  failedColor?: string;
}) {
  const total = passed + failed;

  // Pie angles
  const passedAngle = total > 0 ? (passed / total) * 360 : 0;
  const passedFraction = total > 0 ? (passed / total) * 100 : 0;
  const failedFraction = total > 0 ? (failed / total) * 100 : 0;

  const size = 200;
  const center = size / 2;
  const radius = 80;

  // Arc path helper
  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M",
      cx,
      cy,
      "L",
      start.x,
      start.y,
      "A",
      r,
      r,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      "Z",
    ].join(" ");
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-2">
      {/* Legend matching screenshot */}
      <div className="flex items-center justify-center gap-6 text-xs text-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded-xs" style={{ backgroundColor: passedColor }} />
          <span>{passedLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded-xs" style={{ backgroundColor: failedColor }} />
          <span>{failedLabel}</span>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No assessment data to display.
        </div>
      ) : (
        <div className="relative">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* If 100% passed */}
            {passed > 0 && failed === 0 && (
              <circle cx={center} cy={center} r={radius} fill={passedColor} />
            )}

            {/* If 100% failed */}
            {failed > 0 && passed === 0 && (
              <circle cx={center} cy={center} r={radius} fill={failedColor} />
            )}

            {/* If mixed, render two pie slices */}
            {passed > 0 && failed > 0 && (
              <>
                <path
                  d={describeArc(center, center, radius, 0, passedAngle)}
                  fill={passedColor}
                />
                <path
                  d={describeArc(center, center, radius, passedAngle, 360)}
                  fill={failedColor}
                />
              </>
            )}
          </svg>

          {/* Counts pill */}
          <div className="mt-2 text-center text-xs font-medium text-slate-600">
            <span className="text-emerald-600 font-bold">{passed} ({passedFraction.toFixed(1)}%)</span>
            {" Passed • "}
            <span className="text-rose-600 font-bold">{failed} ({failedFraction.toFixed(1)}%)</span>
            {" Failed"}
          </div>
        </div>
      )}
    </div>
  );
}

export function AssessmentSummaryTable({
  title,
  itemLabel = "Module",
  data,
}: {
  title: string;
  itemLabel?: string;
  data: ChartDataPoint[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-800 mb-4">{title}</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="py-2.5 px-3 w-12">#</th>
              <th className="py-2.5 px-3">{itemLabel}</th>
              <th className="py-2.5 px-3 text-center w-24">Total</th>
              <th className="py-2.5 px-3 text-center w-24">Pass</th>
              <th className="py-2.5 px-3 text-center w-24">Fail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No data found.
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr key={item.label + idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 text-slate-500 font-medium">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{item.label}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex min-w-[28px] items-center justify-center rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                      {item.total}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex min-w-[28px] items-center justify-center rounded bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                      {item.passed}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex min-w-[28px] items-center justify-center rounded bg-rose-600 px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                      {item.failed}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
