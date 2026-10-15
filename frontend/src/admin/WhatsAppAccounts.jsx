import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Loader2,
  Phone,
  Smartphone,
  Building2,
  CheckCircle2,
  Clock3,
  Unplug,
  ShieldCheck,
  Eye,
  EyeOff,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const ACCOUNT_URL = `${API_BASE_URL}/whatsapp-accounts`;
const CLIENT_URL = `${API_BASE_URL}/clients`;
const NUMBER_URL = `${API_BASE_URL}/whatsapp-numbers`;


// Dynamic webhook URL
const getWebhookUrl = (accountId) => {
  if (!accountId) return "";

  return `${API_BASE_URL}/webhooks/whatsapp/${accountId}`;
};

/* =========================================================
   AXIOS
========================================================= */

const api = axios.create({
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/* =========================================================
   MOBILE HELPERS
========================================================= */

const normalizeIndianMobile = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (/^[6-9]\d{9}$/.test(digits)) return digits;

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return digits.slice(2);
  }

  return null;
};

const isValidIndianMobile = (value) =>
  normalizeIndianMobile(value) !== null;

/* =========================================================
   DEFAULT VALUES
========================================================= */

const EMPTY_ACCOUNT = {
  tenant_id: "",
  name: "",
  provider: "meta",
  business_name: "",
  phone_number: "",
  phone_number_id: "",
  waba_id: "",
  access_token: "",
  app_secret: "",
  webhook_verify_token: "",
   webhook_url: "",
  api_base_url: "",
  sender_number: "",
  sender_name: "Whatsappdemo",
  webhook_dn_id: "1001",
  status: "pending",
  notes: "",
};

const EMPTY_NUMBER = {
  phone_number: "",
  display_name: "",
  phone_number_id: "",
  sender_id: "",
  country_code: "+91",
  status: "pending",
};

/* =========================================================
   GENERAL HELPERS
========================================================= */

function getRows(response) {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
}

function getErrorMessage(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;

  if (data?.errors) {
    const firstError = Object.values(data.errors)
      .flat()
      .find(Boolean);

    if (firstError) return String(firstError);
  }

  return (
    data?.message ||
    data?.error ||
    error?.message ||
    fallback
  );
}

function getStatus(item) {
  return String(item?.status || "pending").toLowerCase();
}

function getClientName(account, clients) {
  if (account?.client?.name) return account.client.name;
  if (account?.tenant?.name) return account.tenant.name;
  if (account?.client_name) return account.client_name;
  if (account?.tenant_name) return account.tenant_name;

  const client = clients.find(
    (item) =>
      String(item.id) === String(account?.tenant_id) ||
      String(item.id) === String(account?.client_id)
  );

  return client?.name || client?.business_name || "Unassigned";
}

function formatStatus(status) {
  return String(status || "pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getStatusStyle(status) {
  switch (String(status || "").toLowerCase()) {
    case "connected":
    case "active":
    case "approved":
    case "success":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";

    case "disconnected":
    case "inactive":
    case "failed":
    case "error":
    case "rejected":
      return "bg-rose-50 text-rose-700 ring-rose-600/20";

    case "pending":
    case "processing":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";

    default:
      return "bg-slate-100 text-slate-700 ring-slate-500/20";
  }
}

/* =========================================================
   REUSABLE UI
========================================================= */

const inputClass =
  "block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50";

const selectClass = inputClass;

function Field({
  label,
  children,
  required = false,
  hint = "",
  className = "",
}) {
  return (
    <div className={cx("min-w-0 space-y-1.5", className)}>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>

      {children}

      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        getStatusStyle(status)
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {formatStatus(status)}
    </span>
  );
}

function AlertMessage({ message, type = "error", onClose }) {
  if (!message) return null;

  const isError = type === "error";

  return (
    <div
      role="alert"
      className={cx(
        "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
        isError
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      <AlertCircle size={17} className="mt-0.5 shrink-0" />
      <p className="min-w-0 flex-1 break-words">{message}</p>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-0.5 hover:bg-black/5"
          aria-label="Dismiss message"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = "indigo" }) {
  const colors = {
    indigo: {
      icon: "bg-indigo-50 text-indigo-600",
      accent: "bg-indigo-500",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-600",
      accent: "bg-emerald-500",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600",
      accent: "bg-amber-500",
    },
    rose: {
      icon: "bg-rose-50 text-rose-600",
      accent: "bg-rose-500",
    },
  };

  const theme = colors[color] || colors.indigo;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${theme.accent}`}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Current account overview
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${theme.icon}`}
        >
          <Icon size={23} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}
function ModalHeader({ title, subtitle, onClose, icon: Icon }) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-green-600">
            <Icon size={21} />
          </div>
        )}

        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="mt-1 break-words text-sm text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        aria-label="Close modal"
      >
        <X size={19} />
      </button>
    </div>
  );
}

