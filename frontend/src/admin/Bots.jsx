
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { createPortal } from "react-dom";
import {
  Bot,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  Workflow,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Users,
  Power,
  Building2,
  MessageCircle,
  FileText,
  CircleHelp,
  Check,
  Filter,
  Download,
  Smartphone,
  LayoutGrid,
  List,
  Zap,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { PastelKpiCard } from "../components/admin/DashboardCharts";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const EMPTY_FORM = {
  name: "",
  description: "",
  status: "draft",
  user_id: "",
  whatsapp_account_id: "",
  workflow_ids: [],
};

const STATUS_OPTIONS = [
//   { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.bots)) return data.bots;
  if (Array.isArray(data?.clients)) return data.clients;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.workflows)) return data.workflows;
  if (Array.isArray(data?.accounts)) return data.accounts;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  return [];
};

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;

  if (data?.errors) {
    const firstError = Object.values(data.errors).flat()[0];
    if (firstError) return String(firstError);
  }

  if (error?.response?.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (error?.response?.status === 403) {
    return data?.message || "You do not have permission to perform this action.";
  }

  if (error?.response?.status === 404) {
    return data?.message || "The requested resource was not found.";
  }

  if (!error?.response && error?.request) {
    return "Cannot connect to the API. Check your backend server and VITE_API_URL.";
  }

  return data?.message || error?.message || fallback;
};

const getWorkflowIds = (bot) => {
  if (Array.isArray(bot?.workflow_ids)) {
    return bot.workflow_ids.map(Number).filter(Number.isFinite);
  }

  if (Array.isArray(bot?.workflows)) {
    return bot.workflows
      .map((workflow) => Number(workflow.id))
      .filter(Number.isFinite);
  }

  return [];
};

const getCurrentUser = () => {
  const keys = ["user", "auth_user", "current_user", "user_data"];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const user = parsed?.user ?? parsed;

      if (user?.id) return user;
    } catch {
      // Try the next key.
    }
  }

  return null;
};

const getUserRole = (user) =>
  String(user?.role ?? user?.roles?.[0]?.name ?? "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const getStatusStyle = (status) => {
  switch (String(status || "draft").toLowerCase()) {
    case "active":
    case "published":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "inactive":
    case "archived":
      return "bg-slate-100 text-slate-600 ring-slate-500/20";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }
};

function StatusBadge({ status }) {
  const normalized = String(status || "draft").toLowerCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${getStatusStyle(
        normalized
      )}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ["active", "published"].includes(normalized)
            ? "bg-emerald-500"
            : ["inactive", "archived"].includes(normalized)
              ? "bg-slate-400"
              : "bg-amber-500"
        }`}
      />
      {normalized}
    </span>
  );
}


function AlertMessage({ type = "error", message, onClose }) {
  if (!message) return null;

  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      }`}
    >
      <Icon size={19} className="mt-0.5 shrink-0" />
      <p className="min-w-0 flex-1">{message}</p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function FieldLabel({ children, required = false, hint }) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-sm font-semibold text-slate-700">
        {children}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  );
}



