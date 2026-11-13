import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react";

import {
  getStoredUser,
  hasPermission,
  isSuperAdmin,
} from "../utils/permission";
import WhatsAppConnectionStatus from "../components/admin/WhatsAppConnectionStatus";
import AccountBotsExplorer from "../components/admin/AccountBotsExplorer";
import {
  PastelKpiCard,
  ThirtyDaysHitsChart,
  WorkflowInteractionDonutCard,
  WorkflowTriggersSummaryCard,
} from "../components/admin/DashboardCharts";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

const initialData = {
  stats: {
    total_contacts: 0,
    unique_customers: 0,
    total_conversations: 0,
    active_conversations: 0,
    completed_conversations: 0,
    messages_today: 0,
    total_messages_30d: 0,
    workflow_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
    active_workflows: 0,
    total_workflows: 0,
    total_bots: 0,
    total_accounts: 0,
  },
  monthly_usage: {
    used: 0,
    limit: 0,
    remaining: 0,
    percentage: 0,
    has_quota: false,
    has_active_plan: false,
    active_plan_name: null,
    wallet_balance: 0,
    message_rate: 0.5,
  },
  execution_summary: {
    success_rate: 0,
    failure_rate: 0,
    total: 0,
  },
  daily_hits: [],
  workflow_breakdown: {
    total: 0,
    by_workflow: [],
    by_status: [],
  },
  keywords_summary: [],
  accounts_overview: [],
  whatsapp: {
    status: "not_configured",
    sender_number: null,
    active_numbers: 0,
  },
  recent_executions: [],
};

const getAuthToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("auth_token") ||
  localStorage.getItem("access_token") ||
  sessionStorage.getItem("token");

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

function UsageRing({ value }) {
  const rawId = useId();
  const ringGradId = `usage-ring-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const safeValue = percentage(value);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;
  const isHigh = safeValue >= 90;

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-emerald-50/50 p-1">
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`${safeValue.toFixed(1)} percent usage`}
      >
        <defs>
          <linearGradient id={ringGradId} x1="0" y1="0" x2="1" y2="1">
            <stop
              offset="0%"
              stopColor={isHigh ? "#f59e0b" : "#059669"}
            />
            <stop
              offset="100%"
              stopColor={isHigh ? "#ef4444" : "#14b8a6"}
            />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#d1fae5"
          strokeWidth="8.5"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={`url(#${ringGradId})`}
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>

      <div className="absolute text-center">
        <p className="text-xl font-black tracking-tight tabular-nums text-slate-900">
          {safeValue.toFixed(0)}%
        </p>
        <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
          Used
        </p>
      </div>
    </div>
  );
}

