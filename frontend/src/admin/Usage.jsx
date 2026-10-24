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
} from "lucide-react";

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

/**
 * Read the logged-in user from localStorage.
 * Supports common storage keys used by React authentication.
 */
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
      // Continue to the next key if the value is not valid JSON.
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

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass = "bg-blue-50 text-blue-600",
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            {formatNumber(value)}
          </p>

          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
        </div>

        <div className={`rounded-lg p-3 ${iconClass}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
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
  const [clientId, setClientId] = useState("");
  const [period, setPeriod] = useState("month");
  const [from, setFrom] = useState(getMonthStart);
  const [to, setTo] = useState(getToday);

  const requestRef = useRef(null);
  const firstLoadRef = useRef(true);

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
          if (search.trim()) {
            params.search = search.trim();
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
    [from, to, isSuperAdmin, search, clientId]
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
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Usage</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor messages, workflow executions and API usage.
            </p>
          </div>

          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page header */}
        
    <header className="relative isolate flex min-h-[120px] w-full flex-col justify-between gap-5 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
  <div className="flex items-center gap-4">
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
      <Activity size={28} strokeWidth={1.8} />
    </div>

    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-emerald-950 sm:text-3xl">
          Usage
        </h1>

        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          {isSuperAdmin ? "Platform Analytics" : "My Business"}
        </span>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        {isSuperAdmin
          ? "Monitor usage, messages and workflow activity across all clients."
          : "Monitor your business messages, API requests and workflow activity."}
      </p>
    </div>
  </div>

  <div className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={() => fetchUsage({ showLoader: false })}
      disabled={refreshing || loading}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw
        size={16}
        className={refreshing ? "animate-spin" : ""}
      />
      Refresh
    </button>

    <button
      type="button"
      onClick={handleExport}
      disabled={visibleRows.length === 0}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Download size={16} />
      Export CSV
    </button>
  </div>
</header>
    
        {/* Normal user's own business */}
        {!isSuperAdmin && (
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="rounded-lg bg-white p-2 text-blue-600">
              <Building2 size={21} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                Your Business
              </p>
              <p className="mt-1 break-words text-base font-semibold text-gray-900">
                {visibleRows.length > 0
                  ? getClientName(visibleRows[0])
                  : ownClientName}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Only usage available to your account is displayed here.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <CircleAlert className="mt-0.5 shrink-0 text-red-600" size={20} />

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-800">
                Unable to load usage
              </p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => fetchUsage()}
              className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Messages Sent"
            value={calculatedStats.messagesSent}
            description="Total messages sent"
            icon={MessageSquare}
            iconClass="bg-blue-50 text-blue-600"
          />

          <StatCard
            title="Messages Delivered"
            value={calculatedStats.messagesDelivered}
            description="Successfully delivered"
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            title="Messages Failed"
            value={calculatedStats.messagesFailed}
            description="Messages that failed"
            icon={AlertTriangle}
            iconClass="bg-red-50 text-red-600"
          />

          <StatCard
            title="Workflow Executions"
            value={calculatedStats.workflowExecutions}
            description="Recorded workflow executions"
            icon={Workflow}
            iconClass="bg-violet-50 text-violet-600"
          />

          <StatCard
            title="API Requests"
            value={calculatedStats.apiRequests}
            description="Recorded API requests"
            icon={Zap}
            iconClass="bg-amber-50 text-amber-600"
          />

          {isSuperAdmin && (
            <StatCard
              title="Clients"
              value={calculatedStats.activeClients}
              description="Clients in the current result"
              icon={Users}
              iconClass="bg-indigo-50 text-indigo-600"
            />
          )}

          <StatCard
            title="Delivery Rate"
            value={
              calculatedStats.messagesSent > 0
                ? `${Math.min(
                    100,
                    Math.round(
                      (calculatedStats.messagesDelivered /
                        calculatedStats.messagesSent) *
                        100
                    )
                  )}%`
                : "0%"
            }
            description="Delivered out of sent messages"
            icon={TrendingUp}
            iconClass="bg-cyan-50 text-cyan-600"
          />

          <StatCard
            title="Failed Rate"
            value={
              calculatedStats.messagesSent > 0
                ? `${Math.min(
                    100,
                    Math.round(
                      (calculatedStats.messagesFailed /
                        calculatedStats.messagesSent) *
                        100
                    )
                  )}%`
                : "0%"
            }
            description="Failed out of sent messages"
            icon={Activity}
            iconClass="bg-orange-50 text-orange-600"
          />
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Filters</h2>
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
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Search client
                </label>

                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    id="usage-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Client name or ID"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear client search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Super Admin only: tenant ID */}
            {isSuperAdmin && (
              <div>
                <label
                  htmlFor="usage-client-id"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Client ID
                </label>

                <input
                  id="usage-client-id"
                  type="text"
                  inputMode="numeric"
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  placeholder="All clients"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="usage-period"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Date range
              </label>

              <select
                id="usage-period"
                value={period}
                onChange={(event) => handlePeriodChange(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">This month</option>
                <option value="custom">Custom range</option>
                <option value="all">All available dates</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="usage-from"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                From
              </label>

              <div className="relative">
                <CalendarDays
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
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
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="usage-to"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                To
              </label>

              <div className="relative">
                <CalendarDays
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
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
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">
              Showing {formatNumber(visibleRows.length)}{" "}
              {isSuperAdmin ? "client records" : "usage records"}
            </p>

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              <X size={15} />
              Reset filters
            </button>
          </div>
        </div>

        {/* Usage table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                {isSuperAdmin ? "Client Usage Details" : "My Usage Details"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {isSuperAdmin
                  ? "Usage details for clients in the selected date range."
                  : "Usage details for your business in the selected date range."}
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
              <Clock3 size={14} />
              {from && to
                ? `${formatDate(from)} – ${formatDate(to)}`
                : "All available dates"}
            </span>
          </div>

          {visibleRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
              <div className="rounded-full bg-gray-100 p-4">
                <Activity size={28} className="text-gray-400" />
              </div>

              <h3 className="mt-4 font-semibold text-gray-900">
                No usage records found
              </h3>

              <p className="mt-1 max-w-md text-sm text-gray-500">
                {error
                  ? "Check your connection and try again."
                  : "Usage records will appear here when activity is available for the selected date range."}
              </p>

              <button
                type="button"
                onClick={() => fetchUsage()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw size={15} />
                Reload data
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">
                      {isSuperAdmin ? "Client" : "Business"}
                    </th>

                    {isSuperAdmin && (
                      <th className="px-5 py-3.5 font-semibold">Client ID</th>
                    )}

                    <th className="px-5 py-3.5 font-semibold">Sent</th>
                    <th className="px-5 py-3.5 font-semibold">Delivered</th>
                    <th className="px-5 py-3.5 font-semibold">Failed</th>
                    <th className="px-5 py-3.5 font-semibold">Executions</th>
                    <th className="px-5 py-3.5 font-semibold">API Requests</th>
                    <th className="px-5 py-3.5 font-semibold">
                      Last Activity
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {visibleRows.map((row, index) => {
                    const sent =
                      row.messages_sent ??
                      row.sent_messages ??
                      row.total_messages ??
                      0;

                    const delivered =
                      row.messages_delivered ??
                      row.delivered_messages ??
                      row.delivered ??
                      0;

                    const failed =
                      row.messages_failed ??
                      row.failed_messages ??
                      row.failed ??
                      0;

                    const executions =
                      row.workflow_executions ??
                      row.total_executions ??
                      row.executions ??
                      0;

                    const apiRequests =
                      row.api_requests ?? row.total_api_requests ?? 0;

                    const clientIdValue = row.tenant_id ?? row.client_id ?? "—";
     
                    const lastActivity =
                      row.last_activity ??
                      row.last_active_at ??
                      row.updated_at ??
                      null;
                
                    return (
                      <tr
                        key={
                          row.tenant_id ??
                          row.client_id ??
                          row.id ??
                          `usage-row-${index}`
                        }
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <Building2 size={19} />
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[240px] truncate font-semibold text-gray-900">
                                {isSuperAdmin
                                  ? getClientName(row)
                                  : getClientName(row) !== "Unnamed client"
                                    ? getClientName(row)
                                    : ownClientName}
                              </p>

                              {!isSuperAdmin && (
                                <p className="mt-0.5 text-xs text-gray-500">
                                  Your business usage
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {isSuperAdmin && (
                          <td className="px-5 py-4">
                            <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600">
                              {clientIdValue}
                            </span>
                          </td>
                        )}

                        <td className="px-5 py-4 font-medium text-gray-900">
                          {formatNumber(sent)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                            <CheckCircle2 size={15} />
                            {formatNumber(delivered)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 font-medium ${
                              Number(failed) > 0
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            {Number(failed) > 0 && (
                              <AlertTriangle size={15} />
                            )}
                            {formatNumber(failed)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {formatNumber(executions)}
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {formatNumber(apiRequests)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-gray-500">
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
            <div className="flex items-center justify-center gap-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
              <LoaderCircle size={14} className="animate-spin" />
              Refreshing usage data...
            </div>
          )}
        </div>

        {/* Access information */}
        <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-gray-400" />

          <p>
            {isSuperAdmin
              ? "You are viewing platform-wide usage. Client data is loaded from the authenticated usage API."
              : "You are viewing your business usage. The backend must restrict this endpoint to your authenticated tenant."}
          </p>
        </div>
      </div>
    </div>
  );
}