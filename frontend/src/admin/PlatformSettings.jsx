
import React, { useCallback, useEffect, useState } from "react";
import {
  Settings,
  Globe,
  ShieldCheck,
  Save,
  RefreshCw,
  Server,
  Bell,
  CheckCircle2,
  MessageCircle,
  AlertCircle,
  Clock3,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  LoaderCircle,
  ExternalLink,
  Info,
  CircleCheck,
  X,
  Languages,
  Link2,
  Sparkles,
  Zap,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { PastelKpiCard } from "../components/admin/DashboardCharts";

/* -------------------------------------------------------------------------- */
/* API CONFIGURATION                                                          */
/* -------------------------------------------------------------------------- */

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const PLATFORM_SETTINGS_URL = `${API_BASE_URL}/platform-settings`;

const REQUEST_TIMEOUT_DEFAULT = 30;

const DEFAULT_SETTINGS = {
  platformName:
    import.meta.env.VITE_PLATFORM_NAME || "WhatsApp Workflow Builder",
  platformUrl:
    typeof window !== "undefined" ? window.location.origin : "",
  timezone: "Asia/Kolkata",
  language: "English",
  requestTimeout: String(REQUEST_TIMEOUT_DEFAULT),
  emailNotifications: true,
  webhookNotifications: true,
};

/* -------------------------------------------------------------------------- */
/* AUTHENTICATION                                                             */
/* -------------------------------------------------------------------------- */

const getAuthHeaders = () => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token");

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/* -------------------------------------------------------------------------- */
/* RESPONSE HELPERS                                                           */
/* -------------------------------------------------------------------------- */

const readApiResponse = async (response) => {
  const raw = await response.text();

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {
      message: raw || `Request failed with HTTP ${response.status}.`,
    };
  }
};

const getErrorMessage = (error) => {
  if (error?.name === "AbortError") {
    return "The request timed out. Please try again.";
  }

  if (error?.status === 401) {
    return "Your session may have expired. Please sign in again.";
  }

  if (error?.status === 403) {
    return "You do not have permission to manage platform settings.";
  }

  if (!error?.response && error?.message === "Failed to fetch") {
    return "Unable to connect to the API server. Check the API URL, server and CORS configuration.";
  }

  return error?.message || "Something went wrong. Please try again.";
};

/* -------------------------------------------------------------------------- */
/* FIELD MAPPING                                                              */
/* -------------------------------------------------------------------------- */

const FIELD_MAP = {
  platform_name: "platformName",
  platformName: "platformName",

  platform_url: "platformUrl",
  platformUrl: "platformUrl",

  timezone: "timezone",
  language: "language",

  request_timeout: "requestTimeout",
  requestTimeout: "requestTimeout",

  email_notifications: "emailNotifications",
  emailNotifications: "emailNotifications",

  webhook_notifications: "webhookNotifications",
  webhookNotifications: "webhookNotifications",
};

const mapSettings = (data = {}) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  const mapped = {};

  Object.entries(data).forEach(([key, value]) => {
    const stateKey = FIELD_MAP[key];

    if (!stateKey) return;

    if (stateKey === "requestTimeout") {
      mapped[stateKey] = String(value ?? REQUEST_TIMEOUT_DEFAULT);
      return;
    }

    if (
      stateKey === "emailNotifications" ||
      stateKey === "webhookNotifications"
    ) {
      mapped[stateKey] =
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true";

      return;
    }

    mapped[stateKey] = value ?? "";
  });

  return mapped;
};

const extractSettings = (result) => {
  const candidates = [
    result?.data?.data,
    result?.data,
    result?.settings?.data,
    result?.settings,
  ];

  return (
    candidates.find(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        !Array.isArray(candidate)
    ) || {}
  );
};

/* -------------------------------------------------------------------------- */
/* STYLES                                                                     */
/* -------------------------------------------------------------------------- */

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-600";

const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50";

/* -------------------------------------------------------------------------- */
/* REUSABLE COMPONENTS                                                        */
/* -------------------------------------------------------------------------- */

const SectionHeading = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3.5">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 border border-emerald-200/60 shadow-sm">
      <Icon size={22} strokeWidth={2} />
    </div>

    <div className="min-w-0">
      <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
        {title}
      </h2>
      <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
        {description}
      </p>
    </div>
  </div>
);

const OverviewCard = ({ icon: Icon, title, value, description, iconClass }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 break-words text-lg font-bold text-slate-900">
          {value}
        </p>
      </div>

      <div className={`rounded-xl p-3 ${iconClass}`}>
        <Icon size={21} strokeWidth={1.8} />
      </div>
    </div>

    <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
  </div>
);

