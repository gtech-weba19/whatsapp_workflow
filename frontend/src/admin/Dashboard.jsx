import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Users,
  MessageCircle,
  MessagesSquare,
  Workflow,
  CheckCircle2,
  XCircle,
  Activity,
  RefreshCw,
  AlertCircle,
  Clock3,
  Smartphone,
  ArrowUpRight,
  TrendingUp,
  Zap,
  ShieldCheck,
  CircleHelp,
  Wifi,
  CalendarDays,
  ChevronRight,
  BarChart3,
  CircleDot,
} from "lucide-react";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

const initialData = {
  stats: {
    total_contacts: 0,
    active_conversations: 0,
    messages_today: 0,
    workflow_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
    active_workflows: 0,
  },
  monthly_usage: {
    used: 0,
    limit: 100000,
    remaining: 100000,
    percentage: 0,
  },
  execution_summary: {
    success_rate: 0,
    failure_rate: 0,
    total: 0,
  },
  whatsapp: {
    status: "not_configured",
    sender_number: null,
    active_numbers: 0,
  },
  recent_executions: [],
};

const numberFormat = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const percentage = (value) =>
  Math.min(100, Math.max(0, Number(value) || 0));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function Panel({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-emerald-100/80 bg-white shadow-sm shadow-emerald-950/[0.025] ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  title,
  description,
  icon: Icon,
  eyebrow,
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      {Icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
          <Icon size={19} />
        </div>
      )}

      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            {eyebrow}
          </p>
        )}

        <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "emerald",
  loading = false,
}) {
  const accents = {
    emerald: {
      icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      bar: "bg-emerald-500",
      glow: "from-emerald-100/70",
    },
    teal: {
      icon: "bg-teal-50 text-teal-700 ring-teal-100",
      bar: "bg-teal-500",
      glow: "from-teal-100/70",
    },
    blue: {
      icon: "bg-blue-50 text-blue-700 ring-blue-100",
      bar: "bg-blue-500",
      glow: "from-blue-100/70",
    },
    lime: {
      icon: "bg-lime-50 text-lime-700 ring-lime-100",
      bar: "bg-lime-500",
      glow: "from-lime-100/70",
    },
    amber: {
      icon: "bg-amber-50 text-amber-700 ring-amber-100",
      bar: "bg-amber-500",
      glow: "from-amber-100/70",
    },
    red: {
      icon: "bg-red-50 text-red-700 ring-red-100",
      bar: "bg-red-500",
      glow: "from-red-100/70",
    },
  };

  const theme = accents[accent] || accents.emerald;

  return (
    <div className="group relative isolate overflow-hidden rounded-2xl border border-emerald-100/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/[0.06] sm:p-6">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b ${theme.glow} to-transparent opacity-70`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          {loading ? (
            <div className="mt-4 h-9 w-28 animate-pulse rounded-lg bg-emerald-50" />
          ) : (
            <h3 className="mt-3 break-words text-3xl font-extrabold tracking-tight text-green-950">
              {numberFormat(value)}
            </h3>
          )}

          <p className="mt-3 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition duration-300 group-hover:scale-110 ${theme.icon}`}
        >
          <Icon size={21} strokeWidth={2} />
        </div>
      </div>

      <div
        className={`absolute bottom-0 left-0 h-[3px] w-0 transition-all duration-500 group-hover:w-full ${theme.bar}`}
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "unknown")
    .toLowerCase()
    .replaceAll(" ", "_");

  const success = [
    "success",
    "completed",
    "successful",
    "complete",
    "succeeded",
  ].includes(normalized);

  const failed = [
    "failed",
    "failure",
    "error",
    "cancelled",
    "canceled",
  ].includes(normalized);

  const styles = success
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : failed
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-800";

  const Icon = success
    ? CheckCircle2
    : failed
      ? XCircle
      : Clock3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles}`}
    >
      <Icon size={13} />
      {String(status || "Unknown").replaceAll("_", " ")}
    </span>
  );
}

function LoadingRows() {
  return Array.from({ length: 4 }).map((_, index) => (
    <tr key={index}>
      {Array.from({ length: 4 }).map((__, cell) => (
        <td className="px-5 py-5 sm:px-6" key={cell}>
          <div className="h-4 animate-pulse rounded-md bg-emerald-50" />
        </td>
      ))}
    </tr>
  ));
}

function UsageRing({ value }) {
  const safeValue = percentage(value);
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`${safeValue.toFixed(1)} percent usage`}
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#d1fae5"
          strokeWidth="8"
        />

        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#059669"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>

      <div className="absolute text-center">
        <p className="text-xl font-extrabold text-green-950">
          {safeValue.toFixed(0)}%
        </p>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          Used
        </p>
      </div>
    </div>
  );
}

function WhatsAppStatus({ whatsapp }) {
  const status = String(
    whatsapp.status || "not_configured"
  ).toLowerCase();

  const connected = status === "connected";
  const configured = status === "configured";

  const statusText = connected
    ? "Connected"
    : configured
      ? "Configured"
      : status.replaceAll("_", " ");

  const badgeClass = connected
    ? "bg-emerald-100 text-emerald-800"
    : configured
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-600";

  return (
    <Panel className="relative h-full overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-100/70 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <SectionHeading
          title="WhatsApp status"
          description="Messaging provider overview"
          icon={Smartphone}
        />

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
          <MessageCircle size={20} />
        </div>
      </div>

      <div className="relative mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {connected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}

              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  connected
                    ? "bg-emerald-500"
                    : configured
                      ? "bg-amber-500"
                      : "bg-slate-400"
                }`}
              />
            </span>

            <span className="truncate text-sm font-bold capitalize text-slate-800">
              {statusText}
            </span>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${badgeClass}`}
          >
            {connected ? "CONNECTED" : configured ? "SETUP" : "OFFLINE"}
          </span>
        </div>
      </div>

      <div className="relative mt-5 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Sender number
          </p>

          <p className="mt-1.5 break-all text-sm font-semibold text-slate-800">
            {whatsapp.sender_number || "Not configured"}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-medium text-slate-600">
              Active numbers
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Configured WhatsApp numbers
            </p>
          </div>

          <span className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-lg font-extrabold text-emerald-800">
            {numberFormat(whatsapp.active_numbers)}
          </span>
        </div>
      </div>

      <div className="relative mt-5 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-xs leading-5 text-emerald-800">
        <CircleHelp size={15} className="mt-0.5 shrink-0" />
        <p>
          A configured status does not guarantee a live provider connection.
          Verify connectivity with a provider health check.
        </p>
      </div>
    </Panel>
  );
}

function MetricSummary({
  title,
  value,
  description,
  icon: Icon,
  type = "neutral",
}) {
  const styles = {
    neutral: {
      wrapper: "border-emerald-100 bg-emerald-50/50",
      title: "text-slate-600",
      value: "text-green-950",
      icon: "text-emerald-700",
    },
    success: {
      wrapper: "border-emerald-100 bg-emerald-50/70",
      title: "text-emerald-800",
      value: "text-emerald-900",
      icon: "text-emerald-700",
    },
    danger: {
      wrapper: "border-red-100 bg-red-50/60",
      title: "text-red-800",
      value: "text-red-800",
      icon: "text-red-600",
    },
  };

  const theme = styles[type] || styles.neutral;

  return (
    <div className={`rounded-xl border p-4 ${theme.wrapper}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`text-sm font-medium ${theme.title}`}>
          {title}
        </span>
        <Icon size={17} className={theme.icon} />
      </div>

      <p className={`mt-3 text-2xl font-extrabold ${theme.value}`}>
        {value}
      </p>

      <p className="mt-1 text-[11px] leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API}/dashboard`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = response.data?.data ?? response.data ?? {};

      setDashboard({
        ...initialData,
        ...result,
        stats: {
          ...initialData.stats,
          ...(result.stats || {}),
        },
        monthly_usage: {
          ...initialData.monthly_usage,
          ...(result.monthly_usage || {}),
        },
        execution_summary: {
          ...initialData.execution_summary,
          ...(result.execution_summary || {}),
        },
        whatsapp: {
          ...initialData.whatsapp,
          ...(result.whatsapp || {}),
        },
        recent_executions: Array.isArray(result.recent_executions)
          ? result.recent_executions
          : [],
      });
    } catch (err) {
      console.error(
        "Dashboard API error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          "Dashboard data load nahi ho saka. API URL, authentication aur backend logs check karein."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const stats = dashboard.stats;
  const usage = dashboard.monthly_usage;
  const summary = dashboard.execution_summary;
  const whatsapp = dashboard.whatsapp;

  const successRate = percentage(summary.success_rate);
  const failureRate = percentage(summary.failure_rate);
  const usagePercentage = percentage(usage.percentage);

  const executionCount = Number(summary.total || 0);
  const hasExecutions = executionCount > 0;

  return (
    <div className="min-h-screen bg-[#f3faf6] text-slate-900">
      <div className="mx-auto max-w-[1700px] space-y-7 p-4 sm:p-6 lg:p-8">
        
<header
  className="relative isolate w-full rounded-2xl border border-emerald-100 bg-white shadow-sm"
  style={{ minHeight: "70px", height: "auto" }}
>
  <div className="pointer-events-none absolute right-0 top-0 -z-10 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" />

  <div
    className="flex w-full flex-col justify-center gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    style={{ boxSizing: "border-box" }}
  >
    <div className="min-w-0 flex-1">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
        <BarChart3 size={13} />
        Admin dashboard
      </div>

 <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-emerald-950 sm:text-3xl mt-2">
        Dashboard
      </h1>
     
    </div>

    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
      <div className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm font-semibold text-emerald-800">
        <Activity size={16} />
        Platform analytics
      </div>

      <button
        type="button"
        onClick={() => fetchDashboard(true)}
        disabled={refreshing}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw
          size={16}
          className={refreshing ? "animate-spin" : ""}
        />
        {refreshing ? "Refreshing..." : "Refresh data"}
      </button>
    </div>
  </div>
</header>

        {/* PLATFORM OVERVIEW */}
        <section>
   

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
            
              value={stats.total_contacts}
              description="All registered contacts"
              icon={Users}
              accent="emerald"
              loading={loading}
            />

            <StatCard
              title="Active Conversations"
              value={stats.active_conversations}
              description="Active and waiting sessions"
              icon={MessageCircle}
              accent="teal"
              loading={loading}
            />

            <StatCard
              title="Messages Today"
              value={stats.messages_today}
              description="Messages recorded today"
              icon={MessagesSquare}
              accent="blue"
              loading={loading}
            />

            <StatCard
              title="Active Workflows"
              value={stats.active_workflows}
              description="Published or active workflows"
              icon={Workflow}
              accent="lime"
              loading={loading}
            />
          </div>
        </section>

        {/* WORKFLOW PERFORMANCE */}
        <section>
          <div className="mb-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              Automation analytics
            </p>

            <h2 className="text-lg font-bold tracking-tight text-green-950">
              Workflow performance
            </h2>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Execution results for the current month
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Executions"
              value={stats.workflow_executions}
              description="Executions this month"
              icon={Activity}
              accent="emerald"
              loading={loading}
            />

            <StatCard
              title="Successful"
              value={stats.successful_executions}
              description="Successful executions this month"
              icon={CheckCircle2}
              accent="teal"
              loading={loading}
            />

            <StatCard
              title="Failed"
              value={stats.failed_executions}
              description="Failed executions this month"
              icon={XCircle}
              accent="red"
              loading={loading}
            />

            <Panel className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Success rate
                  </p>

                  {loading ? (
                    <div className="mt-4 h-9 w-24 animate-pulse rounded-lg bg-emerald-50" />
                  ) : (
                    <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-green-950">
                      {Number(summary.success_rate || 0).toFixed(1)}%
                    </h3>
                  )}
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <TrendingUp size={21} />
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-700"
                  style={{
                    width: `${hasExecutions ? successRate : 0}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  {numberFormat(summary.total)} total executions
                </span>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <ArrowUpRight size={14} />
                  {Number(summary.success_rate || 0).toFixed(1)}%
                </span>
              </div>
            </Panel>
          </div>
        </section>

        {/* USAGE + WHATSAPP */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <Panel className="overflow-hidden p-5 sm:p-6 xl:col-span-3">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <SectionHeading
                title="Monthly message usage"
                description="Track consumption against your monthly limit"
                icon={BarChart3}
              />

              <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                <CalendarDays size={13} />
                Monthly
              </span>
            </div>

            <div className="mt-5 flex flex-col items-center gap-6 rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/70 p-5 sm:flex-row sm:justify-between sm:p-6">
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Messages consumed
                </p>

                {loading ? (
                  <div className="mx-auto mt-3 h-10 w-36 animate-pulse rounded-lg bg-emerald-100 sm:mx-0" />
                ) : (
                  <p className="mt-2 break-words text-3xl font-extrabold tracking-tight text-green-950 sm:text-4xl">
                    {numberFormat(usage.used)}
                  </p>
                )}

                <p className="mt-2 text-sm text-slate-500">
                  of {numberFormat(usage.limit)} messages available
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <span className="rounded-lg border border-emerald-100 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">
                    {numberFormat(usage.remaining)} remaining
                  </span>
                </div>
              </div>

              <UsageRing value={usage.percentage} />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-600">
                  Monthly quota
                </span>

                <span className="text-xs font-bold text-emerald-800">
                  {usagePercentage.toFixed(1)}% used
                </span>
              </div>

              <div
                className="h-2.5 overflow-hidden rounded-full bg-emerald-100"
                role="progressbar"
                aria-label="Monthly message usage"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={usagePercentage}
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    usagePercentage >= 90
                      ? "bg-gradient-to-r from-amber-500 to-red-500"
                      : "bg-gradient-to-r from-emerald-600 via-green-500 to-teal-400"
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>0 messages</span>
                <span>{numberFormat(usage.limit)} messages</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/40 p-4 transition hover:bg-emerald-50">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                    <MessagesSquare size={16} />
                  </div>

                  <p className="text-xs font-medium text-slate-500">
                    Remaining quota
                  </p>
                </div>

                <p className="mt-3 text-xl font-extrabold text-green-950">
                  {numberFormat(usage.remaining)}
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  Messages left this month
                </p>
              </div>

              <div className="rounded-xl border border-teal-100/80 bg-teal-50/40 p-4 transition hover:bg-teal-50">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm">
                    <BarChart3 size={16} />
                  </div>

                  <p className="text-xs font-medium text-slate-500">
                    Monthly limit
                  </p>
                </div>

                <p className="mt-3 text-xl font-extrabold text-green-950">
                  {numberFormat(usage.limit)}
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  Total allowed messages
                </p>
              </div>
            </div>
          </Panel>

          <div className="xl:col-span-2">
            <WhatsAppStatus whatsapp={whatsapp} />
          </div>
        </section>

        {/* EXECUTION HEALTH */}
        <section>
          <Panel className="p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeading
                title="Execution health"
                description="A breakdown of workflow results returned by your API"
                icon={Activity}
              />

              <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                <Wifi size={14} />
                Monthly summary
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricSummary
                title="Total executions"
                value={numberFormat(summary.total)}
                description="All executions in the reported period"
                icon={Activity}
                type="neutral"
              />

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-emerald-800">
                    Success rate
                  </span>
                  <CheckCircle2 size={17} className="text-emerald-700" />
                </div>

                <p className="mt-3 text-2xl font-extrabold text-emerald-900">
                  {Number(summary.success_rate || 0).toFixed(1)}%
                </p>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${hasExecutions ? successRate : 0}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-[11px] text-emerald-800/70">
                  Successful workflow executions
                </p>
              </div>

              <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-red-800">
                    Failure rate
                  </span>
                  <XCircle size={17} className="text-red-600" />
                </div>

                <p className="mt-3 text-2xl font-extrabold text-red-800">
                  {Number(summary.failure_rate || 0).toFixed(1)}%
                </p>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-red-100">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-500"
                    style={{
                      width: `${hasExecutions ? failureRate : 0}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-[11px] text-red-800/70">
                  Failed workflow executions
                </p>
              </div>
            </div>
          </Panel>
        </section>

        {/* RECENT EXECUTIONS */}
        <Panel className="overflow-hidden">
          <div className="flex flex-col justify-between gap-4 border-b border-emerald-100/80 p-5 sm:flex-row sm:items-center sm:px-6">
            <SectionHeading
              title="Recent executions"
              description="Latest workflow activity from your platform"
              icon={Clock3}
            />

            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              <MessagesSquare size={14} />
              {numberFormat(dashboard.recent_executions.length)} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead>
                <tr className="border-b border-emerald-100 bg-emerald-50/60">
                  {["Workflow", "Status", "Time"].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-900/70 sm:px-6"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <LoadingRows />
                ) : dashboard.recent_executions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                        <Activity size={26} />
                      </div>

                      <p className="mt-4 text-sm font-bold text-slate-800">
                        No recent executions
                      </p>

                      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                        Workflow execution records will appear here when
                        your backend has activity to display.
                      </p>

                      {error && (
                        <button
                          type="button"
                          onClick={() => fetchDashboard(true)}
                          disabled={refreshing}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <RefreshCw
                            size={13}
                            className={refreshing ? "animate-spin" : ""}
                          />
                          Retry loading
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  dashboard.recent_executions.map((execution, index) => (
                    <tr
                      key={execution.id ?? index}
                      className="transition-colors hover:bg-emerald-50/50"
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700">
                            <Workflow size={17} />
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate text-sm font-bold text-slate-800">
                              {execution.workflow || "Workflow"}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              Workflow execution
                            </p>
                          </div>
                        </div>
                      </td>

                

                      <td className="px-5 py-4 sm:px-6">
                        <StatusBadge status={execution.status} />
                      </td>

                      <td className="px-5 py-4 text-xs font-medium text-slate-500 sm:px-6">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <Clock3 size={13} className="text-emerald-600" />
                          {execution.time || "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && dashboard.recent_executions.length > 0 && (
            <div className="flex flex-col justify-between gap-2 border-t border-emerald-100/80 bg-emerald-50/30 px-5 py-3 sm:flex-row sm:items-center sm:px-6">
              <p className="text-xs text-slate-500">
                Showing latest{" "}
                {numberFormat(dashboard.recent_executions.length)} executions
              </p>

              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                Latest activity
                <ChevronRight size={14} />
              </span>
            </div>
          )}
        </Panel>

        {/* FOOTER */}
        <footer className="flex flex-col items-start justify-between gap-2 border-t border-emerald-100 pt-4 text-xs text-slate-400 sm:flex-row sm:items-center">
          <p className="inline-flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <ShieldCheck size={13} />
            </span>
            Dashboard · Admin Console
          </p>

          {dashboard.generated_at && (
            <p>
              Last updated: {formatDate(dashboard.generated_at)}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}