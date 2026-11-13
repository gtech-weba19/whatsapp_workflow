import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Activity,
  MessageSquare,
  Workflow,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Download,
  CalendarDays,
  TrendingUp,
  CircleAlert,
  Clock3,
  ShieldCheck,
  Filter,
  X,
  Building2,
  Users,
  LoaderCircle,
  LayoutGrid,
  List,
  Sparkles,
  ExternalLink,
  BarChart3,
  Check,
} from "lucide-react";
import { PastelKpiCard } from "../components/admin/DashboardCharts";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const USAGE_URL = `${API_BASE_URL}/usage`;

const TOKEN_KEYS = ["access_token", "auth_token", "token"];

const USER_KEYS = [
  "user",
  "auth_user",
  "current_user",
  "authUser",
  "user_data",
];

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = TOKEN_KEYS.map((key) => localStorage.getItem(key)).find(
    Boolean
  );

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


function getStoredUser() {
  for (const key of USER_KEYS) {
    try {
      const value = localStorage.getItem(key);

      if (!value) continue;

      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object") {
        return parsed.user || parsed.data?.user || parsed;
      }
    } catch {
    }
  }

  return {};
}

function normalizeRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isSuperAdminUser(user) {
  const role = normalizeRole(
    user?.role ||
      user?.user_role ||
      user?.user_type ||
      user?.account_type
  );

  return (
    role === "super_admin" ||
    role === "superadmin" ||
    user?.is_super_admin === true ||
    user?.isSuperAdmin === true
  );
}

function formatNumber(value) {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN")
    : "0";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthStart() {
  const date = new Date();
  date.setDate(1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function getErrorMessage(error) {
  if (error?.response?.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (error?.response?.status === 403) {
    return "You do not have permission to view usage data.";
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Unable to load usage data. Please try again."
  );
}

function getClientName(row) {
  return (
    row?.client_name ||
    row?.business_name ||
    row?.company_name ||
    row?.tenant?.business_name ||
    row?.tenant?.name ||
    row?.business?.business_name ||
    row?.business?.name ||
    row?.user?.business_name ||
    row?.user?.name ||
    "Unnamed client"
  );
}

function getUserBusinessName(user) {
  return (
    user?.business_name ||
    user?.company_name ||
    user?.business?.business_name ||
    user?.business?.name ||
    user?.business_profile?.business_name ||
    user?.businessProfile?.business_name ||
    user?.tenant?.business_name ||
    user?.tenant?.name ||
    user?.name ||
    user?.email ||
    "My Business"
  );
}


function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="mt-4 h-8 w-20 rounded bg-gray-200" />
            <div className="mt-3 h-3 w-32 rounded bg-gray-100" />
          </div>
        ))}
      </div>

      <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5">
        <div className="h-5 w-40 rounded bg-gray-200" />
        <div className="mt-5 h-10 rounded bg-gray-100" />
        <div className="mt-4 h-10 rounded bg-gray-100" />
        <div className="mt-4 h-10 rounded bg-gray-100" />
      </div>
    </div>
  );
}

