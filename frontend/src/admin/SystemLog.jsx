import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import axios from "axios";

import {
  Activity,
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clipboard,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import {
  ToastContainer,
  toast,
} from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000/api"
).replace(/\/+$/, "");

const AUDIT_LOGS_URL = `${API_BASE_URL}/audit-logs`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;

  if (data?.message) {
    return data.message;
  }

  if (data?.errors) {
    const firstError = Object.values(data.errors)
      .flat()
      .find(Boolean);

    if (firstError) {
      return firstError;
    }
  }

  if (error?.response?.status === 401) {
    return "Session expired or unauthenticated. Please log in again.";
  }

  if (error?.response?.status === 403) {
    return "You do not have permission to perform this action.";
  }

  return fallback;
};

const getLogId = (log) => log?.id ?? log?.log_id;

const getLogAction = (log) =>
  log?.action ??
  log?.event ??
  log?.event_type ??
  log?.description ??
  "—";

const getLogUser = (log) =>
  log?.user?.name ??
  log?.user_name ??
  log?.username ??
  log?.causer?.name ??
  log?.email ??
  "System";

const getLogDate = (log) =>
  log?.created_at ??
  log?.timestamp ??
  log?.event_time ??
  log?.date ??
  null;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const getStatusColor = (value) => {
  const status = String(value || "").toLowerCase();

  if (
    status.includes("success") ||
    status.includes("created") ||
    status.includes("login") ||
    status.includes("updated")
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  }

  if (
    status.includes("delete") ||
    status.includes("failed") ||
    status.includes("error") ||
    status.includes("denied")
  ) {
    return "bg-rose-50 text-rose-700 ring-rose-600/20";
  }

  if (
    status.includes("warning") ||
    status.includes("logout")
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }

  return "bg-slate-100 text-slate-700 ring-slate-500/20";
};

const downloadBlob = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

const escapeCsv = (value) => {
  const text = formatValue(value);
  return `"${text.replace(/"/g, '""')}"`;
};

/* =========================================================
   NOTIFICATION COMPONENT
   Defined OUTSIDE SystemLog to preserve component identity.
========================================================= */

