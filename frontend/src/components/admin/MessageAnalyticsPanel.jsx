import React, { useState } from "react";
import {
  PieChart,
  Download,
  CheckCircle2,
  AlertTriangle,
  Database,
  GitCommitHorizontal,
} from "lucide-react";

function getInitials(name, mobile) {
  const cleanName = String(name || "").trim();
  if (cleanName) {
    return cleanName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  const digits = String(mobile || "").replace(/\D/g, "");
  return digits ? digits.slice(-2) : "WA";
}

function getStatusBadgeClass(status) {
  switch (String(status || "").toLowerCase()) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "active":
      return "bg-teal-50 text-teal-700 border-teal-200";
    case "waiting":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "error":
    case "dropped":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function DonutChart({
  total,
  segments,
  hoveredKey,
  onHover,
}) {
  const radius = 56;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;

  const activeSegments = segments.filter((s) => s.value > 0);
  const safeTotal = activeSegments.reduce((sum, s) => sum + s.value, 0);

  let cumulativeOffset = 0;

  const activeSegment =
    hoveredKey !== null
      ? activeSegments.find((s) => s.key === hoveredKey) || null
      : null;

  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-emerald-50/40 p-1.5 2xl:h-40 2xl:w-40">
      <svg
        className="h-32 w-32 -rotate-90 overflow-visible 2xl:h-36 2xl:w-36"
        viewBox="0 0 144 144"
      >
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />

        {safeTotal > 0 &&
          activeSegments.map((segment) => {
            const length = (segment.value / safeTotal) * circumference;
            const dashArray = `${length} ${circumference - length}`;
            const dashOffset = -cumulativeOffset;
            cumulativeOffset += length;
            const isActive = hoveredKey === segment.key;
            const isDimmed = hoveredKey !== null && !isActive;

            return (
              <circle
                key={segment.key}
                cx="72"
                cy="72"
                r={radius}
                fill="transparent"
                stroke={segment.color}
                strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                onMouseEnter={() => onHover(segment.key)}
                onMouseLeave={() => onHover(null)}
                className={`cursor-pointer transition-all duration-300 ${
                  isDimmed ? "opacity-35" : "opacity-100"
                }`}
              />
            );
          })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="text-2xl font-black tracking-tight tabular-nums text-slate-900">
          {Number(activeSegment ? activeSegment.value : total || 0).toLocaleString(
            "en-IN"
          )}
        </span>
        <span className="mt-0.5 max-w-[92px] truncate text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
          {activeSegment ? activeSegment.shortLabel : "MESSAGES"}
        </span>
      </div>
    </div>
  );
}

export default function MessageAnalyticsPanel({
  session,
  analytics,
  summary,
  selectedWorkflowName,
  executions = [],
  onExportConversation,
}) {
  const [hoveredKey, setHoveredKey] = useState(null);

  const activeStats = session ? analytics : summary;

  const totalMessages = Number(activeStats?.total_messages ?? 0);
  const botMessages = Number(activeStats?.bot_messages ?? 0);
  const userMessages = Number(activeStats?.user_messages ?? 0);
  const interactiveMessages = Number(activeStats?.interactive_messages ?? 0);
  const deliveredCount = Number(activeStats?.delivered_count ?? 0);
  const readCount = Number(activeStats?.read_count ?? 0);
  const failedCount = Number(activeStats?.failed_count ?? 0);

  const metricRows = [
    {
      key: "bot",
      label: "Bot Replies (Outbound)",
      shortLabel: "Bot Replies",
      value: botMessages,
      color: "#059669",
      dotClass: "bg-emerald-600",
    },
    {
      key: "user",
      label: "User Messages (Inbound)",
      shortLabel: "User Chats",
      value: userMessages,
      color: "#0d9488",
      dotClass: "bg-teal-600",
    },
    {
      key: "interactive",
      label: "Keyword / Interactive",
      shortLabel: "Interactive",
      value: interactiveMessages,
      color: "#f59e0b",
      dotClass: "bg-amber-500",
    },
  ];

  const totalForBars = Math.max(
    1,
    botMessages + userMessages + interactiveMessages
  );

  const initials = session
    ? getInitials(session.display_name, session.user_identifier)
    : "WA";

  const displayPhone = session
    ? `+${String(session.user_identifier || "").replace(/^\+/, "")}`
    : "+91 XXXXX XXXXX";

  const statusLabel = session
    ? String(session.status || "active").toUpperCase()
    : "No Selection";

  const variables =
    session && session.variables && typeof session.variables === "object"
      ? Object.entries(session.variables).filter(
          ([, val]) => val !== null && val !== ""
        )
      : [];

  return (
    <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-emerald-100/90 bg-white p-4 shadow-sm shadow-emerald-950/[0.03]">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 opacity-85" />

      {/* Header */}
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700">
            <PieChart size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-extrabold tracking-tight text-slate-900">
              Message Analytics
            </h2>
            <p className="truncate text-[10.5px] text-slate-500">
              {session ? "Selected conversation" : "Filtered summary"}
            </p>
          </div>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live Stats
        </span>
      </div>

      {/* Scrollable Body (matches Mobile Preview height cleanly) */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5 [scrollbar-width:thin]">

      {/* Selected User Box */}
      <div className="flex items-center justify-between gap-2.5 rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/75 via-white to-teal-50/40 p-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-xs font-extrabold text-white shadow-sm shadow-emerald-600/20">
            {initials}
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold text-slate-900">
              {session?.display_name || displayPhone}
            </p>

            {session?.display_name && (
              <p className="truncate text-[10px] font-medium text-slate-500">
                {displayPhone}
              </p>
            )}

            <span
              className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold ${getStatusBadgeClass(
                session?.status
              )}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => session && onExportConversation?.(session)}
          disabled={!session}
          title={
            session
              ? "Download this conversation transcript (CSV)"
              : "Select a conversation to export"
          }
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-2xs transition hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={14} />
        </button>
      </div>

      {/* Interactive Donut Chart */}
      <div className="my-2.5">
        <DonutChart
          total={totalMessages}
          segments={metricRows}
          hoveredKey={hoveredKey}
          onHover={setHoveredKey}
        />
      </div>

      {/* 3 Legend Cards with Proportional Progress Bars */}
      <div className="space-y-2">
        {metricRows.map((row) => {
          const pct = Math.min(100, Math.round((row.value / totalForBars) * 100));
          const isHovered = hoveredKey === row.key;
          return (
            <div
              key={row.key}
              onMouseEnter={() => setHoveredKey(row.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`rounded-xl border px-3 py-2 transition ${
                isHovered
                  ? "border-emerald-300 bg-emerald-50/70"
                  : "border-slate-100 bg-slate-50/60 hover:border-emerald-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.dotClass}`} />
                  <span className="truncate">{row.label}</span>
                </div>
                <span className="shrink-0 text-xs font-extrabold tabular-nums text-slate-900">
                  {row.value.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${row.value > 0 ? Math.max(pct, 4) : 0}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Delivery Health Strip */}
      {botMessages > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-1.5 py-2">
            <p className="text-[10px] font-bold text-emerald-700">Delivered</p>
            <p className="mt-0.5 text-xs font-black tabular-nums text-emerald-900">
              {deliveredCount}
            </p>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50/80 px-1.5 py-2">
            <p className="text-[10px] font-bold text-teal-700">Read</p>
            <p className="mt-0.5 text-xs font-black tabular-nums text-teal-900">
              {readCount}
            </p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/80 px-1.5 py-2">
            <p className="text-[10px] font-bold text-rose-700">Failed</p>
            <p className="mt-0.5 text-xs font-black tabular-nums text-rose-900">
              {failedCount}
            </p>
          </div>
        </div>
      )}

      {/* Metadata Box */}
      <div className="mt-3 space-y-1.5 rounded-xl border border-emerald-100/80 bg-[#f7fbf9] p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0 font-medium text-slate-500">Active Number:</span>
          <span className="truncate font-bold text-slate-800">
            {session?.user_identifier || "-"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0 font-medium text-slate-500">Workflow:</span>
          <span className="truncate font-bold text-emerald-800">
            {session?.workflow_name || selectedWorkflowName || "-"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0 font-medium text-slate-500">Last Interaction:</span>
          <span className="truncate font-semibold text-slate-800">
            {session?.last_message_formatted || "-"}
          </span>
        </div>
      </div>

      {/* Captured Lead / Workflow Variables */}
      {variables.length > 0 && (
        <div className="mt-3 rounded-xl border border-emerald-200/80 bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">
            <Database size={13} className="text-emerald-600" />
            <span>Captured Details</span>
          </div>

          <div className="space-y-1.5 text-xs">
            {variables.map(([key, val]) => (
              <div
                key={key}
                className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1 last:border-0 last:pb-0"
              >
                <span className="shrink-0 font-medium capitalize text-slate-500">
                  {key.replace(/_/g, " ")}:
                </span>
                <span className="break-all text-right font-bold text-slate-800">
                  {typeof val === "object" ? JSON.stringify(val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Node Execution Trail */}
      {executions.length > 0 && (
        <div className="mt-3 rounded-xl border border-emerald-200/80 bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">
            <GitCommitHorizontal size={13} className="text-emerald-600" />
            <span>Journey Trail ({executions.length})</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            {executions.slice(0, 6).map((step) => {
              const isFail = step.status === "failed";
              return (
                <div
                  key={step.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-[#f7fbf9] px-2.5 py-1.5"
                >
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-slate-700">
                    {isFail ? (
                      <AlertTriangle
                        size={12}
                        className="shrink-0 text-rose-500"
                      />
                    ) : (
                      <CheckCircle2
                        size={12}
                        className="shrink-0 text-emerald-600"
                      />
                    )}
                    <span className="truncate font-mono text-[10px]">
                      {step.node_id}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[10px] font-bold capitalize ${
                      isFail ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {step.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
