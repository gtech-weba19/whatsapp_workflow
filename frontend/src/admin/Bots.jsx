
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
  { value: "draft", label: "Draft" },
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

function ModalHeader({ editing, onClose, disabled }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          {editing ? <Pencil size={20} /> : <Bot size={22} />}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            {editing ? "Edit bot" : "Create New Bot"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Configure your bot and connect existing workflows.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        aria-label="Close modal"
        className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
      >
        <X size={20} />
      </button>
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
    } catch {
      // Backend will return 401 if authentication is missing.
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

    if (!form.name.trim()) {
      setError("Please enter a bot name.");
      return;
    }

    if (isSuperAdmin && !editingBot && !form.user_id) {
      setError("Please select a user to assign this bot.");
      return;
    }

    if (!isSuperAdmin && !form.user_id && !currentUser?.id) {
      setError("Unable to identify your logged-in user. Please log in again.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      whatsapp_account_id: form.whatsapp_account_id
        ? Number(form.whatsapp_account_id)
        : null,
      workflow_ids: form.workflow_ids.map(Number),
    };

    // Only Super Admin can select an owner on create.
    if (isSuperAdmin && !editingBot) {
      payload.user_id = Number(form.user_id);
    }

    setSaving(true);

    try {
      if (editingBot) {
        await request("put", `/bots/${editingBot.id}`, { data: payload });
      } else {
        await request("post", "/bots", { data: payload });
      }

      setSuccess(
        editingBot
          ? "Bot updated successfully."
          : "Bot assigned to user successfully."
      );

      setModalOpen(false);
      setEditingBot(null);
      setForm({ ...EMPTY_FORM });
      setWorkflows([]);
      setWhatsappAccounts([]);

      await fetchBots({ quiet: true });
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          editingBot ? "Failed to update bot." : "Failed to create bot."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Delete bot.
   */
  const deleteBot = async (bot) => {
    const confirmed = window.confirm(
      `Delete "${bot.name}"?\n\nThis action cannot be undone. Existing workflows will not be deleted.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setOpenMenu(null);
    setDeletingId(bot.id);

    try {
      await request("delete", `/bots/${bot.id}`);
      setSuccess("Bot deleted successfully.");
      await fetchBots({ quiet: true });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete bot."));
    } finally {
      setDeletingId(null);
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

  const refreshAll = async () => {
    setRefreshing(true);
    setError("");
    await fetchBots({ quiet: true });
    setRefreshing(false);
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
              onClick={refreshAll}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
            >
              <Plus size={18} />
              Create bot
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
            <div>
              <h2 className="text-lg font-bold text-slate-900">All Bots</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search, filter and manage your bot configurations.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative min-w-0 flex-1 sm:min-w-[260px] lg:w-80 lg:flex-none">
                <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search bots or users..."
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

              <div className="relative sm:min-w-[170px]">
                <Filter size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  aria-label="Filter bots by status"
                  className={`${inputClass} appearance-none pl-9 pr-9`}
                >
                  <option value="all">All statuses</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 px-5 py-3 sm:px-6">
            <p className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{filteredBots.length}</span> of{" "}
              <span className="font-semibold text-slate-900">{bots.length}</span> bots
            </p>

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
                  <tr className="border-b border-slate-200 bg-white text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-6 py-4">Bot details</th>
                    <th scope="col" className="px-5 py-4">User</th>
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
                              <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500">
                                {bot.description || "No description added"}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">ID: {bot.id}</p>
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
                              {bot.user_id && (
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  User ID: {bot.user_id}
                                </p>
                              )}
                            </div>
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
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => deleteBot(bot)}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                                  >
                                    <Trash2 size={15} />
                                    Delete bot
                                  </button>
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

        {/* Create / edit modal */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[3px] sm:p-5"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="bot-modal-title"
              className="my-auto flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl shadow-slate-950/20 sm:rounded-3xl"
            >
              <div id="bot-modal-title">
                <ModalHeader
                  editing={Boolean(editingBot)}
                  onClose={closeModal}
                  disabled={saving}
                />
              </div>

              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                  <AlertMessage type="error" message={error} onClose={() => setError("")} />

                  {/* Basic information */}
                  <section>
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <FileText size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Basic information</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Set the bot name and description.</p>
                      </div>
                    </div>

                    {/* Super Admin owner selection */}
                    {isSuperAdmin && !editingBot && (
                      <div className="mb-4">
                        <FieldLabel required>Assign Bot To User</FieldLabel>
                        <select
                          value={form.user_id}
                          onChange={(event) => handleOwnerChange(event.target.value)}
                          disabled={saving || loadingUsers}
                          required
                          className={inputClass}
                        >
                          <option value="">
                            {loadingUsers ? "Loading registered users..." : "Select registered user"}
                          </option>
                          {users.map((user) => (
                            <option key={user.id} value={String(user.id)}>
                              {user.name || `User ${user.id}`}
                              {user.email ? ` (${user.email})` : ""}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-xs text-slate-500">
                          The bot and its assignments will belong to the selected user.
                        </p>
                        {!loadingUsers && users.length === 0 && (
                          <p className="mt-2 text-xs text-rose-600">
                            No registered users were returned by the API.
                          </p>
                        )}
                      </div>
                    )}

                    {isSuperAdmin && editingBot && (
                      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <FieldLabel>Assigned User</FieldLabel>
                        <p className="text-sm font-semibold text-slate-800">
                          {editingBot.user?.name || `User ${editingBot.user_id}`}
                        </p>
                        {editingBot.user?.email && (
                          <p className="mt-1 text-xs text-slate-500">{editingBot.user.email}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">
                          Bot ownership cannot be changed from the edit form.
                        </p>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <div className="mb-4">
                        <FieldLabel required>Bot name</FieldLabel>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(event) => updateForm("name", event.target.value)}
                          placeholder="e.g. Customer Support Bot"
                          required
                          maxLength={255}
                          disabled={saving}
                          className={inputClass}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <FieldLabel hint="Optional">Description</FieldLabel>
                        <textarea
                          value={form.description}
                          onChange={(event) => updateForm("description", event.target.value)}
                          placeholder="Describe this bot's purpose and responsibilities..."
                          rows={3}
                          maxLength={5000}
                          disabled={saving}
                          className={`${inputClass} min-h-20 resize-y`}
                        />
                        <p className="mt-1 text-right text-[11px] text-slate-400">
                          {form.description.length}/5000
                        </p>
                      </div>
                    </div>
                  </section>

                  <div className="border-t border-slate-100" />

                  {/* Bot configuration */}
                  <section>
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <MessageCircle size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Bot configuration</h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Choose its status and WhatsApp account.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <FieldLabel>Status</FieldLabel>
                        <select
                          value={form.status}
                          onChange={(event) => updateForm("status", event.target.value)}
                          disabled={saving}
                          className={inputClass}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-xs text-slate-400">
                          Set whether this bot is active, inactive or in draft.
                        </p>
                      </div>

                      <div>
                        <FieldLabel hint="Optional">WhatsApp account</FieldLabel>
                        <select
                          value={form.whatsapp_account_id}
                          onChange={(event) => updateForm("whatsapp_account_id", event.target.value)}
                          disabled={saving || loadingAccounts || (!form.user_id && isSuperAdmin)}
                          className={inputClass}
                        >
                          <option value="">
                            {loadingAccounts
                              ? "Loading accounts..."
                              : whatsappAccounts.length === 0
                                ? "No connected accounts available"
                                : "No WhatsApp account"}
                          </option>
                          {whatsappAccounts.map((account) => (
                            <option key={account.id} value={String(account.id)}>
                              {account.name || `Account ${account.id}`}
                              {account.phone_number ? ` — ${account.phone_number}` : ""}
                              {String(account.status).toLowerCase() !== "connected"
                                ? ` (${account.status || "unknown"})`
                                : ""}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-xs text-slate-400">
                          WhatsApp accounts for the selected owner are listed here.
                        </p>
                      </div>
                    </div>
                  </section>

                  <div className="border-t border-slate-100" />

                  {/* Workflow assignments */}
                  <section>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                          <Workflow size={19} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Workflow assignments</h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Assign existing workflows to this bot.
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                        <Check size={13} />
                        {form.workflow_ids.length} selected
                      </span>
                    </div>

                    {loadingWorkflows ? (
                      <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70">
                        <Loader2 size={23} className="animate-spin text-emerald-600" />
                        <p className="text-sm text-slate-500">Loading workflows...</p>
                      </div>
                    ) : workflows.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-9 text-center">
                        <Workflow size={26} className="mx-auto mb-2 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-700">No existing workflows found</p>
                        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                          Select a user with workflows, or create a workflow for this user first.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5 sm:p-3">
                        {workflows.map((workflow) => {
                          const unavailable = isWorkflowUnavailable(workflow);
                          const checked = form.workflow_ids.map(Number).includes(Number(workflow.id));

                          return (
                            <label
                              key={workflow.id}
                              className={`flex items-start gap-3 rounded-xl border p-3.5 transition ${
                                unavailable
                                  ? "cursor-not-allowed border-slate-100 bg-slate-100/70 opacity-60"
                                  : checked
                                    ? "cursor-pointer border-emerald-200 bg-emerald-50/70"
                                    : "cursor-pointer border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={saving || unavailable}
                                onChange={() => toggleWorkflow(workflow.id)}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="break-words text-sm font-semibold text-slate-900">
                                    {workflow.name || `Workflow ${workflow.id}`}
                                  </span>
                                  <StatusBadge status={workflow.status || "draft"} />
                                  {unavailable && (
                                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                      Assigned to another bot
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1.5 break-words text-xs leading-5 text-slate-500">
                                  {workflow.description || "No description provided."}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                                  <span>ID: {workflow.id}</span>
                                  {workflow.channel && <span className="capitalize">Channel: {workflow.channel}</span>}
                                </div>
                              </div>
                              {checked && !unavailable && (
                                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <p className="mt-2.5 text-xs leading-5 text-slate-400">
                      Workflows assigned to another bot cannot be selected.
                    </p>
                  </section>
                </div>

                {/* Modal footer */}
                <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <p className="hidden text-xs text-slate-400 sm:block">
                    <span className="text-rose-500">*</span> Required fields
                  </p>
                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={saving}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        saving ||
                        loadingWorkflows ||
                        loadingUsers ||
                        (isSuperAdmin && !editingBot && !form.user_id)
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          {editingBot ? <Pencil size={16} /> : <Plus size={17} />}
                          {editingBot ? "Save changes" : "Create bot"}
                        </>
                      )}
                    </button>
                  </div>
                </footer>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default Bots;