const Notice = ({ type = "error", message, onDismiss, onRetry }) => {
  if (!message) return null;

  const success = type === "success";
  const info = type === "info";

  const styles = success
    ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
    : info
      ? "border-amber-200 bg-amber-50/80 text-amber-900"
      : "border-rose-200 bg-rose-50/80 text-rose-900";

  const Icon = success ? CheckCircle2 : info ? Info : AlertCircle;

  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm ${styles}`}
    >
      <Icon size={19} className="mt-0.5 shrink-0" />

      <p className="min-w-0 flex-1 break-words text-sm font-medium leading-6">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-sm font-bold underline underline-offset-4 hover:opacity-80"
        >
          Retry
        </button>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-lg p-1 transition hover:bg-black/5"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

const SettingsField = ({ label, id, hint, children }) => (
  <div className="min-w-0">
    <label htmlFor={id} className={labelClass}>
      {label}
    </label>
    <div className="mt-1.5">{children}</div>
    {hint && (
      <p className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</p>
    )}
  </div>
);

const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
  disabled,
  icon: Icon,
}) => (
  <div className="flex items-center justify-between gap-4 py-4 px-4 sm:px-5 rounded-2xl border border-slate-200/80 bg-white hover:border-emerald-200 hover:bg-emerald-50/20 transition-all duration-200 group">
    <div className="flex min-w-0 items-start gap-3.5">
      {Icon && (
        <div
          className={`mt-0.5 rounded-xl p-2.5 transition-colors ${
            checked
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
          }`}
        >
          <Icon size={18} strokeWidth={2} />
        </div>
      )}

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
              checked
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {checked ? "Enabled" : "Disabled"}
          </span>
        </div>
        <p className="mt-1 max-w-xl text-xs sm:text-sm leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>

    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "bg-emerald-600 shadow-md shadow-emerald-600/30"
          : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 flex items-center justify-center ${
          checked ? "left-[25px]" : "left-1"
        }`}
      >
        {checked && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        )}
      </span>
    </button>
  </div>
);

/* -------------------------------------------------------------------------- */
/* PLATFORM SETTINGS                                                          */
/* -------------------------------------------------------------------------- */