function Notification({
  message,
  isSuccess = true,
  onClose,
}) {
  useEffect(() => {
    if (!message) return undefined;

    const timer = setTimeout(() => {
      onClose?.();
    }, 4000);

    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm shadow-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      }`}
    >
      <Icon size={20} className="mt-0.5 shrink-0" />

      <p className="min-w-0 flex-1 break-words">
        {message}
      </p>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="rounded-md p-1 transition hover:bg-black/5"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/* =========================================================
   REUSABLE DETAIL FIELD
========================================================= */

function DetailField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="break-words text-sm font-medium text-slate-800">
        {formatValue(value)}
      </p>
    </div>
  );
}

/* =========================================================
   JSON DETAILS SECTION
========================================================= */

function JsonSection({ title, value }) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  let displayValue = value;

  if (typeof value === "string") {
    try {
      displayValue = JSON.parse(value);
    } catch {
      displayValue = value;
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h4 className="text-sm font-semibold text-slate-800">
          {title}
        </h4>
      </div>

      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words bg-white p-4 text-xs leading-6 text-slate-700">
        {typeof displayValue === "object"
          ? JSON.stringify(displayValue, null, 2)
          : String(displayValue)}
      </pre>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

const SystemLog = () => {
  /* ---------------- STATE ---------------- */

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const [notification, setNotification] = useState({
    message: "",
    isSuccess: true,
  });

  /* ---------------- NOTIFICATIONS ---------------- */

  const showNotification = useCallback(
    (message, isSuccess = true) => {
      setNotification({
        message,
        isSuccess,
      });
    },
    []
  );

  const closeNotification = useCallback(() => {
    setNotification({
      message: "",
      isSuccess: true,
    });
  }, []);

  /* ---------------- FETCH AUDIT LOGS ---------------- */

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const params = {
        page,
        per_page: perPage,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (actionFilter) {
        params.action = actionFilter;
      }

      if (userFilter.trim()) {
        params.user = userFilter.trim();
      }

      if (fromDate) {
        params.from_date = fromDate;
      }

      if (toDate) {
        params.to_date = toDate;
      }

      const response = await api.get(
        AUDIT_LOGS_URL,
        { params }
      );

      const result = response.data;

      /*
       * Supports common Laravel response formats:
       *
       * { data: [...] }
       * { data: { data: [...], current_page: 1, ... } }
       * { logs: [...] }
       */

      let rows = [];
      let pagination = {};

      if (Array.isArray(result?.data)) {
        rows = result.data;
        pagination = result;
      } else if (Array.isArray(result?.data?.data)) {
        rows = result.data.data;
        pagination = result.data;
      } else if (Array.isArray(result?.logs)) {
        rows = result.logs;
        pagination = result;
      } else if (Array.isArray(result?.results)) {
        rows = result.results;
        pagination = result;
      } else if (Array.isArray(result)) {
        rows = result;
        pagination = {};
      } else {
        throw new Error(
          "Unexpected audit logs response format."
        );
      }

      setLogs(rows);

      const totalRows = Number(
        pagination.total ??
        pagination.total_count ??
        pagination.meta?.total ??
        rows.length
      );

      const currentPage = Number(
        pagination.current_page ??
        pagination.meta?.current_page ??
        page
      );

      const calculatedLastPage = Number(
        pagination.last_page ??
        pagination.meta?.last_page ??
        Math.max(
          1,
          Math.ceil(totalRows / perPage)
        )
      );

      setTotal(totalRows);
      setPage(currentPage);
      setLastPage(Math.max(1, calculatedLastPage));

      const existingIds = new Set(
        rows.map((log) => Number(getLogId(log)))
      );

      setSelectedIds((previous) =>
        previous.filter((id) =>
          existingIds.has(Number(id))
        )
      );
    } catch (error) {
      console.error(
        "Fetch audit logs error:",
        error.response?.data || error
      );

      const message = getErrorMessage(
        error,
        "Unable to load audit logs."
      );

      setLoadError(message);
      setLogs([]);
      setTotal(0);
      setLastPage(1);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    perPage,
    search,
    actionFilter,
    userFilter,
    fromDate,
    toDate,
    refreshKey,
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /* ---------------- FILTERS ---------------- */

  const resetFilters = () => {
    setSearch("");
    setActionFilter("");
    setUserFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
    setSelectedIds([]);
    setLoadError("");
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
    setSelectedIds([]);
  };

  const handleActionChange = (value) => {
    setActionFilter(value);
    setPage(1);
    setSelectedIds([]);
  };

  const handleUserChange = (value) => {
    setUserFilter(value);
    setPage(1);
    setSelectedIds([]);
  };

  const handleFromDateChange = (value) => {
    setFromDate(value);
    setPage(1);
    setSelectedIds([]);
  };

  const handleToDateChange = (value) => {
    setToDate(value);
    setPage(1);
    setSelectedIds([]);
  };

  /* ---------------- SELECT ALL ---------------- */

  const currentPageIds = useMemo(
    () =>
      logs
        .map(getLogId)
        .filter((id) => id !== null && id !== undefined),
    [logs]
  );

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) =>
      selectedIds.some(
        (selectedId) =>
          Number(selectedId) === Number(id)
      )
    );

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      const pageIds = new Set(
        currentPageIds.map(Number)
      );

      setSelectedIds((previous) =>
        previous.filter(
          (id) => !pageIds.has(Number(id))
        )
      );

      return;
    }

    setSelectedIds((previous) => {
      const merged = new Map();

      previous.forEach((id) => {
        merged.set(Number(id), id);
      });

      currentPageIds.forEach((id) => {
        merged.set(Number(id), id);
      });

      return Array.from(merged.values());
    });
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((previous) => {
      const exists = previous.some(
        (selectedId) =>
          Number(selectedId) === Number(id)
      );

      if (exists) {
        return previous.filter(
          (selectedId) =>
            Number(selectedId) !== Number(id)
        );
      }

      return [...previous, id];
    });
  };

  /* ---------------- SINGLE DELETE ---------------- */

  const deleteLog = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this audit log?"
    );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      const response = await api.delete(
        `${AUDIT_LOGS_URL}/${id}`
      );

      if (response.data?.success !== true) {
        showNotification(
          response.data?.message ||
            "Audit log could not be deleted.",
          false
        );

        return;
      }

      setLogs((previous) =>
        previous.filter(
          (log) =>
            Number(getLogId(log)) !== Number(id)
        )
      );

      setSelectedIds((previous) =>
        previous.filter(
          (selectedId) =>
            Number(selectedId) !== Number(id)
        )
      );

      if (
        Number(getLogId(selectedLog)) === Number(id)
      ) {
        setSelectedLog(null);
      }

      showNotification(
        response.data?.message ||
          "Audit log deleted successfully.",
        true
      );

      if (logs.length === 1 && page > 1) {
        setPage((current) =>
          Math.max(1, current - 1)
        );
      } else {
        setRefreshKey((current) => current + 1);
      }
    } catch (error) {
      console.error(
        "Single delete error:",
        error.response?.data || error
      );

      showNotification(
        getErrorMessage(
          error,
          "Failed to delete audit log."
        ),
        false
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* ---------------- BULK DELETE ---------------- */

  const deleteSelectedLogs = async () => {
    if (!selectedIds.length) {
      showNotification(
        "Please select at least one audit log.",
        false
      );

      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${selectedIds.length} selected audit log(s)?`
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const idsToDelete = [...selectedIds];

      const response = await api.delete(
        `${AUDIT_LOGS_URL}/bulk-delete`,
        {
          data: {
            ids: idsToDelete,
          },
        }
      );

      if (response.data?.success !== true) {
        showNotification(
          response.data?.message ||
            "Selected audit logs could not be deleted.",
          false
        );

        return;
      }

      const deletedIds = new Set(
        idsToDelete.map(Number)
      );

      setLogs((previous) =>
        previous.filter(
          (log) =>
            !deletedIds.has(Number(getLogId(log)))
        )
      );

      setSelectedIds([]);

      if (
        selectedLog &&
        deletedIds.has(Number(getLogId(selectedLog)))
      ) {
        setSelectedLog(null);
      }

      showNotification(
        response.data?.message ||
          "Selected audit logs deleted successfully.",
        true
      );

      if (
        logs.length > 0 &&
        logs.every((log) =>
          deletedIds.has(Number(getLogId(log)))
        ) &&
        page > 1
      ) {
        setPage((current) =>
          Math.max(1, current - 1)
        );
      } else {
        setRefreshKey((current) => current + 1);
      }
    } catch (error) {
      console.error(
        "Bulk delete error:",
        error.response?.data || error
      );

      showNotification(
        getErrorMessage(
          error,
          "Failed to delete selected audit logs."
        ),
        false
      );
    } finally {
      setDeleting(false);
    }
  };

  /* ---------------- CSV EXPORT ---------------- */

  const downloadCsv = () => {
    if (!logs.length) {
      toast.info("There are no audit logs to export.");
      return;
    }

    try {
      const headers = [
        "ID",
        "Action",
        "User",
        "IP Address",
        "Created At",
      ];

      const rows = logs.map((log) => [
        getLogId(log),
        getLogAction(log),
        getLogUser(log),
        log.ip_address ??
          log.ip ??
          log.properties?.ip ??
          "",
        log.description ??
          log.message ??
          "",
        formatDate(getLogDate(log)),
      ]);

      const csv = [
        headers.map(escapeCsv).join(","),
        ...rows.map((row) =>
          row.map(escapeCsv).join(",")
        ),
      ].join("\r\n");

      // UTF-8 BOM helps Excel display text correctly.
      downloadBlob(
        "\uFEFF" + csv,
        `audit-logs-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`,
        "text/csv;charset=utf-8;"
      );

      toast.success("CSV exported successfully.");
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error("Unable to export CSV.");
    }
  };

  /* ---------------- COPY DETAILS ---------------- */

  const copyLogDetails = async (log) => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(log, null, 2)
      );

      toast.success("Log details copied.");
    } catch (error) {
      console.error("Copy details error:", error);
      toast.error("Unable to copy log details.");
    }
  };

  /* ---------------- PAGINATION ---------------- */

  const goToPage = (nextPage) => {
    const safePage = Math.min(
      Math.max(1, nextPage),
      Math.max(1, lastPage)
    );

    setPage(safePage);
    setSelectedIds([]);
  };

  const startRecord =
    total === 0 ? 0 : (page - 1) * perPage + 1;

  const endRecord = Math.min(
    page * perPage,
    total
  );

  /* ---------------- MODAL ESCAPE KEY ---------------- */

  useEffect(() => {
    if (!selectedLog) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedLog(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [selectedLog]);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* NOTIFICATION */}

        {notification.message && (
          <Notification
            message={notification.message}
            isSuccess={notification.isSuccess}
            onClose={closeNotification}
          />
        )}


        <header className="relative isolate min-h-[120px] w-full rounded-2xl border border-emerald-100 ">
  <div className="pointer-events-none absolute right-0 top-0 -z-10 h-32 w-32 rounded-full bg-emerald-100/60 blur-3xl" />

  <div className="flex w-full flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:p-6">
    {/* Header Content */}
    <div className="min-w-0 flex-1">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
        <ShieldCheck size={13} />
        Administration
      </div>

      <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-emerald-950 sm:text-3xl mt-2">
       System Audit Logs
      </h1>

 
    </div>

    {/* Header Actions */}
    <div className="flex shrink-0 flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() =>
                setRefreshKey((current) => current + 1)
              }
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={downloadCsv}
              disabled={!logs.length || loading}
             className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <Download size={16} />
              Export CSV
            </button>
    </div>
  </div>


