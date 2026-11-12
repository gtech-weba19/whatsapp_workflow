import React, { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  MessageCircle,
  PieChart,
  Search,
  Sparkles,
  TrendingUp,
  Workflow as WorkflowIcon,
  Zap,
} from "lucide-react";

const EMERALD_BAR_GRADIENTS = [
  { top: "#059669", bottom: "#34d399" }, // emerald
  { top: "#0d9488", bottom: "#2dd4bf" }, // teal
  { top: "#10b981", bottom: "#6ee7b7" }, // emerald-light
  { top: "#16a34a", bottom: "#4ade80" }, // green
  { top: "#14b8a6", bottom: "#5eead4" }, // teal-mint
  { top: "#0891b2", bottom: "#22d3ee" }, // cyan
  { top: "#22c55e", bottom: "#86efac" }, // bright-green
  { top: "#047857", bottom: "#10b981" }, // deep-emerald
  { top: "#0f766e", bottom: "#14b8a6" }, // deep-teal
  { top: "#65a30d", bottom: "#a3e635" }, // lime
];

const DONUT_PALETTE = [
  "#059669",
  "#0d9488",
  "#22c55e",
  "#0891b2",
  "#84cc16",
  "#047857",
];

/**
 * Elevated 5-card emerald-spectrum KPI tile with ambient corner glow,
 * top accent ribbon, tabular numeral, and gradient area sparkline.
 */
export function PastelKpiCard({
  title,
  value,
  subtitle,
  pill,
  icon: Icon,
  theme = "emerald",
  sparkline = [],
  to,
  loading = false,
}) {
  const rawGradId = useId();
  const gradId = `kpi-grad-${rawGradId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const themes = {
    emerald: {
      card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 hover:border-emerald-300",
      topBar: "from-emerald-500 via-emerald-400 to-teal-400",
      glow: "bg-emerald-300/30",
      iconBox: "bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-emerald-600/25",
      pill: "border-emerald-200/90 bg-emerald-50/90 text-emerald-700",
      stroke: "#059669",
    },
    teal: {
      card: "border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-white to-teal-50/40 hover:border-teal-300",
      topBar: "from-teal-500 via-teal-400 to-cyan-400",
      glow: "bg-teal-300/30",
      iconBox: "bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-teal-600/25",
      pill: "border-teal-200/90 bg-teal-50/90 text-teal-700",
      stroke: "#0d9488",
    },
    green: {
      card: "border-green-200/80 bg-gradient-to-br from-green-50/90 via-white to-green-50/40 hover:border-green-300",
      topBar: "from-green-500 via-emerald-400 to-lime-400",
      glow: "bg-green-300/30",
      iconBox: "bg-gradient-to-br from-green-600 to-emerald-500 text-white shadow-green-600/25",
      pill: "border-green-200/90 bg-green-50/90 text-green-700",
      stroke: "#16a34a",
    },
    cyan: {
      card: "border-cyan-200/80 bg-gradient-to-br from-cyan-50/90 via-white to-cyan-50/40 hover:border-cyan-300",
      topBar: "from-cyan-500 via-teal-400 to-emerald-400",
      glow: "bg-cyan-300/30",
      iconBox: "bg-gradient-to-br from-cyan-600 to-teal-500 text-white shadow-cyan-600/25",
      pill: "border-cyan-200/90 bg-cyan-50/90 text-cyan-700",
      stroke: "#0891b2",
    },
    lime: {
      card: "border-lime-200/80 bg-gradient-to-br from-lime-50/90 via-white to-lime-50/40 hover:border-lime-300",
      topBar: "from-lime-500 via-green-400 to-emerald-400",
      glow: "bg-lime-300/30",
      iconBox: "bg-gradient-to-br from-lime-600 to-green-600 text-white shadow-lime-600/25",
      pill: "border-lime-200/90 bg-lime-50/90 text-lime-800",
      stroke: "#65a30d",
    },
  };

  const t = themes[theme] || themes.emerald;

  const { linePath, areaPath, lastPoint } = useMemo(() => {
    const pts =
      Array.isArray(sparkline) && sparkline.length >= 2
        ? sparkline
        : [3, 5, 4, 7, 6, 8, 7];
    const max = Math.max(...pts, 1);
    const min = Math.min(...pts, 0);
    const range = max - min || 1;
    const width = 68;
    const height = 26;

    const coords = pts.map((val, idx) => {
      const x = (idx / (pts.length - 1)) * (width - 4) + 2;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return { x, y };
    });

    const line = coords
      .map(
        (c, idx) =>
          `${idx === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`
      )
      .join(" ");

    const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${height} L${coords[0].x.toFixed(1)},${height} Z`;

    return {
      linePath: line,
      areaPath: area,
      lastPoint: coords[coords.length - 1],
    };
  }, [sparkline]);

  const cardClassName = `group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 shadow-sm shadow-slate-900/[0.03] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/[0.06] ${t.card}`;

  const cardBody = (
    <>
      {/* Top gradient accent strip */}
      <span
        className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-85 transition-opacity group-hover:opacity-100 ${t.topBar}`}
      />

      {/* Ambient corner glow */}
      <span
        className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125 ${t.glow}`}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-105 ${t.iconBox}`}
            >
              <Icon size={16} strokeWidth={2.3} />
            </span>
            <span className="truncate text-xs font-bold text-slate-700">
              {title}
            </span>
          </div>

          {to && (
            <ArrowUpRight
              size={14}
              className="shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-600"
            />
          )}
        </div>

        <div className="mt-3.5">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p className="text-2xl font-black tracking-tight tabular-nums text-slate-900 sm:text-[28px]">
              {Number(value || 0).toLocaleString("en-IN")}
            </p>
          )}
          <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="relative mt-3.5 flex items-end justify-between gap-2 border-t border-slate-100/80 pt-2.5">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-2xs ${t.pill}`}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: t.stroke }}
          />
          {pill}
        </span>

        <svg
          width="68"
          height="26"
          viewBox="0 0 68 26"
          className="shrink-0 overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={t.stroke} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={t.stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {lastPoint && (
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="2.8"
              fill="#ffffff"
              stroke={t.stroke}
              strokeWidth="2"
            />
          )}
        </svg>
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cardClassName}>
        {cardBody}
      </Link>
    );
  }

  return <div className={cardClassName}>{cardBody}</div>;
}

