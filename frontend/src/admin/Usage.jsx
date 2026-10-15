
import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const USAGE_URL = `${API_BASE_URL}/usage`;

const api = axios.create({
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers.Accept = "application/json";

  return config;
});

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const today = () => formatDate(new Date());

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
};

const number = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

function StatCard({
  title,
  value,
  caption,
  Icon,
  tone = "green",
  loading = false,
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    blue: "bg-sky-50 text-sky-700 ring-sky-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
  };

  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          {loading ? (
            <div className="mt-4 h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {number(value)}
            </p>
          )}
        </div>

        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tones[tone] || tones.green}`}
        >
          <Icon size={20} strokeWidth={1.9} />
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <p className="text-xs leading-5 text-slate-500">{caption}</p>
      </div>
    </div>
  );
}

function formatActivity(value) {
  if (!value) return "No activity";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function downloadCsv(data) {
  if (!Array.isArray(data) || !data.length) return;

  const columns = [
    ["Client", "client_name"],
    ["Client ID", "tenant_id"],
    ["Messages", "messages"],
    ["Sent", "sent"],
    ["Delivered", "delivered"],
    ["Failed", "failed"],
    ["Workflow Executions", "workflow_executions"],
    ["Successful Executions", "successful_executions"],
    ["Failed Executions", "failed_executions"],
    ["API Requests", "api_requests"],
    ["Last Activity", "last_activity"],
  ];

  const escape = (value) => {
    let text = String(value ?? "");

    // Prevent spreadsheet formula injection for text values.
    if (/^[\s]*[=+\-@]/.test(text)) {
      text = `'${text}`;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    columns.map(([label]) => escape(label)).join(","),
    ...data.map((row) =>
      columns.map(([, key]) => escape(row[key])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `usage-report-${today()}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ErrorBanner({ message, onRetry, loading }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-white p-2 text-red-600 shadow-sm">
          <CircleAlert size={19} />
        </span>

        <div>
          <p className="font-semibold text-red-800">
            Unable to load usage data
          </p>
          <p className="mt-1 text-sm leading-5 text-red-700">
            {message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRetry}
        disabled={loading}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
      >
        <RefreshCw
          size={15}
          className={loading ? "animate-spin" : ""}
        />
        Try again
      </button>
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index}>
          {Array.from({ length: 8 }).map((__, cell) => (
            <td key={cell} className="px-5 py-5">
              <div
                className={`h-4 animate-pulse rounded-md bg-slate-100 ${
                  cell === 0 ? "w-32" : "w-16"
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function Usage() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [period, setPeriod] = useState("30");

  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(() => today());

  const fetchUsage = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(USAGE_URL, {
          signal,
          params: {
            from,
            to,
            search: search.trim() || undefined,
            tenant_id: clientId || undefined,
          },
        });

        const result = response.data?.data;
        const summary = response.data?.stats;

        setData(
          Array.isArray(result)
            ? result
            : Array.isArray(result?.data)
              ? result.data
              : []
        );

        setStats(
          summary && typeof summary === "object"
            ? summary
            : {}
        );
      } catch (err) {
        if (
          err.code === "ERR_CANCELED" ||
          err.name === "CanceledError"
        ) {
          return;
        }

        setError(
          err.response?.data?.message ||
            (err.response?.status === 401
              ? "Session expired. Please log in again."
              : err.response?.status === 403
                ? "You do not have permission to view usage reports."
                : err.code === "ECONNABORTED"
                  ? "The request timed out. Please try again."
                  : "Usage data load nahi hua. API route aur authentication check karein.")
        );

        setData([]);
        setStats({});
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [from, to, search, clientId]
  );

  useEffect(() => {
    const controller = new AbortController();

    // Debounce search and filter changes to avoid unnecessary requests.
    const timeout = window.setTimeout(() => {
      fetchUsage(controller.signal);
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [fetchUsage]);

  const failedActivities = useMemo(
    () =>
      Number(stats.failed || 0) +
      Number(stats.failed_executions || 0),
    [stats]
  );

  const changePeriod = (value) => {
    setPeriod(value);

    if (value === "today") {
      const date = today();
      setFrom(date);
      setTo(date);
    } else if (value === "7") {
      setFrom(daysAgo(6));
      setTo(today());
    } else if (value === "30") {
      setFrom(daysAgo(29));
      setTo(today());
    }
  };

  const clearFilters = () => {
    setSearch("");
    setClientId("");
    setPeriod("30");
    setFrom(daysAgo(29));
    setTo(today());
  };

  const hasFilters =
    search.trim() !== "" ||
    clientId !== "" ||
    period === "custom";

  const dateInvalid = !from || !to || from > to || to > today();

  return (
    <main className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-emerald-50 blur-3xl" />
          <div className="pointer-events-none absolute right-36 top-20 h-32 w-32 rounded-full bg-green-50 blur-2xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                <Activity size={14} />
                Analytics & Reports
              </div>

                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-emerald-950 sm:text-3xl mt-4">
                  Usage Overview
                </h1>
             


              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-emerald-600" />
                  Usage monitoring
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={15} className="text-emerald-600" />
                  {from} <span className="text-slate-400">to</span> {to}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchUsage()}
              disabled={loading || dateInvalid}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh report
            </button>
          </div>
        </section>

        <ErrorBanner
          message={error}
          onRetry={() => fetchUsage()}
          loading={loading}
        />

        {/* Primary Statistics */}
        <section aria-label="Usage summary">
          <div className="mb-4 flex items-center justify-between gap-3">
           
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-flex">
              <Clock3 size={13} />
              {period === "today"
                ? "Today"
                : period === "7"
                  ? "Last 7 days"
                  : period === "30"
                    ? "Last 30 days"
                    : "Custom range"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Messages"
              value={stats.messages}
              caption="Outbound message records"
              Icon={MessageSquare}
              tone="green"
              loading={loading}
            />

            <StatCard
              title="Workflow Executions"
              value={stats.workflow_executions}
              caption="Recorded workflow runs"
              Icon={Workflow}
              tone="blue"
              loading={loading}
            />

            <StatCard
              title="Successful Executions"
              value={stats.successful_executions}
              caption="Completed or successful runs"
              Icon={CheckCircle2}
              tone="green"
              loading={loading}
            />

            <StatCard
              title="Failed Activities"
              value={failedActivities}
              caption="Failed messages and workflow runs"
              Icon={AlertTriangle}
              tone="red"
              loading={loading}
            />
          </div>
        </section>

        {/* Secondary Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Delivered Messages"
            value={stats.delivered}
            caption="Messages marked delivered"
            Icon={CheckCircle2}
            tone="green"
            loading={loading}
          />

          <StatCard
            title="Failed Messages"
            value={stats.failed}
            caption="Messages marked failed"
            Icon={AlertTriangle}
            tone="red"
            loading={loading}
          />

          <StatCard
            title="API Requests"
            value={stats.api_requests}
            caption="Recorded API node events"
            Icon={Zap}
            tone="amber"
            loading={loading}
          />
        </section>

        {/* Filters */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Filter size={17} />
              </span>

              <div>
                <h2 className="font-bold text-slate-900">
                  Filter report
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Refine usage by client and date
                </p>
              </div>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 self-start rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:self-auto"
              >
                <X size={14} />
                Reset filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label
                htmlFor="usage-search"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                Search client
              </label>

              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="usage-search"
                  className={`${input} pl-10`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Enter client name..."
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="usage-period"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                Date period
              </label>

              <select
                id="usage-period"
                className={input}
                value={period}
                onChange={(e) => changePeriod(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="usage-from"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                From date
              </label>

              <div className="relative">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="usage-from"
                  className={`${input} pl-9`}
                  type="date"
                  value={from}
                  max={to || today()}
                  onChange={(e) => {
                    setPeriod("custom");
                    setFrom(e.target.value);
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="usage-to"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                To date
              </label>

              <input
                id="usage-to"
                className={input}
                type="date"
                value={to}
                min={from || undefined}
                max={today()}
                onChange={(e) => {
                  setPeriod("custom");
                  setTo(e.target.value);
                }}
              />
            </div>
          </div>

          {dateInvalid && (
            <div className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-800">
              Please select a valid date range. The end date cannot be
              earlier than the start date or later than today.
            </div>
          )}
        </section>

        {/* Usage Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <TrendingUp size={19} />
              </span>

              <div>
                <h2 className="font-bold text-slate-900">
                  Client Usage Report
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Client-level activity and execution details
                </p>

                <p className="mt-1.5 text-xs text-slate-400">
                  {from} <span className="px-1">—</span> {to}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => downloadCsv(data)}
              disabled={loading || !data.length}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-5 py-4">
                    Client
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Messages
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Delivered
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Failed
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Workflow Runs
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Successful
                  </th>
                  <th scope="col" className="px-5 py-4">
                    API Requests
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Last Activity
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <TableSkeleton />
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Activity size={25} />
                      </span>

                      <p className="mt-4 font-semibold text-slate-800">
                        No usage records found
                      </p>

                      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                        No client activity was found for this period.
                        Try a different date range or search term.
                      </p>

                      {hasFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <X size={15} />
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => (
                    <tr
                      key={row.tenant_id ?? `${row.client_name}-${index}`}
                      className="transition-colors hover:bg-emerald-50/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-sm font-bold uppercase text-emerald-800">
                            {(row.client_name || "C")
                              .trim()
                              .charAt(0) || "C"}
                          </span>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {row.client_name || "Unnamed client"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Client ID: {row.tenant_id ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold tabular-nums text-slate-800">
                        {number(row.messages)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-emerald-700">
                          <CheckCircle2 size={14} />
                          {number(row.delivered)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-red-600">
                          <AlertTriangle size={14} />
                          {number(row.failed)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm tabular-nums text-slate-700">
                        {number(row.workflow_executions)}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium tabular-nums text-emerald-700">
                        {number(row.successful_executions)}
                      </td>

                      <td className="px-5 py-4 text-sm tabular-nums text-slate-700">
                        {number(row.api_requests)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                          <Clock3
                            size={14}
                            className="shrink-0 text-slate-400"
                          />
                          <span>{formatActivity(row.last_activity)}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing{" "}
              <span className="font-semibold text-slate-800">
                {loading ? "—" : number(data.length)}
              </span>{" "}
              client record(s)
            </p>

            <p className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              Figures reflect records available in the backend.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