class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Unexpected rendering error.",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"
        >
          <p className="font-bold">Section failed to render</p>
          <p className="mt-1 opacity-85">{this.state.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [chartWorkflowId, setChartWorkflowId] = useState("all");

  const [whatsAppAccount, setWhatsAppAccount] = useState(null);
  const [whatsAppLoading, setWhatsAppLoading] = useState(true);
  const [whatsAppError, setWhatsAppError] = useState("");

  const [workflows, setWorkflows] = useState([]);

  const user = getStoredUser();
  const superAdmin = isSuperAdmin(user);

  const canViewBots = superAdmin || hasPermission("bots.view", user);
  const canViewWorkflows = superAdmin || hasPermission("workflows.view", user);
  const canViewUsage = superAdmin || hasPermission("usage.view", user);
  const canViewWhatsApp =
    superAdmin || hasPermission("whatsapp_accounts.view", user);

  const fetchDashboard = useCallback(
    async ({ silent = false, workflowId = chartWorkflowId } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const token = getAuthToken();
        const response = await axios.get(`${API}/dashboard`, {
          params:
            workflowId && workflowId !== "all"
              ? { workflow_id: workflowId }
              : undefined,
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
          daily_hits: Array.isArray(result.daily_hits)
            ? result.daily_hits
            : [],
          workflow_breakdown: {
            ...initialData.workflow_breakdown,
            ...(result.workflow_breakdown || {}),
          },
          keywords_summary: Array.isArray(result.keywords_summary)
            ? result.keywords_summary
            : [],
          accounts_overview: Array.isArray(result.accounts_overview)
            ? result.accounts_overview
            : [],
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
    },
    [chartWorkflowId]
  );

  const fetchWorkflows = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API}/workflows`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const payload = response.data?.data;
      const workflowList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(response.data?.workflows)
            ? response.data.workflows
            : [];

      setWorkflows(workflowList);
    } catch {
      setWorkflows([]);
    }
  }, []);

  const fetchWhatsAppStatus = useCallback(async ({ silent = false } = {}) => {
    const token = getAuthToken();

    if (!token) {
      setWhatsAppAccount(null);
      setWhatsAppError("Session expired. Please log in again.");
      setWhatsAppLoading(false);
      return;
    }

    if (!silent) setWhatsAppLoading(true);
    setWhatsAppError("");

    try {
      const response = await axios.get(`${API}/whatsapp-accounts`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
        params: { _t: Date.now() },
      });

      const accounts = response.data?.data;
      if (!Array.isArray(accounts)) {
        throw new Error("Unexpected WhatsApp API response.");
      }

      const sortedAccounts = [...accounts].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return Number(b.id || 0) - Number(a.id || 0);
      });

      const account = sortedAccounts[0] || null;

      setWhatsAppAccount(
        account || {
          status: "not_configured",
          waba_id: null,
          sender_number: null,
        }
      );

      if (!account) {
        localStorage.removeItem("whatsapp_account_status");
        localStorage.removeItem("whatsapp_account_number");
      }
    } catch (err) {
      setWhatsAppError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load WhatsApp connection status."
      );
    } finally {
      if (!silent) setWhatsAppLoading(false);
    }
  }, []);

  const handleConnectWhatsApp = useCallback(
    async (details) => {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Session expired. Please log in again.");
      }

      try {
        const response = await axios.post(`${API}/whatsapp-accounts`, details, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        await fetchWhatsAppStatus();
        await fetchDashboard({ silent: true });

        return response.data;
      } catch (err) {
        const validationErrors = err.response?.data?.errors;
        const firstValidationError = validationErrors
          ? Object.values(validationErrors).flat()[0]
          : null;

        throw new Error(
          firstValidationError ||
            err.response?.data?.message ||
            err.message ||
            "Unable to save WhatsApp account."
        );
      }
    },
    [fetchWhatsAppStatus, fetchDashboard]
  );

  // Initial load
  useEffect(() => {
    fetchDashboard();
    if (!superAdmin && canViewWhatsApp) {
      fetchWhatsAppStatus();
    } else {
      setWhatsAppLoading(false);
    }
    if (canViewWorkflows || canViewBots) {
      fetchWorkflows();
    }
  }, [
    fetchDashboard,
    fetchWhatsAppStatus,
    fetchWorkflows,
    superAdmin,
    canViewWhatsApp,
    canViewBots,
    canViewWorkflows,
  ]);

  // Poll pending WhatsApp approval every 10s
  useEffect(() => {
    const status = String(whatsAppAccount?.status || "")
      .trim()
      .toLowerCase();
    const pendingStatuses = [
      "pending",
      "pending_approval",
      "connecting",
      "verifying",
    ];
    if (!pendingStatuses.includes(status)) return;

    const timer = window.setInterval(() => {
      fetchWhatsAppStatus({ silent: true });
    }, 10000);

    return () => window.clearInterval(timer);
  }, [whatsAppAccount?.status, fetchWhatsAppStatus]);

  const handleChartWorkflowChange = (nextWorkflowId) => {
    setChartWorkflowId(nextWorkflowId);
    fetchDashboard({ silent: true, workflowId: nextWorkflowId });
  };

  const handleRefreshAll = () => {
    fetchDashboard({ silent: true });
    if (canViewWorkflows || canViewBots) fetchWorkflows();
    if (!superAdmin && canViewWhatsApp) fetchWhatsAppStatus({ silent: true });
  };

  const stats = dashboard.stats;
  const usage = dashboard.monthly_usage;
  const summary = dashboard.execution_summary;
  const recentExecutions = (dashboard.recent_executions || []).slice(0, 5);

  const messageSparkline = useMemo(() => {
    const recent = (dashboard.daily_hits || []).slice(-7);
    return recent.length >= 2
      ? recent.map((d) => Number(d.messages || 0))
      : [4, 7, 5, 9, 8, 12, 10];
  }, [dashboard.daily_hits]);

  const sessionSparkline = useMemo(() => {
    const recent = (dashboard.daily_hits || []).slice(-7);
    return recent.length >= 2
      ? recent.map((d) => Number(d.sessions || 0))
      : [2, 4, 3, 6, 5, 7, 6];
  }, [dashboard.daily_hits]);

  const displayName =
    user?.name || user?.company_name || (superAdmin ? "Super Admin" : "Admin");

  const accountCount =
    Number(stats.total_accounts || 0) || dashboard.accounts_overview.length;

  const showWhatsAppWidget = !superAdmin && canViewWhatsApp;
  const showQuotaWidget = canViewUsage || canViewWorkflows;

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-5 text-slate-900">
      <DashboardErrorBoundary>
        {/* EXECUTIVE EMERALD HERO COMMAND BANNER */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 px-5 py-5 text-white shadow-xl shadow-emerald-950/15 ring-1 ring-emerald-400/20 sm:px-7 sm:py-6">
          {/* Decorative ambient mesh & dot pattern */}
          <span className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
          <span className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-teal-300/15 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2.5">
              {/* Status & badge row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200 backdrop-blur-xs">
                  {superAdmin ? "Super Admin Console" : "Workspace"}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold italic text-emerald-100">
                  <Sparkles size={11} className="text-emerald-300" />
                  Automate &amp; Grow
                </span>
              </div>

              <div>
                <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl lg:text-[26px]">
                  Welcome back, {displayName}
                  <span className="text-emerald-400">!</span>
                </h1>
                <p className="mt-0.5 text-xs text-emerald-100/80 sm:text-sm">
                  Real-time overview across all WhatsApp accounts, active bots,
                  workflows, and customer conversations.
                </p>
              </div>

              {/* Compact inline snapshot pills */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                  <Building2 size={12} className="text-emerald-300" />
                  {numberFormat(accountCount)} Account
                  {accountCount === 1 ? "" : "s"}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                  <Bot size={12} className="text-teal-300" />
                  {numberFormat(stats.total_bots)} Bot
                  {stats.total_bots === 1 ? "" : "s"}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                  <Workflow size={12} className="text-emerald-300" />
                  {numberFormat(stats.total_workflows || workflows.length)}{" "}
                  Workflows
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/25 bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-100">
                  <CheckCircle2 size={12} className="text-emerald-300" />
                  {Number(summary.success_rate || 0).toFixed(1)}% Healthy
                </span>
              </div>
            </div>

            {/* Right Action Dock */}
            <div className="flex flex-wrap items-center gap-2.5 lg:shrink-0">
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/20 disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? "animate-spin text-emerald-300" : ""}
                />
                Refresh
              </button>

              {canViewWorkflows && (
                <Link
                  to="/workflow-builder"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/30 bg-emerald-500/25 px-3.5 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-emerald-500/40"
                >
                  <Workflow size={14} />
                  Workflow Builder
                </Link>
              )}

              <Link
                to="/message-logs"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-900 shadow-lg shadow-emerald-950/25 transition hover:bg-emerald-50"
              >
                <MessageCircle size={14} />
                Message Logs
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>

        {/* ERROR ALERT */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={19} />
              <div>
                <p className="text-sm font-bold text-red-900">
                  Unable to refresh dashboard
                </p>
                <p className="mt-0.5 text-xs text-red-800">{error}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchDashboard({ silent: true })}
              disabled={refreshing}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-100"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin" : ""}
              />
              Try again
            </button>
          </div>
        )}

        {/* ROW 1: 5 EMERALD-SPECTRUM KPI CARDS WITH AREA SPARKLINES */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <PastelKpiCard
            title="Active Workflows"
            value={stats.active_workflows}
            subtitle={`Out of ${numberFormat(stats.total_workflows || workflows.length)} total workflows`}
            pill="Active"
            icon={Workflow}
            theme="emerald"
            sparkline={[
              2,
              4,
              4,
              6,
              7,
              8,
              Math.max(1, Number(stats.active_workflows || 1)),
            ]}
            to={canViewWorkflows ? "/workflow-builder" : undefined}
            loading={loading}
          />

          <PastelKpiCard
            title="Total Conversations"
            value={stats.total_conversations}
            subtitle={`${numberFormat(stats.active_conversations)} active · ${numberFormat(stats.completed_conversations)} done`}
            pill="All Sessions"
            icon={MessageCircle}
            theme="teal"
            sparkline={sessionSparkline}
            to="/message-logs"
            loading={loading}
          />

          <PastelKpiCard
            title="Messages Today"
            value={stats.messages_today}
            subtitle={`${numberFormat(stats.total_messages_30d)} in last 30 days`}
            pill="Today"
            icon={MessagesSquare}
            theme="green"
            sparkline={messageSparkline}
            to="/message-logs"
            loading={loading}
          />

          <PastelKpiCard
            title="Unique Customers"
            value={stats.unique_customers || stats.total_contacts}
            subtitle="WhatsApp users reached"
            pill="Engaged"
            icon={Users}
            theme="cyan"
            sparkline={sessionSparkline}
            loading={loading}
          />

          <PastelKpiCard
            title="Workflow Executions"
            value={stats.workflow_executions}
            subtitle={`${Number(summary.success_rate || 0).toFixed(1)}% success rate`}
            pill="This Month"
            icon={Zap}
            theme="lime"
            sparkline={messageSparkline}
            loading={loading}
          />
        </section>

        {/* ROW 2: FULL-WIDTH 30 DAYS / 14 DAYS ACTIVITY PULSE CHART */}
        <ThirtyDaysHitsChart
          data={dashboard.daily_hits}
          workflows={workflows}
          selectedWorkflowId={chartWorkflowId}
          onWorkflowChange={handleChartWorkflowChange}
          loading={loading}
        />

        {/* ROW 3: 2-COLUMN SPLIT ANALYTICS (INTERACTIVE DONUT + RANKED LEADERBOARD) */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <WorkflowInteractionDonutCard
            breakdown={dashboard.workflow_breakdown}
          />

          <WorkflowTriggersSummaryCard items={dashboard.keywords_summary} />
        </div>

        {/* ROW 4: INTERACTIVE ACCOUNT → NUMBERED BOTS & WORKFLOWS EXPLORER */}
        {(canViewWhatsApp || canViewBots || canViewWorkflows) && (
          <AccountBotsExplorer
            accounts={dashboard.accounts_overview}
            loading={loading}
            superAdmin={superAdmin}
            canViewWorkflows={canViewWorkflows}
          />
        )}

        {/* CLIENT WHATSAPP CONNECTION BANNER */}
        {showWhatsAppWidget && (
          <WhatsAppConnectionStatus
            status={whatsAppError ? "" : whatsAppAccount?.status || ""}
            senderNumber={
              whatsAppAccount?.sender_number ||
              whatsAppAccount?.waba_id ||
              null
            }
            loading={whatsAppLoading}
            onRefresh={fetchWhatsAppStatus}
            onConnectWhatsApp={handleConnectWhatsApp}
          />
        )}

        {/* ROW 5: MONTHLY QUOTA HEALTH + RECENT EXECUTIONS */}
        {(showQuotaWidget || canViewWorkflows) && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            {showQuotaWidget && (
              <Panel
                className={`relative flex flex-col justify-between overflow-hidden p-5 sm:p-6 ${
                  canViewWorkflows ? "xl:col-span-6" : "xl:col-span-12"
                }`}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80" />

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <UsageRing
                      value={
                        usage.has_quota || Number(usage.limit || 0) > 0
                          ? usage.percentage
                          : 0
                      }
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                          Monthly Quota &amp; Health
                        </p>
                        {!usage.has_quota && Number(usage.limit || 0) <= 0 ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                            No Wallet Recharge
                          </span>
                        ) : (
                          usage.active_plan_name && (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              {usage.active_plan_name}
                            </span>
                          )
                        )}
                      </div>

                      {!usage.has_quota && Number(usage.limit || 0) <= 0 ? (
                        <>
                          <h3 className="mt-0.5 text-base font-extrabold text-slate-900 tabular-nums">
                            {numberFormat(usage.used)} Msgs Sent · 0 Quota Left
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            Wallet balance is ₹
                            {Number(usage.wallet_balance || 0).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}{" "}
                            — 0 messages remaining.
                            {!superAdmin && (
                              <>
                                {" "}
                                <Link
                                  to="/plans"
                                  className="inline-flex items-center gap-0.5 font-bold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                                >
                                  Recharge Wallet
                                  <ArrowRight size={11} />
                                </Link>
                              </>
                            )}
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="mt-0.5 text-base font-extrabold text-slate-900 tabular-nums">
                            {numberFormat(usage.used)} /{" "}
                            {numberFormat(usage.limit)} Msgs
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {numberFormat(usage.remaining)} messages remaining
                            from{" "}
                            {superAdmin ? "client wallets" : "wallet balance"}{" "}
                            (₹
                            {Number(usage.wallet_balance || 0).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                            )
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2.5 border-t border-slate-100 pt-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-2.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>Success Rate</span>
                    </p>
                    <p className="mt-1 text-base font-black tabular-nums text-emerald-900">
                      {Number(summary.success_rate || 0).toFixed(1)}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-teal-100 bg-teal-50/70 px-3.5 py-2.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold text-teal-700">
                      <Zap size={12} className="shrink-0" />
                      <span>Succeeded</span>
                    </p>
                    <p className="mt-1 text-base font-black tabular-nums text-teal-900">
                      {numberFormat(stats.successful_executions)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-rose-100 bg-rose-50/70 px-3.5 py-2.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold text-rose-700">
                      <XCircle size={12} className="shrink-0" />
                      <span>Failed</span>
                    </p>
                    <p className="mt-1 text-base font-black tabular-nums text-rose-900">
                      {numberFormat(stats.failed_executions)}
                    </p>
                  </div>
                </div>
              </Panel>
            )}

            {/* RECENT WORKFLOW EXECUTIONS FEED */}
            {canViewWorkflows && (
              <Panel
                className={`relative overflow-hidden p-5 sm:p-6 ${
                  showQuotaWidget ? "xl:col-span-6" : "xl:col-span-12"
                }`}
              >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-400 opacity-80" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700">
                    <Activity size={17} />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Recent Workflow Activity
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Latest execution stream across bots
                    </p>
                  </div>
                </div>

                <Link
                  to="/message-logs"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-600 hover:text-white"
                >
                  All Logs
                  <ArrowRight size={12} />
                </Link>
              </div>

              {recentExecutions.length === 0 ? (
                <div className="flex h-36 flex-col items-center justify-center gap-1.5 text-center text-xs text-slate-400">
                  <Activity size={22} className="text-slate-300" />
                  <span>No workflow executions logged yet.</span>
                </div>
              ) : (
                <div className="mt-3 divide-y divide-slate-100">
                  {recentExecutions.map((item, idx) => {
                    const isFailed =
                      String(item.status || "").toLowerCase() === "failed";
                    return (
                      <div
                        key={item.id ?? idx}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-0"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              isFailed ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-800">
                              {item.workflow || "Workflow"}
                            </p>
                            <p className="truncate text-[10px] text-slate-400">
                              {item.contact ? `${item.contact} · ` : ""}
                              {item.time || "Just now"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            isFailed
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          <Clock size={9} />
                          {item.status || "Done"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              </Panel>
            )}
          </div>
        )}

        {/* FOOTER */}
        <footer className="flex flex-col items-start justify-between gap-2 border-t border-emerald-100 pt-4 text-xs text-slate-400 sm:flex-row sm:items-center">
          <p className="inline-flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck size={14} />
            </span>
            <span>WABA Automation · Admin Console</span>
          </p>

          {dashboard.generated_at && (
            <p className="font-medium text-slate-500">
              Last synced: {formatDate(dashboard.generated_at)}
            </p>
          )}
        </footer>
      </DashboardErrorBoundary>
    </div>
  );
}
