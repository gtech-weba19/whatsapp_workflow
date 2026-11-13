
import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  CalendarDays,
  Clock,
  Workflow,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  RotateCcw,
  CheckCircle2,
  XCircle,
  LoaderCircle,
  AlertTriangle,
  ShieldCheck,
  Activity,
  CircleHelp,
  ArrowUpRight,
  Smartphone,
  Hash,
  CalendarClock,
  FilterX,
  LayoutGrid,
  List,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { PastelKpiCard } from "../components/admin/DashboardCharts";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const FAILED_WORKFLOWS_URL = `${API_BASE_URL}/failed-workflows`;

const api = axios.create({
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("auth_token") ||
  localStorage.getItem("access_token");

api.interceptors.request.use((config) => {
  const token = getToken();

  config.headers = config.headers || {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const getErrorMessage = (error) => {
  if (error?.response?.status === 401) {
    return "Your session may have expired. Please sign in again.";
  }

  if (error?.response?.status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (!error?.response && error?.request) {
    return "Unable to connect to the server. Check your API URL and network.";
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

const getExecutionId = (item) =>
  item?.id ?? item?.execution_id ?? item?.executionId ?? "—";

const getWorkflowName = (item) =>
  item?.workflow?.name ||
  item?.workflow_name ||
  item?.workflowName ||
  "Unnamed workflow";

const getErrorText = (item) =>
  item?.error_message ||
  item?.error ||
  item?.exception ||
  item?.failure_reason ||
  item?.message ||
  "No error details available.";

const getStatus = (item) =>
  String(item?.status || "failed").toLowerCase();

const isFailed = (status) =>
  ["failed", "error", "failure"].includes(status);

const statusClass = (status) => {
  if (isFailed(status)) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (["retrying", "pending", "running"].includes(status)) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (["completed", "success", "successful"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
};

const StatusIcon = ({ status, size = 14 }) => {
  if (isFailed(status)) return <XCircle size={size} />;

  if (["completed", "success", "successful"].includes(status)) {
    return <CheckCircle2 size={size} />;
  }

  if (["retrying", "pending", "running"].includes(status)) {
    return <Clock size={size} />;
  }

  return <CircleHelp size={size} />;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const getContact = (item) =>
  item?.contact?.mobile ||
  item?.mobile ||
  item?.phone ||
  item?.user_identifier ||
  "—";

const prettyJson = (value) => {
  if (value == null || value === "") return "No data available.";

  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

const iconInputClass =
  "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50";

const Notice = ({ type = "error", message, onDismiss, onRetry }) => {
  if (!message) return null;

  const success = type === "success";

  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-2xl border p-4 ${
        success
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
          : "border-rose-200 bg-rose-50/80 text-rose-900"
      }`}
    >
      {success ? (
        <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600" />
      ) : (
        <AlertTriangle size={19} className="mt-0.5 shrink-0 text-rose-600" />
      )}

      <p className="min-w-0 flex-1 break-words text-sm leading-6">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-sm font-semibold underline underline-offset-4"
        >
          Retry
        </button>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

const DetailCard = ({ label, value, icon: Icon }) => (
  <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
      {Icon && <Icon size={14} />}
      {label}
    </div>
    <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-800">
      {value || "—"}
    </p>
  </div>
);

const FailedWorkflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("failed");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [retryError, setRetryError] = useState("");
  const [retrySuccess, setRetrySuccess] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [copiedId, setCopiedId] = useState(null);
  const abortRef = useRef(null);

  const handleCopyError = (e, text, id) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const fetchWorkflows = useCallback(
    async (showRefresh = false) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await api.get(FAILED_WORKFLOWS_URL, {
          params: {
            page,
            per_page: perPage,
            search: search || undefined,
            status: status || undefined,
            from: from || undefined,
            to: to || undefined,
          },
          signal: controller.signal,
        });

        const payload = response?.data?.data;

        // Supports Laravel paginator, a plain data array, and
        // an API response containing a workflows array.
        const paginator =
          payload && !Array.isArray(payload) ? payload : null;

        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(paginator?.data)
            ? paginator.data
            : Array.isArray(response?.data?.workflows)
              ? response.data.workflows
              : [];

        setWorkflows(rows);

        const currentPage = Number(
          paginator?.current_page ?? response?.data?.current_page ?? page
        );
        const lastPage = Number(
          paginator?.last_page ?? response?.data?.last_page ?? 1
        );

        setPagination({
          current_page: currentPage,
          last_page: Math.max(1, lastPage),
          per_page: Number(paginator?.per_page ?? perPage),
          total: Number(
            paginator?.total ?? response?.data?.total ?? rows.length
          ),
        });

        if (currentPage !== page) {
          setPage(currentPage);
        }
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
          return;
        }
        setWorkflows([]);
        setPagination({
          current_page: 1,
          last_page: 1,
          per_page: perPage,
          total: 0,
        });
        setError(getErrorMessage(err));
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [page, perPage, search, status, from, to]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== search) {
        setPage(1);
        setSearch(next);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    fetchWorkflows();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchWorkflows]);

  // Close the details dialog with Escape.
  useEffect(() => {
    if (!selectedWorkflow) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedWorkflow(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedWorkflow]);

  const applySearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("failed");
    setFrom("");
    setTo("");
    setPage(1);
    setSelectedWorkflow(null);
    setRetryError("");
    setRetrySuccess("");
    setError("");
  };

  const retryWorkflow = async (item) => {
    const id = getExecutionId(item);

    if (id === "—") {
      setRetryError("Execution ID is missing. This workflow cannot be retried.");
      return;
    }

    if (item?.retryable === false) {
      setRetryError("This execution is marked as non-retryable.");
      return;
    }

    const confirmed = window.confirm(
      `Retry execution #${id}?\n\nMake sure retrying will not duplicate external actions such as messages, payments, or API requests.`
    );

    if (!confirmed) return;

    setRetryingId(id);
    setRetryError("");
    setRetrySuccess("");

    try {
      const response = await api.post(
        `${FAILED_WORKFLOWS_URL}/${encodeURIComponent(id)}/retry`
      );

      setRetrySuccess(
        response?.data?.message || `Retry requested for execution #${id}.`
      );

      await fetchWorkflows(true);
    } catch (err) {
      setRetryError(getErrorMessage(err));
    } finally {
      setRetryingId(null);
    }
  };

  const total = pagination.total || 0;

  const failedCount = workflows.filter((item) =>
    isFailed(getStatus(item))
  ).length;

  const retryableCount = workflows.filter(
    (item) =>
      isFailed(getStatus(item)) && item?.retryable !== false
  ).length;

  const hasFilters = Boolean(search || from || to || status !== "failed");

  const firstRecord =
    total === 0 ? 0 : (pagination.current_page - 1) * pagination.per_page + 1;

  const lastRecord =
    total === 0
      ? 0
      : Math.min(
          pagination.current_page * pagination.per_page,
          total
        );

  return (
    <div className="min-h-screen bg-slate-50/80 px-3 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        {/* Page header */}
        <header className="relative isolate overflow-hidden rounded-3xl border border-emerald-100/80 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute right-1/4 -bottom-16 h-48 w-48 rounded-full bg-teal-400/15 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-200/80">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm border border-white/10">
                  <Workflow size={13} className="text-emerald-300" />
                  Workflow Management
                </span>
                <span className="text-emerald-400/40">/</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 font-semibold text-rose-200 border border-rose-500/30">
                  <AlertCircle size={13} className="text-rose-300" />
                  Execution &amp; Incident Monitor
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25">
                  <Activity size={28} className="stroke-[2.2]" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-white">
                    Failed Workflows
                  </h1>
                  <p className="mt-1 text-sm text-emerald-100/80 max-w-xl">
                    Real-time error diagnostics, trace inspection, and one-click replay execution for bot workflows.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fetchWorkflows(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white shadow-sm backdrop-blur transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                {refreshing ? "Refreshing..." : "Refresh Logs"}
              </button>
            </div>
          </div>
        </header>

        {/* API and retry notifications */}
        {error && (
          <Notice
            message={error}
            onRetry={() => fetchWorkflows(true)}
          />
        )}

        {retryError && (
          <Notice
            message={retryError}
            onDismiss={() => setRetryError("")}
          />
        )}

        {retrySuccess && (
          <Notice
            type="success"
            message={retrySuccess}
            onDismiss={() => setRetrySuccess("")}
          />
        )}

        {/* Overview */}
        <section aria-label="Execution summary">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Execution Telemetry Overview
            </h2>
            <span className="text-xs text-slate-500">
              Active Filters Applied
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PastelKpiCard
              title="Matching Executions"
              value={formatNumber(total)}
              subtitle="Total records matching filters"
              pill="Telemetry Log"
              icon={Workflow}
              theme="emerald"
              sparkline={[14, 20, 18, 26, 22, 30, total || 35]}
              loading={loading}
            />
            <PastelKpiCard
              title="Active Failures"
              value={formatNumber(failedCount)}
              subtitle={
                failedCount > 0 ? "Requires diagnostic review" : "Fleet clear"
              }
              pill="Error Status"
              icon={AlertCircle}
              theme="lime"
              sparkline={[6, 9, 7, 12, 8, 10, failedCount || 5]}
              loading={loading}
            />
            <PastelKpiCard
              title="Retryable Journeys"
              value={formatNumber(retryableCount)}
              subtitle="Eligible for automated replay"
              pill="Actionable"
              icon={RotateCcw}
              theme="green"
              sparkline={[4, 7, 5, 9, 8, 6, retryableCount || 7]}
              loading={loading}
            />
            <PastelKpiCard
              title="Recovery Readiness"
              value={
                total > 0 && failedCount > 0
                  ? `${Math.max(
                      0,
                      Math.round(((total - failedCount) / total) * 100)
                    )}%`
                  : "100%"
              }
              subtitle="Auto-heal & diagnostics OK"
              pill="System Health"
              icon={ShieldCheck}
              theme="cyan"
              sparkline={[92, 94, 91, 95, 97, 98, 99]}
              loading={loading}
            />
          </div>
        </section>

        {/* Filters */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <SlidersHorizontal size={19} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Filter executions
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Narrow down results to find a specific failure.
                </p>
              </div>
            </div>

            {hasFilters && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Filters active
              </span>
            )}
          </div>

          <form onSubmit={applySearch} className="space-y-5 p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="sm:col-span-2 xl:col-span-2">
                <label
                  htmlFor="failed-workflow-search"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Search executions
                </label>

                <div className="relative">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="failed-workflow-search"
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Workflow, execution ID, error..."
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="failed-workflow-status"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Execution status
                </label>

                <select
                  id="failed-workflow-status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  className={inputClass}
                >
                  <option value="failed">Failed</option>
                  <option value="error">Error</option>
                  <option value="retrying">Retrying</option>
                  <option value="pending">Pending</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="">All statuses</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="failed-workflow-from"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  From date
                </label>

                <div className="relative">
                  <CalendarDays
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="failed-workflow-from"
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(event) => {
                      setFrom(event.target.value);
                      setPage(1);
                    }}
                    className={iconInputClass}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="failed-workflow-to"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  To date
                </label>

                <div className="relative">
                  <CalendarDays
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="failed-workflow-to"
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(event) => {
                      setTo(event.target.value);
                      setPage(1);
                    }}
                    className={iconInputClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
              <button type="submit" className={primaryButtonClass}>
                <Search size={16} />
                Apply filters
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className={secondaryButtonClass}
              >
                <FilterX size={16} />
                Reset filters
              </button>

              <p className="text-xs leading-5 text-slate-500 sm:ml-auto">
                Search is applied when you click Apply filters.
                Status and date changes update the results automatically.
              </p>
            </div>
          </form>
        </section>

        {/* Execution history */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <Activity size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">
                  Execution Incident History
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Inspect traces, copy runtime errors, and replay failed customer journeys.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    viewMode === "grid"
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <LayoutGrid size={14} />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    viewMode === "table"
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <List size={14} />
                  Table
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/60 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {formatNumber(total)} records
              </div>
            </div>
          </div>

          {/* Body: Grid or Table */}
          {viewMode === "grid" ? (
            <div className="bg-slate-50/50 p-4 sm:p-6 min-h-[300px]">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm animate-pulse space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-slate-100" />
                          <div className="space-y-1.5">
                            <div className="h-4 w-20 rounded bg-slate-100" />
                            <div className="h-4 w-32 rounded bg-slate-100" />
                          </div>
                        </div>
                        <div className="h-6 w-16 rounded-full bg-slate-100" />
                      </div>
                      <div className="h-16 rounded-xl bg-slate-100" />
                      <div className="flex justify-between pt-2">
                        <div className="h-8 w-28 rounded-xl bg-slate-100" />
                        <div className="h-8 w-20 rounded-xl bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : workflows.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    {error ? (
                      <AlertCircle size={26} />
                    ) : (
                      <CheckCircle2 size={27} />
                    )}
                  </div>
                  <p className="mt-4 font-bold text-slate-900 text-base">
                    {error
                      ? "Executions could not be loaded"
                      : "No executions found"}
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                    {error
                      ? "Check your connection and API authentication, then try again."
                      : "No records match the current filters. Try another status or date range."}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {error && (
                      <button
                        type="button"
                        onClick={() => fetchWorkflows(true)}
                        className={primaryButtonClass}
                      >
                        <RefreshCw size={15} />
                        Try again
                      </button>
                    )}
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className={secondaryButtonClass}
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {workflows.map((item, index) => {
                    const id = getExecutionId(item);
                    const itemStatus = getStatus(item);
                    const errorText = getErrorText(item);
                    const isRetrying = retryingId === id;
                    const isFailedItem = isFailed(itemStatus);

                    return (
                      <div
                        key={item.id ?? item.execution_id ?? index}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/80 hover:shadow-xl hover:shadow-emerald-950/5"
                      >
                        {/* Top colored accent ribbon based on status */}
                        <div
                          className={`absolute inset-x-0 top-0 h-1.5 ${
                            isFailedItem
                              ? "bg-gradient-to-r from-rose-500 via-red-400 to-amber-500"
                              : itemStatus === "retrying" || itemStatus === "pending"
                              ? "bg-gradient-to-r from-amber-400 to-yellow-500"
                              : "bg-gradient-to-r from-emerald-500 to-teal-400"
                          }`}
                        />

                        {/* Ambient subtle corner glow on hover */}
                        <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-emerald-400/0 blur-2xl transition duration-300 group-hover:bg-emerald-400/10" />

                        <div>
                          {/* Header row: Avatar, ID & Name, Status Badge */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100/70 border border-emerald-200/60 text-emerald-800 shadow-sm group-hover:scale-105 transition-transform">
                                <Workflow size={20} className="stroke-[2.2]" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-md">
                                    #{id}
                                  </span>
                                  {item?.workflow_id && (
                                    <span className="text-[11px] font-medium text-slate-400">
                                      Flow #{item.workflow_id}
                                    </span>
                                  )}
                                </div>
                                <h3
                                  title={getWorkflowName(item)}
                                  className="mt-1 truncate font-bold text-slate-900 group-hover:text-emerald-700 transition-colors text-sm"
                                >
                                  {getWorkflowName(item)}
                                </h3>
                              </div>
                            </div>

                            <span
                              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${statusClass(
                                itemStatus
                              )}`}
                            >
                              <StatusIcon status={itemStatus} size={12} />
                              {itemStatus.replaceAll("_", " ")}
                            </span>
                          </div>

                          {/* Contact / Phone row */}
                          {getContact(item) && (
                            <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 w-fit">
                              <Smartphone size={13} className="text-slate-400" />
                              <span>{getContact(item)}</span>
                            </div>
                          )}

                          {/* Error Message Snippet Terminal Box */}
                          <div className="mt-3.5 relative rounded-xl border border-rose-100/80 bg-rose-50/40 p-3">
                            <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-rose-100/60">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rose-700">
                                <AlertCircle size={12} className="text-rose-500" />
                                Failure Reason
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyError(e, errorText, id)}
                                title="Copy error message"
                                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-100 transition active:scale-95"
                              >
                                {copiedId === id ? (
                                  <>
                                    <Check size={11} className="text-emerald-600" />
                                    <span className="text-emerald-700">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p
                              title={errorText}
                              className="line-clamp-2 font-mono text-xs text-rose-900/90 leading-relaxed break-words"
                            >
                              {errorText || "No failure diagnostic details recorded."}
                            </p>
                          </div>

                          {/* Timestamp and retryability */}
                          <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-1.5 font-medium">
                              <CalendarClock size={13} className="text-slate-400" />
                              <span>
                                {formatDate(
                                  item?.failed_at || item?.updated_at || item?.created_at
                                )}
                              </span>
                            </div>
                            {isFailedItem && (
                              <span
                                className={`text-[11px] font-semibold ${
                                  item?.retryable !== false
                                    ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"
                                    : "text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"
                                }`}
                              >
                                {item?.retryable !== false ? "Retry Ready" : "Manual Review"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRetryError("");
                              setRetrySuccess("");
                              setSelectedWorkflow(item);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                          >
                            <Eye size={14} className="text-slate-500" />
                            Inspect Details
                          </button>

                          {isFailedItem && item?.retryable !== false && (
                            <button
                              type="button"
                              onClick={() => retryWorkflow(item)}
                              disabled={isRetrying || retryingId !== null}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 active:scale-95 disabled:opacity-50"
                            >
                              <RotateCcw
                                size={13}
                                className={isRetrying ? "animate-spin" : ""}
                              />
                              {isRetrying ? "Retrying..." : "Retry"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-[0.09em] text-slate-500">
                    <th scope="col" className="px-5 py-4 font-semibold">
                      Execution
                    </th>
                    <th scope="col" className="px-5 py-4 font-semibold">
                      Workflow
                    </th>
                    <th scope="col" className="px-5 py-4 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-5 py-4 font-semibold">
                      Failure reason
                    </th>
                    <th scope="col" className="px-5 py-4 font-semibold">
                      Date &amp; time
                    </th>
                    <th scope="col" className="px-5 py-4 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-20 text-center">
                        <LoaderCircle
                          size={30}
                          className="mx-auto animate-spin text-emerald-600"
                        />
                        <p className="mt-3 text-sm font-medium text-slate-700">
                          Loading executions
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Please wait while we fetch the latest data.
                        </p>
                      </td>
                    </tr>
                  ) : workflows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                          {error ? (
                            <AlertCircle size={26} />
                          ) : (
                            <CheckCircle2 size={27} />
                          )}
                        </div>

                        <p className="mt-4 font-semibold text-slate-900">
                          {error
                            ? "Executions could not be loaded"
                            : "No executions found"}
                        </p>

                        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                          {error
                            ? "Check your connection and API authentication, then try again."
                            : "No records match the current filters. Try another status or date range."}
                        </p>

                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                          {error && (
                            <button
                              type="button"
                              onClick={() => fetchWorkflows(true)}
                              className={primaryButtonClass}
                            >
                              <RefreshCw size={15} />
                              Try again
                            </button>
                          )}

                          {hasFilters && (
                            <button
                              type="button"
                              onClick={resetFilters}
                              className={secondaryButtonClass}
                            >
                              Reset filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    workflows.map((item, index) => {
                      const id = getExecutionId(item);
                      const itemStatus = getStatus(item);
                      const errorText = getErrorText(item);
                      const isRetrying = retryingId === id;

                      return (
                        <tr
                          key={item.id ?? item.execution_id ?? index}
                          className="group transition-colors hover:bg-emerald-50/30"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-700">
                                <Hash size={17} />
                              </div>

                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">
                                  #{id}
                                </p>
                                <p
                                  title={getContact(item)}
                                  className="mt-1 max-w-[160px] truncate text-xs text-slate-500"
                                >
                                  {getContact(item)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex max-w-[250px] items-center gap-3">
                              <div className="shrink-0 rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                                <Workflow size={18} />
                              </div>

                              <div className="min-w-0">
                                <p
                                  title={getWorkflowName(item)}
                                  className="truncate text-sm font-semibold text-slate-800"
                                >
                                  {getWorkflowName(item)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item?.workflow_id
                                    ? `Workflow #${item.workflow_id}`
                                    : "Workflow execution"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(
                                itemStatus
                              )}`}
                            >
                              <StatusIcon status={itemStatus} size={13} />
                              {itemStatus.replaceAll("_", " ")}
                            </span>
                          </td>

                          <td className="max-w-[280px] px-5 py-4">
                            <div className="flex items-start gap-2">
                              {isFailed(itemStatus) && (
                                <AlertCircle
                                  size={15}
                                  className="mt-0.5 shrink-0 text-rose-500"
                                />
                              )}
                              <p
                                title={errorText}
                                className={`max-w-[260px] truncate text-sm ${
                                  isFailed(itemStatus)
                                    ? "text-rose-700"
                                    : "text-slate-600"
                                }`}
                              >
                                {errorText}
                              </p>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <CalendarClock
                                size={15}
                                className="shrink-0 text-slate-400"
                              />
                              {formatDate(
                                item?.failed_at ||
                                  item?.updated_at ||
                                  item?.created_at
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setRetryError("");
                                  setRetrySuccess("");
                                  setSelectedWorkflow(item);
                                }}
                                title="View execution details"
                                aria-label={`View execution ${id}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                              >
                                <Eye size={16} />
                              </button>

                              {isFailed(itemStatus) &&
                                item?.retryable !== false && (
                                  <button
                                    type="button"
                                    onClick={() => retryWorkflow(item)}
                                    disabled={isRetrying || retryingId !== null}
                                    title="Retry execution"
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <RotateCcw
                                      size={14}
                                      className={isRetrying ? "animate-spin" : ""}
                                    />
                                    {isRetrying ? "Retrying..." : "Retry"}
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col gap-4 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-sm font-medium text-slate-700">
                {total > 0 ? (
                  <>
                    Showing{" "}
                    <span className="font-semibold text-slate-900">
                      {formatNumber(firstRecord)}–{formatNumber(lastRecord)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-900">
                      {formatNumber(total)}
                    </span>{" "}
                    records
                  </>
                ) : (
                  "No records to display"
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Page {pagination.current_page} of {pagination.last_page}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span>Rows:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label="Rows per page"
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  {[10, 15, 30, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                disabled={loading || pagination.current_page <= 1}
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                className={secondaryButtonClass}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                disabled={
                  loading ||
                  pagination.current_page >= pagination.last_page
                }
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.last_page, current + 1)
                  )
                }
                className={secondaryButtonClass}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-slate-200/80 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            Workflow execution monitoring
          </p>
          <p>Review retry safety before repeating external actions.</p>
        </footer>
      </div>

      {/* Execution details modal */}
      {selectedWorkflow && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedWorkflow(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="failed-workflow-modal-title"
            className="relative isolate max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl sm:rounded-3xl"
          >
            {/* Top gradient accent ribbon */}
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500" />

            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur sm:p-6">
              <div className="flex min-w-0 items-start gap-3">
                <div className="shrink-0 rounded-xl bg-rose-50 p-3 text-rose-600">
                  <AlertCircle size={22} />
                </div>

                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                      Execution details
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(
                        getStatus(selectedWorkflow)
                      )}`}
                    >
                      <StatusIcon
                        status={getStatus(selectedWorkflow)}
                        size={12}
                      />
                      {getStatus(selectedWorkflow)}
                    </span>
                  </div>

                  <h2
                    id="failed-workflow-modal-title"
                    className="break-words text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
                  >
                    Execution #{getExecutionId(selectedWorkflow)}
                  </h2>

                  <p className="mt-1 break-words text-sm text-slate-500">
                    {getWorkflowName(selectedWorkflow)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWorkflow(null)}
                aria-label="Close details"
                className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-6 p-4 sm:p-6">
              {/* Metadata */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Execution information
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailCard
                    label="Workflow ID"
                    value={selectedWorkflow.workflow_id}
                    icon={Workflow}
                  />

                  <DetailCard
                    label="Contact / mobile"
                    value={getContact(selectedWorkflow)}
                    icon={Smartphone}
                  />

                  <DetailCard
                    label="Created at"
                    value={formatDate(selectedWorkflow.created_at)}
                    icon={Clock}
                  />

                  <DetailCard
                    label="Failed at"
                    value={formatDate(
                      selectedWorkflow.failed_at ||
                        selectedWorkflow.updated_at ||
                        selectedWorkflow.created_at
                    )}
                    icon={CalendarDays}
                  />
                </div>
              </section>

              {/* Error details */}
              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <AlertCircle size={17} className="text-rose-600" />
                    Error details
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard?.writeText(
                        getErrorText(selectedWorkflow)
                      )
                    }
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Copy error
                  </button>
                </div>

                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-rose-100 bg-rose-50/70 p-4 font-mono text-xs leading-6 text-rose-900">
                  {getErrorText(selectedWorkflow)}
                </pre>
              </section>

              {/* Technical trace */}
              {(selectedWorkflow?.exception ||
                selectedWorkflow?.trace) && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">
                    Technical details
                  </h3>

                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
                    {selectedWorkflow.trace ||
                      selectedWorkflow.exception}
                  </pre>
                </section>
              )}

              {/* Optional raw execution data */}
              {selectedWorkflow?.context != null && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">
                    Execution context
                  </h3>

                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-6 text-slate-700">
                    {prettyJson(selectedWorkflow.context)}
                  </pre>
                </section>
              )}

              {/* Modal actions */}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedWorkflow(null)}
                  className={secondaryButtonClass}
                >
                  Close details
                </button>

                {isFailed(getStatus(selectedWorkflow)) &&
                  selectedWorkflow?.retryable !== false && (
                    <button
                      type="button"
                      disabled={
                        retryingId === getExecutionId(selectedWorkflow) ||
                        retryingId !== null
                      }
                      onClick={() => retryWorkflow(selectedWorkflow)}
                      className={primaryButtonClass}
                    >
                      <RotateCcw
                        size={16}
                        className={
                          retryingId === getExecutionId(selectedWorkflow)
                            ? "animate-spin"
                            : ""
                        }
                      />
                      {retryingId === getExecutionId(selectedWorkflow)
                        ? "Retrying execution..."
                        : "Retry execution"}
                      <ArrowUpRight size={15} />
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FailedWorkflows;