function exportToCSV(rows, isSuperAdmin, ownClientName) {
  const headers = [
    ...(isSuperAdmin ? ["Client Name", "Client ID"] : ["Business Name"]),
    "Messages Sent",
    "Messages Delivered",
    "Messages Failed",
    "Workflow Executions",
    "API Requests",
    "Last Activity",
  ];

  const escapeCSV = (value) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const records = rows.map((row) => [
    ...(isSuperAdmin
      ? [getClientName(row), row.tenant_id ?? row.client_id ?? ""]
      : [ownClientName || getClientName(row)]),
    row.messages_sent ?? row.sent_messages ?? row.total_messages ?? 0,
    row.messages_delivered ?? row.delivered_messages ?? row.delivered ?? 0,
    row.messages_failed ?? row.failed_messages ?? row.failed ?? 0,
    row.workflow_executions ?? row.total_executions ?? row.executions ?? 0,
    row.api_requests ?? row.total_api_requests ?? 0,
    row.last_activity ?? row.last_active_at ?? "",
  ]);

  const csv = [
    headers.map(escapeCSV).join(","),
    ...records.map((record) => record.map(escapeCSV).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `usage-report-${getToday()}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function Usage() {
  const [currentUser] = useState(() => getStoredUser());

  const isSuperAdmin = useMemo(
    () => isSuperAdminUser(currentUser),
    [currentUser]
  );

  const ownClientName = useMemo(
    () => getUserBusinessName(currentUser),
    [currentUser]
  );

  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [period, setPeriod] = useState("month");
  const [from, setFrom] = useState(getMonthStart);
  const [to, setTo] = useState(getToday);
  const [viewMode, setViewMode] = useState("grid");

  const requestRef = useRef(null);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsage = useCallback(
    async ({ showLoader = true } = {}) => {
      if (requestRef.current) {
        requestRef.current.abort();
      }

      const controller = new AbortController();
      requestRef.current = controller;

      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      try {
        const params = {
          from: from || undefined,
          to: to || undefined,
        };

        // Only Super Admin can use global client search and client filters.
        if (isSuperAdmin) {
          if (debouncedSearch) {
            params.search = debouncedSearch;
          }

          if (clientId) {
            params.tenant_id = clientId;
          }
        }

        const response = await api.get(USAGE_URL, {
          params,
          signal: controller.signal,
        });

        const responseData = response?.data?.data ?? response?.data ?? {};

        const rows = Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData?.usage)
            ? responseData.usage
            : Array.isArray(responseData?.clients)
              ? responseData.clients
              : Array.isArray(responseData?.items)
                ? responseData.items
                : Array.isArray(responseData?.records)
                  ? responseData.records
                  : [];

        const responseStats = Array.isArray(responseData)
          ? {}
          : responseData?.stats ||
            responseData?.summary ||
            responseData?.totals ||
            {};

        setData(rows);
        setStats(responseStats);
      } catch (requestError) {
        if (
          requestError?.name === "CanceledError" ||
          requestError?.code === "ERR_CANCELED"
        ) {
          return;
        }

        setError(getErrorMessage(requestError));
        setData([]);
        setStats({});
      } finally {
        if (requestRef.current === controller) {
          setLoading(false);
          setRefreshing(false);
          firstLoadRef.current = false;
        }
      }
    },
    [from, to, isSuperAdmin, debouncedSearch, clientId]
  );

  useEffect(() => {
    fetchUsage({ showLoader: firstLoadRef.current });

    return () => {
      if (requestRef.current) {
        requestRef.current.abort();
      }
    };
  }, [fetchUsage]);

  const handlePeriodChange = (value) => {
    setPeriod(value);

    const today = getToday();

    if (value === "today") {
      setFrom(today);
      setTo(today);
      return;
    }

    if (value === "week") {
      const date = new Date();
      date.setDate(date.getDate() - 6);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      setFrom(`${year}-${month}-${day}`);
      setTo(today);
      return;
    }

    if (value === "month") {
      setFrom(getMonthStart());
      setTo(today);
      return;
    }

    if (value === "custom") {
      // Keep the current custom date values.
      return;
    }

    setFrom("");
    setTo(today);
  };

  const visibleRows = useMemo(() => {
    // Backend must already scope normal-user responses to that user's tenant.
    // Never use the normal-user UI as a substitute for backend authorization.
    if (isSuperAdmin) {
      return data;
    }

    const userTenantId =
      currentUser?.tenant_id ??
      currentUser?.tenant?.id ??
      currentUser?.client_id ??
      null;

    if (userTenantId !== null) {
      const ownRows = data.filter((row) => {
        const rowTenantId = row?.tenant_id ?? row?.client_id;
        return (
          rowTenantId !== undefined &&
          rowTenantId !== null &&
          String(rowTenantId) === String(userTenantId)
        );
      });

      return ownRows;
    }

    // Without a tenant identifier, rely on the authenticated backend response.
    // The API should return only this user's usage row.
    return data;
  }, [data, isSuperAdmin, currentUser]);

  const calculatedStats = useMemo(() => {
    const sum = (keys) =>
      visibleRows.reduce((total, row) => {
        const value = keys.reduce((found, key) => {
          if (found !== undefined && found !== null) return found;
          return row?.[key];
        }, undefined);

        return total + (Number(value) || 0);
      }, 0);

    const getStat = (keys, fallback) => {
      for (const key of keys) {
        if (
          stats?.[key] !== undefined &&
          stats?.[key] !== null &&
          stats?.[key] !== ""
        ) {
          return Number(stats[key]) || 0;
        }
      }

      return fallback;
    };

    return {
      messagesSent: getStat(
        ["messages_sent", "total_messages_sent", "sent_messages"],
        sum(["messages_sent", "sent_messages", "total_messages"])
      ),
      messagesDelivered: getStat(
        ["messages_delivered", "total_messages_delivered", "delivered"],
        sum(["messages_delivered", "delivered_messages", "delivered"])
      ),
      messagesFailed: getStat(
        ["messages_failed", "total_messages_failed", "failed"],
        sum(["messages_failed", "failed_messages", "failed"])
      ),
      workflowExecutions: getStat(
        ["workflow_executions", "total_executions", "executions"],
        sum(["workflow_executions", "total_executions", "executions"])
      ),
      apiRequests: getStat(
        ["api_requests", "total_api_requests"],
        sum(["api_requests", "total_api_requests"])
      ),
      activeClients: getStat(
        ["active_clients", "total_clients"],
        visibleRows.length
      ),
    };
  }, [stats, visibleRows]);

  const deliveryRate = useMemo(() => {
    if (calculatedStats.messagesSent <= 0) return 0;
    return Math.min(
      100,
      Math.round(
        (calculatedStats.messagesDelivered / calculatedStats.messagesSent) * 100
      )
    );
  }, [calculatedStats]);

  const failedRate = useMemo(() => {
    if (calculatedStats.messagesSent <= 0) return 0;
    return Math.min(
      100,
      Math.round(
        (calculatedStats.messagesFailed / calculatedStats.messagesSent) * 100
      )
    );
  }, [calculatedStats]);

  const handleExport = () => {
    exportToCSV(visibleRows, isSuperAdmin, ownClientName);
  };

  const handleResetFilters = () => {
    setSearch("");
    setClientId("");
    setPeriod("month");
    setFrom(getMonthStart());
    setTo(getToday());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 animate-pulse rounded-2xl bg-emerald-100" />
              <div className="space-y-2">
                <div className="h-6 w-48 animate-pulse rounded-lg bg-slate-200" />
                <div className="h-4 w-72 animate-pulse rounded-lg bg-slate-100" />
              </div>
            </div>
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Page header */}
        <header className="relative isolate overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/60 p-6 sm:p-7 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-600/25 ring-4 ring-emerald-50">
                <Activity size={30} strokeWidth={1.9} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
                    Usage Analytics
                  </h1>
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur-sm">
                    {isSuperAdmin ? "Platform-wide Analytics" : "My Business Account"}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-500 max-w-xl">
                  {isSuperAdmin
                    ? "Track real-time WhatsApp message delivery, workflow executions, and API volume across all connected clients."
                    : "Track your business messages, delivery rates, API requests, and automated journey activity."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => fetchUsage({ showLoader: false })}
                disabled={refreshing || loading}
                title="Refresh usage data"
                className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin text-emerald-600" : ""} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleExport}
                disabled={visibleRows.length === 0}
                className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </header>

        {/* Normal user's own business banner */}
        {!isSuperAdmin && (
          <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Connected Business Workspace
              </p>
              <p className="text-base font-bold text-slate-900 truncate">
                {visibleRows.length > 0 ? getClientName(visibleRows[0]) : ownClientName}
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm"
          >
            <CircleAlert className="mt-0.5 shrink-0 text-red-600" size={19} />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-red-900">Unable to load usage data</p>
              <p className="mt-0.5 text-xs text-red-700">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchUsage()}
              className="cursor-pointer rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* Elevated Pastel KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PastelKpiCard
            title="Messages Sent"
            value={formatNumber(calculatedStats.messagesSent)}
            subtitle="Total outbound volume"
            pill="Volume"
            icon={MessageSquare}
            theme="emerald"
            sparkline={[
              Math.max(1, calculatedStats.messagesSent - 10),
              Math.max(1, calculatedStats.messagesSent - 5),
              calculatedStats.messagesSent,
            ]}
            loading={loading}
          />
          <PastelKpiCard
            title="Successfully Delivered"
            value={formatNumber(calculatedStats.messagesDelivered)}
            subtitle={`${deliveryRate}% delivery success`}
            pill="Delivered"
            icon={CheckCircle2}
            theme="green"
            sparkline={[
              Math.max(0, calculatedStats.messagesDelivered - 8),
              Math.max(0, calculatedStats.messagesDelivered - 3),
              calculatedStats.messagesDelivered,
            ]}
            loading={loading}
          />
          <PastelKpiCard
            title="Workflow Runs"
            value={formatNumber(calculatedStats.workflowExecutions)}
            subtitle="Automated journey executions"
            pill="Journeys"
            icon={Workflow}
            theme="cyan"
            sparkline={[
              Math.max(0, calculatedStats.workflowExecutions - 4),
              Math.max(0, calculatedStats.workflowExecutions - 2),
              calculatedStats.workflowExecutions,
            ]}
            loading={loading}
          />
          <PastelKpiCard
            title="API Requests"
            value={formatNumber(calculatedStats.apiRequests)}
            subtitle="Platform webhook & REST calls"
            pill="Platform API"
            icon={Zap}
            theme="lime"
            sparkline={[
              Math.max(0, calculatedStats.apiRequests - 5),
              Math.max(0, calculatedStats.apiRequests - 2),
              calculatedStats.apiRequests,
            ]}
            loading={loading}
          />
        </section>

        {/* Health & Performance Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Delivery Rate</p>
              <p className="text-base font-extrabold text-emerald-700">{deliveryRate}%</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Failed Messages</p>
              <p className="text-base font-extrabold text-rose-700">
                {formatNumber(calculatedStats.messagesFailed)}{" "}
                <span className="text-xs font-semibold text-rose-500 font-sans">({failedRate}%)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Records</p>
              <p className="text-base font-extrabold text-slate-900">{formatNumber(calculatedStats.activeClients)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <CalendarDays size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Timeframe</p>
              <p className="truncate text-xs font-bold text-slate-800">
                {from && to ? `${formatDate(from)} – ${formatDate(to)}` : "All Time"}
              </p>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={17} className="text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Filter Analytics
              </h2>
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
            >
              <X size={14} />
              Reset filters
            </button>
          </div>

          <div
            className={`grid grid-cols-1 gap-4 ${
              isSuperAdmin ? "md:grid-cols-2 xl:grid-cols-5" : "md:grid-cols-3"
            }`}
          >
            {/* Super Admin only: search clients */}
            {isSuperAdmin && (
              <div>
                <label
                  htmlFor="usage-search"
                  className="mb-1.5 block text-xs font-bold text-slate-700"
                >
                  Search Client
                </label>

                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="usage-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by client name or ID..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-xs outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 placeholder:text-slate-400"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear client search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Super Admin only: client ID */}
            {isSuperAdmin && (
              <div>
                <label
                  htmlFor="usage-client-id"
                  className="mb-1.5 block text-xs font-bold text-slate-700"
                >
                  Filter Client Name / ID
                </label>

                <input
                  id="usage-client-id"
                  type="text"
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  placeholder="e.g. 5, Acme Corp"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 placeholder:text-slate-400"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="usage-period"
                className="mb-1.5 block text-xs font-bold text-slate-700"
              >
                Date Range Preset
              </label>

              <select
                id="usage-period"
                value={period}
                onChange={(event) => handlePeriodChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">This month</option>
                <option value="custom">Custom date range</option>
                <option value="all">All available dates</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="usage-from"
                className="mb-1.5 block text-xs font-bold text-slate-700"
              >
                From Date
              </label>

              <div className="relative">
                <CalendarDays
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="usage-from"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(event) => {
                    setFrom(event.target.value);
                    setPeriod("custom");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-2 text-xs outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="usage-to"
                className="mb-1.5 block text-xs font-bold text-slate-700"
              >
                To Date
              </label>

              <div className="relative">
                <CalendarDays
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="usage-to"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => {
                    setTo(event.target.value);
                    setPeriod("custom");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-2 text-xs outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-slate-800"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Usage Records Display */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* Section Toolbar */}
          <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900">
                  {isSuperAdmin ? "Client Usage Records" : "My Usage Breakdown"}
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {visibleRows.length} record{visibleRows.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Detailed message volume and journey execution metrics for the selected window.
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              {/* View Mode Switcher */}
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Grid Cards View"
                  className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === "grid"
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LayoutGrid size={15} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  title="Table View"
                  className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === "table"
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <List size={15} />
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {visibleRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-sm">
                <Activity size={28} />
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-900">
                No usage records found
              </h3>

              <p className="mt-1.5 max-w-sm text-sm text-slate-500 leading-relaxed">
                {error
                  ? "Check your connection and try again."
                  : "Usage records will appear here as soon as messaging or workflow activity is recorded for the chosen timeframe."}
              </p>

              <button
                type="button"
                onClick={() => fetchUsage()}
                className="cursor-pointer mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <RefreshCw size={14} />
                Reload Data
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* ================= GRID CARDS VIEW ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-5 sm:p-6 bg-slate-50/50">
              {visibleRows.map((row, index) => {
                const sent = row.messages_sent ?? row.sent_messages ?? row.total_messages ?? 0;
                const delivered = row.messages_delivered ?? row.delivered_messages ?? row.delivered ?? 0;
                const failed = row.messages_failed ?? row.failed_messages ?? row.failed ?? 0;
                const executions = row.workflow_executions ?? row.total_executions ?? row.executions ?? 0;
                const apiRequests = row.api_requests ?? row.total_api_requests ?? 0;
                const clientName = isSuperAdmin
                  ? getClientName(row)
                  : getClientName(row) !== "Unnamed client"
                  ? getClientName(row)
                  : ownClientName;
                const clientIdValue = row.tenant_id ?? row.client_id ?? row.id ?? `#${index + 1}`;
                const lastActivity = row.last_activity ?? row.last_active_at ?? row.updated_at ?? null;

                const rowDeliveryRate = Number(sent) > 0
                  ? Math.min(100, Math.round((Number(delivered) / Number(sent)) * 100))
                  : 0;

                return (
                  <div
                    key={row.tenant_id ?? row.client_id ?? row.id ?? `usage-card-${index}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/5"
                  >
                    {/* Top colored accent ribbon */}
                    <div
                      className={`absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r ${
                        rowDeliveryRate >= 90
                          ? "from-emerald-500 via-teal-500 to-green-500"
                          : rowDeliveryRate >= 50
                          ? "from-cyan-500 via-teal-500 to-emerald-500"
                          : "from-amber-400 via-orange-400 to-rose-500"
                      }`}
                    />

                    {/* Ambient glow on hover */}
                    <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-200/25 blur-3xl transition duration-500 group-hover:scale-125" />

                    {/* Top Content */}
                    <div>
                      {/* Header row: Avatar + Name + Delivery Rate pill */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-100 transition-transform duration-300 group-hover:scale-105">
                            <Building2 size={22} strokeWidth={2} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3
                              title={clientName}
                              className="truncate text-base font-bold text-slate-900 group-hover:text-emerald-950 transition-colors"
                            >
                              {clientName}
                            </h3>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                              <span className="font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {clientIdValue}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Clock3 size={11} />
                                {formatDate(lastActivity)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                            rowDeliveryRate >= 90
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : rowDeliveryRate >= 50
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <TrendingUp size={12} />
                          {rowDeliveryRate}%
                        </span>
                      </div>

                      {/* Delivery progress bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                          <span>Delivery Health</span>
                          <span>{formatNumber(delivered)} / {formatNumber(sent)} messages</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              rowDeliveryRate >= 90
                                ? "bg-gradient-to-r from-emerald-500 to-green-500"
                                : rowDeliveryRate >= 50
                                ? "bg-gradient-to-r from-cyan-500 to-emerald-500"
                                : "bg-gradient-to-r from-amber-400 to-rose-500"
                            }`}
                            style={{ width: `${Math.max(rowDeliveryRate, 4)}%` }}
                          />
                        </div>
                      </div>

                      {/* 4-Tile Metrics Grid inside Card */}
                      <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                          <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                            <MessageSquare size={13} className="text-blue-500" />
                            Sent
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatNumber(sent)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5">
                          <p className="text-[11px] font-medium text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            Delivered
                          </p>
                          <p className="mt-1 text-sm font-bold text-emerald-950">
                            {formatNumber(delivered)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-2.5">
                          <p className="text-[11px] font-medium text-rose-800 flex items-center gap-1.5">
                            <AlertTriangle size={13} className="text-rose-600" />
                            Failed
                          </p>
                          <p className="mt-1 text-sm font-bold text-rose-950">
                            {formatNumber(failed)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-2.5">
                          <p className="text-[11px] font-medium text-cyan-800 flex items-center gap-1.5">
                            <Workflow size={13} className="text-cyan-600" />
                            Workflows
                          </p>
                          <p className="mt-1 text-sm font-bold text-cyan-950">
                            {formatNumber(executions)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Zap size={13} className="text-amber-500" />
                        <span>{formatNumber(apiRequests)} API Requests</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Active
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= TABLE VIEW ================= */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead className="bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      {isSuperAdmin ? "Client" : "Business"}
                    </th>
                    <th className="px-5 py-4 font-semibold">Sent</th>
                    <th className="px-5 py-4 font-semibold">Delivered</th>
                    <th className="px-5 py-4 font-semibold">Failed</th>
                    <th className="px-5 py-4 font-semibold">Executions</th>
                    <th className="px-5 py-4 font-semibold">API Requests</th>
                    <th className="px-5 py-4 font-semibold">Last Activity</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row, index) => {
                    const sent = row.messages_sent ?? row.sent_messages ?? row.total_messages ?? 0;
                    const delivered = row.messages_delivered ?? row.delivered_messages ?? row.delivered ?? 0;
                    const failed = row.messages_failed ?? row.failed_messages ?? row.failed ?? 0;
                    const executions = row.workflow_executions ?? row.total_executions ?? row.executions ?? 0;
                    const apiRequests = row.api_requests ?? row.total_api_requests ?? 0;
                    const clientName = isSuperAdmin
                      ? getClientName(row)
                      : getClientName(row) !== "Unnamed client"
                      ? getClientName(row)
                      : ownClientName;
                    const lastActivity = row.last_activity ?? row.last_active_at ?? row.updated_at ?? null;

                    return (
                      <tr
                        key={row.tenant_id ?? row.client_id ?? row.id ?? `usage-row-${index}`}
                        className="transition hover:bg-emerald-50/30"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm">
                              <Building2 size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[240px] truncate text-sm font-bold text-slate-900">
                                {clientName}
                              </p>
                              {!isSuperAdmin && (
                                <p className="text-xs text-slate-400">
                                  Your business usage
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-900">
                          {formatNumber(sent)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                            <CheckCircle2 size={15} />
                            {formatNumber(delivered)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 font-bold ${
                              Number(failed) > 0 ? "text-rose-600" : "text-slate-600"
                            }`}
                          >
                            {Number(failed) > 0 && <AlertTriangle size={15} />}
                            {formatNumber(failed)}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-700">
                          {formatNumber(executions)}
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-700">
                          {formatNumber(apiRequests)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                          {formatDate(lastActivity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {refreshing && (
            <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
              <LoaderCircle size={15} className="animate-spin text-emerald-600" />
              Refreshing usage data...
            </div>
          )}
        </section>

        {/* Security & Access information */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-slate-500 shadow-sm">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
          <p>
            {isSuperAdmin
              ? "You are viewing platform-wide usage metrics. Client records are loaded securely via authenticated high-speed aggregation queries."
              : "You are viewing your business usage records. All metrics are restricted to your authenticated tenant."}
          </p>
        </div>
      </div>
    </div>
  );
}