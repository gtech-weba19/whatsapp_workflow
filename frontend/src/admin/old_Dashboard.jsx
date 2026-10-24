
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Users,
  Workflow,
  XCircle,
  Zap,
  Building2,
  TrendingUp,
} from "lucide-react";

import {
  getStoredUser,
  hasPermission,
  isSuperAdmin,
} from "../utils/permission";

// Adjust this import path to your actual component location.
import WhatsAppConnectionStatus from "../components/admin/WhatsAppConnectionStatus";

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
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.025] ${className}`}
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
  const themes = {
    emerald: {
      icon: "bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
      glow: "bg-emerald-100/70",
    },
    teal: {
      icon: "bg-teal-50 text-teal-700",
      bar: "bg-teal-500",
      glow: "bg-teal-100/70",
    },
    blue: {
      icon: "bg-blue-50 text-blue-700",
      bar: "bg-blue-500",
      glow: "bg-blue-100/70",
    },
    amber: {
      icon: "bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
      glow: "bg-amber-100/70",
    },
    red: {
      icon: "bg-red-50 text-red-700",
      bar: "bg-red-500",
      glow: "bg-red-100/70",
    },
    violet: {
      icon: "bg-violet-50 text-violet-700",
      bar: "bg-violet-500",
      glow: "bg-violet-100/70",
    },
  };

  const theme = themes[accent] || themes.emerald;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/[0.05] sm:p-6">
      <div
        className={`pointer-events-none absolute -right-5 -top-8 h-28 w-28 rounded-full ${theme.glow} opacity-60 blur-2xl transition group-hover:opacity-100`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          {loading ? (
            <div className="mt-3 h-9 w-28 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p className="mt-2 break-words text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {numberFormat(value)}
            </p>
          )}
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition duration-300 group-hover:scale-110 ${theme.icon}`}
        >
          <Icon size={22} />
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <p className="truncate text-xs text-slate-500">{description}</p>
        <span className={`h-1.5 w-7 shrink-0 rounded-full ${theme.bar}`} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "unknown").toLowerCase();

  const success = ["success", "completed"].includes(normalized);
  const failed = ["failed", "error"].includes(normalized);
  const running = ["running", "processing", "pending"].includes(normalized);

  const classes = success
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : failed
      ? "border-red-200 bg-red-50 text-red-800"
      : running
        ? "border-blue-200 bg-blue-50 text-blue-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  const label = success
    ? "Success"
    : failed
      ? "Failed"
      : normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${classes}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          success
            ? "bg-emerald-500"
            : failed
              ? "bg-red-500"
              : running
                ? "animate-pulse bg-blue-500"
                : "bg-slate-400"
        }`}
      />
      {label}
    </span>
  );
}

function LoadingRows() {
  return Array.from({ length: 4 }).map((_, index) => (
    <tr key={index}>
      {Array.from({ length: 3 }).map((__, cell) => (
        <td className="px-5 py-5 sm:px-6" key={cell}>
          <div className="h-4 animate-pulse rounded-md bg-slate-100" />
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
          stroke={safeValue >= 90 ? "#f59e0b" : "#059669"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>

      <div className="absolute text-center">
        <p className="text-xl font-extrabold text-slate-900">
          {safeValue.toFixed(0)}%
        </p>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          Used
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  type = "neutral",
  rate,
  hasExecutions,
}) {
  const themes = {
    neutral: {
      wrapper: "border-slate-200 bg-slate-50/70",
      text: "text-slate-900",
      icon: "text-slate-600",
      bar: "bg-slate-500",
    },
    success: {
      wrapper: "border-emerald-100 bg-emerald-50/70",
      text: "text-emerald-900",
      icon: "text-emerald-700",
      bar: "bg-emerald-500",
    },
    danger: {
      wrapper: "border-red-100 bg-red-50/60",
      text: "text-red-800",
      icon: "text-red-600",
      bar: "bg-red-500",
    },
  };

  const theme = themes[type] || themes.neutral;

  return (
    <div className={`rounded-xl border p-4 ${theme.wrapper}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{title}</span>
        <Icon size={17} className={theme.icon} />
      </div>

      <p className={`mt-3 text-2xl font-extrabold ${theme.text}`}>{value}</p>

      {rate !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
          <div
            className={`h-full rounded-full transition-all duration-500 ${theme.bar}`}
            style={{ width: `${hasExecutions ? percentage(rate) : 0}%` }}
          />
        </div>
      )}

      {description && (
        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function EmptyState({ error, onRetry, refreshing }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
        <Activity size={25} />
      </div>

      <p className="mt-4 text-sm font-bold text-slate-800">
        No recent executions
      </p>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
        Workflow execution records will appear here when your backend has
        activity to display.
      </p>

      {error && (
        <button
          type="button"
          onClick={onRetry}
          disabled={refreshing}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin" : ""}
          />
          Retry loading
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const user = getStoredUser();
  const superAdmin = isSuperAdmin(user);

  const canViewContacts =
    superAdmin || hasPermission("contacts.view", user);
  const canViewBots =
    superAdmin || hasPermission("bots.view", user);
  const canViewWorkflows =
    superAdmin || hasPermission("workflows.view", user);
  const canViewUsage =
    superAdmin || hasPermission("usage.view", user);
  const canViewWhatsApp =
    superAdmin || hasPermission("whatsapp_accounts.view", user);

  const hasAnyOverviewCard =
    canViewContacts || canViewBots || canViewWorkflows || canViewUsage;

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("token");

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
          "Dashboard data could not be loaded. Please check your connection."
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

  const statCards = useMemo(
    () => [
      ...(canViewBots
        ? [
            {
              title: "Active Conversations",
              value: stats.active_conversations,
              description: "Active and waiting sessions",
              icon: MessageCircle,
              accent: "teal",
            },
          ]
        : []),
      ...(canViewBots || canViewUsage
        ? [
            {
              title: "Messages Today",
              value: stats.messages_today,
              description: "Messages recorded today",
              icon: MessagesSquare,
              accent: "blue",
            },
          ]
        : []),
      ...(canViewWorkflows
        ? [
            {
              title: "Active Workflows",
              value: stats.active_workflows,
              description: "Published or active workflows",
              icon: Workflow,
              accent: "violet",
            },
          ]
        : []),
      ...(canViewWorkflows
        ? [
            {
              title: "Total Executions",
              value: stats.workflow_executions,
              description: "Executions this month",
              icon: Activity,
              accent: "emerald",
            },
            {
              title: "Successful",
              value: stats.successful_executions,
              description: "Successful executions this month",
              icon: CheckCircle2,
              accent: "teal",
            },
            {
              title: "Failed",
              value: stats.failed_executions,
              description: "Failed executions this month",
              icon: XCircle,
              accent: "red",
            },
          ]
        : []),
      // ...(canViewContacts
      //   ? [
      //       {
      //         title: "Total Contacts",
      //         value: stats.total_contacts,
      //         description: "Contacts in your workspace",
      //         icon: Users,
      //         accent: "amber",
      //       },
      //     ]
      //   : []),
    ],
    [stats, canViewBots, canViewUsage, canViewWorkflows, canViewContacts]
  );

  const whatsappStatus = String(whatsapp.status || "")
    .trim()
    .toLowerCase();

  const whatsappConnected = whatsappStatus === "connected";

  return (
    <div className="min-h-screen bg-[#f6faf8] text-slate-900">
      <div className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 lg:space-y-7 lg:p-8">
       
      {/* TOP WHATSAPP STATUS FOR NORMAL USERS */}
        {!superAdmin && canViewWhatsApp && (
          <div className="space-y-3">
            <WhatsAppConnectionStatus
              status={whatsapp.status}
              senderNumber={whatsapp.sender_number}
             
              onRefresh={() => fetchDashboard(true)}
            />

          </div>
        )}

{/* PRODUCTION DASHBOARD HEADER */}
<header className="group relative isolate min-h-[320px] w-full overflow-hidden rounded-3xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/80 shadow-[0_8px_35px_-18px_rgba(5,150,105,0.22)] transition-shadow duration-300 hover:shadow-[0_15px_45px_-20px_rgba(5,150,105,0.3)] sm:min-h-[350px] lg:min-h-[380px]">

  {/* Background decoration */}
  <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl transition-transform duration-700 group-hover:scale-110" />
    <div className="absolute right-1/4 top-16 h-40 w-40 rounded-full bg-teal-100/40 blur-3xl" />
    <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-cyan-100/30 blur-3xl" />

    {/* Decorative dots */}
    <div className="absolute right-7 top-7 grid grid-cols-4 gap-2 opacity-50 sm:right-10 sm:top-9">
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-emerald-400"
        />
      ))}
    </div>
  </div>

  {/* Left accent */}
  <div className="absolute bottom-5 left-0 top-5 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 via-emerald-600 to-teal-400 sm:bottom-7 sm:top-7 sm:w-1.5" />

  {/* MAIN CONTENT: fixed minimum height */}
  <div className="relative grid min-h-[318px] grid-cols-1 content-center gap-7 p-5 pl-7 sm:min-h-[348px] sm:p-7 sm:pl-9 lg:min-h-[378px] lg:grid-cols-[minmax(0,1fr)_290px] lg:items-center lg:gap-8 lg:p-8 lg:pl-10">

    {/* Welcome content */}
    <div className="min-w-0">

      {/* Eyebrow */}
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/90 px-3.5 py-2 shadow-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
          <Activity size={14} strokeWidth={2.5} />
        </span>

        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-800 sm:text-xs">
          Dashboard Overview
        </span>

        <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
      </div>

      {/* Greeting */}
      <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl xl:text-[42px]">
        {user?.name ? (
          <>
            Welcome,{" "}
            <span className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 bg-clip-text text-transparent">
              {user.name}
            </span>
            <span className="ml-2 inline-block origin-bottom-right text-2xl transition-transform duration-300 group-hover:rotate-12 sm:text-3xl">
              👋
            </span>
          </>
        ) : (
          "Dashboard"
        )}
      </h1>

      {/* Description */}
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
        {superAdmin
          ? "Monitor platform activity, workflows and system performance from one central workspace."
          : `Here is the latest activity and performance overview for ${
              user?.tenant?.name ||
              user?.company_name ||
              "your account"
            }.`}
      </p>

      {/* Information chips */}
      <div className="mt-6 flex flex-wrap items-center gap-3">

        {/* Account type */}
        <div className="inline-flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-white/80 px-3.5 py-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <ShieldCheck size={19} />
          </span>

          <span>
            <span className="block text-[10px] font-medium text-slate-400">
              Account role
            </span>
            <span className="block text-xs font-bold text-slate-800">
              {superAdmin ? "Super Admin" : "Workspace"}
            </span>
          </span>
        </div>

        {/* Organization */}
        <div className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-slate-100 bg-white/80 px-3.5 py-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Building2 size={19} />
          </span>

          <span className="min-w-0">
            <span className="block text-[10px] font-medium text-slate-400">
              Organization
            </span>
            <span className="block max-w-[180px] truncate text-xs font-bold text-slate-800">
              {superAdmin
                ? "Platform Management"
                : user?.tenant?.name ||
                  user?.company_name ||
                  "Your Account"}
            </span>
          </span>
        </div>

        {/* Platform status */}
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-white/80 px-3.5 py-2.5 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>

          <span className="text-xs font-bold text-slate-600">
            Dashboard ready
          </span>
        </div>
      </div>
    </div>

    {/* Right side */}
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center lg:w-[290px] lg:flex-col lg:items-stretch lg:gap-4">

      {/* CSS analytics illustration */}
      <div className="relative hidden h-32 overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/80 p-4 sm:flex sm:flex-1 sm:items-center sm:justify-center lg:h-36 lg:flex-none">

        <div className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-teal-100/60 blur-xl" />
        <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-emerald-200/50 blur-xl" />

        <div className="relative flex h-full w-full items-end justify-center gap-3">

          {/* Chart bars */}
          <div className="flex h-full items-end gap-2 rounded-xl border border-white bg-white/80 px-5 pb-3 pt-4 shadow-sm">
            {[30, 48, 39, 68, 88].map((height, index) => (
              <div
                key={index}
                className="relative w-5 overflow-hidden rounded-t-md bg-gradient-to-t from-emerald-600 to-teal-300 transition-all duration-500 group-hover:brightness-110"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          {/* Growth badge */}
          <div className="absolute right-2 top-1 flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 shadow-md transition-transform duration-300 group-hover:-translate-y-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <TrendingUp size={18} />
            </span>

            <span>
              <span className="block text-[10px] font-medium text-slate-400">
                Performance
              </span>
              <span className="block text-xs font-extrabold text-emerald-700">
                Keep growing
              </span>
            </span>
          </div>

          {/* Message badge */}
          <div className="absolute bottom-2 left-2 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-white text-emerald-700 shadow-md transition-transform duration-300 group-hover:rotate-[-6deg]">
            <MessageCircle size={21} />
          </div>
        </div>
      </div>

      {/* Refresh button */}
      <button
        type="button"
        onClick={() => fetchDashboard(true)}
        disabled={refreshing}
        className="group/button inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_-8px_rgba(5,150,105,0.65)] transition duration-200 hover:-translate-y-0.5 hover:from-emerald-800 hover:to-teal-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        <RefreshCw
          size={17}
          className={`shrink-0 transition-transform duration-500 ${
            refreshing
              ? "animate-spin"
              : "group-hover/button:rotate-180"
          }`}
        />

        <span>
          {refreshing ? "Refreshing..." : "Refresh dashboard"}
        </span>

        {!refreshing && (
          <ArrowUpRight
            size={17}
            className="transition-transform duration-200 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
          />
        )}
      </button>

      {/* Refresh caption */}
      <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-slate-400 lg:justify-start">
        <Clock3 size={13} />
        <span>
          {refreshing
            ? "Updating dashboard data..."
            : "Refresh to view the latest activity"}
        </span>
      </div>
    </div>
  </div>

  {/* Bottom accent */}
  <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-300 to-cyan-100" />
</header>



        {/* API ERROR */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={19} />
              <div>
                <p className="text-sm font-bold text-red-900">
                  Unable to refresh dashboard
                </p>
                <p className="mt-1 break-words text-xs leading-5 text-red-800">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-100 disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin" : ""}
              />
              Try again
            </button>
          </div>
        )}

  
        {/* OVERVIEW STATISTICS */}
        {hasAnyOverviewCard && (
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <SectionHeading
                title="Platform overview"
                description="Your workspace at a glance"
                icon={Activity}
              />

              <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Live data
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {statCards.map((card) => (
                <StatCard
                  key={card.title}
                  {...card}
                  loading={loading}
                />
              ))}
            </div>
          </section>
        )}

        {/* USAGE AND WHATSAPP DETAILS */}
        {(canViewUsage || (canViewWhatsApp && superAdmin)) && (
          <section
            className={
              canViewUsage && canViewWhatsApp && superAdmin
                ? "grid grid-cols-1 gap-5 xl:grid-cols-5"
                : "grid grid-cols-1 gap-5"
            }
          >
            {/* {canViewUsage && (
              <div
                className={
                  canViewWhatsApp && superAdmin
                    ? "xl:col-span-3"
                    : "w-full"
                }
              >
                <Panel className="h-full overflow-hidden p-5 sm:p-6">
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

                  <div className="mt-5 flex flex-col items-center gap-6 rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 p-5 sm:flex-row sm:justify-between sm:p-6">
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Messages consumed
                      </p>

                      {loading ? (
                        <div className="mx-auto mt-3 h-10 w-36 animate-pulse rounded-lg bg-slate-100 sm:mx-0" />
                      ) : (
                        <p className="mt-2 break-words text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                          {numberFormat(usage.used)}
                        </p>
                      )}

                      <p className="mt-2 text-sm text-slate-500">
                        of {numberFormat(usage.limit)} messages available
                      </p>

                      <span className="mt-4 inline-flex rounded-lg border border-emerald-100 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">
                        {numberFormat(usage.remaining)} remaining
                      </span>
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
                            : "bg-gradient-to-r from-emerald-600 to-teal-400"
                        }`}
                        style={{ width: `${usagePercentage}%` }}
                      />
                    </div>

                    <div className="mt-3 flex justify-between text-xs text-slate-400">
                      <span>0 messages</span>
                      <span>{numberFormat(usage.limit)} messages</span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <MessagesSquare size={16} />
                        <span className="text-xs font-medium">
                          Remaining quota
                        </span>
                      </div>
                      <p className="mt-3 text-xl font-extrabold text-slate-900">
                        {numberFormat(usage.remaining)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Messages left this month
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <BarChart3 size={16} />
                        <span className="text-xs font-medium">
                          Monthly limit
                        </span>
                      </div>
                      <p className="mt-3 text-xl font-extrabold text-slate-900">
                        {numberFormat(usage.limit)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Total allowed messages
                      </p>
                    </div>
                  </div>
                </Panel>
              </div>
            )} */}

            {canViewWhatsApp && superAdmin && (
              <div
                className={
                  canViewUsage ? "xl:col-span-2" : "w-full"
                }
              >
                <Panel className="h-full overflow-hidden p-5 sm:p-6">
                  <SectionHeading
                    title="WhatsApp account"
                    description="Provider connection overview"
                    icon={Smartphone}
                  />

                  <div className="mt-5">
                    <WhatsAppConnectionStatus
                      status={whatsapp.status}
                      senderNumber={whatsapp.sender_number}
                      loading={loading}
                      onRefresh={() => fetchDashboard(true)}
                      compact
                    />
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Active numbers
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-900">
                      {numberFormat(whatsapp.active_numbers)}
                    </p>
                  </div>
                </Panel>
              </div>
            )}
          </section>
        )}

        {/* EXECUTION HEALTH */}
        {canViewWorkflows && (
          <section>
            <Panel className="p-5 sm:p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <SectionHeading
                  title="Execution health"
                  description="Workflow results for the reported period"
                  icon={Activity}
                />

                <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  <Clock3 size={14} />
                  Monthly summary
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MetricCard
                  title="Total executions"
                  value={numberFormat(summary.total)}
                  description="All executions in the reported period"
                  icon={Activity}
                />

                <MetricCard
                  title="Success rate"
                  value={`${Number(summary.success_rate || 0).toFixed(1)}%`}
                  description="Successful workflow executions"
                  icon={CheckCircle2}
                  type="success"
                  rate={successRate}
                  hasExecutions={hasExecutions}
                />

                <MetricCard
                  title="Failure rate"
                  value={`${Number(summary.failure_rate || 0).toFixed(1)}%`}
                  description="Failed workflow executions"
                  icon={XCircle}
                  type="danger"
                  rate={failureRate}
                  hasExecutions={hasExecutions}
                />
              </div>
            </Panel>
          </section>
        )}

   
        {/* NO PERMISSIONS FALLBACK */}
        {!hasAnyOverviewCard &&
          !canViewWorkflows &&
          !canViewUsage &&
          !canViewWhatsApp && (
            <Panel className="p-8 text-center sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ShieldCheck size={32} />
              </div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Welcome to your workspace, {user?.name || "User"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Your account is active. Use the sidebar to access your
                assigned tools and features.
              </p>
            </Panel>
          )}

        {/* FOOTER */}
        <footer className="flex flex-col items-start justify-between gap-2 border-t border-slate-200 pt-4 text-xs text-slate-400 sm:flex-row sm:items-center">
          <p className="inline-flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck size={14} />
            </span>
            Dashboard · Admin Console
          </p>

          {dashboard.generated_at && (
            <p>Last updated: {formatDate(dashboard.generated_at)}</p>
          )}
        </footer>
      </div>
    </div>
  );
}