</header>

  
        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Audit Logs
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loading ? "—" : total.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Activity size={23} />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Records matching the current filters
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Selected on Current Page
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {selectedIds.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Clipboard size={23} />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Select records to perform bulk deletion
            </p>
          </div>
        </div>

        {/* FILTERS */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter size={19} className="text-blue-600" />

              <h2 className="text-base font-bold text-slate-900">
                Search and Filters
              </h2>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X size={15} />
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {/* Search */}

            <div>
              <label
                htmlFor="audit-search"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search Logs
              </label>

              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="audit-search"
                  type="text"
                  value={search}
                  onChange={(event) =>
                    handleSearchChange(event.target.value)
                  }
                  placeholder="Search action, user, description..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            {/* Action */}

            <div>
              <label
                htmlFor="audit-action"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Action
              </label>

              <select
                id="audit-action"
                value={actionFilter}
                onChange={(event) =>
                  handleActionChange(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option value="">All Actions</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="deleted">Deleted</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* User */}

            <div>
              <label
                htmlFor="audit-user"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                User
              </label>

              <input
                id="audit-user"
                type="text"
                value={userFilter}
                onChange={(event) =>
                  handleUserChange(event.target.value)
                }
                placeholder="Filter by user name"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            {/* From Date */}

            <div>
              <label
                htmlFor="audit-from-date"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                From Date
              </label>

              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="audit-from-date"
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(event) =>
                    handleFromDateChange(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            {/* To Date */}

            <div>
              <label
                htmlFor="audit-to-date"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                To Date
              </label>

              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="audit-to-date"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) =>
                    handleToDateChange(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            {/* Per Page */}

            <div>
              <label
                htmlFor="audit-per-page"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Rows Per Page
              </label>

              <select
                id="audit-per-page"
                value={perPage}
                onChange={(event) => {
                  setPerPage(Number(event.target.value));
                  setPage(1);
                  setSelectedIds([]);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLE */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* TABLE TOOLBAR */}

          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2">
              <FileText size={19} className="text-blue-600" />

              <h2 className="font-bold text-slate-900">
                Audit Records
              </h2>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {total.toLocaleString("en-IN")}
              </span>
            </div>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={deleteSelectedLogs}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2 size={16} />
                )}

                {deleting
                  ? "Deleting..."
                  : `Delete Selected (${selectedIds.length})`}
              </button>
            )}
          </div>

          {/* LOADING */}

          {loading && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8">
              <Loader2
                size={32}
                className="animate-spin text-blue-600"
              />

              <p className="text-sm font-medium text-slate-500">
                Loading audit logs...
              </p>
            </div>
          )}

          {/* ERROR */}

          {!loading && loadError && (
            <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertCircle size={25} />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Unable to load audit logs
                </h3>

                <p className="mt-1 max-w-xl text-sm text-slate-500">
                  {loadError}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRefreshKey((current) => current + 1)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          )}

          {/* TABLE CONTENT */}

          {!loading && !loadError && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="w-12 px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label="Select all logs on this page"
                          checked={allCurrentPageSelected}
                          onChange={toggleSelectAll}
                          disabled={!logs.length || deleting}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                        />
                      </th>

                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        ID
                      </th>

                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Action
                      </th>

                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        User
                      </th>

                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        IP Address
                      </th>

             

                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Date & Time
                      </th>

                      <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log, index) => {
                      const id = getLogId(log);

                      const isSelected = selectedIds.some(
                        (selectedId) =>
                          Number(selectedId) === Number(id)
                      );

                      const action = getLogAction(log);

                   

                      const ipAddress =
                        log.ip_address ??
                        log.ip ??
                        log.properties?.ip ??
                        "—";

                      return (
                        <tr
                          key={id ?? index}
                          className={`transition hover:bg-slate-50/80 ${
                            isSelected ? "bg-blue-50/50" : ""
                          }`}
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              aria-label={`Select audit log ${id}`}
                              checked={isSelected}
                              onChange={() =>
                                toggleSelectOne(id)
                              }
                              disabled={
                                id === null ||
                                id === undefined ||
                                deleting
                              }
                              className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <span className="font-mono text-xs font-semibold text-slate-600">
                              #{formatValue(id)}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex max-w-48 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusColor(
                                action
                              )}`}
                            >
                              <span className="truncate">
                                {action}
                              </span>
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="max-w-44 truncate text-sm font-medium text-slate-800">
                              {getLogUser(log)}
                            </div>

                            {(log.email ||
                              log.user?.email) && (
                              <div className="mt-1 max-w-44 truncate text-xs text-slate-500">
                                {log.email || log.user?.email}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <span className="font-mono text-xs text-slate-600">
                              {formatValue(ipAddress)}
                            </span>
                          </td>

                     

                          <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                            {formatDate(getLogDate(log))}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="View details"
                                aria-label={`View log ${id}`}
                                onClick={() =>
                                  setSelectedLog(log)
                                }
                                className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                              >
                                <Eye size={17} />
                              </button>

                              <button
                                type="button"
                                title="Delete log"
                                aria-label={`Delete log ${id}`}
                                onClick={() => deleteLog(id)}
                                disabled={
                                  deletingId === id || deleting
                                }
                                className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingId === id ? (
                                  <Loader2
                                    size={17}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2 size={17} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* EMPTY STATE */}

              {logs.length === 0 && (
                <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <FileText size={26} />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-900">
                    No audit logs found
                  </h3>

                  <p className="mt-1 max-w-md text-sm text-slate-500">
                    There are no records matching your search or filter criteria.
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear Filters
                  </button>
                </div>
              )}

              {/* PAGINATION */}

              <div className="flex flex-col gap-4 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-800">
                    {startRecord}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-800">
                    {endRecord}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-800">
                    {total}
                  </span>{" "}
                  records
                </p>

                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goToPage(1)}
                    disabled={page <= 1}
                    aria-label="First page"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronsLeft size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    aria-label="Previous page"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={17} />
                  </button>

                  <span className="min-w-28 px-3 text-center text-sm font-semibold text-slate-700">
                    Page {page} of {lastPage}
                  </span>

                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= lastPage}
                    aria-label="Next page"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={() => goToPage(lastPage)}
                    disabled={page >= lastPage}
                    aria-label="Last page"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronsRight size={17} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedLog(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-modal-title"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FileText size={21} />
                </div>

                <div className="min-w-0">
                  <h2
                    id="audit-modal-title"
                    className="truncate text-lg font-bold text-slate-900"
                  >
                    Audit Log Details
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Record ID: #{formatValue(getLogId(selectedLog))}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                aria-label="Close details"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField
                  label="ID"
                  value={getLogId(selectedLog)}
                />

                <DetailField
                  label="Action"
                  value={getLogAction(selectedLog)}
                />

                <DetailField
                  label="User"
                  value={getLogUser(selectedLog)}
                />

                <DetailField
                  label="IP Address"
                  value={
                    selectedLog.ip_address ??
                    selectedLog.ip ??
                    selectedLog.properties?.ip
                  }
                />

                <DetailField
                  label="Date & Time"
                  value={formatDate(
                    getLogDate(selectedLog)
                  )}
                />

                <DetailField
                  label="User Agent"
                  value={
                    selectedLog.user_agent ??
                    selectedLog.properties?.user_agent
                  }
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-2 text-sm font-bold text-slate-900">
                  Description
                </h3>

                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                  {formatValue(
                    selectedLog.description ??
                    selectedLog.message ??
                    selectedLog.properties?.description
                  )}
                </p>
              </div>

              <JsonSection
                title="Properties"
                value={selectedLog.properties}
              />

              <JsonSection
                title="Old Values"
                value={
                  selectedLog.old_values ??
                  selectedLog.old
                }
              />

              <JsonSection
                title="New Values"
                value={
                  selectedLog.new_values ??
                  selectedLog.new
                }
              />

              <JsonSection
                title="Request Data"
                value={
                  selectedLog.request_data ??
                  selectedLog.payload
                }
              />

              <JsonSection
                title="Complete Raw Record"
                value={selectedLog}
              />
            </div>

            {/* MODAL FOOTER */}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() =>
                  copyLogDetails(selectedLog)
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Clipboard size={16} />
                Copy Details
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const log = selectedLog;
                    setSelectedLog(null);
                    deleteLog(getLogId(log));
                  }}
                  disabled={
                    deletingId === getLogId(selectedLog) ||
                    deleting
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Delete Log
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS FOR CSV AND COPY ACTIONS */}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default SystemLog;