const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function Bots() {
  const [bots, setBots] = useState([]);
  const [users, setUsers] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [whatsappAccounts, setWhatsappAccounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingBot, setEditingBot] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const currentUser = useMemo(() => getCurrentUser(), []);
  const [isSuperAdmin, setIsSuperAdmin] = useState(
    () => getUserRole(getCurrentUser()) === "super_admin"
  );

  /*
   * API request helper.
   */
  const request = useCallback((method, url, config = {}) => {
    let token = null;

    try {
      for (const key of ["access_token", "auth_token", "token"]) {
        const value = localStorage.getItem(key);
        if (value) {
          token = value;
          break;
        }
      }
    } catch(error) {
      console.log(error.message)
    }

    return axios({
      ...config,
      method,
      url: `${API_BASE_URL}${url}`,
      headers: {
        Accept: "application/json",
        ...config.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, []);

  /*
   * Load bots.
   */
  const fetchBots = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);

      try {
        const response = await request("get", "/bots");
        setBots(normalizeArray(response.data));
        return true;
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load bots."));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  /*
   * Load registered users for Super Admin.
   */
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);

    try {
      const response = await request("get", "/bots/clients");
      const list = normalizeArray(response.data);
      setUsers(list);
      return list;
    } catch (err) {
      setUsers([]);
      setError(getErrorMessage(err, "Failed to load registered users."));
      return [];
    } finally {
      setLoadingUsers(false);
    }
  }, [request]);

  /*
   * Load workflows for the selected owner.
   */
  const fetchWorkflows = useCallback(
    async (userId = null, botId = null) => {
      setLoadingWorkflows(true);

      try {
        const params = {};

        if (userId) params.user_id = Number(userId);
        if (botId) params.bot_id = Number(botId);

        const response = await request("get", "/bots/workflows", { params });
        setWorkflows(normalizeArray(response.data));
      } catch (err) {
        setWorkflows([]);
        setError(getErrorMessage(err, "Failed to load workflows."));
      } finally {
        setLoadingWorkflows(false);
      }
    },
    [request]
  );

  /*
   * Load WhatsApp accounts for the selected owner.
   * The endpoint must support user_id for Super Admin.
   */
  const fetchWhatsAppAccounts = useCallback(
    async (userId = null, selectedAccountId = "") => {
      setLoadingAccounts(true);

      try {
        const params = {};

        if (userId) params.user_id = Number(userId);

        const response = await request("get", "/whatsapp-accounts", { params });
        const accounts = normalizeArray(response.data);

        setWhatsappAccounts(
          accounts.filter((account) => {
            const sameUser =
              !userId ||
              (account.user_id != null &&
                Number(account.user_id) === Number(userId));

            const connected =
              String(account.status || "").toLowerCase() === "connected";

            const selected =
              String(account.id) === String(selectedAccountId);

            return sameUser && (connected || selected);
          })
        );
      } catch (err) {
        setWhatsappAccounts([]);
        setError(getErrorMessage(err, "Failed to load WhatsApp accounts."));
      } finally {
        setLoadingAccounts(false);
      }
    },
    [request]
  );

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  /*
   * Close modal/menu with Escape.
   */
  useEffect(() => {
    if (!modalOpen && !openMenu) return undefined;

    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      if (openMenu) setOpenMenu(null);

      if (modalOpen && !saving) {
        setModalOpen(false);
        setEditingBot(null);
        setForm({ ...EMPTY_FORM });
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [modalOpen, openMenu, saving]);

  useEffect(() => {
    if (!openMenu) return undefined;

    const closeOnScroll = () => setOpenMenu(null);

    window.addEventListener("resize", closeOnScroll);
    window.addEventListener("scroll", closeOnScroll, true);

    return () => {
      window.removeEventListener("resize", closeOnScroll);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [openMenu]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  /*
   * User selection: reset old assignments and load selected user's data.
   */
  const handleOwnerChange = async (userId) => {
    setForm((current) => ({
      ...current,
      user_id: userId,
      whatsapp_account_id: "",
      workflow_ids: [],
    }));

    setWorkflows([]);
    setWhatsappAccounts([]);
    setError("");

    if (!userId) return;

    await Promise.all([
      fetchWorkflows(userId),
      fetchWhatsAppAccounts(userId),
    ]);
  };

  /*
   * Create modal.
   */
  const openCreateModal = async () => {
    setEditingBot(null);
    setForm({ ...EMPTY_FORM });
    setWorkflows([]);
    setWhatsappAccounts([]);
    setError("");
    setSuccess("");
    setOpenMenu(null);
    setModalOpen(true);

    const superAdmin = getUserRole(currentUser) === "super_admin";
    setIsSuperAdmin(superAdmin);

    if (superAdmin) {
      setUsers([]);
      await fetchUsers();

      // Super Admin must select the bot owner.
      setWorkflows([]);
      setWhatsappAccounts([]);
      return;
    }

    const userId = currentUser?.id;

    if (!userId) {
      setError("Unable to identify your logged-in user. Please log in again.");
      return;
    }

    setForm((current) => ({
      ...current,
      user_id: String(userId),
    }));

    await Promise.all([
      fetchWorkflows(userId),
      fetchWhatsAppAccounts(userId),
    ]);
  };

  /*
   * Edit modal.
   */
  const openEditModal = async (bot) => {
    setEditingBot(bot);
    setError("");
    setSuccess("");
    setOpenMenu(null);

    const ownerId = bot.user_id ?? bot.user?.id ?? null;

    setForm({
      name: bot.name ?? "",
      description: bot.description ?? "",
      status: bot.status ?? "draft",
      user_id: ownerId ? String(ownerId) : "",
      whatsapp_account_id: bot.whatsapp_account_id
        ? String(bot.whatsapp_account_id)
        : "",
      workflow_ids: getWorkflowIds(bot),
    });

    setWorkflows([]);
    setWhatsappAccounts([]);
    setModalOpen(true);

    await Promise.all([
      fetchWorkflows(ownerId, bot.id),
      fetchWhatsAppAccounts(ownerId, bot.whatsapp_account_id ?? ""),
    ]);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingBot(null);
    setForm({ ...EMPTY_FORM });
    setWorkflows([]);
    setWhatsappAccounts([]);
    setError("");
  };

  /*
   * Workflow selection.
   */
  const toggleWorkflow = (workflowId) => {
    const id = Number(workflowId);

    setForm((current) => {
      const selected = current.workflow_ids.map(Number);

      return {
        ...current,
        workflow_ids: selected.includes(id)
          ? selected.filter((selectedId) => selectedId !== id)
          : [...selected, id],
      };
    });
  };

  const isWorkflowUnavailable = (workflow) => {
    const assignedBotId = workflow.bot_id ?? workflow.bot?.id ?? null;

    return (
      assignedBotId != null &&
      Number(assignedBotId) !== Number(editingBot?.id)
    );
  };

  /*
   * Create/update bot.
   */
const handleSubmit = async (event) => {
  event.preventDefault();

  setError("");
  setSuccess("");

  const botName = form.name.trim();

  if (!botName) {
    setError("Please enter bot name.");
    return;
  }

  if (!editingBot) {
    setError("Please select a bot to edit.");
    return;
  }

  try {
    setSaving(true);

    await request("put", `/bots/${editingBot.id}`, {
      data: {
        name: botName,
      },
    });

    setSuccess("Bot name updated successfully.");

    await fetchBots({ quiet: true });

    setTimeout(() => {
      setModalOpen(false);
      setEditingBot(null);
      setSuccess("");
    }, 800);

  } catch (err) {
    console.error("BOT NAME UPDATE ERROR:", err);

    setError(
      err.response?.data?.message ||
      "Unable to update bot name."
    );
  } finally {
    setSaving(false);
  }
};

  /*
   * Update bot status.
   */
  const changeStatus = async (bot, status) => {
    setError("");
    setSuccess("");
    setOpenMenu(null);
    setStatusUpdatingId(bot.id);

    try {
      await request("patch", `/bots/${bot.id}/status`, {
        data: { status },
      });

      setSuccess(`Bot status changed to ${status}.`);
      await fetchBots({ quiet: true });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update bot status."));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  /*
   * Action menu positioning.
   */
  const toggleActionMenu = (event, botId) => {
    event.stopPropagation();

    if (openMenu === botId) {
      setOpenMenu(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 208;
    const menuHeight = 220;
    const belowSpace = window.innerHeight - rect.bottom;

    const top =
      belowSpace >= menuHeight
        ? rect.bottom + 6
        : Math.max(8, rect.top - menuHeight - 6);

    const left = Math.max(
      8,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)
    );

    setMenuPosition({ top, left });
    setOpenMenu(botId);
  };

  /*
   * Search and filters.
   */
  const filteredBots = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bots.filter((bot) => {
      const ownerName = bot.user?.name ?? bot.user?.email ?? "";

      const matchesSearch =
        !query ||
        String(bot.name ?? "").toLowerCase().includes(query) ||
        String(bot.description ?? "").toLowerCase().includes(query) ||
        String(ownerName).toLowerCase().includes(query);

      const matchesStatus =
        selectedStatus === "all" ||
        String(bot.status) === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [bots, search, selectedStatus]);

  const activeCount = bots.filter((bot) => bot.status === "active").length;
  const draftCount = bots.filter((bot) => bot.status === "draft").length;
  const inactiveCount = bots.filter((bot) => bot.status === "inactive").length;

  const totalWorkflowsCount = useMemo(() => {
    return bots.reduce((acc, bot) => {
      const list = Array.isArray(bot.workflows) ? bot.workflows : [];
      return acc + (bot.workflows_count ?? list.length);
    }, 0);
  }, [bots]);

  const formatBotDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };


    const handleExport = () => {
  if (!bots || bots.length === 0) {
    alert("No bots available to export.");
    return;
  }

  const headers = [
    "Bot Name",
    "Status",
    "WhatsApp Account",
    "Created At",
  ];

  const rows = bots.map((bot) => [
    bot.name || "",
    bot.status || "",
    bot.whatsapp_account?.name || "",
    bot.created_at
      ? new Date(bot.created_at).toLocaleDateString()
      : "",
  ]);

  const csvContent = [
    headers,
    ...rows,
  ]
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `bots-export-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

  return (
    <div className="min-h-screen bg-slate-50/80 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Page heading */}
        <header className="relative isolate overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/60 p-6 sm:p-7 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-600/25 ring-4 ring-emerald-50">
                <Bot size={30} strokeWidth={1.9} />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
                    WhatsApp Bots
                  </h1>
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur-sm">
                    {activeCount} Active of {bots.length}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-500 max-w-xl">
                  Deploy, monitor and manage automated WhatsApp bot journeys, connected WABA accounts, and active workflow triggers.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setRefreshing(true);
                  fetchBots({ quiet: true }).finally(() => setRefreshing(false));
                }}
                disabled={loading || refreshing}
                title="Refresh bot list"
                className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin text-emerald-600" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleExport}
                disabled={loading || bots.length === 0}
                className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </header>

        {/* Notifications */}
        <div className="space-y-3">
          <AlertMessage
            type="error"
            message={!modalOpen ? error : ""}
            onClose={() => setError("")}
          />
          <AlertMessage
            type="success"
            message={!modalOpen ? success : ""}
            onClose={() => setSuccess("")}
          />
        </div>

        {/* Elevated Pastel KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PastelKpiCard
            title="Total Bots"
            value={bots.length}
            subtitle="Configured bot fleet"
            pill="Bot Fleet"
            icon={Bot}
            theme="emerald"
            sparkline={[Math.max(1, bots.length - 2), Math.max(1, bots.length - 1), Math.max(2, bots.length), Math.max(2, bots.length + 1), bots.length]}
            loading={loading}
          />
          <PastelKpiCard
            title="Active Bots"
            value={activeCount}
            subtitle={`${bots.length > 0 ? Math.round((activeCount / bots.length) * 100) : 0}% fleet active`}
            pill="Operational"
            icon={Zap}
            theme="green"
            sparkline={[Math.max(0, activeCount - 2), Math.max(0, activeCount - 1), Math.max(1, activeCount), activeCount]}
            loading={loading}
          />
          <PastelKpiCard
            title="Assigned Workflows"
            value={totalWorkflowsCount}
            subtitle="Connected automations"
            pill="Journeys"
            icon={Workflow}
            theme="cyan"
            sparkline={[Math.max(1, totalWorkflowsCount - 3), Math.max(1, totalWorkflowsCount - 1), Math.max(2, totalWorkflowsCount), totalWorkflowsCount]}
            loading={loading}
          />
          <PastelKpiCard
            title="Inactive / Draft"
            value={inactiveCount + draftCount}
            subtitle={`${inactiveCount} paused · ${draftCount} draft`}
            pill="Standby"
            icon={Power}
            theme="lime"
            sparkline={[inactiveCount + draftCount + 1, inactiveCount + draftCount, inactiveCount + draftCount]}
            loading={loading}
          />
        </section>

        {/* Bots Fleet Display */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* Search, Filter & View Switcher Bar */}
          <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Search + Filter */}
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search bots by name, owner, description..."
                  aria-label="Search bots"
                  className={`${inputClass} pl-10 pr-9`}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative sm:w-48 shrink-0">
                <Filter
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  aria-label="Filter bots by status"
                  className={`${inputClass} appearance-none pl-9 pr-9 font-medium`}
                >
                  <option value="all">All Statuses ({bots.length})</option>
                  <option value="active">Active Only ({activeCount})</option>
                  <option value="inactive">Inactive Only ({inactiveCount})</option>
                  {draftCount > 0 && <option value="draft">Draft Only ({draftCount})</option>}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            {/* Right: View Switcher & Clear button */}
            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t border-slate-100 lg:border-t-0">
              {(search || selectedStatus !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedStatus("all");
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline decoration-emerald-300 underline-offset-2"
                >
                  Clear filters
                </button>
              )}

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

          {/* Body Content */}
          {loading ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-4 text-center">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-slate-600">Loading bot fleet...</p>
            </div>
          ) : filteredBots.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-5 py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-sm">
                {search || selectedStatus !== "all" ? <Search size={28} /> : <Bot size={30} />}
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {search || selectedStatus !== "all" ? "No matching bots found" : "No bots yet"}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {search || selectedStatus !== "all"
                  ? "Try changing your search term or clearing the active status filter."
                  : "Create your first bot, connect a WhatsApp account and assign existing workflows."}
              </p>
              {search || selectedStatus !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedStatus("all");
                  }}
                  className="mt-5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                >
                  <Plus size={17} />
                  Create your first bot
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* ================= GRID CARDS VIEW ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-5 sm:p-6 bg-slate-50/50">
              {filteredBots.map((bot) => {
                const assignedWorkflows = Array.isArray(bot.workflows) ? bot.workflows : [];
                const ownerName =
                  bot.user?.name ??
                  bot.user?.email ??
                  (bot.user_id ? `User #${bot.user_id}` : "Current user");
                const isActive = bot.status === "active";
                const isBusy = statusUpdatingId === bot.id;

                return (
                  <div
                    key={bot.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/5"
                  >
                    {/* Top colored accent ribbon */}
                    <div
                      className={`absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r ${
                        isActive
                          ? "from-emerald-500 via-teal-500 to-green-500"
                          : bot.status === "draft"
                          ? "from-amber-400 via-amber-500 to-orange-400"
                          : "from-slate-300 via-slate-400 to-slate-300"
                      }`}
                    />

                    {/* Ambient glow on hover */}
                    <div
                      className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${
                        isActive ? "bg-emerald-300/25" : "bg-slate-200/40"
                      }`}
                    />

                    {/* Card Content Top */}
                    <div>
                      {/* Avatar + Title + Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Bot Avatar */}
                          <div className="relative shrink-0">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-md transition-transform duration-300 group-hover:scale-105 ${
                                isActive
                                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-600/25 ring-2 ring-emerald-100"
                                  : "bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-slate-600/25 ring-2 ring-slate-100"
                              }`}
                            >
                              <Bot size={22} strokeWidth={2} />
                            </div>
                            {isActive && (
                              <span
                                title="Bot is active and running"
                                className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white ring-2 ring-white"
                              >
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              </span>
                            )}
                          </div>

                          {/* Bot Name & Metadata */}
                          <div className="min-w-0 flex-1">
                            <h3
                              title={bot.name}
                              className="truncate text-base font-bold text-slate-900 group-hover:text-emerald-950 transition-colors"
                            >
                              {bot.name || "Untitled Bot"}
                            </h3>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                              <span className="font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                #{bot.id}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatBotDate(bot.created_at) || "Recently"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          <StatusBadge status={bot.status} />
                        </div>
                      </div>

                      {/* Description if present */}
                      {bot.description && (
                        <p className="mt-3 text-xs text-slate-500 line-clamp-2">
                          {bot.description}
                        </p>
                      )}

                      {/* Divider */}
                      <div className="my-4 border-t border-slate-100" />

                      {/* Connected WhatsApp Account */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            WhatsApp Account
                          </p>
                          {bot.whatsapp_account ? (
                            <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 transition hover:bg-emerald-50">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
                                  <Smartphone size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-slate-900">
                                    {bot.whatsapp_account.name || "WhatsApp Business"}
                                  </p>
                                  <p className="font-mono text-[11px] text-emerald-700 truncate">
                                    ID: {bot.whatsapp_account.waba_id || bot.whatsapp_account.id}
                                  </p>
                                </div>
                              </div>
                              <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                Linked
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-400">
                              <CircleHelp size={15} />
                              <span>No WhatsApp account connected</span>
                            </div>
                          )}
                        </div>

                        {/* Assigned Workflows */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Workflow size={12} className="text-emerald-600" />
                              Assigned Workflows
                            </p>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                              {assignedWorkflows.length}
                            </span>
                          </div>

                          {assignedWorkflows.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {assignedWorkflows.slice(0, 3).map((wf) => (
                                <span
                                  key={wf.id}
                                  title={wf.name}
                                  className="inline-flex max-w-[180px] items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
                                >
                                  <Workflow size={12} className="shrink-0 text-emerald-600" />
                                  <span className="truncate">{wf.name || `Workflow #${wf.id}`}</span>
                                </span>
                              ))}
                              {assignedWorkflows.length > 3 && (
                                <span
                                  title={assignedWorkflows.slice(3).map((w) => w.name).join(", ")}
                                  className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600"
                                >
                                  +{assignedWorkflows.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              No automated workflows connected yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Owner Info & Action Buttons */}
                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                      {/* Owner row */}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                          <Building2 size={13} className="shrink-0 text-slate-400" />
                          <span className="truncate font-medium text-slate-700">{ownerName}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          v1.0
                        </span>
                      </div>

                      {/* Quick Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {/* Toggle Status Button */}
                        <button
                          type="button"
                          onClick={() => changeStatus(bot, isActive ? "inactive" : "active")}
                          disabled={isBusy}
                          className={`cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition shadow-sm ${
                            isActive
                              ? "border border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                              : "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-emerald-600/20 hover:from-emerald-700 hover:to-green-700"
                          } disabled:opacity-50`}
                        >
                          {isBusy ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : isActive ? (
                            <>
                              <Power size={13} />
                              <span>Pause Bot</span>
                            </>
                          ) : (
                            <>
                              <Zap size={13} />
                              <span>Activate Bot</span>
                            </>
                          )}
                        </button>

                        {/* Edit Name Button */}
                        <button
                          type="button"
                          onClick={() => openEditModal(bot)}
                          disabled={isBusy}
                          title="Edit bot name"
                          className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 disabled:opacity-50"
                        >
                          <Pencil size={13} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= TABLE VIEW ================= */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-6 py-4">Bot details</th>
                    <th scope="col" className="px-5 py-4">User</th>
                    <th scope="col" className="px-5 py-4">WhatsApp ID</th>
                    <th scope="col" className="px-5 py-4">Workflows</th>
                    <th scope="col" className="px-5 py-4">Status</th>
                    <th scope="col" className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredBots.map((bot) => {
                    const assignedWorkflows = Array.isArray(bot.workflows) ? bot.workflows : [];
                    const ownerName =
                      bot.user?.name ??
                      bot.user?.email ??
                      (bot.user_id ? `User ${bot.user_id}` : "Current user");

                    const busy =
                      statusUpdatingId === bot.id || deletingId === bot.id;

                    return (
                      <tr key={bot.id} className="group transition-colors hover:bg-emerald-50/30">
                        <td className="px-6 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm">
                              <Bot size={21} />
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[260px] truncate text-sm font-bold text-slate-900">
                                {bot.name || "Untitled bot"}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400 font-mono">
                                ID: #{bot.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex max-w-[180px] items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                              <Building2 size={17} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-700">{ownerName}</p>
                            </div>
                          </div>
                        </td>

                        {/* WhatsApp Account ID */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Smartphone size={16} className="shrink-0 text-emerald-600" />
                            <span className="text-sm font-medium text-slate-700">
                              {bot.whatsapp_account?.waba_id || "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex max-w-[300px] flex-wrap items-center gap-1.5">
                            {assignedWorkflows.length > 0 ? (
                              <>
                                {assignedWorkflows.slice(0, 2).map((workflow) => (
                                  <span
                                    key={workflow.id}
                                    title={workflow.name}
                                    className="inline-flex max-w-[150px] items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-medium text-emerald-800"
                                  >
                                    <Workflow size={13} className="shrink-0 text-emerald-600" />
                                    <span className="truncate">{workflow.name || `Workflow ${workflow.id}`}</span>
                                  </span>
                                ))}
                                {assignedWorkflows.length > 2 && (
                                  <span
                                    title={assignedWorkflows.slice(2).map((item) => item.name).join(", ")}
                                    className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                                  >
                                    +{assignedWorkflows.length - 2}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                                <CircleHelp size={14} />
                                No workflows
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4"><StatusBadge status={bot.status} /></td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(bot)}
                              disabled={busy}
                              aria-label={`Edit ${bot.name}`}
                              title="Edit bot"
                              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={(event) => toggleActionMenu(event, bot.id)}
                              disabled={busy}
                              aria-label={`More actions for ${bot.name}`}
                              aria-expanded={openMenu === bot.id}
                              title="More actions"
                              className={`rounded-xl p-2.5 transition disabled:opacity-40 ${
                                openMenu === bot.id
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              }`}
                            >
                              {busy ? <Loader2 size={17} className="animate-spin" /> : <ChevronDown size={18} />}
                            </button>
                          </div>

                          {openMenu === bot.id &&
                            createPortal(
                              <>
                                <button
                                  type="button"
                                  aria-label="Close actions menu"
                                  className="fixed inset-0 z-[9998] cursor-default"
                                  onClick={() => setOpenMenu(null)}
                                />
                                <div
                                  role="menu"
                                  className="fixed z-[9999] w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
                                  style={{ top: menuPosition.top, left: menuPosition.left }}
                                >
                                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Change status
                                  </p>
                                  {STATUS_OPTIONS.filter((item) => item.value !== bot.status).map((item) => (
                                    <button
                                      key={item.value}
                                      type="button"
                                      role="menuitem"
                                      onClick={() => changeStatus(bot, item.value)}
                                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                                    >
                                      <span className={`h-2 w-2 rounded-full ${
                                        item.value === "active"
                                          ? "bg-emerald-500"
                                          : item.value === "draft"
                                            ? "bg-amber-500"
                                            : "bg-slate-400"
                                      }`} />
                                      Set {item.label}
                                    </button>
                                  ))}
                                </div>
                              </>,
                              document.body
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredBots.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:px-6">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-800">{filteredBots.length}</span> of {bots.length} bot{bots.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-slate-400">
                Bot status and assignments reflect API database state.
              </p>
            </div>
          )}
        </section>

        {/* Polished Edit Bot Name Modal */}
        {modalOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
              onClick={() => {
                if (!saving) {
                  setModalOpen(false);
                }
              }}
            >
              <div
                className="w-full max-w-md overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Top accent ribbon */}
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                      <Bot size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Edit Bot Name
                      </h2>
                      <p className="text-xs text-slate-500">
                        Update display name for Bot #{editingBot?.id}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={saving}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                  {error && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                      <AlertCircle size={17} />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                      <CheckCircle2 size={17} />
                      {success}
                    </div>
                  )}

                  <div>
                    <FieldLabel required>Bot Name</FieldLabel>

                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        updateForm("name", event.target.value)
                      }
                      placeholder="Enter bot name (e.g. Support Bot, Lead Gen Bot)"
                      required
                      maxLength={255}
                      disabled={saving}
                      autoFocus
                      className={inputClass}
                    />
                  </div>

                  {/* Footer Buttons */}
                  <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      disabled={saving}
                      className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving || !form.name.trim()}
                      className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all duration-200 hover:from-emerald-700 hover:to-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}

export default Bots;