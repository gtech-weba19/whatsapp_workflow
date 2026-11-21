import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
  SlidersHorizontal,
  Smartphone,
  Calendar,
  X,
} from "lucide-react";

import {
  getStoredUser,
  hasPermission,
  isSuperAdmin,
} from "../utils/permission";
import WhatsAppConnectionStatus from "../components/admin/WhatsAppConnectionStatus";
import AccountBotsExplorer from "../components/admin/AccountBotsExplorer";
import ClientSetupActivationCard from "../components/admin/ClientSetupActivationCard";
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
  const [chartAccountId, setChartAccountId] = useState("all");
  const [chartWorkflowId, setChartWorkflowId] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [whatsAppAccount, setWhatsAppAccount] = useState(null);
  const [whatsAppAccountsList, setWhatsAppAccountsList] = useState([]);
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
    async ({
      silent = false,
      accountId = chartAccountId,
      workflowId = chartWorkflowId,
      customStart = startDate,
      customEnd = endDate,
    } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const token = getAuthToken();
        const params = {};
        if (workflowId && workflowId !== "all") {
          params.workflow_id = workflowId;
        }
        if (accountId && accountId !== "all") {
          params.whatsapp_account_id = accountId;
        }
        if (customStart) {
          params.start_date = customStart;
        }
        if (customEnd) {
          params.end_date = customEnd;
        }

        const response = await axios.get(`${API}/dashboard`, {
          params: Object.keys(params).length > 0 ? params : undefined,
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
    [chartAccountId, chartWorkflowId, startDate, endDate]
  );

  const fetchWorkflows = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API}/workflows`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        params: { dashboard_only: 1 },
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
        params: { _t: Date.now(), dashboard_only: 1 },
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

      setWhatsAppAccountsList(sortedAccounts);

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

  const chartAccounts = useMemo(() => {
    const rawList =
      Array.isArray(dashboard.accounts_overview) &&
      dashboard.accounts_overview.length > 0
        ? dashboard.accounts_overview
        : whatsAppAccountsList;

    // Filter out inactive users and only keep active, connected, approved, or pending WhatsApp accounts
    return (rawList || []).filter((acc) => {
      const uStatus = String(acc?.user_status || acc?.user?.status || "").toLowerCase();
      if (uStatus === "inactive" || uStatus === "suspended" || uStatus === "disabled") {
        return false;
      }
      const accStatus = String(acc?.status || acc?.account_status || "").toLowerCase();
      const allowed = ["active", "connected", "approved", "verified", "pending"];
      return !accStatus || allowed.includes(accStatus);
    });
  }, [dashboard.accounts_overview, whatsAppAccountsList]);

  // Auto-select WhatsApp account for Client panel (!superAdmin)
  const clientAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (!superAdmin && chartAccounts.length > 0 && !clientAutoSelectedRef.current) {
      const defaultId = String(chartAccounts[0].id);
      clientAutoSelectedRef.current = true;
      setChartAccountId(defaultId);
      if (chartAccounts.length > 1) {
        fetchDashboard({
          silent: true,
          accountId: defaultId,
          workflowId: "all",
          customStart: startDate,
          customEnd: endDate,
        });
      }
    }
  }, [superAdmin, chartAccounts, fetchDashboard, startDate, endDate]);

  const availableWorkflows = useMemo(() => {
    if (!Array.isArray(chartAccounts) || chartAccounts.length === 0) {
      return [];
    }

    const activeAccIds = new Set(chartAccounts.map((a) => String(a.id)));
    const activeBotIds = new Set(
      chartAccounts.flatMap((a) =>
        Array.isArray(a.bots) ? a.bots.map((b) => String(b.id)) : []
      )
    );

    if (chartAccountId && chartAccountId !== "all") {
      const targetAcc = chartAccounts.find(
        (a) => String(a.id) === String(chartAccountId)
      );

      if (Array.isArray(targetAcc?.workflows) && targetAcc.workflows.length > 0) {
        return targetAcc.workflows;
      }

      const accBotIds = Array.isArray(targetAcc?.bots)
        ? targetAcc.bots.map((b) => String(b.id))
        : [];

      return workflows.filter((wf) => {
        const wfAccId =
          wf.whatsapp_account_id !== undefined && wf.whatsapp_account_id !== null
            ? String(wf.whatsapp_account_id)
            : null;
        if (wfAccId && wfAccId === String(chartAccountId)) return true;
        if (wf.bot_id && accBotIds.includes(String(wf.bot_id))) return true;
        return false;
      });
    }

    // "All Accounts" view: only keep workflows that belong to active chartAccounts!
    const embeddedWorkflows = chartAccounts.flatMap((a) =>
      Array.isArray(a.workflows) ? a.workflows : []
    );
    if (embeddedWorkflows.length > 0) {
      const seen = new Set();
      return embeddedWorkflows.filter((wf) => {
        if (!wf?.id || seen.has(wf.id)) return false;
        seen.add(wf.id);
        return true;
      });
    }

    return workflows.filter((wf) => {
      const wfAccId =
        wf.whatsapp_account_id !== undefined && wf.whatsapp_account_id !== null
          ? String(wf.whatsapp_account_id)
          : null;
      if (wfAccId && activeAccIds.has(wfAccId)) return true;
      if (wf.bot_id && activeBotIds.has(String(wf.bot_id))) return true;
      return false;
    });
  }, [chartAccountId, chartAccounts, workflows]);

  const handleChartAccountChange = (nextAccountId) => {
    setChartAccountId(nextAccountId);
    setChartWorkflowId("all");
    fetchDashboard({
      silent: true,
      accountId: nextAccountId,
      workflowId: "all",
      customStart: startDate,
      customEnd: endDate,
    });
  };

  const handleChartWorkflowChange = (nextWorkflowId) => {
    setChartWorkflowId(nextWorkflowId);
    fetchDashboard({
      silent: true,
      accountId: chartAccountId,
      workflowId: nextWorkflowId,
      customStart: startDate,
      customEnd: endDate,
    });
  };

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let start = "";
    let end = "";

    if (preset === "today") {
      start = toYMD(today);
      end = toYMD(today);
    } else if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      start = toYMD(y);
      end = toYMD(y);
    } else if (preset === "7d") {
      const p = new Date(today);
      p.setDate(p.getDate() - 6);
      start = toYMD(p);
      end = toYMD(today);
    } else if (preset === "30d") {
      const p = new Date(today);
      p.setDate(p.getDate() - 29);
      start = toYMD(p);
      end = toYMD(today);
    } else if (preset === "this_month") {
      const m = new Date(today.getFullYear(), today.getMonth(), 1);
      start = toYMD(m);
      end = toYMD(today);
    } else if (preset === "last_month") {
      const startLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      start = toYMD(startLastMonth);
      end = toYMD(endLastMonth);
    } else if (preset === "all") {
      start = "";
      end = "";
    }

    if (preset !== "custom") {
      setStartDate(start);
      setEndDate(end);
      fetchDashboard({
        silent: true,
        accountId: chartAccountId,
        workflowId: chartWorkflowId,
        customStart: start,
        customEnd: end,
      });
    }
  };

  const handleStartDateChange = (val) => {
    setStartDate(val);
    setDatePreset("custom");
    if (val && endDate) {
      fetchDashboard({
        silent: true,
        accountId: chartAccountId,
        workflowId: chartWorkflowId,
        customStart: val,
        customEnd: endDate,
      });
    }
  };

  const handleEndDateChange = (val) => {
    setEndDate(val);
    setDatePreset("custom");
    if (startDate && val) {
      fetchDashboard({
        silent: true,
        accountId: chartAccountId,
        workflowId: chartWorkflowId,
        customStart: startDate,
        customEnd: val,
      });
    }
  };

  const handleResetChartFilters = () => {
    const defaultAccountId =
      !superAdmin && chartAccounts.length > 0
        ? String(chartAccounts[0].id)
        : "all";
    setChartAccountId(defaultAccountId);
    setChartWorkflowId("all");
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
    fetchDashboard({
      silent: true,
      accountId: defaultAccountId,
      workflowId: "all",
      customStart: "",
      customEnd: "",
    });
  };

  const handleRefreshAll = () => {
    fetchDashboard({
      silent: true,
      accountId: chartAccountId,
      workflowId: chartWorkflowId,
      customStart: startDate,
      customEnd: endDate,
    });
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

  // Check if WhatsApp account is connected & approved
  const hasApprovedWhatsApp = useMemo(() => {
    if (superAdmin) return true;
    const isApproved = (st) =>
      ["approved", "connected", "active"].includes(
        String(st || "").trim().toLowerCase()
      );

    if (whatsAppAccount && isApproved(whatsAppAccount.status)) {
      return true;
    }
    if (
      Array.isArray(whatsAppAccountsList) &&
      whatsAppAccountsList.some((acc) => isApproved(acc?.status))
    ) {
      return true;
    }
    if (
      Array.isArray(dashboard.accounts_overview) &&
      dashboard.accounts_overview.some((acc) =>
        isApproved(acc?.status || acc?.account_status)
      )
    ) {
      return true;
    }
    return false;
  }, [
    superAdmin,
    whatsAppAccount,
    whatsAppAccountsList,
    dashboard.accounts_overview,
  ]);

  // Check if any workflows are created
  const hasWorkflowsCreated = useMemo(() => {
    if (superAdmin) return true;
    return (
      Number(stats.total_workflows || 0) > 0 ||
      (Array.isArray(workflows) && workflows.length > 0) ||
      (Array.isArray(dashboard.workflows) && dashboard.workflows.length > 0)
    );
  }, [superAdmin, stats.total_workflows, workflows, dashboard.workflows]);

  // Check if message flow / conversations are active
  const hasActiveTraffic = useMemo(() => {
    if (superAdmin) return true;
    const hasConvs = Number(stats.total_conversations || 0) > 0;
    const hasMsgs =
      Number(stats.total_messages_30d || 0) > 0 ||
      Number(stats.messages_today || 0) > 0;
    const hasExecs = Number(stats.workflow_executions || 0) > 0;
    const hasHits =
      Array.isArray(dashboard.daily_hits) &&
      dashboard.daily_hits.some(
        (d) =>
          Number(d.total || d.count || d.messages || d.conversations || 0) > 0
      );
    const hasWorkflowHits =
      Array.isArray(dashboard.workflow_breakdown) &&
      dashboard.workflow_breakdown.some(
        (w) => Number(w.hits || w.executions || w.count || 0) > 0
      );

    return hasConvs || hasMsgs || hasExecs || hasHits || hasWorkflowHits;
  }, [
    superAdmin,
    stats.total_conversations,
    stats.total_messages_30d,
    stats.messages_today,
    stats.workflow_executions,
    dashboard.daily_hits,
    dashboard.workflow_breakdown,
  ]);

  // New Client: Has not connected / approved WhatsApp account yet.
  // When true, hide bot explorer, filter, KPI cards, quota, and only show "Connect Your WhatsApp" section!
  const isNewClient = !superAdmin && !hasApprovedWhatsApp;

  // Dashboard charts are only displayed when flow is active
  const showDashboardCharts =
    superAdmin ||
    (hasApprovedWhatsApp && hasWorkflowsCreated && hasActiveTraffic);

  const selectedAccountObj = useMemo(() => {
    if (!chartAccountId || chartAccountId === "all") return null;
    return (
      chartAccounts.find((a) => String(a.id) === String(chartAccountId)) || null
    );
  }, [chartAccountId, chartAccounts]);

  const selectedAccountLabel = useMemo(() => {
    if (!selectedAccountObj) return "All WhatsApp Accounts";
    return (
      selectedAccountObj.name ||
      selectedAccountObj.business_name ||
      selectedAccountObj.sender_name ||
      selectedAccountObj.account_name ||
      `Account #${selectedAccountObj.id}`
    );
  }, [selectedAccountObj]);

  const selectedWorkflowObj = useMemo(() => {
    if (!chartWorkflowId || chartWorkflowId === "all") return null;
    return (
      workflows.find((w) => String(w.id) === String(chartWorkflowId)) || null
    );
  }, [chartWorkflowId, workflows]);

  const selectedWorkflowLabel = useMemo(() => {
    if (!selectedWorkflowObj) {
      return chartAccountId !== "all"
        ? "All Workflows in Account"
        : "All Workflows";
    }
    return selectedWorkflowObj.name || `Workflow #${selectedWorkflowObj.id}`;
  }, [selectedWorkflowObj, chartAccountId]);

  const activeDateRangeText = useMemo(() => {
    if (dashboard.filter_meta?.date_range_label) {
      return dashboard.filter_meta.date_range_label;
    }
    if (startDate && endDate) {
      return `${startDate} – ${endDate}`;
    }
    if (datePreset === "today") return "Today";
    if (datePreset === "yesterday") return "Yesterday";
    if (datePreset === "7d") return "Last 7 Days";
    if (datePreset === "30d") return "Last 30 Days";
    if (datePreset === "this_month") return "This Month";
    if (datePreset === "last_month") return "Last Month";
    return "Last 30 Days";
  }, [dashboard.filter_meta, startDate, endDate, datePreset]);

  const isAnyFilterActive = useMemo(() => {
    if (superAdmin) {
      return (
        chartAccountId !== "all" ||
        chartWorkflowId !== "all" ||
        (datePreset !== "all" && datePreset !== "30d")
      );
    }
    const defaultAccId =
      chartAccounts.length > 0 ? String(chartAccounts[0].id) : "all";
    const isAccFiltered =
      chartAccounts.length > 1 && chartAccountId !== defaultAccId;
    return (
      isAccFiltered ||
      chartWorkflowId !== "all" ||
      (datePreset !== "all" && datePreset !== "30d")
    );
  }, [superAdmin, chartAccounts, chartAccountId, chartWorkflowId, datePreset]);

  const buildFilterUrl = useCallback(
    (basePath, extraParams = {}) => {
      const params = new URLSearchParams();
      if (chartAccountId && chartAccountId !== "all") {
        params.set("whatsapp_account_id", chartAccountId);
        params.set("account_id", chartAccountId);
      }
      if (chartWorkflowId && chartWorkflowId !== "all") {
        params.set("workflow_id", chartWorkflowId);
      }
      if (datePreset && datePreset !== "all") {
        params.set("period", datePreset);
      }
      if (startDate) {
        params.set("from", startDate);
        params.set("period", "custom");
      }
      if (endDate) {
        params.set("to", endDate);
        params.set("period", "custom");
      }
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          params.set(k, v);
        }
      });
      const qs = params.toString();
      return qs ? `${basePath}?${qs}` : basePath;
    },
    [chartAccountId, chartWorkflowId, datePreset, startDate, endDate]
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-130px)] w-full max-w-[1640px] flex-1 flex-col text-slate-900">
      <DashboardErrorBoundary>
        <div className="flex flex-1 flex-col justify-between space-y-6">
          <div className="space-y-5">
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

        {/* If initial loading, show clean loading skeleton */}
        {loading && whatsAppLoading ? (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <RefreshCw className="mb-3 h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm font-bold text-slate-800">
                Loading dashboard...
              </p>
            </div>
          </div>
        ) : isNewClient ? (
          /* NEW CLIENT ONBOARDING: Keep ONLY the "Connect Your WhatsApp" section */
          <section className="mt-2 space-y-6">
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

            {/* Clean 3-Step Setup Roadmap */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-emerald-950/[0.02]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Smartphone size={18} />
                </div>
                <div className="mt-3.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                    Step 1
                  </span>
                  <h3 className="mt-0.5 text-sm font-bold text-slate-900">
                    Connect WhatsApp Number
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Add your Meta Phone Number ID and WhatsApp Business Account (WABA) ID to connect your official sender number.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-emerald-950/[0.02]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Bot size={18} />
                </div>
                <div className="mt-3.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">
                    Step 2
                  </span>
                  <h3 className="mt-0.5 text-sm font-bold text-slate-900">
                    Design Bot Workflows
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Create conversational chatbot flows, keyword triggers, and interactive button menus in the visual builder.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-emerald-950/[0.02]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                  <Zap size={18} />
                </div>
                <div className="mt-3.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">
                    Step 3
                  </span>
                  <h3 className="mt-0.5 text-sm font-bold text-slate-900">
                    Unlock Live Analytics
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Once your bot processes incoming messages, 30-day activity pulse, trigger rankings, and conversation logs will appear.
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* FULL DASHBOARD: For clients with connected WhatsApp and Super Admin */
          <>
            {/* GLOBAL DASHBOARD FILTER BAR */}
        <section className="relative rounded-2xl border border-emerald-100/90 bg-white p-3.5 shadow-sm shadow-emerald-950/[0.03]">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 opacity-90" />

          {/* Top Row: Title on Left, Action Buttons on Right */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 shadow-2xs">
                <SlidersHorizontal size={16} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Global Dashboard Filter
                  </h2>
                  {isAnyFilterActive && (
                    <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[9.5px] font-extrabold text-emerald-700">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Filter dashboard metrics by WhatsApp account, workflow, and date range
                </p>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={refreshing || loading}
                title="Refresh dashboard data"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
              >
                <RefreshCw
                  size={12}
                  className={refreshing ? "animate-spin text-emerald-600" : ""}
                />
                Refresh
              </button>

              {canViewWorkflows && (
                <Link
                  to={buildFilterUrl("/workflow-builder", chartWorkflowId !== "all" ? { workflow_id: chartWorkflowId } : {})}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs transition hover:bg-emerald-100"
                >
                  <Workflow size={12} />
                  Workflow Builder
                </Link>
              )}

              <Link
                to={buildFilterUrl("/message-logs")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <MessageCircle size={12} />
                Message Logs
                <ArrowRight size={11} />
              </Link>
            </div>
          </div>

          {/* Bottom Row: ALL THREE DROPDOWNS IN ONE CLEAN SINGLE HORIZONTAL LINE */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-3">
            {/* WhatsApp Account Dropdown */}
            <div className="relative flex-1 w-full sm:w-auto">
              <Smartphone
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"
              />
              <select
                value={chartAccountId}
                onChange={(e) => handleChartAccountChange(e.target.value)}
                aria-label="Filter dashboard by WhatsApp Account"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs font-bold text-slate-700 outline-none transition hover:border-emerald-300 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 shadow-2xs"
              >
                {(superAdmin || chartAccounts.length > 1) && (
                  <option value="all">
                    All WhatsApp Accounts {chartAccounts.length > 0 ? `(${chartAccounts.length})` : ""}
                  </option>
                )}
                {chartAccounts.map((acc) => {
                  const label =
                    acc.name ||
                    acc.business_name ||
                    acc.sender_name ||
                    acc.account_name ||
                    `Account #${acc.id}`;
                  const wfCount =
                    acc.workflows_count ??
                    (Array.isArray(acc.workflows) ? acc.workflows.length : null);
                  return (
                    <option key={acc.id} value={String(acc.id)}>
                      {label} {wfCount !== null ? `(${wfCount} WF)` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Workflow Dropdown */}
            <div className="relative flex-1 w-full sm:w-auto">
              <Workflow
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"
              />
              <select
                value={chartWorkflowId}
                onChange={(e) => handleChartWorkflowChange(e.target.value)}
                aria-label="Filter dashboard by Workflow"
                disabled={availableWorkflows.length === 0 && chartAccountId !== "all"}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs font-bold text-slate-700 outline-none transition hover:border-emerald-300 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400 shadow-2xs"
              >
                <option value="all">
                  {chartAccountId !== "all"
                    ? `All Workflows (${availableWorkflows.length})`
                    : `All Workflows (${workflows.length})`}
                </option>
                {availableWorkflows.map((wf) => (
                  <option key={wf.id} value={String(wf.id)}>
                    {wf.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter Dropdown */}
            <div className="relative flex-1 w-full sm:w-auto">
              <Calendar
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"
              />
              <select
                value={datePreset}
                onChange={(e) => handleDatePresetChange(e.target.value)}
                aria-label="Filter dashboard by Date"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs font-bold text-slate-700 outline-none transition hover:border-emerald-300 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 shadow-2xs"
              >
                <option value="all">All Time (Last 30D)</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
              </select>
            </div>

            {/* Reset All Button */}
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetChartFilters}
                title="Reset all filters"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100 hover:text-rose-800 shadow-2xs"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </section>

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
            to={
              canViewWorkflows
                ? buildFilterUrl("/workflow-builder", chartWorkflowId !== "all" ? { workflow_id: chartWorkflowId } : {})
                : undefined
            }
            loading={loading}
          />

          <PastelKpiCard
            title="Total Conversations"
            value={stats.total_conversations}
            subtitle={`${numberFormat(stats.active_conversations)} active · ${numberFormat(stats.completed_conversations)} done`}
            pill={datePreset !== "all" && datePreset !== "30d" ? "Filtered" : "All Sessions"}
            icon={MessageCircle}
            theme="teal"
            sparkline={sessionSparkline}
            to={buildFilterUrl("/message-logs")}
            loading={loading}
          />

          <PastelKpiCard
            title={datePreset !== "all" && datePreset !== "30d" ? "Messages" : "Messages Today"}
            value={datePreset !== "all" && datePreset !== "30d" ? stats.total_messages_30d : stats.messages_today}
            subtitle={
              datePreset !== "all" && datePreset !== "30d"
                ? `Messages for ${activeDateRangeText}`
                : `${numberFormat(stats.total_messages_30d)} in last 30 days`
            }
            pill={datePreset !== "all" && datePreset !== "30d" ? "Filtered" : "Today"}
            icon={MessagesSquare}
            theme="green"
            sparkline={messageSparkline}
            to={buildFilterUrl("/message-logs", datePreset === "all" ? { period: "today" } : {})}
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
            to={buildFilterUrl("/message-logs")}
            loading={loading}
          />

          <PastelKpiCard
            title="Workflow Executions"
            value={stats.workflow_executions}
            subtitle={`${Number(summary.success_rate || 0).toFixed(1)}% success rate`}
            pill={datePreset !== "all" && datePreset !== "30d" ? "Filtered" : "This Month"}
            icon={Zap}
            theme="lime"
            sparkline={messageSparkline}
            to={buildFilterUrl("/message-logs")}
            loading={loading}
          />
        </section>

            {/* ROW 2 & 3: CHARTS / ACTIVITY SECTION */}
            {showDashboardCharts ? (
              <>
                {/* ROW 2: FULL-WIDTH 30 DAYS / 14 DAYS ACTIVITY PULSE CHART */}
                <ThirtyDaysHitsChart
                  data={dashboard.daily_hits}
                  loading={loading}
                />

                {/* ROW 3: 2-COLUMN SPLIT ANALYTICS (INTERACTIVE DONUT + RANKED LEADERBOARD) */}
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <WorkflowInteractionDonutCard
                    breakdown={dashboard.workflow_breakdown}
                    accountId={chartAccountId}
                    period={datePreset}
                  />

                  <WorkflowTriggersSummaryCard
                    items={dashboard.keywords_summary}
                    accountId={chartAccountId}
                    period={datePreset}
                  />
                </div>
              </>
            ) : (
              /* ONBOARDING & ACTIVATION HUB FOR APPROVED CLIENTS AWAITING FLOW */
              <ClientSetupActivationCard
                hasApprovedWhatsApp={hasApprovedWhatsApp}
                hasWorkflowsCreated={hasWorkflowsCreated}
                hasActiveTraffic={hasActiveTraffic}
                whatsAppAccount={whatsAppAccount}
                workflowCount={Number(stats.total_workflows || workflows.length || 0)}
              />
            )}

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
      </>
    )}
          </div>

          {/* FOOTER */}
          <footer className="mt-auto flex flex-col items-start justify-between gap-2 border-t border-emerald-100 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center">
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
        </div>
      </DashboardErrorBoundary>
    </div>
  );
}