const PlatformSettings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /* API request helper: applies auth headers and timeout consistently. */
  const request = useCallback(async (url, options = {}) => {
    const controller = new AbortController();

    const timeoutSeconds = Number(
      options.timeoutSeconds ?? REQUEST_TIMEOUT_DEFAULT
    );

    const timeoutMs = Math.min(
      120,
      Math.max(1, timeoutSeconds)
    ) * 1000;

    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: options.signal || controller.signal,
        headers: {
          ...getAuthHeaders(),
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
        },
      });

      const result = await readApiResponse(response);

      if (!response.ok || result?.success === false) {
        const validationErrors = result?.errors
          ? Object.values(result.errors).flat().join(" ")
          : "";

        const message =
          response.status === 401
            ? "Your session may have expired. Please sign in again."
            : response.status === 403
              ? "Access denied. You do not have permission to manage platform settings."
              : validationErrors ||
                result?.message ||
                `Request failed with HTTP ${response.status}.`;

        const requestError = new Error(message);
        requestError.status = response.status;
        throw requestError;
      }

      return result;
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error(
          "The request timed out. Please check the API server and try again."
        );
      }

      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  /* Load persisted settings. */
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSaved(false);
      setNotice("");

      const result = await request(PLATFORM_SETTINGS_URL);
      const data = extractSettings(result);

      setSettings((previous) => ({
        ...previous,
        ...mapSettings(data),
      }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = (key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setSaved(false);
    setError("");
    setNotice("");
  };

const handleSave = async () => {
  try {
    setSaving(true);
    setSaved(false);
    setError("");
    setNotice("");

    const platformName = String(settings.platformName || "").trim();
    const platformUrl = String(settings.platformUrl || "").trim();
    const timeout = Number(settings.requestTimeout);

    if (!platformName) {
      throw new Error("Platform name is required.");
    }

    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120) {
      throw new Error("Request timeout must be between 1 and 120 seconds.");
    }

    if (platformUrl) {
      let parsedUrl;

      try {
        parsedUrl = new URL(platformUrl);
      } catch {
        throw new Error("Please enter a valid platform URL.");
      }

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Platform URL must use HTTP or HTTPS.");
      }
    }

    const payload = {
      platform_name: platformName,
      platform_url: platformUrl || null,
      timezone: settings.timezone,
      language: settings.language,
      request_timeout: timeout,
      email_notifications: Boolean(settings.emailNotifications),
      webhook_notifications: Boolean(settings.webhookNotifications),
    };

    const result = await request(PLATFORM_SETTINGS_URL, {
      method: "PUT",
      body: JSON.stringify(payload),
      timeoutSeconds: timeout,
    });

    const responseData = extractSettings(result);

    if (Object.keys(responseData).length > 0) {
      setSettings((previous) => ({
        ...previous,
        ...mapSettings(responseData),
      }));
    }

    setSaved(true);
    setNotice(result?.message || "Platform settings saved successfully.");
  } catch (err) {
    setError(getErrorMessage(err));
  } finally {
    setSaving(false);
  }
};

  const tabs = [
    {
      id: "general",
      label: "General",
      description: "Platform identity and preferences",
      icon: Settings,
    },
    {
      id: "api",
      label: "API Configuration",
      description: "Endpoint and request behavior",
      icon: Server,
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Email and webhook preferences",
      icon: Bell,
    },
  ];

  const activeTabInfo = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const ActiveTabIcon = activeTabInfo.icon;

  const [copiedUrl, setCopiedUrl] = useState(false);
  const copyApiUrl = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(API_BASE_URL);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const renderInput = (label, key, placeholder, type = "text", hint, icon = null) => {
    const Icon = icon;
    return (
      <SettingsField key={key} label={label} id={key} hint={hint}>
        <div className="relative">
          {Icon && (
            <Icon
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          )}
          <input
            id={key}
            name={key}
            type={type}
            value={settings[key] ?? ""}
            placeholder={placeholder}
            disabled={loading || saving}
            autoComplete={key === "platformUrl" ? "url" : "off"}
            onChange={(event) => updateSetting(key, event.target.value)}
            className={`${inputClass} ${Icon ? "pl-10" : ""}`}
          />
        </div>
      </SettingsField>
    );
  };

  const renderSelect = (label, key, options, hint, icon = null) => {
    const Icon = icon;
    return (
      <SettingsField key={key} label={label} id={key} hint={hint}>
        <div className="relative">
          {Icon && (
            <Icon
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10"
            />
          )}
          <select
            id={key}
            name={key}
            value={settings[key] ?? ""}
            disabled={loading || saving}
            onChange={(event) => updateSetting(key, event.target.value)}
            className={`${inputClass} ${Icon ? "pl-10" : ""}`}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </SettingsField>
    );
  };

  const saveButton = (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving || loading}
      className={primaryButtonClass}
    >
      {saving ? (
        <LoaderCircle size={16} className="animate-spin" />
      ) : saved ? (
        <CheckCircle2 size={16} />
      ) : (
        <Save size={16} />
      )}
      {saving ? "Saving changes..." : saved ? "Saved" : "Save changes"}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50/80 px-3 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        {/* Deep Emerald Hero Header */}
        <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-800 p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10">
          {/* Ambient blurred glow blobs */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute right-1/4 -bottom-16 h-48 w-48 rounded-full bg-teal-400/15 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-200/80">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm border border-white/10">
                  <Settings size={13} className="text-emerald-300" />
                  System Administration
                </span>
                <span className="text-emerald-400/40">/</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-200 border border-emerald-500/30">
                  <SlidersHorizontal size={13} className="text-emerald-300" />
                  Global Preferences
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25">
                  <SlidersHorizontal size={28} className="stroke-[2.2]" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-white">
                    Platform Settings
                  </h1>
                  <p className="mt-1 text-sm text-emerald-100/80 max-w-xl">
                    Configure platform identity, API gateway connection timeouts, timezones, and enterprise event notification preferences.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={loadSettings}
                disabled={loading || saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white shadow-sm backdrop-blur transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                {loading ? "Reloading..." : "Reload"}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : saved ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Save size={16} />
                )}
                {saving ? "Saving..." : saved ? "Saved Successfully" : "Save Changes"}
              </button>
            </div>
          </div>
        </header>

        {/* Notifications */}
        {error && (
          <Notice
            message={error}
            onDismiss={() => setError("")}
            onRetry={loadSettings}
          />
        )}

        {saved && (
          <Notice
            type="success"
            message={notice || "Platform settings saved successfully."}
            onDismiss={() => {
              setSaved(false);
              setNotice("");
            }}
          />
        )}

        {/* Overview KPI Cards */}
        <section aria-label="Platform overview">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-600" />
              Platform Configuration Telemetry
            </h2>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Synchronized
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <PastelKpiCard
              title="Platform Identity"
              value={settings.platformName || "WabaBot Platform"}
              subtitle={settings.platformUrl || "Public domain configured"}
              pill="Active Brand"
              icon={Globe}
              theme="emerald"
              sparkline={[35, 45, 60, 70, 85, 92, 100]}
              loading={loading}
            />

            <PastelKpiCard
              title="API Gateway Guard"
              value={`${settings.requestTimeout}s Timeout`}
              subtitle={`Endpoint: ${API_BASE_URL.replace(/^https?:\/\//, "")}`}
              pill="Latency Threshold"
              icon={Server}
              theme="cyan"
              sparkline={[12, 18, 15, 20, 25, 28, 30]}
              loading={loading}
            />

            <PastelKpiCard
              title="Access & Security"
              value="Bearer Token Auth"
              subtitle={`${settings.language} · ${settings.timezone}`}
              pill="Secured Session"
              icon={ShieldCheck}
              theme="green"
              sparkline={[90, 92, 94, 96, 98, 99, 100]}
              loading={loading}
            />
          </div>
        </section>

        {/* Settings workspace */}
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/20 px-6 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeading
                icon={SlidersHorizontal}
                title="Configuration Console"
                description="Select a category to customize platform variables, endpoints, and event listeners."
              />
              <span className="inline-flex items-center text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm w-fit">
                Editing: <span className="text-emerald-700 font-bold ml-1">{activeTabInfo.label}</span>
              </span>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
            {/* Navigation sidebar on desktop; scrollable tabs on mobile */}
            <aside className="min-w-0 border-b border-slate-200/80 bg-slate-50/50 p-4 lg:border-b-0 lg:border-r lg:p-5">
              <p className="hidden px-3 pb-3 pt-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 lg:block">
                Navigation Categories
              </p>

              <nav
                aria-label="Settings categories"
                className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`group relative flex min-w-max flex-1 items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 lg:min-w-0 lg:flex-none ${
                        isActive
                          ? "border-emerald-300 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent text-emerald-950 shadow-sm font-semibold"
                          : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105"
                            : "bg-white text-slate-500 border border-slate-200 group-hover:text-emerald-700 group-hover:border-emerald-200"
                        }`}
                      >
                        <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block whitespace-nowrap text-sm font-bold">
                          {tab.label}
                        </span>
                        <span
                          className={`mt-0.5 hidden text-xs leading-4 lg:block ${
                            isActive ? "text-emerald-700 font-medium" : "text-slate-500"
                          }`}
                        >
                          {tab.description}
                        </span>
                      </span>

                      {isActive && (
                        <div className="hidden lg:flex items-center">
                          <span className="h-6 w-1 rounded-full bg-emerald-600 mr-1" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-4 lg:block">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  Configuration Safety
                </div>
                <p className="mt-1.5 text-xs leading-5 text-emerald-900/70">
                  Changes are validated and committed directly to the central Laravel API database.
                </p>
              </div>
            </aside>

            {/* Active settings panel */}
            <div className="min-w-0 flex flex-col justify-between">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/30 px-6 py-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200/50 shadow-sm">
                    <ActiveTabIcon size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {activeTabInfo.label}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {activeTabInfo.description}
                    </p>
                  </div>
                </div>

                {saved ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    All changes saved
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
                    Configuration active
                  </span>
                )}
              </div>

              {/* General */}
              {activeTab === "general" && (
                <div>
                  <div className="p-6 sm:p-8 space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Platform Identity &amp; Region
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Set the platform brand identity, public production URL, and regional defaults.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      {renderInput(
                        "Platform name",
                        "platformName",
                        "Enter platform name",
                        "text",
                        "Choose a clear name for your workflow platform.",
                        Globe
                      )}

                      {renderInput(
                        "Platform URL",
                        "platformUrl",
                        "https://example.com",
                        "url",
                        "Use your public HTTPS URL in production.",
                        Link2
                      )}

                      {renderSelect(
                        "Timezone",
                        "timezone",
                        [
                          {
                            value: "Asia/Kolkata",
                            label: "India Standard Time (Asia/Kolkata)",
                          },
                          { value: "UTC", label: "UTC" },
                          {
                            value: "America/New_York",
                            label: "America/New_York",
                          },
                          {
                            value: "Europe/London",
                            label: "Europe/London",
                          },
                        ],
                        "Used as the preferred platform timezone.",
                        Clock3
                      )}

                      {renderSelect(
                        "Default language",
                        "language",
                        [
                          { value: "English", label: "English" },
                          { value: "Hindi", label: "Hindi" },
                        ],
                        "Select the default language preference.",
                        Languages
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/50 p-6">
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <Globe
                        size={18}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />
                      <p className="text-xs leading-5 text-slate-600">
                        <strong className="text-slate-800 font-semibold">Domain Propagation:</strong> Ensure the platform URL matches your deployed domain and CORS configuration so bot webhooks route correctly.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* API configuration */}
              {activeTab === "api" && (
                <div>
                  <div className="p-6 sm:p-8 space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Connection &amp; Gateway Settings
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Review the configured API endpoint and adjust maximum client network timeouts.
                      </p>
                    </div>

                    <SettingsField
                      label="API base URL"
                      id="apiBaseUrl"
                      hint="Configured through VITE_API_URL in your frontend environment. Restart Vite after changing environment variables."
                    >
                      <div className="relative">
                        <Link2
                          size={17}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="apiBaseUrl"
                          type="url"
                          value={API_BASE_URL}
                          readOnly
                          className={`${inputClass} bg-slate-50 pl-10 pr-24 font-mono text-xs`}
                        />
                        <button
                          type="button"
                          onClick={copyApiUrl}
                          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-700"
                        >
                          {copiedUrl ? (
                            <>
                              <Check size={13} className="text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </SettingsField>

                    {renderSelect(
                      "Request timeout",
                      "requestTimeout",
                      [
                        { value: "10", label: "10 seconds (Strict)" },
                        { value: "30", label: "30 seconds (Default recommended)" },
                        { value: "60", label: "60 seconds (Extended operations)" },
                        { value: "120", label: "120 seconds (High latency fallback)" },
                      ],
                      "Maximum time the client helper will wait before aborting pending API requests.",
                      Clock3
                    )}

                    <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white p-5 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm border border-emerald-100">
                          <Server size={22} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-extrabold text-emerald-950">
                              API Gateway Request Behavior
                            </h3>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              <Zap size={12} /> Active Gateway
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs sm:text-sm leading-6 text-emerald-900/80">
                            The selected timeout is enforced by client-side HTTP dispatchers. The Laravel API backend also enforces independent middleware limits and rate throttles.
                          </p>
                          <div className="mt-3.5 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm">
                              <Clock3 size={14} className="text-emerald-600" />
                              Active Timeout: {settings.requestTimeout}s
                            </div>
                            <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/60 bg-white/60 px-3 py-1.5 text-xs font-medium text-slate-600">
                              Protocol: HTTP / JSON REST
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                      <div className="flex items-start gap-3.5">
                        <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Authentication &amp; Session Protection
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Requests automatically attach Bearer token authorization headers. All configuration modifications are verified against Laravel platform permissions.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeTab === "notifications" && (
                <div>
                  <div className="p-6 sm:p-8 space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Event Notification Channels
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Control global delivery channels for system alerts, errors, and webhook dispatches.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <ToggleRow
                        icon={Mail}
                        label="Email notifications"
                        description="Send critical system alerts, failure summaries, and transaction notices to administrator emails."
                        checked={settings.emailNotifications}
                        onChange={(value) =>
                          updateSetting("emailNotifications", value)
                        }
                        disabled={loading || saving}
                      />

                      <ToggleRow
                        icon={Zap}
                        label="Webhook notifications"
                        description="Dispatch real-time HTTP webhooks on workflow execution events, failures, and quota thresholds."
                        checked={settings.webhookNotifications}
                        onChange={(value) =>
                          updateSetting("webhookNotifications", value)
                        }
                        disabled={loading || saving}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/50 p-6">
                    <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
                        <Info size={18} />
                      </div>
                      <p className="text-xs leading-5 text-slate-600">
                        <strong className="text-slate-800 font-semibold">Service note:</strong> These switches manage global preference flags. Actual email dispatch and webhook delivery execute asynchronously through Laravel queue workers.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Panel footer */}
              <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  Persisted securely to Laravel central database.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={loadSettings}
                    disabled={loading || saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw
                      size={15}
                      className={loading ? "animate-spin" : ""}
                    />
                    Discard / Reload
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
                  >
                    {saving ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : saved ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-2 border-t border-slate-200/80 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            Platform configuration · Synchronized with Laravel API
          </p>
          <p className="flex items-center gap-1.5 font-medium">
            <Languages size={14} className="text-slate-400" />
            {settings.language} · {settings.timezone}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default PlatformSettings;
