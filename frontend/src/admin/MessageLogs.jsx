import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import {
  Smartphone,
  Workflow as WorkflowIcon,
  CalendarDays,
  Search,
  RefreshCw,
  Download,
  MessageSquare,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

import { getStoredUser, isSuperAdmin } from "../utils/permission";
import MessageLogsPhonePreview from "../components/admin/MessageLogsPhonePreview";
import MessageAnalyticsPanel from "../components/admin/MessageAnalyticsPanel";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

function getAuthToken() {
  for (const key of ["token", "auth_token", "access_token"]) {
    const val = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (val) return val;
  }
  return null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

function getStatusPillClass(status) {
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

export default function MessageLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialClientParam = searchParams.get("client_id") || "";
  const initialAccountParam =
    searchParams.get("account_id") ||
    searchParams.get("whatsapp_account_id") ||
    "";
  const initialWorkflowParam = searchParams.get("workflow_id") || "all";
  const initialPeriodParam =
    searchParams.get("period") || searchParams.get("date_preset") || "all";
  const initialFromParam =
    searchParams.get("from") || searchParams.get("start_date") || "";
  const initialToParam =
    searchParams.get("to") || searchParams.get("end_date") || "";
  const initialStatusParam = searchParams.get("status") || "all";

  const [currentUser] = useState(() => getStoredUser());
  const superAdmin = useMemo(() => isSuperAdmin(currentUser), [currentUser]);

  // Filter options from backend
  const [clients, setClients] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Selected filters
  const [clientId, setClientId] = useState(initialClientParam);
  const [accountId, setAccountId] = useState(initialAccountParam);
  const [workflowId, setWorkflowId] = useState(initialWorkflowParam);
  const [period, setPeriod] = useState(
    initialFromParam && initialToParam ? "custom" : initialPeriodParam
  );
  const [fromDate, setFromDate] = useState(initialFromParam);
  const [toDate, setToDate] = useState(initialToParam);
  const [statusFilter, setStatusFilter] = useState(initialStatusParam);

  // Sync state if URL search params change dynamically
  useEffect(() => {
    const acc =
      searchParams.get("account_id") ||
      searchParams.get("whatsapp_account_id");
    const wf = searchParams.get("workflow_id");
    const pr = searchParams.get("period") || searchParams.get("date_preset");
    const from = searchParams.get("from") || searchParams.get("start_date");
    const to = searchParams.get("to") || searchParams.get("end_date");
    const st = searchParams.get("status");
    const cl = searchParams.get("client_id");

    if (acc !== null && acc !== undefined && acc !== "") setAccountId(acc);
    if (wf !== null && wf !== undefined && wf !== "") setWorkflowId(wf);
    if (pr !== null && pr !== undefined && pr !== "") setPeriod(pr);
    if (from !== null && from !== undefined && from !== "") setFromDate(from);
    if (to !== null && to !== undefined && to !== "") setToDate(to);
    if (from && to && (!pr || pr === "all")) setPeriod("custom");
    if (st !== null && st !== undefined && st !== "") setStatusFilter(st);
    if (cl !== null && cl !== undefined && cl !== "") setClientId(cl);
  }, [searchParams]);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);

  // Conversations & summary
  const [conversations, setConversations] = useState([]);
  const [summary, setSummary] = useState({
    total_conversations: 0,
    total_messages: 0,
    bot_messages: 0,
    user_messages: 0,
    interactive_messages: 0,
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 30,
    total: 0,
  });
  const [listLoading, setListLoading] = useState(false);

  // Selected conversation detail
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Device preview & responsive mobile panel state
  const [device, setDevice] = useState("iphone");
  const [mobileShowPreview, setMobileShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const listAbortRef = useRef(null);
  const detailAbortRef = useRef(null);
  const selectedSessionIdRef = useRef(null);
  const prevFilterSignatureRef = useRef("");
  const knownTotalRef = useRef(0);
  const cursorMapRef = useRef({});
  const forceRefreshSummaryRef = useRef(false);
  selectedSessionIdRef.current = selectedSessionId;

  const buildFilterParams = useCallback(() => {
    const params = {
      period,
    };

    if (superAdmin && clientId) {
      params.client_id = clientId;
    }

    if (accountId) {
      params.whatsapp_account_id = accountId;
    }

    if (workflowId && workflowId !== "all") {
      params.workflow_id = workflowId;
    } else {
      params.workflow_id = "all";
    }

    if (period === "custom") {
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
    }

    if (statusFilter && statusFilter !== "all") {
      params.status = statusFilter;
    }

    if (appliedSearch.trim()) {
      params.search = appliedSearch.trim();
    }

    return params;
  }, [
    superAdmin,
    clientId,
    accountId,
    workflowId,
    period,
    fromDate,
    toDate,
    statusFilter,
    appliedSearch,
  ]);

  const fetchFilterOptions = useCallback(async () => {
    setFiltersLoading(true);
    try {
      const params = { period };
      if (superAdmin && clientId) params.client_id = clientId;
      if (accountId) params.whatsapp_account_id = accountId;
      if (period === "custom") {
        if (fromDate) params.from = fromDate;
        if (toDate) params.to = toDate;
      }

      const res = await api.get("/message-logs/filters", { params });
      const data = res.data || {};

      setClients(Array.isArray(data.clients) ? data.clients : []);
      const accountList = Array.isArray(data.accounts) ? data.accounts : [];
      setAccounts(accountList);

      // Auto-select WhatsApp account when client logs in or when single account available
      setAccountId((curr) => {
        if (accountList.length === 0) return "";
        const exists =
          curr && accountList.some((a) => String(a.id) === String(curr));
        if (exists) return curr;
        if (!superAdmin || accountList.length === 1) {
          return String(accountList[0].id);
        }
        return curr || "";
      });

      const workflowList = Array.isArray(data.workflows) ? data.workflows : [];
      setWorkflows(workflowList);

      if (
        workflowId &&
        workflowId !== "all" &&
        !workflowList.some((w) => String(w.id) === String(workflowId))
      ) {
        setWorkflowId("all");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load workflow and account filters."
      );
    } finally {
      setFiltersLoading(false);
    }
  }, [superAdmin, clientId, accountId, period, fromDate, toDate, workflowId]);

  const fetchConversations = useCallback(async () => {
    if (listAbortRef.current) {
      listAbortRef.current.abort();
    }
    const controller = new AbortController();
    listAbortRef.current = controller;

    setListLoading(true);
    setError("");

    try {
      const baseFilters = buildFilterParams();
      const filterSignature = JSON.stringify({ ...baseFilters, perPage });
      const filtersChanged = filterSignature !== prevFilterSignatureRef.current;

      if (filtersChanged || page === 1 || forceRefreshSummaryRef.current) {
        cursorMapRef.current = {};
      }

      const includeSummary =
        filtersChanged || page === 1 || forceRefreshSummaryRef.current;

      const params = {
        ...baseFilters,
        page,
        per_page: perPage,
        include_summary: includeSummary ? 1 : 0,
      };

      if (!includeSummary) {
        params.known_total = knownTotalRef.current;
        const seekCursor = cursorMapRef.current[page - 1];
        if (seekCursor?.ts && seekCursor?.id) {
          params.cursor_ts = seekCursor.ts;
          params.cursor_id = seekCursor.id;
        }
      }

      const res = await api.get("/message-logs/conversations", {
        params,
        signal: controller.signal,
      });

      const data = res.data || {};
      const rows = Array.isArray(data.conversations) ? data.conversations : [];
      setConversations(rows);

      prevFilterSignatureRef.current = filterSignature;
      forceRefreshSummaryRef.current = false;

      if (data.summary) {
        setSummary(data.summary);
      } else if (includeSummary) {
        setSummary({
          total_conversations: 0,
          total_messages: 0,
          bot_messages: 0,
          user_messages: 0,
          interactive_messages: 0,
        });
      }

      const nextPagination = data.pagination || {
        current_page: 1,
        last_page: 1,
        per_page: perPage,
        total: rows.length,
      };
      setPagination(nextPagination);
      knownTotalRef.current = Number(nextPagination.total ?? rows.length);

      if (nextPagination.next_cursor) {
        cursorMapRef.current[page] = nextPagination.next_cursor;
      }

      const currentSelected = selectedSessionIdRef.current;
      const stillInList =
        currentSelected &&
        rows.some((r) => String(r.id) === String(currentSelected));

      if (currentSelected && !stillInList) {
        setSelectedSession(null);
        setMessages([]);
        setAnalytics(null);
        setExecutions([]);
      }

      if (!stillInList) {
        if (rows.length > 0) {
          const preferred =
            rows.find((r) => Number(r.total_messages || 0) > 0) || rows[0];
          selectedSessionIdRef.current = preferred.id;
          setSelectedSessionId(preferred.id);
        } else {
          selectedSessionIdRef.current = null;
          setSelectedSessionId(null);
        }
      }
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
        return;
      }
      setError(
        err?.response?.data?.message ||
          "Unable to load conversations. Please try again."
      );
      setConversations([]);
    } finally {
      if (listAbortRef.current === controller) {
        setListLoading(false);
      }
    }
  }, [buildFilterParams, page, perPage, workflowId]);

  const fetchConversationDetail = useCallback(async (sessionId) => {
    if (!sessionId) return;

    if (detailAbortRef.current) {
      detailAbortRef.current.abort();
    }
    const controller = new AbortController();
    detailAbortRef.current = controller;

    setDetailLoading(true);
    setError("");

    try {
      const res = await api.get(`/message-logs/conversations/${sessionId}`, {
        signal: controller.signal,
      });

      const data = res.data || {};
      setSelectedSession(data.session || null);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setAnalytics(data.analytics || null);
      setExecutions(Array.isArray(data.executions) ? data.executions : []);
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
        return;
      }
      setError(
        err?.response?.data?.message ||
          "Unable to load conversation messages."
      );
    } finally {
      if (detailAbortRef.current === controller) {
        setDetailLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== appliedSearch) {
        setPage(1);
        setAppliedSearch(searchInput);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, appliedSearch]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchConversations();
    return () => {
      if (listAbortRef.current) {
        listAbortRef.current.abort();
      }
    };
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchConversationDetail(selectedSessionId);
    }
    return () => {
      if (detailAbortRef.current) {
        detailAbortRef.current.abort();
      }
    };
  }, [selectedSessionId, fetchConversationDetail]);

  const handleWorkflowChange = (
    nextWorkflowId,
    nextClientId = clientId,
    nextAccountId = accountId
  ) => {
    setWorkflowId(nextWorkflowId);
    setPage(1);
    selectedSessionIdRef.current = null;
    setSelectedSessionId(null);
    setSelectedSession(null);
    setMessages([]);
    setAnalytics(null);
    setExecutions([]);

    const nextParams = {};
    if (nextClientId) nextParams.client_id = String(nextClientId);
    if (nextAccountId) nextParams.account_id = String(nextAccountId);
    if (nextWorkflowId && nextWorkflowId !== "all") {
      nextParams.workflow_id = String(nextWorkflowId);
    }
    setSearchParams(nextParams);
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput);
  };

  const handleRefresh = () => {
    forceRefreshSummaryRef.current = true;
    fetchFilterOptions();
    fetchConversations();
    if (selectedSessionId) {
      fetchConversationDetail(selectedSessionId);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const res = await api.get("/message-logs/export", {
        params: buildFilterParams(),
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `message-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to export message logs."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportSingleConversation = async (session) => {
    if (!session?.id) return;
    try {
      const res = await api.get(
        `/message-logs/conversations/${session.id}/export`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `chat-${session.user_identifier || session.id}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to export conversation chat."
      );
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedSessionId(conv.id);
    setMobileShowPreview(true);
  };

  const filteredConversations = useMemo(() => {
    const q = quickFilter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((item) => {
      const phone = String(item.user_identifier || "").toLowerCase();
      const name = String(item.display_name || "").toLowerCase();
      const wf = String(item.workflow_name || "").toLowerCase();
      const last = String(item.last_message_text || "").toLowerCase();
      return (
        phone.includes(q) ||
        name.includes(q) ||
        wf.includes(q) ||
        last.includes(q)
      );
    });
  }, [conversations, quickFilter]);

  const selectedWorkflowObj = useMemo(
    () => workflows.find((w) => String(w.id) === String(workflowId)) || null,
    [workflows, workflowId]
  );

  const totalWorkflowSessions = useMemo(
    () =>
      workflows.reduce((sum, w) => sum + Number(w.sessions_count || 0), 0),
    [workflows]
  );

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-3.5">
      {/* EXECUTIVE EMERALD HERO HEADER & FILTERS DECK */}
      <div className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-sm shadow-emerald-950/[0.04]">
        {/* Deep Emerald Top Strip */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-800 px-4 py-3 text-white sm:px-5">
          <span className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-emerald-400/20 blur-2xl" />

          <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/30 bg-white/15 text-emerald-200 shadow-inner backdrop-blur-xs">
                <Smartphone size={20} />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-sm font-black tracking-tight text-white sm:text-base">
                  {selectedWorkflowObj
                    ? selectedWorkflowObj.name
                    : "All Workflows · Conversation Inspector"}
                </h2>
                <p className="truncate text-[11px] text-emerald-100/80">
                  {selectedWorkflowObj?.trigger_keyword
                    ? `Trigger keyword: "${selectedWorkflowObj.trigger_keyword}" · Real-time WhatsApp chat replay`
                    : "Select any conversation on the left to inspect chat flow and delivery stats"}
                </p>
              </div>
            </div>

            {/* Right Quick Summary Counters & Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-xs sm:inline-flex">
                <Users size={12} className="text-emerald-300" />
                <span>{pagination.total} Chats</span>
              </div>

              <div className="hidden items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-xs md:inline-flex">
                <MessageSquare size={12} className="text-teal-300" />
                <span>
                  {Number(summary.total_messages || 0).toLocaleString("en-IN")}{" "}
                  Msgs
                </span>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={listLoading || filtersLoading}
                title="Refresh logs"
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/20 disabled:opacity-50"
              >
                <RefreshCw
                  size={13}
                  className={listLoading ? "animate-spin text-emerald-300" : ""}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleExportAll}
                disabled={exporting || pagination.total === 0}
                title="Export filtered conversations CSV"
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-extrabold text-emerald-900 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

          {/* Filter Inputs Row */}
          <div className="px-4 py-3.5">
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-wrap items-center gap-2"
            >
              {accounts.length > 0 && (
                <div className="relative">
                  <Smartphone
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"
                  />
                  <select
                    value={accountId}
                    onChange={(e) => {
                      const nextAccountId = e.target.value;
                      setAccountId(nextAccountId);
                      handleWorkflowChange("all", clientId, nextAccountId);
                    }}
                    aria-label="Select WhatsApp account"
                    className="h-9 max-w-[220px] rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs font-semibold text-slate-700 outline-none transition hover:border-emerald-300 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  >
                    {accounts.length > 1 && (
                      <option value="">All WhatsApp Accounts</option>
                    )}
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.waba_id ? `(${acc.waba_id})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Select Workflow */}
              <div className="relative">
                <WorkflowIcon
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"
                />
                <select
                  value={workflowId}
                  onChange={(e) => handleWorkflowChange(e.target.value)}
                  aria-label="Select Workflow"
                  className="h-9 max-w-[230px] rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs font-bold text-slate-700 outline-none transition hover:border-emerald-300 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">
                    All Workflows ({totalWorkflowSessions})
                  </option>
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name} ({wf.sessions_count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Period */}
              <div className="relative">
                <CalendarDays
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"
                />
                <select
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Date range"
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs font-semibold text-slate-700 outline-none transition hover:border-emerald-300 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Mobile search */}
              <div className="relative min-w-[200px] flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by mobile number or keyword..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-7 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-emerald-300 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setAppliedSearch("");
                      setPage(1);
                    }}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-extrabold text-white shadow-sm shadow-emerald-600/20 transition hover:brightness-105"
              >
                <Search size={13} />
                Search
              </button>
            </form>

            {/* Custom Date Range Row */}
            {period === "custom" && (
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">From:</span>
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">To:</span>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
          >
            <span className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </span>
            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-lg p-1 hover:bg-rose-100"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* 3-COLUMN WORKSPACE */}
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(265px,1fr)_336px] xl:grid-cols-[minmax(265px,1fr)_336px_minmax(285px,1fr)] 2xl:grid-cols-[minmax(300px,1fr)_356px_minmax(320px,1fr)]">
          {/* COLUMN 1: CONVERSATIONS LIST */}
          <section
            className={`relative flex h-[630px] min-w-0 flex-col overflow-hidden rounded-2xl border border-emerald-100/90 bg-white shadow-sm shadow-emerald-950/[0.03] ${
              mobileShowPreview ? "hidden lg:flex" : "flex"
            }`}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400 opacity-85" />

            {/* List Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-3 pt-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700">
                  <MessageSquare size={15} />
                </span>
                <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                  Conversations
                </h2>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <Users size={11} />
                {pagination.total} Users
              </span>
            </div>

            {/* Quick filter & Status chips */}
            <div className="space-y-2 border-b border-slate-100 p-3">
              <div className="relative">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={quickFilter}
                  onChange={(e) => setQuickFilter(e.target.value)}
                  placeholder="Quick filter number / name..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-8 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {[
                  { value: "all", label: "All" },
                  { value: "completed", label: "Completed" },
                  { value: "active", label: "Active" },
                  { value: "waiting", label: "Waiting" },
                  { value: "error", label: "Error" },
                ].map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st.value);
                      setPage(1);
                    }}
                    className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                      statusFilter === st.value
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List Body */}
            <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
              {listLoading ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Loader2 size={24} className="animate-spin text-emerald-600" />
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    Loading conversations...
                  </p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                    <Smartphone size={20} />
                  </div>
                  <p className="mt-3 text-xs font-extrabold text-slate-800">
                    {selectedWorkflowObj
                      ? `No Conversations in "${selectedWorkflowObj.name}"`
                      : "No Conversations Found"}
                  </p>
                  <p className="mt-1 max-w-[220px] text-[11px] leading-4 text-slate-400">
                    Try changing the workflow, date range, or status filter from
                    the top bar.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredConversations.map((conv) => {
                    const isSelected =
                      String(selectedSessionId) === String(conv.id);

                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => handleSelectConversation(conv)}
                        className={`flex w-full items-start gap-2.5 rounded-xl border border-l-4 p-2.5 text-left transition-all ${
                          isSelected
                            ? "border-emerald-400 border-l-emerald-600 bg-gradient-to-r from-emerald-50/90 via-emerald-50/40 to-white shadow-xs"
                            : "border-transparent border-l-transparent bg-white hover:border-slate-200 hover:bg-emerald-50/30"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold shadow-2xs ${
                            isSelected
                              ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {getInitials(conv.display_name, conv.user_identifier)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-extrabold text-slate-900">
                              {conv.display_name || conv.user_identifier}
                            </p>
                            <span className="shrink-0 text-[10px] font-medium text-slate-400">
                              {conv.last_message_human || ""}
                            </span>
                          </div>

                          {conv.display_name && (
                            <p className="truncate text-[10px] font-medium text-slate-500">
                              {conv.user_identifier}
                            </p>
                          )}

                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {conv.last_message_text || "No message text"}
                          </p>

                          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1">
                            <span className="max-w-[130px] truncate rounded-md border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-600">
                              {conv.workflow_name}
                            </span>

                            <div className="flex items-center gap-1">
                              <span
                                className={`rounded-full border px-1.5 py-[1px] text-[9px] font-bold capitalize ${getStatusPillClass(
                                  conv.status
                                )}`}
                              >
                                {conv.status}
                              </span>

                              <span className="rounded-full border border-emerald-200/70 bg-emerald-50 px-1.5 py-[1px] text-[9px] font-extrabold text-emerald-700">
                                {conv.total_messages}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination & Page-Size Footer */}
            {pagination.total > 0 && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500">
                <div className="flex items-center gap-2">
                  <span>
                    Pg {pagination.current_page} / {pagination.last_page}
                  </span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    aria-label="Rows per page"
                    className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 outline-none focus:border-emerald-500"
                  >
                    {[15, 30, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}/pg
                      </option>
                    ))}
                  </select>
                </div>
                {pagination.last_page > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1 || listLoading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-slate-200 p-1 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={page >= pagination.last_page || listLoading}
                      onClick={() =>
                        setPage((p) => Math.min(pagination.last_page, p + 1))
                      }
                      className="rounded-lg border border-slate-200 p-1 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* COLUMN 2: MOBILE VIEW */}
          <section
            className={`relative flex h-[630px] min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-emerald-100/90 bg-gradient-to-b from-emerald-50/45 via-white to-teal-50/25 px-3 pb-3.5 pt-3 shadow-sm shadow-emerald-950/[0.03] ${
              mobileShowPreview ? "flex" : "hidden lg:flex"
            }`}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 opacity-85" />
            <MessageLogsPhonePreview
              device={device}
              onDeviceChange={setDevice}
              session={selectedSession}
              messages={messages}
              loading={detailLoading}
              onMobileBack={() => setMobileShowPreview(false)}
            />
          </section>

          {/* COLUMN 3: MESSAGE ANALYTICS */}
          <section
            className={`flex min-w-0 flex-col lg:col-span-2 xl:col-span-1 xl:h-[630px] ${
              mobileShowPreview ? "flex" : "hidden lg:flex"
            }`}
          >
            <MessageAnalyticsPanel
              session={selectedSession}
              analytics={analytics}
              summary={summary}
              selectedWorkflowName={selectedWorkflowObj?.name || "All Workflows"}
              executions={executions}
              onExportConversation={handleExportSingleConversation}
            />
          </section>
        </div>
      </div>
  );
}
