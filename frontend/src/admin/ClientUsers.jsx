import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

import {
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  UserRound,
  Building2,
  ShieldCheck,
  Mail,
  Phone,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  ChevronDown,
  CheckCircle2,
  Ban,
  UserCheck,
  UserCog,
  Filter,
  ArrowUpRight,
  CircleAlert,
  KeyRound,
} from "lucide-react";

/* -------------------------------------------------------
   API CONFIGURATION
------------------------------------------------------- */

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const EMPTY_FORM = {
  tenant_id: "",
  name: "",
  email: "",
  mobile: "",
  role: "agent",
  department: "",
  password: "",
  password_confirmation: "",
  status: "active",
};

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("auth_token") ||
  "";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (data?.errors) {
    return Object.values(data.errors).flat().join(" ");
  }

  return (
    data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

const getRows = (response) => {
  const data = response?.data?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

const cn = (...classes) => classes.filter(Boolean).join(" ");

/* -------------------------------------------------------
   SHARED UI
------------------------------------------------------- */

const inputClass =
  "block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-emerald-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70";

function StatusBadge({ status }) {
  const normalized = String(status || "inactive").toLowerCase();

  const styles = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-800",
    inactive: "border-slate-200 bg-slate-50 text-slate-600",
    suspended: "border-rose-200 bg-rose-50 text-rose-700",
  };

  const dotStyles = {
    active: "bg-emerald-500",
    inactive: "bg-slate-400",
    suspended: "bg-rose-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
        styles[normalized] || styles.inactive
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          dotStyles[normalized] || dotStyles.inactive
        )}
      />
      {normalized}
    </span>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === "admin";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
        isAdmin
          ? "border border-violet-100 bg-violet-50 text-violet-700"
          : "border border-sky-100 bg-sky-50 text-sky-700"
      )}
    >
      {isAdmin ? <ShieldCheck size={13} /> : <UserRound size={13} />}
      {isAdmin ? "Client Admin" : "Agent"}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "emerald",
}) {
  const themes = {
    emerald: {
      icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
      glow: "from-emerald-100/80",
      bar: "bg-emerald-500",
    },
    teal: {
      icon: "border-teal-100 bg-teal-50 text-teal-700",
      glow: "from-teal-100/80",
      bar: "bg-teal-500",
    },
    violet: {
      icon: "border-violet-100 bg-violet-50 text-violet-700",
      glow: "from-violet-100/70",
      bar: "bg-violet-500",
    },
    amber: {
      icon: "border-amber-100 bg-amber-50 text-amber-700",
      glow: "from-amber-100/70",
      bar: "bg-amber-500",
    },
  };

  const theme = themes[accent] || themes.emerald;

  return (
    <div className="group relative isolate overflow-hidden rounded-2xl border border-emerald-100/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/[0.05] sm:p-6">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b to-transparent opacity-70",
          theme.glow
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-3 break-words text-3xl font-extrabold tracking-tight text-emerald-950">
            {Number(value || 0).toLocaleString("en-IN")}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition duration-300 group-hover:scale-105",
            theme.icon
          )}
        >
          <Icon size={22} strokeWidth={1.9} />
        </div>
      </div>

      <div
        className={cn(
          "absolute bottom-0 left-0 h-[3px] w-0 transition-all duration-500 group-hover:w-full",
          theme.bar
        )}
      />
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div className="min-w-0 space-y-2">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>

      {children}

      {hint && (
        <p className="text-xs leading-5 text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function IconButton({
  onClick,
  title,
  children,
  variant = "default",
  disabled = false,
}) {
  const styles = {
    default:
      "border-slate-200 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
    warning:
      "border-slate-200 text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700",
    danger:
      "border-slate-200 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700",
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant]
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------
   CLIENT USER MODAL
------------------------------------------------------- */

function ClientUserModal({
  open,
  onClose,
  onSave,
  clients,
  editingUser,
  saving,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (editingUser) {
      setForm({
        ...EMPTY_FORM,
        tenant_id: String(editingUser.tenant_id ?? ""),
        name: editingUser.name ?? "",
        email: editingUser.email ?? "",
        mobile: editingUser.mobile ?? "",
        role: editingUser.role ?? "agent",
        department: editingUser.department ?? "",
        status: editingUser.status ?? "active",
        password: "",
        password_confirmation: "",
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        tenant_id: clients[0] ? String(clients[0].id) : "",
      });
    }

    setError("");
    setShowPassword(false);
  }, [open, editingUser, clients]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, saving, onClose]);

  if (!open) return null;

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.tenant_id) {
      setError("Please select a client.");
      return;
    }

    if (form.name.trim().length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (
      form.mobile &&
      !/^[6-9]\d{9}$/.test(form.mobile.trim())
    ) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!editingUser && form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password && form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.password_confirmation) {
      setError("Password and confirmation do not match.");
      return;
    }

    const payload = {
      tenant_id: Number(form.tenant_id),
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      mobile: form.mobile.trim() || null,
      role: form.role,
      department: form.department.trim() || null,
      status: form.status,
    };

    if (!editingUser || form.password) {
      payload.password = form.password;
      payload.password_confirmation = form.password_confirmation;
    }

    try {
      await onSave(payload);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  };

  const availableClients = clients.filter(
    (client) =>
      client.status === "active" ||
      String(client.id) === String(form.tenant_id)
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-user-modal-title"
        className="my-auto flex max-h-[calc(100dvh-24px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl sm:max-h-[calc(100dvh-40px)] sm:rounded-3xl"
      >
        {/* Modal header */}
        <div className="relative shrink-0 overflow-hidden border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-white px-5 py-5 sm:px-7">
          <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-100/70 blur-3xl" />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-emerald-700 shadow-sm">
                <UserRound size={23} />
              </div>

              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                  User management
                </p>

                <h2
                  id="client-user-modal-title"
                  className="text-lg font-extrabold tracking-tight text-emerald-950 sm:text-xl"
                >
                  {editingUser ? "Edit Client User" : "Add Client User"}
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                  {editingUser
                    ? "Update profile information and account access."
                    : "Create a secure account for your client."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="Close dialog"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Modal form */}
        <form
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="md:col-span-2 xl:col-span-3">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <UserCog size={15} />
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    Personal information
                  </h3>
                </div>

                <Field label="Client account" required>
                  <div className="relative">
                    <Building2
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700"
                    />

                    <select
                      required
                      value={form.tenant_id}
                      onChange={(event) =>
                        updateField("tenant_id", event.target.value)
                      }
                      className={cn(inputClass, "appearance-none pl-10 pr-10")}
                    >
                      <option value="">Select client</option>

                      {availableClients.map((client) => (
                        <option key={client.id} value={String(client.id)}>
                          {client.name}
                          {client.status !== "active"
                            ? ` (${client.status})`
                            : ""}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>

                  {availableClients.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      No clients found. Create a client before adding users.
                    </p>
                  )}
                </Field>
              </div>

              <Field label="Full name" required>
                <input
                  required
                  minLength={2}
                  maxLength={255}
                  value={form.name}
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                  placeholder="Enter full name"
                  autoComplete="name"
                  className={inputClass}
                />
              </Field>

              <Field label="Email address" required>
                <div className="relative">
                  <Mail
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700"
                  />

                  <input
                    required
                    type="email"
                    maxLength={255}
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="name@company.com"
                    autoComplete="email"
                    className={cn(inputClass, "pl-10")}
                  />
                </div>
              </Field>

              <Field label="Mobile number">
                <div className="relative">
                  <Phone
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700"
                  />

                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.mobile}
                    onChange={(event) =>
                      updateField(
                        "mobile",
                        event.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    placeholder="10-digit mobile number"
                    autoComplete="tel-national"
                    className={cn(inputClass, "pl-10")}
                  />
                </div>
              </Field>

              {/* Account settings */}
              <div className="border-t border-slate-100 pt-5 md:col-span-2 xl:col-span-3">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <ShieldCheck size={15} />
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    Account settings
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <Field label="Role" required>
                    <select
                      required
                      value={form.role}
                      onChange={(event) =>
                        updateField("role", event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="agent">Agent</option>
                      <option value="admin">Client Admin</option>
                    </select>
                  </Field>

                  <Field label="Department">
                    <div className="relative">
                      <BriefcaseBusiness
                        size={17}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700"
                      />

                      <input
                        maxLength={100}
                        value={form.department}
                        onChange={(event) =>
                          updateField("department", event.target.value)
                        }
                        placeholder="Sales, Support..."
                        className={cn(inputClass, "pl-10")}
                      />
                    </div>
                  </Field>

                  <Field label="Account status" required>
                    <select
                      required
                      value={form.status}
                      onChange={(event) =>
                        updateField("status", event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* Password */}
              <div className="border-t border-slate-100 pt-5 md:col-span-2 xl:col-span-3">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <KeyRound size={15} />
                  </span>

                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {editingUser ? "Password settings" : "Login password"}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {editingUser
                        ? "Leave both fields blank to keep the existing password."
                        : "Use at least 8 characters for the account password."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field
                    label="Password"
                    required={!editingUser}
                    hint={editingUser ? "Optional when editing a user." : undefined}
                  >
                    <div className="relative">
                      <input
                        required={!editingUser}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        value={form.password}
                        onChange={(event) =>
                          updateField("password", event.target.value)
                        }
                        placeholder={
                          editingUser
                            ? "Enter new password"
                            : "Minimum 8 characters"
                        }
                        className={cn(inputClass, "pr-12")}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((current) => !current)
                        }
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        {showPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </Field>

                  <Field label="Confirm password" required={!editingUser}>
                    <input
                      required={!editingUser}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      value={form.password_confirmation}
                      onChange={(event) =>
                        updateField(
                          "password_confirmation",
                          event.target.value
                        )
                      }
                      placeholder="Re-enter password"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 md:col-span-2 xl:col-span-3"
                >
                  <CircleAlert size={18} className="mt-0.5 shrink-0" />
                  <p className="leading-5">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="hidden text-xs text-slate-400 sm:block">
              <span className="text-rose-500">*</span> Required fields
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || availableClients.length === 0}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={17} />
                )}

                {saving
                  ? "Saving..."
                  : editingUser
                    ? "Save changes"
                    : "Create user"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   MAIN PAGE
------------------------------------------------------- */

export default function ClientUsers() {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);

  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const [usersResponse, clientsResponse] = await Promise.all([
        api.get("/client-users"),
        api.get("/clients"),
      ]);

      setUsers(getRows(usersResponse));
      setClients(getRows(clientsResponse));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!notice) return undefined;

    const timeout = setTimeout(() => setNotice(""), 4000);

    return () => clearTimeout(timeout);
  }, [notice]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        [
          user.name,
          user.email,
          user.mobile,
          user.client_name,
          user.department,
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );

      const matchesClient =
        clientFilter === "all" ||
        String(user.tenant_id) === clientFilter;

      const matchesRole =
        roleFilter === "all" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      return (
        matchesSearch &&
        matchesClient &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [users, search, clientFilter, roleFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === "active").length,
      admins: users.filter((user) => user.role === "admin").length,
      agents: users.filter((user) => user.role === "agent").length,
    }),
    [users]
  );

  const hasFilters =
    Boolean(search.trim()) ||
    clientFilter !== "all" ||
    roleFilter !== "all" ||
    statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setClientFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const openCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    if (saving) return;

    setModalOpen(false);
    setEditingUser(null);
  }, [saving]);

  const saveUser = async (payload) => {
    setSaving(true);

    try {
      if (editingUser) {
        await api.put(
          `/client-users/${editingUser.id}`,
          payload
        );
        setNotice("Client user updated successfully.");
      } else {
        await api.post("/client-users", payload);
        setNotice("Client user created successfully.");
      }

      setModalOpen(false);
      setEditingUser(null);

      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (user) => {
    const nextStatus =
      user.status === "active" ? "inactive" : "active";

    const confirmed = window.confirm(
      `Are you sure you want to change ${user.name}'s status to ${nextStatus}?`
    );

    if (!confirmed) return;

    setBusyUserId(user.id);
    setPageError("");

    try {
      await api.patch(`/client-users/${user.id}/status`, {
        status: nextStatus,
      });

      setNotice(`User status changed to ${nextStatus}.`);
      await fetchData();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyUserId(null);
    }
  };

  const deleteUser = async (user) => {
    const confirmed = window.confirm(
      `Delete "${user.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setBusyUserId(user.id);
    setPageError("");

    try {
      await api.delete(`/client-users/${user.id}`);

      setNotice("Client user deleted successfully.");
      await fetchData();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setBusyUserId(null);
    }
  };

  const activeClientsForModal = clients.filter((client) => {
    return (
      client.status === "active" ||
      String(client.id) === String(editingUser?.tenant_id)
    );
  });

  return (
    <div className="min-h-screen w-full bg-[#f4faf6] p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1700px] space-y-6">
   {/* PAGE HEADER */}
<header className="relative isolate min-h-[120px] w-full rounded-2xl border border-emerald-100 ">
  <div className="pointer-events-none absolute right-0 top-0 -z-10 h-32 w-32 rounded-full bg-emerald-100/60 blur-3xl" />

  <div className="flex w-full flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:p-6">
    {/* Header Content */}
    <div className="min-w-0 flex-1">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
        <ShieldCheck size={13} />
        User Management
      </div>

      <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-emerald-950 sm:text-3xl mt-2">
        Client Users
      </h1>

 
    </div>

    {/* Header Actions */}
    <div className="flex shrink-0 flex-row gap-2 sm:gap-3">
      <button
        type="button"
        onClick={fetchData}
        disabled={loading}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw
          size={15}
          className={loading ? "animate-spin" : ""}
        />
        Refresh
      </button>

      <button
        type="button"
        onClick={openCreate}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <Plus size={17} />
        Add Client User
      </button>
    </div>
  </div>


</header>

        {/* SUCCESS MESSAGE */}
        {notice && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={19} />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-bold text-emerald-900">
                Action completed
              </p>
              <p className="mt-1 text-sm text-slate-600">{notice}</p>
            </div>

            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {pageError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600">
              <CircleAlert size={19} />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-bold text-rose-900">
                Unable to complete the request
              </p>
              <p className="mt-1 break-words text-sm leading-5 text-rose-800">
                {pageError}
              </p>
              <button
                type="button"
                onClick={fetchData}
                className="mt-2 text-xs font-bold text-rose-800 underline underline-offset-2 hover:text-rose-950"
              >
                Reload data
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPageError("")}
              aria-label="Dismiss error"
              className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* OVERVIEW */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
      

            <div className="hidden items-center gap-1.5 text-xs font-semibold text-emerald-700 sm:flex">
              <ArrowUpRight size={15} />
              Live data
            </div>
          </div>

          {loading && users.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-emerald-100 bg-white p-5 sm:p-6"
                >
                  <div className="h-4 w-28 animate-pulse rounded bg-emerald-50" />
                  <div className="mt-4 h-9 w-20 animate-pulse rounded-lg bg-emerald-50" />
                  <div className="mt-3 h-3 w-36 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total users"
                value={stats.total}
                description="All registered client users"
                icon={Users}
                accent="emerald"
              />

              <StatCard
                title="Active users"
                value={stats.active}
                description="Accounts currently active"
                icon={UserCheck}
                accent="teal"
              />

              <StatCard
                title="Client admins"
                value={stats.admins}
                description="Users with admin role"
                icon={ShieldCheck}
                accent="violet"
              />

              <StatCard
                title="Agents"
                value={stats.agents}
                description="Users with agent role"
                icon={UserRound}
                accent="amber"
              />
            </div>
          )}
        </section>

        {/* USERS LIST */}
        <section className="overflow-hidden rounded-2xl border border-emerald-100/80 bg-white shadow-sm shadow-emerald-950/[0.025] sm:rounded-3xl">
          {/* List heading */}
          <div className="flex flex-col gap-3 border-b border-emerald-100/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                <Users size={21} />
              </div>

              <div>
                <h2 className="text-base font-extrabold text-emerald-950">
                  All client users
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Search, filter and manage user accounts.
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-bold text-emerald-800">
              <Users size={14} />
              {filteredUsers.length} of {users.length} users
            </span>
          </div>

          {/* Search and filters */}
          <div className="border-b border-slate-100 bg-slate-50/40 p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, mobile, client..."
                  aria-label="Search client users"
                  className={cn(inputClass, "pl-10")}
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:w-[570px]">
                <div className="relative min-w-0">
                  <Building2
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700"
                  />

                  <select
                    value={clientFilter}
                    onChange={(event) => setClientFilter(event.target.value)}
                    className={cn(
                      inputClass,
                      "appearance-none pl-9 pr-8"
                    )}
                    aria-label="Filter by client"
                  >
                    <option value="all">All clients</option>
                    {clients.map((client) => (
                      <option key={client.id} value={String(client.id)}>
                        {client.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                <div className="relative min-w-0">
                  <UserRound
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700"
                  />

                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    className={cn(
                      inputClass,
                      "appearance-none pl-9 pr-8"
                    )}
                    aria-label="Filter by role"
                  >
                    <option value="all">All roles</option>
                    <option value="admin">Client Admin</option>
                    <option value="agent">Agent</option>
                  </select>

                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                <div className="relative min-w-0">
                  <Filter
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700"
                  />

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className={cn(
                      inputClass,
                      "appearance-none pl-9 pr-8"
                    )}
                    aria-label="Filter by status"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>

                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-slate-500 sm:text-sm">
                Showing{" "}
                <span className="font-bold text-slate-800">
                  {filteredUsers.length}
                </span>{" "}
                matching users out of{" "}
                <span className="font-bold text-slate-800">
                  {users.length}
                </span>
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-900"
                >
                  <X size={14} />
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && users.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Loader2 size={25} className="animate-spin" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Loading client users...
              </p>
              <p className="text-xs text-slate-400">
                Fetching the latest account information
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            /* Empty state */
            <div className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                {users.length ? (
                  <Search size={29} />
                ) : (
                  <Users size={29} />
                )}
              </div>

              <h3 className="mt-5 text-base font-extrabold text-emerald-950">
                {users.length ? "No matching users" : "No client users yet"}
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {users.length
                  ? "Try adjusting your search or filters to find the account you're looking for."
                  : "Create your first client user to start managing account access."}
              </p>

              {users.length === 0 ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
                >
                  <Plus size={17} />
                  Add Client User
                </button>
              ) : (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  <RefreshCw size={15} />
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[950px] text-left">
                  <thead>
                    <tr className="border-b border-emerald-100 bg-emerald-50/60">
                      {[
                        "User",
                        "Client",
                        "Role",
                        "Department",
                        "Status",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className={cn(
                            "px-5 py-4 text-[10px] font-extrabold uppercase tracking-[0.13em] text-emerald-900/70",
                            heading === "Actions" && "text-right"
                          )}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="transition-colors hover:bg-emerald-50/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-sm font-extrabold text-emerald-800">
                              {(user.name || "U")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate text-sm font-bold text-slate-800">
                                {user.name || "Unnamed user"}
                              </p>

                              <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                                {user.email || "No email"}
                              </p>

                              {user.mobile && (
                                <p className="mt-1 text-xs text-slate-400">
                                  {user.mobile}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex max-w-[190px] items-center gap-2">
                            <Building2
                              size={16}
                              className="shrink-0 text-emerald-700"
                            />
                            <span className="truncate text-sm font-medium text-slate-700">
                              {user.client_name || "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <RoleBadge role={user.role} />
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {user.department || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={user.status} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <IconButton
                              title="Edit user"
                              onClick={() => openEdit(user)}
                            >
                              <Pencil size={15} />
                            </IconButton>

                            <IconButton
                              title={
                                user.status === "active"
                                  ? "Deactivate user"
                                  : "Activate user"
                              }
                              variant="warning"
                              disabled={busyUserId === user.id}
                              onClick={() => changeStatus(user)}
                            >
                              {busyUserId === user.id ? (
                                <Loader2
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : user.status === "active" ? (
                                <Ban size={15} />
                              ) : (
                                <CheckCircle2 size={15} />
                              )}
                            </IconButton>

                            <IconButton
                              title="Delete user"
                              variant="danger"
                              disabled={busyUserId === user.id}
                              onClick={() => deleteUser(user)}
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 md:hidden">
                {filteredUsers.map((user) => (
                  <article
                    key={user.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 font-extrabold text-emerald-800">
                        {(user.name || "U")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-extrabold text-slate-900">
                          {user.name || "Unnamed user"}
                        </p>

                        <p className="mt-1 break-all text-xs leading-5 text-slate-500">
                          {user.email || "No email"}
                        </p>

                        {user.mobile && (
                          <p className="mt-1 text-xs text-slate-500">
                            {user.mobile}
                          </p>
                        )}
                      </div>

                      <StatusBadge status={user.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4">
                      <div className="flex items-start gap-2.5 text-sm">
                        <Building2
                          size={16}
                          className="mt-0.5 shrink-0 text-emerald-700"
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Client
                          </p>
                          <p className="mt-1 break-words font-medium text-slate-700">
                            {user.client_name || "No client assigned"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <RoleBadge role={user.role} />

                        {user.department && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <BriefcaseBusiness size={14} />
                            {user.department}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => changeStatus(user)}
                        disabled={busyUserId === user.id}
                        className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {busyUserId === user.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : user.status === "active" ? (
                          <Ban size={15} />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}

                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteUser(user)}
                        disabled={busyUserId === user.id}
                        aria-label="Delete user"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* List footer */}
          {!loading && filteredUsers.length > 0 && (
            <div className="flex flex-col justify-between gap-2 border-t border-emerald-100 bg-emerald-50/30 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6">
              <p>
                Displaying{" "}
                <span className="font-bold text-slate-700">
                  {filteredUsers.length}
                </span>{" "}
                user records
              </p>

              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 size={14} />
                Account management
              </span>
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="flex flex-col items-start justify-between gap-3 border-t border-emerald-100 pt-4 text-xs text-slate-400 sm:flex-row sm:items-center">
          <p className="inline-flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <ShieldCheck size={14} />
            </span>
            Client Users · Admin Console
          </p>

          <p className="leading-5">
            Manage account access and user permissions securely.
          </p>
        </footer>
      </div>

      {/* CREATE / EDIT MODAL */}
      <ClientUserModal
        open={modalOpen}
        onClose={closeModal}
        onSave={saveUser}
        clients={activeClientsForModal}
        editingUser={editingUser}
        saving={saving}
      />
    </div>
  );
}