/**
 * Executive 30 Days / 14 Days Hits column chart with gradient bars,
 * peak-day callout, Y-axis scale, workflow filter, and focused hover popovers.
 */
export function ThirtyDaysHitsChart({
  data = [],
  workflows = [],
  selectedWorkflowId = "all",
  onWorkflowChange,
  loading = false,
}) {
  const [metric, setMetric] = useState("messages");
  const [windowRange, setWindowRange] = useState("30d");
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const safeWorkflows = useMemo(
    () => (Array.isArray(workflows) ? workflows : []),
    [workflows]
  );

  const visibleData = useMemo(() => {
    if (windowRange === "14d" && safeData.length > 14) {
      return safeData.slice(-14);
    }
    return safeData;
  }, [safeData, windowRange]);

  const values = useMemo(
    () =>
      visibleData.map((d) =>
        metric === "sessions" ? Number(d.sessions || 0) : Number(d.messages || 0)
      ),
    [visibleData, metric]
  );

  const maxValue = useMemo(() => Math.max(...values, 1), [values]);
  const totalHits = useMemo(
    () => values.reduce((acc, v) => acc + v, 0),
    [values]
  );

  const avgHits = useMemo(() => {
    if (!visibleData.length) return 0;
    return totalHits / visibleData.length;
  }, [totalHits, visibleData.length]);

  const peakInfo = useMemo(() => {
    if (!visibleData.length) return null;
    let bestIdx = -1;
    let bestVal = 0;
    values.forEach((v, idx) => {
      if (v > bestVal) {
        bestVal = v;
        bestIdx = idx;
      }
    });
    if (bestIdx < 0) return null;
    return {
      idx: bestIdx,
      val: bestVal,
      label: visibleData[bestIdx]?.short_label || visibleData[bestIdx]?.label,
    };
  }, [visibleData, values]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-100/90 bg-white p-5 shadow-sm shadow-emerald-950/[0.03] sm:p-6">
      {/* Subtle decorative top highlight */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 opacity-80" />

      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 shadow-2xs">
            <BarChart3 size={21} />
          </span>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                {windowRange === "14d" ? "14 Days" : "30 Days"} Activity Pulse
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                {totalHits.toLocaleString("en-IN")}{" "}
                {metric === "sessions" ? "Conversations" : "Messages"}
              </span>
              {visibleData.length > 0 && (
                <span className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 sm:inline-flex">
                  Avg {avgHits.toFixed(1)}/day
                </span>
              )}
              {peakInfo && peakInfo.val > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800">
                  <TrendingUp size={11} />
                  Peak {peakInfo.label}: {peakInfo.val.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Daily WhatsApp interaction volume — hover any bar to inspect
              message &amp; chat breakdown
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 14D / 30D toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setWindowRange("14d")}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                windowRange === "14d"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              14D
            </button>
            <button
              type="button"
              onClick={() => setWindowRange("30d")}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                windowRange === "30d"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              30D
            </button>
          </div>

          {/* Metric toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetric("messages")}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                metric === "messages"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Messages
            </button>
            <button
              type="button"
              onClick={() => setMetric("sessions")}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                metric === "sessions"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Conversations
            </button>
          </div>

          {/* Workflow dropdown */}
          <div className="relative">
            <WorkflowIcon
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"
            />
            <select
              value={selectedWorkflowId}
              onChange={(e) => onWorkflowChange?.(e.target.value)}
              aria-label="Filter 30 days hits by workflow"
              className="h-9 max-w-[220px] rounded-xl border border-slate-200 bg-white pl-8 pr-7 text-xs font-semibold text-slate-700 outline-none transition hover:border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All Workflows</option>
              {safeWorkflows.map((wf) => (
                <option key={wf.id} value={String(wf.id)}>
                  {wf.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bars Canvas */}
      {loading && visibleData.length === 0 ? (
        <div className="mt-5 grid h-56 grid-cols-12 items-end gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-t-lg bg-emerald-100"
              style={{ height: `${30 + ((i * 19) % 60)}%` }}
            />
          ))}
        </div>
      ) : visibleData.length === 0 ? (
        <div className="flex h-52 flex-col items-center justify-center gap-1.5 text-xs text-slate-400">
          <BarChart3 size={24} className="text-slate-300" />
          <span>No 30-day activity recorded yet.</span>
        </div>
      ) : (
        <div className="mt-5 flex gap-2">
          {/* Y-Axis scale labels */}
          <div className="hidden h-60 flex-col justify-between pb-7 pt-7 text-right text-[10px] font-semibold tabular-nums text-slate-400 sm:flex">
            <span>{maxValue.toLocaleString("en-IN")}</span>
            <span>{Math.round(maxValue / 2).toLocaleString("en-IN")}</span>
            <span>0</span>
          </div>

          <div className="flex-1 overflow-x-auto pb-1">
            <div className="relative flex h-60 min-w-[660px] items-end gap-1.5 border-b border-slate-100 px-1 pb-1 pt-8">
              {/* Subtle horizontal guide lines */}
              <div className="pointer-events-none absolute inset-x-0 bottom-7 top-8 flex flex-col justify-between">
                {[0, 1, 2].map((line) => (
                  <div
                    key={line}
                    className="w-full border-t border-dashed border-slate-100"
                  />
                ))}
              </div>

              {visibleData.map((day, index) => {
                const val =
                  metric === "sessions"
                    ? Number(day.sessions || 0)
                    : Number(day.messages || 0);
                const heightPct =
                  val > 0 ? Math.max(9, (val / maxValue) * 100) : 3;
                const palette =
                  EMERALD_BAR_GRADIENTS[index % EMERALD_BAR_GRADIENTS.length];
                const isHovered = hoveredIdx === index;
                const isDimmed = hoveredIdx !== null && hoveredIdx !== index;
                const isPeak = peakInfo && peakInfo.idx === index && val > 0;
                const shareOfPeak =
                  maxValue > 0 ? Math.round((val / maxValue) * 100) : 0;

                return (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredIdx(index)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`group relative flex h-full flex-1 flex-col items-center justify-end transition-opacity duration-200 ${
                      isDimmed ? "opacity-55" : "opacity-100"
                    }`}
                  >
                    {/* Hover Popover Card */}
                    {isHovered && (
                      <div className="pointer-events-none absolute -top-2 z-30 -translate-y-full whitespace-nowrap rounded-xl border border-emerald-700/40 bg-slate-900 px-3 py-1.5 text-[10px] text-white shadow-xl">
                        <p className="font-bold text-emerald-300">
                          {day.label}
                        </p>
                        <p className="mt-0.5 font-semibold text-white">
                          {Number(day.messages || 0).toLocaleString("en-IN")}{" "}
                          msgs ·{" "}
                          {Number(day.sessions || 0).toLocaleString("en-IN")}{" "}
                          chats
                        </p>
                        {val > 0 && (
                          <p className="text-[9px] text-slate-300">
                            {shareOfPeak}% of period peak
                          </p>
                        )}
                      </div>
                    )}

                    {/* Peak dot or top value */}
                    <span
                      className={`mb-1 flex items-center gap-0.5 text-[9.5px] font-bold tabular-nums transition ${
                        val > 0
                          ? isPeak
                            ? "text-emerald-700"
                            : "text-slate-600 group-hover:text-emerald-700"
                          : "text-slate-300"
                      }`}
                    >
                      {isPeak && (
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                          title="Peak day"
                        />
                      )}
                      {val > 0 ? val : ""}
                    </span>

                    {/* Bar */}
                    <div
                      className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                        isHovered ? "scale-x-105 shadow-md" : ""
                      }`}
                      style={{
                        height: `${heightPct}%`,
                        background:
                          val > 0
                            ? `linear-gradient(180deg, ${palette.top} 0%, ${palette.bottom} 100%)`
                            : "#e2e8f0",
                      }}
                    />

                    {/* Date X-axis label */}
                    <span
                      className={`mt-1.5 text-[9px] font-semibold ${
                        isHovered ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {day.short_label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Left Split Card: Interactive SVG Donut with slice hover emphasis,
 * mini legend bars, and deep-emerald Quick Insights CTA dock.
 */
export function WorkflowInteractionDonutCard({
  breakdown = { total: 0, by_workflow: [], by_status: [] },
}) {
  const [mode, setMode] = useState("workflow");
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const safeBreakdown = breakdown || {};
  const itemsRaw =
    mode === "status"
      ? safeBreakdown.by_status
      : safeBreakdown.by_workflow;
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];

  const total = Number(safeBreakdown.total || 0);
  const radius = 56;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    const valid = items.filter((item) => Number(item.count || 0) > 0);
    const sum = valid.reduce((acc, item) => acc + Number(item.count || 0), 0);
    if (sum === 0) return [];

    let offset = 0;
    return valid.map((item, idx) => {
      const len = (Number(item.count) / sum) * circumference;
      const seg = {
        ...item,
        idx,
        color: DONUT_PALETTE[idx % DONUT_PALETTE.length],
        dashArray: `${len} ${circumference - len}`,
        dashOffset: -offset,
      };
      offset += len;
      return seg;
    });
  }, [items, circumference]);

  const activeItem =
    hoveredIdx !== null && items[hoveredIdx] ? items[hoveredIdx] : null;

  return (
    <section className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.025] sm:p-6">
      <div>
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700">
              <PieChart size={18} />
            </span>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">
                Workflow Interaction (30 Days)
              </h2>
              <p className="text-[11px] text-slate-500">
                Hover a slice or item to inspect share
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("workflow");
                setHoveredIdx(null);
              }}
              className={`rounded-lg px-2.5 py-1 transition ${
                mode === "workflow"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              By Workflow
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("status");
                setHoveredIdx(null);
              }}
              className={`rounded-lg px-2.5 py-1 transition ${
                mode === "status"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              By Status
            </button>
          </div>
        </div>

        {/* Donut + Interactive Legend */}
        <div className="my-5 grid grid-cols-1 items-center gap-6 sm:grid-cols-[176px_1fr]">
          <div className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-emerald-50/40 p-2">
            <svg className="h-40 w-40 -rotate-90 overflow-visible" viewBox="0 0 144 144">
              <circle
                cx="72"
                cy="72"
                r={radius}
                fill="transparent"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
              />
              {segments.map((seg, idx) => {
                const isActive = hoveredIdx === idx;
                const isDimmed = hoveredIdx !== null && hoveredIdx !== idx;
                return (
                  <circle
                    key={idx}
                    cx="72"
                    cy="72"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`cursor-pointer transition-all duration-300 ${
                      isDimmed ? "opacity-35" : "opacity-100"
                    }`}
                  />
                );
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <span className="text-2xl font-black tracking-tight tabular-nums text-slate-900">
                {Number(
                  activeItem ? activeItem.count : total
                ).toLocaleString("en-IN")}
              </span>
              <span className="mt-0.5 max-w-[92px] truncate text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
                {activeItem
                  ? `${Number(activeItem.percentage || 0).toFixed(1)}% · ${activeItem.name}`
                  : "TOTAL CHATS"}
              </span>
            </div>
          </div>

          {/* Legend with mini proportional bars */}
          <div className="space-y-2.5">
            {items.length === 0 ? (
              <p className="text-xs text-slate-400">
                No conversation activity in the last 30 days.
              </p>
            ) : (
              items.map((item, idx) => {
                const color = DONUT_PALETTE[idx % DONUT_PALETTE.length];
                const isActive = hoveredIdx === idx;
                const pct = Math.min(100, Math.max(0, Number(item.percentage || 0)));

                return (
                  <div
                    key={item.id ?? item.key ?? idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`rounded-xl px-2.5 py-1.5 transition ${
                      isActive ? "bg-emerald-50/80 ring-1 ring-emerald-200" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate font-semibold text-slate-700">
                          {item.name}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 tabular-nums">
                        <span className="font-bold text-slate-900">
                          {Number(item.count || 0).toLocaleString("en-IN")}
                        </span>
                        <span className="w-11 text-right text-[11px] font-semibold text-emerald-700">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(pct, item.count > 0 ? 4 : 0)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Elevated Deep Emerald Quick Insights CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 p-4 text-white shadow-md shadow-emerald-950/15">
        <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-emerald-200 ring-1 ring-white/20 backdrop-blur-xs">
              <Sparkles size={17} />
            </span>
            <div>
              <p className="text-xs font-extrabold tracking-wide text-white">
                Quick Insights · Live Mobile Replay
              </p>
              <p className="text-[11px] text-emerald-100/85">
                Inspect every workflow conversation inside our WhatsApp phone preview.
              </p>
            </div>
          </div>

          <Link
            to="/message-logs"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
          >
            View Details
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Right Split Card: Ranked Horizontal Leaderboard for Workflows & Trigger Keywords (30 Days).
 */
export function WorkflowTriggersSummaryCard({ items = [] }) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const maxHits = useMemo(
    () => Math.max(...safeItems.map((i) => Number(i?.hits || 0)), 1),
    [safeItems]
  );

  return (
    <section className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.025] sm:p-6">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700">
            <Search size={18} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">
              Workflows &amp; Triggers Leaderboard (30 Days)
            </h2>
            <p className="text-[11px] text-slate-500">
              Click any workflow to open its conversations in Message Logs
            </p>
          </div>
        </div>

        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
          Top {safeItems.length}
        </span>
      </div>

      {safeItems.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-14 text-xs text-slate-400">
          No workflows or trigger hits recorded yet.
        </div>
      ) : (
        <div className="mt-4 flex-1 space-y-2">
          {safeItems.map((item, idx) => {
            const hits = Number(item.hits || 0);
            const widthPct = hits > 0 ? Math.max(6, (hits / maxHits) * 100) : 3;
            const palette =
              EMERALD_BAR_GRADIENTS[idx % EMERALD_BAR_GRADIENTS.length];
            const isTopThree = idx < 3;

            return (
              <Link
                key={item.workflow_id}
                to={`/message-logs?workflow_id=${item.workflow_id}`}
                title={`${item.name} — ${item.messages_count} messages, ${item.sessions_count} conversations`}
                className="group grid grid-cols-[26px_130px_1fr_72px] items-center gap-2.5 rounded-xl border border-transparent px-2 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/60 sm:grid-cols-[28px_165px_1fr_84px]"
              >
                {/* Rank badge */}
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black tabular-nums ${
                    isTopThree
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>

                {/* Name + Trigger */}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                    {item.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                    {item.trigger ? (
                      <span className="inline-flex items-center gap-0.5 truncate font-semibold text-emerald-700">
                        <Zap size={9} />
                        {item.trigger}
                      </span>
                    ) : (
                      <span className="text-slate-400">No trigger</span>
                    )}
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-0.5 text-slate-500">
                      <MessageCircle size={9} />
                      {Number(item.sessions_count || 0)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                    style={{
                      width: `${widthPct}%`,
                      background: `linear-gradient(90deg, ${palette.top} 0%, ${palette.bottom} 100%)`,
                    }}
                  />
                </div>

                {/* Hits + Arrow */}
                <div className="flex items-center justify-end gap-1.5 text-right tabular-nums">
                  <span className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-800">
                    {hits.toLocaleString("en-IN")}
                  </span>
                  <ArrowRight
                    size={12}
                    className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