function ModalFooter({ onCancel, saving, submitLabel }) {
  return (
    <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        form="whatsapp-modal-form"
        disabled={saving}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saving ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

/* =========================================================
   ACCOUNT CREATE / EDIT MODAL
========================================================= */

function AccountModal({
  open,
  close,
  save,
  clients,
  editing,
  saving,
}) {
  const [form, setForm] = useState({ ...EMPTY_ACCOUNT });
  const [error, setError] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (!open) return;

    setError("");
    setShowToken(false);
    setShowSecret(false);

    if (editing) {
      setForm({
        ...EMPTY_ACCOUNT,
        ...editing,
        tenant_id: editing.tenant_id ?? editing.client_id ?? "",
        name: editing.name ?? "",
        provider: editing.provider ?? "meta",
        business_name: editing.business_name ?? "",
        phone_number: editing.phone_number ?? "",
        phone_number_id: editing.phone_number_id ?? "",
        waba_id: editing.waba_id ?? "",
        access_token: "",
        app_secret: "",
        webhook_verify_token: editing.webhook_verify_token ?? "",
        api_base_url: editing.api_base_url ?? "",
        webhook_url: editing.webhook_url || getWebhookUrl(editing.id),
        sender_number: editing.sender_number ?? "",
        sender_name: editing.sender_name ?? "Whatsappdemo",
        webhook_dn_id: String(editing.webhook_dn_id ?? "1001"),
        status: editing.status ?? "pending",
        notes: editing.notes ?? "",
      });
    } else {
      setForm({ ...EMPTY_ACCOUNT });
    }
  }, [open, editing]);

  if (!open) return null;

  const update = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Account name is required.");
      return;
    }

    if (!form.tenant_id) {
      setError("Please select a client.");
      return;
    }

    let normalizedMobile = "";

    if (form.phone_number.trim()) {
      normalizedMobile = normalizeIndianMobile(form.phone_number);

      if (!normalizedMobile) {
        setError(
          "Enter a valid Indian mobile number, e.g. 9876543210."
        );
        return;
      }
    }

    const payload = {
      ...form,
      tenant_id: form.tenant_id,
      name: form.name.trim(),
      business_name: form.business_name.trim(),
      phone_number: normalizedMobile,
      phone_number_id: form.phone_number_id.trim(),
      waba_id: form.waba_id.trim(),
      webhook_verify_token: form.webhook_verify_token.trim(),
      api_base_url: form.api_base_url.trim(),
      sender_number: form.sender_number.trim(),
      sender_name: form.sender_name.trim(),
      webhook_dn_id: String(form.webhook_dn_id ?? "").trim(),
      notes: form.notes.trim(),
    };

    // Existing credentials ko blank input se overwrite na karein.
    if (editing && !payload.access_token.trim()) {
      delete payload.access_token;
    }

    if (editing && !payload.app_secret.trim()) {
      delete payload.app_secret;
    }

    try {
      await save(payload);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Unable to save account."));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) close();
      }}
    >
      <section className="relative flex max-h-[92dvh] min-h-0 w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <ModalHeader
          title={editing ? "Edit WhatsApp Account" : "Add WhatsApp Account"}
          subtitle={
            editing
              ? "Update account configuration and provider connection details."
              : "Connect a WhatsApp provider account to your platform."
          }
          onClose={close}
          icon={Building2}
        />

        <form
          id="whatsapp-modal-form"
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {error && <AlertMessage message={error} />}

            {/* ACCOUNT DETAILS */}

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Account Details
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Select the client and configure the WhatsApp account.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Client" required>
                <select
                  className={selectClass}
                  value={form.tenant_id}
                  onChange={(event) =>
                    update("tenant_id", event.target.value)
                  }
                  required
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name ||
                        client.business_name ||
                        `Client #${client.id}`}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Account Name" required>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Main WhatsApp Account"
                  required
                />
              </Field>

              <Field label="Provider" required>
                <select
                  className={selectClass}
                  value={form.provider}
                  onChange={(event) => update("provider", event.target.value)}
                  required
                >
                  <option value="meta">Meta WhatsApp Cloud API</option>
                  <option value="wati">WATI</option>
                  <option value="twilio">Twilio</option>
                  <option value="gupshup">Gupshup</option>
                  <option value="custom">Custom Provider</option>
                </select>
              </Field>

              <Field label="Business Name">
                <input
                  className={inputClass}
                  value={form.business_name}
                  onChange={(event) =>
                    update("business_name", event.target.value)
                  }
                  placeholder="Business or brand name"
                />
              </Field>

              <Field
                label="Phone Number"
                hint="Optional. Enter a 10-digit Indian mobile number starting with 6–9."
              >
                <input
                  className={inputClass}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={form.phone_number}
                  onChange={(event) => {
                    const digits = event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);

                    update("phone_number", digits);
                    setError("");
                  }}
                  placeholder="9876543210"
                  aria-invalid={
                    !!form.phone_number &&
                    !isValidIndianMobile(form.phone_number)
                  }
                />

                {!!form.phone_number &&
                  !isValidIndianMobile(form.phone_number) && (
                    <p className="text-xs text-rose-600">
                      Enter a valid 10-digit Indian mobile number.
                    </p>
                  )}
              </Field>

              <Field label="Phone Number ID">
                <input
                  className={inputClass}
                  value={form.phone_number_id}
                  onChange={(event) =>
                    update("phone_number_id", event.target.value)
                  }
                  placeholder="WhatsApp provider phone number ID"
                />
              </Field>

              <Field label="WhatsApp Business Account ID (WABA ID)">
                <input
                  className={inputClass}
                  value={form.waba_id}
                  onChange={(event) => update("waba_id", event.target.value)}
                  placeholder="Enter WABA ID"
                />
              </Field>

              <Field label="Account Status">
                <select
                  className={selectClass}
                  value={form.status}
                  onChange={(event) => update("status", event.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="connected">Connected</option>
                  <option value="disconnected">Disconnected</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>

            {/* API CREDENTIALS */}

            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-sm font-bold text-slate-900">
                API Credentials
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Credentials are sensitive. Leave secret fields empty when
                editing to keep their existing values.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Access Token"
                hint={
                  editing
                    ? "Leave blank to retain the existing token."
                    : "Paste your provider access token."
                }
              >
                <div className="relative">
                  <input
                    className={cx(inputClass, "pr-11")}
                    type={showToken ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.access_token}
                    onChange={(event) =>
                      update("access_token", event.target.value)
                    }
                    placeholder={editing ? "Token already saved" : "Enter access token"}
                  />

                  <button
                    type="button"
                    onClick={() => setShowToken((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700"
                    aria-label={showToken ? "Hide token" : "Show token"}
                  >
                    {showToken ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </Field>

              <Field
                label="App Secret"
                hint={
                  editing
                    ? "Leave blank to retain the existing secret."
                    : "Optional, depending on provider."
                }
              >
                <div className="relative">
                  <input
                    className={cx(inputClass, "pr-11")}
                    type={showSecret ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.app_secret}
                    onChange={(event) =>
                      update("app_secret", event.target.value)
                    }
                    placeholder={editing ? "Secret already saved" : "Enter app secret"}
                  />

                  <button
                    type="button"
                    onClick={() => setShowSecret((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700"
                    aria-label={showSecret ? "Hide secret" : "Show secret"}
                  >
                    {showSecret ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </Field>

              <Field label="Webhook Verify Token">
                <input
                  className={inputClass}
                  value={form.webhook_verify_token}
                  onChange={(event) =>
                    update("webhook_verify_token", event.target.value)
                  }
                  placeholder="Webhook verification token"
                />
              </Field>

              <Field
                label="Account Webhook URL"
                hint="Use this URL in your WhatsApp provider webhook configuration."
              >
                <div className="flex min-w-0 gap-2">
                  <input
                    className={inputClass}
                    type="url"
                    value={
                      form.webhook_url ||
                      (editing?.id ? getWebhookUrl(editing.id) : "")
                    }
                    readOnly
                    placeholder="Save the account to generate its webhook URL"
                  />

                  <button
                    type="button"
                    disabled={
                      !(form.webhook_url || (editing?.id && getWebhookUrl(editing.id)))
                    }
                    onClick={() => {
                      const url =
                        form.webhook_url ||
                        getWebhookUrl(editing?.id);

                      if (url) {
                        navigator.clipboard.writeText(url);
                      }
                    }}
                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Copy
                  </button>
                </div>
              </Field>

              <Field label="API Base URL">
                <input
                  className={inputClass}
                  type="url"
                  value={form.api_base_url}
                  onChange={(event) =>
                    update("api_base_url", event.target.value)
                  }
                  placeholder="https://api.example.com"
                />
              </Field>
            </div>

            {/* EXISTING PROVIDER CONFIGURATION */}

            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-sm font-bold text-slate-900">
                Provider Configuration
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                These settings correspond to the sender configuration used by
                your existing WhatsApp service.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Sender Number"
                hint="The sender number configured with your provider."
              >
                <input
                  className={inputClass}
                  value={form.sender_number}
                  onChange={(event) =>
                    update("sender_number", event.target.value)
                  }
                  placeholder="Provider sender number"
                />
              </Field>

              <Field
                label="Sender Name"
                hint="The sender name used in outgoing messages."
              >
                <input
                  className={inputClass}
                  value={form.sender_name}
                  onChange={(event) =>
                    update("sender_name", event.target.value)
                  }
                  placeholder="Whatsappdemo"
                />
              </Field>

              <Field
                label="Webhook DN ID"
                hint="The webhook DN ID required by your provider."
              >
                <input
                  className={inputClass}
                  value={form.webhook_dn_id}
                  onChange={(event) =>
                    update("webhook_dn_id", event.target.value)
                  }
                  placeholder="1001"
                />
              </Field>
            </div>

            {/* NOTES */}

            <Field label="Notes">
              <textarea
                className={cx(inputClass, "min-h-[90px] resize-y")}
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Internal notes about this account..."
                rows={3}
              />
            </Field>
          </div>

          <ModalFooter
            onCancel={close}
            saving={saving}
            submitLabel={editing ? "Update Account" : "Create Account"}
          />
        </form>
      </section>
    </div>
  );
}

/* =========================================================
   WHATSAPP NUMBERS MODAL
========================================================= */

function WhatsAppNumbersModal({ account, close, notify }) {
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_NUMBER });

  const fetchNumbers = useCallback(async () => {
    if (!account?.id) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.get(NUMBER_URL, {
        params: { whatsapp_account_id: account.id },
      });

      setNumbers(getRows(response));
    } catch (fetchError) {
      setError(
        getErrorMessage(fetchError, "Unable to load WhatsApp numbers.")
      );
    } finally {
      setLoading(false);
    }
  }, [account?.id]);

  useEffect(() => {
    if (!account) return;

    setNumbers([]);
    setFormOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_NUMBER });
    fetchNumbers();
  }, [account, fetchNumbers]);

  useEffect(() => {
    if (!account) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) {
        if (formOpen) {
          setFormOpen(false);
          setEditingId(null);
        } else {
          close();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [account, saving, formOpen, close]);

  if (!account) return null;

  const openCreateForm = () => {
    setError("");
    setEditingId(null);
    setForm({ ...EMPTY_NUMBER });
    setFormOpen(true);
  };

  const openEditForm = (number) => {
    setError("");
    setEditingId(number.id);
    setForm({
      ...EMPTY_NUMBER,
      ...number,
      phone_number: number.phone_number ?? "",
      display_name: number.display_name ?? "",
      phone_number_id: number.phone_number_id ?? "",
      sender_id: number.sender_id ?? "",
      country_code: number.country_code ?? "+91",
      status: number.status ?? "pending",
  
    });
    setFormOpen(true);
  };

  const updateForm = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const saveNumber = async (event) => {
  event.preventDefault();
  setError("");

  const normalizedMobile = normalizeIndianMobile(form.phone_number);

  if (!normalizedMobile) {
    setError(
      "Enter a valid 10-digit Indian mobile number starting with 6–9."
    );
    return;
  }

  // Parse metadata before starting the loading state.
  let metadata = form.metadata;

  if (typeof metadata === "string") {
    if (!metadata.trim()) {
      metadata = {};
    } else {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        setError("Metadata must contain valid JSON.");
        return;
      }
    }
  }

  if (
    metadata === null ||
    Array.isArray(metadata) ||
    typeof metadata !== "object"
  ) {
    setError("Metadata must be a valid JSON object.");
    return;
  }

  const webhookUrl = (form.webhook_url || "").trim();

  if (webhookUrl) {
    try {
      const parsedUrl = new URL(webhookUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        setError("Webhook URL must start with http:// or https://.");
        return;
      }
    } catch {
      setError("Enter a valid Webhook URL.");
      return;
    }
  }

  const payload = {
    whatsapp_account_id: account.id,
    phone_number: normalizedMobile,
    display_name: (form.display_name || "").trim(),
    phone_number_id: (form.phone_number_id || "").trim(),
    sender_id: (form.sender_id || "").trim(),
    country_code: (form.country_code || "+91").trim(),
    status: form.status,
    webhook_url: webhookUrl || null,
    metadata,
  };

  setSaving(true);

  try {
    if (editingId) {
      await api.put(`${NUMBER_URL}/${editingId}`, payload);

      notify?.(
        "WhatsApp number updated successfully.",
        "success"
      );
    } else {
      await api.post(NUMBER_URL, payload);

      notify?.(
        "WhatsApp number added successfully.",
        "success"
      );
    }

    setFormOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_NUMBER });

    await fetchNumbers();
  } catch (saveError) {
    setError(
      getErrorMessage(saveError, "Unable to save WhatsApp number.")
    );
  } finally {
    setSaving(false);
  }
};

  const deleteNumber = async (number) => {
    const confirmed = window.confirm(
      `Delete WhatsApp number ${number.phone_number || ""}?`
    );

    if (!confirmed) return;

    setDeletingId(number.id);
    setError("");

    try {
      await api.delete(`${NUMBER_URL}/${number.id}`, {
        params: { whatsapp_account_id: account.id },
      });

      notify?.("WhatsApp number deleted successfully.", "success");

      setNumbers((previous) =>
        previous.filter((item) => item.id !== number.id)
      );
    } catch (deleteError) {
      setError(
        getErrorMessage(deleteError, "Unable to delete WhatsApp number.")
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) close();
      }}
    >
      <section className="relative flex max-h-[92dvh] min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <ModalHeader
          title="WhatsApp Numbers"
          subtitle={`Manage phone numbers for ${account.name || `Account #${account.id}`}`}
          onClose={close}
          icon={Smartphone}
        />

        <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain p-5 sm:p-6">
          {error && (
            <AlertMessage
              message={error}
              onClose={() => setError("")}
            />
          )}

          {formOpen && (
            <form
              onSubmit={saveNumber}
              className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">
                    {editingId ? "Edit WhatsApp Number" : "Add WhatsApp Number"}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter the number and its provider IDs.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white"
                  aria-label="Close number form"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field
                  label="Phone Number"
                  required
                  hint="10-digit Indian mobile number starting with 6–9."
                >
                  <input
                    className={inputClass}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    value={form.phone_number}
                    onChange={(event) => {
                      const digits = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);

                      updateForm("phone_number", digits);
                      setError("");
                    }}
                    placeholder="9876543210"
                    required
                    aria-invalid={
                      !!form.phone_number &&
                      !isValidIndianMobile(form.phone_number)
                    }
                  />

                  {!!form.phone_number &&
                    !isValidIndianMobile(form.phone_number) && (
                      <p className="text-xs text-rose-600">
                        Enter a valid 10-digit Indian mobile number.
                      </p>
                    )}
                </Field>

                <Field label="Display Name">
                  <input
                    className={inputClass}
                    value={form.display_name}
                    onChange={(event) =>
                      updateForm("display_name", event.target.value)
                    }
                    placeholder="Customer Support"
                  />
                </Field>

                <Field label="Country Code">
                  <input
                    className={inputClass}
                    value={form.country_code}
                    onChange={(event) =>
                      updateForm("country_code", event.target.value)
                    }
                    placeholder="+91"
                  />
                </Field>

                <Field label="Phone Number ID">
                  <input
                    className={inputClass}
                    value={form.phone_number_id}
                    onChange={(event) =>
                      updateForm("phone_number_id", event.target.value)
                    }
                    placeholder="Provider phone number ID"
                  />
                </Field>

                <Field label="Sender ID">
                  <input
                    className={inputClass}
                    value={form.sender_id}
                    onChange={(event) =>
                      updateForm("sender_id", event.target.value)
                    }
                    placeholder="Optional sender ID"
                  />
                </Field>
                

                <Field label="Status">
                  <select
                    className={selectClass}
                    value={form.status}
                    onChange={(event) =>
                      updateForm("status", event.target.value)
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="error">Error</option>
                  </select>
                </Field>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                    setError("");
                  }}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Number"
                      : "Save Number"}
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Registered Numbers</h3>
              <p className="mt-1 text-sm text-slate-500">
                {numbers.length} number{numbers.length === 1 ? "" : "s"} found
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fetchNumbers}
                disabled={loading}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
              >
                <Plus size={16} />
                Add Number
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] divide-y divide-slate-200 text-left">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr className="transition-colors duration-150 hover:bg-indigo-50/30">
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Phone Number
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Display Name
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Phone Number ID
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-14 text-center">
                        <Loader2
                          size={25}
                          className="mx-auto animate-spin text-indigo-600"
                        />
                        <p className="mt-3 text-sm text-slate-500">
                          Loading WhatsApp numbers...
                        </p>
                      </td>
                    </tr>
                  ) : numbers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <Smartphone size={23} />
                        </div>
                        <p className="mt-3 font-semibold text-slate-800">
                          No WhatsApp numbers found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Add a number to manage it under this account.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    numbers.map((number) => (
                      <tr
                        key={number.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                              <Phone size={16} />
                            </div>
                            <span className="font-semibold text-slate-900">
                              {number.country_code || ""}
                              {number.phone_number || "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {number.display_name || "—"}
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-mono text-xs text-slate-600">
                            {number.phone_number_id || "—"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={number.status} />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditForm(number)}
                              title="Edit number"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteNumber(number)}
                              disabled={deletingId === number.id}
                              title="Delete number"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            >
                              {deletingId === number.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   MAIN WHATSAPP ACCOUNTS PAGE
========================================================= */

export default function WhatsAppAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [clients, setClients] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [numbersAccount, setNumbersAccount] = useState(null);
  const [deletingAccountId, setDeletingAccountId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  /* FETCH DATA */

  const fetchData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const [accountResponse, clientResponse] = await Promise.all([
        api.get(ACCOUNT_URL, {
          params: {
            search: search.trim() || undefined,
            tenant_id: clientFilter || undefined,
            status: statusFilter || undefined,
          },
        }),
        api.get(CLIENT_URL),
      ]);

      setAccounts(getRows(accountResponse));
      setClients(getRows(clientResponse));
    } catch (fetchError) {
      setPageError(
        getErrorMessage(
          fetchError,
          "Unable to load WhatsApp accounts. Check the API URL and backend routes."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [search, clientFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!notice) return undefined;

    const timeout = window.setTimeout(() => setNotice(""), 4000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  /* STATISTICS */

  const stats = useMemo(() => {
    return {
      total: accounts.length,
      connected: accounts.filter((item) =>
        ["connected", "active"].includes(getStatus(item))
      ).length,
      pending: accounts.filter(
        (item) => getStatus(item) === "pending"
      ).length,
      disconnected: accounts.filter((item) =>
        ["disconnected", "inactive", "failed", "error"].includes(
          getStatus(item)
        )
      ).length,
    };
  }, [accounts]);

  /* SAVE ACCOUNT */

  const saveAccount = async (payload) => {
    setSaving(true);
    setPageError("");

    try {
      if (editingAccount?.id) {
        await api.put(`${ACCOUNT_URL}/${editingAccount.id}`, payload);
        setNotice("WhatsApp account updated successfully.");
      } else {
        await api.post(ACCOUNT_URL, payload);
        setNotice("WhatsApp account created successfully.");
      }

      setAccountModalOpen(false);
      setEditingAccount(null);

      await fetchData();
    } catch (saveError) {
      setPageError(
        getErrorMessage(saveError, "Unable to save WhatsApp account.")
      );
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  /* CREATE / EDIT */

  const openCreate = () => {
    setEditingAccount(null);
    setAccountModalOpen(true);
    setPageError("");
  };

  const openEdit = (account) => {
    setEditingAccount(account);
    setAccountModalOpen(true);
    setPageError("");
  };

  const closeAccountModal = () => {
    if (saving) return;

    setAccountModalOpen(false);
    setEditingAccount(null);
  };

  /* UPDATE STATUS */

  const changeStatus = async (account, status) => {
    setUpdatingStatusId(account.id);
    setPageError("");

    try {
      await api.patch(`${ACCOUNT_URL}/${account.id}/status`, { status });

      setNotice("Account status updated successfully.");
      await fetchData();
    } catch (statusError) {
      setPageError(
        getErrorMessage(statusError, "Unable to update account status.")
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  /* DELETE ACCOUNT */

  const removeAccount = async (account) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${account.name || "this account"}"?`
    );

    if (!confirmed) return;

    setDeletingAccountId(account.id);
    setPageError("");

    try {
      await api.delete(`${ACCOUNT_URL}/${account.id}`);

      setAccounts((previous) =>
        previous.filter((item) => item.id !== account.id)
      );

      if (numbersAccount?.id === account.id) {
        setNumbersAccount(null);
      }

      setNotice("WhatsApp account deleted successfully.");
    } catch (deleteError) {
      setPageError(
        getErrorMessage(deleteError, "Unable to delete WhatsApp account.")
      );
    } finally {
      setDeletingAccountId(null);
    }
  };

  /* RENDER */

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-6 lg:p-8">
        {/* PAGE HEADER */}

  <div className="relative w-full rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div className="space-y-1">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Communication Platform
      </div>

         <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-emerald-950 sm:text-3xl mt-4">
        WhatsApp Accounts
      </h1>

  
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={fetchData}
        disabled={loading}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
      >
        <RefreshCw
          size={16}
          className={loading ? "animate-spin" : ""}
        />
        Refresh
      </button>

      <button
        type="button"
        onClick={openCreate}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
      >
        <Plus size={17} />
        Add WhatsApp Account
      </button>
    </div>
  </div>
</div>

        {/* ALERTS */}

        {pageError && (
          <AlertMessage
            message={pageError}
            onClose={() => setPageError("")}
          />
        )}

        {notice && (
          <AlertMessage
            message={notice}
            type="success"
            onClose={() => setNotice("")}
          />
        )}

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Accounts"
            value={stats.total}
            icon={Building2}
            color="indigo"
          />
          <StatCard
            label="Connected"
            value={stats.connected}
            icon={CheckCircle2}
            color="emerald"
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={Clock3}
            color="amber"
          />
          <StatCard
            label="Disconnected"
            value={stats.disconnected}
            icon={Unplug}
            color="rose"
          />
        </div>

        {/* TABLE CARD */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* SEARCH / FILTERS */}

          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">All Accounts</h2>
              <p className="mt-1 text-sm text-slate-500">
                View and manage your WhatsApp accounts.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex">
              <div className="relative min-w-0 sm:min-w-[220px]">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search accounts..."
                  className={cx(inputClass, "pl-10")}
                />
              </div>

              <select
                value={clientFilter}
                onChange={(event) => setClientFilter(event.target.value)}
                className={cx(selectClass, "sm:min-w-[180px]")}
              >
                <option value="">All clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name ||
                      client.business_name ||
                      `Client #${client.id}`}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={cx(selectClass, "sm:min-w-[155px]")}
              >
                <option value="">All statuses</option>
                <option value="connected">Connected</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="disconnected">Disconnected</option>
                <option value="inactive">Inactive</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>

          {/* ACCOUNTS TABLE */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Account
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Client
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Provider
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Phone Number
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Update Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <Loader2
                        size={28}
                        className="mx-auto animate-spin text-indigo-600"
                      />
                      <p className="mt-3 text-sm text-slate-500">
                        Loading WhatsApp accounts...
                      </p>
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Smartphone size={26} />
                      </div>

                      <h3 className="mt-4 font-bold text-slate-900">
                        No WhatsApp accounts found
                      </h3>

                      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                        Add a WhatsApp account or change your search and filters.
                      </p>

                      <button
                        type="button"
                        onClick={openCreate}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        <Plus size={16} />
                        Add WhatsApp Account
                      </button>
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr
                      key={account.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Building2 size={19} />
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate font-semibold text-slate-900">
                              {account.name || "Unnamed account"}
                            </p>
                            <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                              {account.business_name || "No business name"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Building2
                            size={15}
                            className="shrink-0 text-slate-400"
                          />
                          <span className="max-w-[180px] truncate">
                            {getClientName(account, clients)}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold capitalize text-slate-700">
                          {String(account.provider || "meta").replaceAll(
                            "_",
                            " "
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Phone
                            size={15}
                            className="shrink-0 text-slate-400"
                          />
                          <span className="whitespace-nowrap">
                            {account.phone_number || "—"}
                          </span>
                        </div>

                        {account.phone_number_id && (
                          <p className="mt-1 max-w-[200px] truncate font-mono text-[11px] text-slate-400">
                            ID: {account.phone_number_id}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={account.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="relative min-w-[145px]">
                          {updatingStatusId === account.id ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Loader2 size={14} className="animate-spin" />
                              Updating...
                            </div>
                          ) : (
                            <>
                              <select
                                value={getStatus(account)}
                                onChange={(event) =>
                                  changeStatus(account, event.target.value)
                                }
                                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                aria-label={`Change status for ${account.name}`}
                              >
                                <option value="pending">Pending</option>
                                <option value="connected">Connected</option>
                                <option value="disconnected">Disconnected</option>
                                <option value="inactive">Inactive</option>
                              </select>

                              <ChevronDown
                                size={14}
                                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                              />
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setNumbersAccount(account)}
                            title="Manage WhatsApp Numbers"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-100"
                          >
                            <Smartphone size={15} />
                            Numbers
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(account)}
                            title="Edit account"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeAccount(account)}
                            disabled={deletingAccountId === account.id}
                            title="Delete account"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          >
                            {deletingAccountId === account.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER */}

          <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-5 py-3.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {accounts.length} account
              {accounts.length === 1 ? "" : "s"}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              WhatsApp account management
            </span>
          </div>
        </div>
      </div>

      {/* ACCOUNT MODAL */}

      <AccountModal
        open={accountModalOpen}
        close={closeAccountModal}
        save={saveAccount}
        clients={clients}
        editing={editingAccount}
        saving={saving}
      />

      {/* NUMBERS MODAL */}

      {numbersAccount && (
        <WhatsAppNumbersModal
          account={numbersAccount}
          close={() => setNumbersAccount(null)}
          notify={(message) => {
            setNotice(message);
            setPageError("");
          }}
        />
      )}
    </div>
  );
}