
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
  Smartphone
} from "lucide-react";

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

function SummaryCard({ icon: Icon, label, value, description, iconClass }) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-400">{description}</p>
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={21} strokeWidth={1.9} />
        </div>
      </div>
    </div>
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
          <header className="relative isolate min-h-[120px] w-full rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
              <Bot size={28} strokeWidth={1.8} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-emerald-950 sm:text-3xl">
                  Bots
                </h1>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Management
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Manage bots, WhatsApp accounts and workflow assignments.
              </p>
            </div>
          </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <Download size={17} />
            Export
        </button>
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

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Bot}
            label="Total bots"
            value={bots.length}
            description="All configured bots"
            iconClass="bg-emerald-50 text-emerald-700"
          />
          <SummaryCard
            icon={Power}
            label="Active bots"
            value={activeCount}
            description="Currently marked active"
            iconClass="bg-green-50 text-green-700"
          />
          <SummaryCard
            icon={Workflow}
            label="Draft bots"
            value={draftCount}
            description="Still being configured"
            iconClass="bg-amber-50 text-amber-700"
          />
          <SummaryCard
            icon={Users}
            label="Inactive bots"
            value={inactiveCount}
            description="Not currently active"
            iconClass="bg-slate-100 text-slate-600"
          />
        </section>

        {/* Bots table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex w-full items-center justify-between gap-4">

                {/* Search */}
                <div className="relative min-w-0 flex-1 sm:min-w-[300px] lg:w-80 lg:flex-none">
                <Search
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search Bot..."
                    aria-label="Search bots or users"
                    className={`${inputClass} pl-10`}
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
                <div className="relative  sm:w-[170px] sm:flex-none">
                <Filter
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                    aria-label="Filter bots by status"
                    className={`${inputClass} appearance-none pl-9 pr-9`}
                >
                    {/* <option value="all">All</option> */}

                    {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                        {status.label}
                    </option>
                    ))}
                </select>

                <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                </div>

            </div>
            </div>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 px-5 py-3 sm:px-6">

            {(search || selectedStatus !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedStatus("all");
                }}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-4 text-center">
              <Loader2 size={28} className="animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-slate-600">Loading bots...</p>
            </div>
          ) : filteredBots.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-5 py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                {search || selectedStatus !== "all" ? <Search size={28} /> : <Bot size={30} />}
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {search || selectedStatus !== "all" ? "No matching bots" : "No bots yet"}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {search || selectedStatus !== "all"
                  ? "Try changing your search term or clearing the selected filters."
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
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <Plus size={17} />
                  Create your first bot
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-white text-[11px] font-bold uppercase tracking-wider text-slate-500 ">
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
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                              <Bot size={21} />
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[260px] truncate text-sm font-bold text-slate-900">
                                {bot.name || "Untitled bot"}
                              </p>
                              {/* <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500">
                                {bot.description || "No description added"}
                              </p> */}
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
                                    <Workflow size={13} className="shrink-0" />
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
                                  <div className="my-1.5 border-t border-slate-100" />
                                  {/* <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => deleteBot(bot)}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                                  >
                                    <Trash2 size={15} />
                                    Delete bot
                                  </button> */}
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
                {filteredBots.length} result{filteredBots.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-slate-400">
                Bot status and assignments reflect the latest API response.
              </p>
            </div>
          )}
        </section>

       {modalOpen &&
            createPortal(
                <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
                onClick={() => {
                    if (!saving) {
                    setModalOpen(false);
                    }
                }}
                >
                <div
                    className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                        Edit Bot Name
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                        Update your bot name.
                        </p>
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
                        placeholder="Enter bot name"
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
                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                        Cancel
                        </button>

                       <button
                        type="submit"
                        disabled={saving || !form.name.trim()}
                        className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all duration-200 hover:from-emerald-600 hover:to-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                        >
                        {saving ? (
                            <>
                            <Loader2 size={16} className="animate-spin" />
                            Updating...
                            </>
                        ) : (
                            <>
                            <Check size={16} />
                            Update Bot
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