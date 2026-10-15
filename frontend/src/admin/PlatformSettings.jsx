
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
} from "lucide-react";

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
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const labelClass = "block text-sm font-semibold text-slate-700";

const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50";

/* -------------------------------------------------------------------------- */
/* REUSABLE COMPONENTS                                                        */
/* -------------------------------------------------------------------------- */

const SectionHeading = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
      <Icon size={20} strokeWidth={1.8} />
    </div>

    <div className="min-w-0">
      <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
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
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : info
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-rose-200 bg-rose-50 text-rose-900";

  const Icon = success ? CheckCircle2 : info ? Info : AlertCircle;

  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-2xl border p-4 ${styles}`}
    >
      <Icon size={19} className="mt-0.5 shrink-0" />

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
    {children}
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
  <div className="flex items-start justify-between gap-4 py-5">
    <div className="flex min-w-0 items-start gap-3">
      {Icon && (
        <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600">
          <Icon size={17} />
        </div>
      )}

      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
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
      className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-emerald-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
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

  const renderInput = (label, key, placeholder, type = "text", hint) => (
    <SettingsField key={key} label={label} id={key} hint={hint}>
      <input
        id={key}
        name={key}
        type={type}
        value={settings[key] ?? ""}
        placeholder={placeholder}
        disabled={loading || saving}
        autoComplete={key === "platformUrl" ? "url" : "off"}
        onChange={(event) => updateSetting(key, event.target.value)}
        className={inputClass}
      />
    </SettingsField>
  );

  const renderSelect = (label, key, options, hint) => (
    <SettingsField key={key} label={label} id={key} hint={hint}>
      <select
        id={key}
        name={key}
        value={settings[key] ?? ""}
        disabled={loading || saving}
        onChange={(event) => updateSetting(key, event.target.value)}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </SettingsField>
  );

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
        {/* Page header */}
        <header className="relative isolate min-h-[120px] w-full rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
              <span>Administration</span>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="text-emerald-700">Platform settings</span>
            </div>

            <div className="flex items-start gap-3">
              <div className="hidden rounded-2xl bg-emerald-100 p-3.5 text-emerald-700 sm:block">
                <Settings size={25} strokeWidth={1.8} />
              </div>

              <div>
                 <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-emerald-950 sm:text-3xl mt-2">
                   Platform Settings
                  </h1>
             
               
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadSettings}
              disabled={loading || saving}
              className={secondaryButtonClass}
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Reload
            </button>
            {saveButton}
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

        {/* Overview cards */}
        <section aria-label="Platform overview">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Configuration overview
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Platform preferences
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <OverviewCard
              icon={Globe}
              title="Platform identity"
              value={settings.platformName || "Not configured"}
              description="Name used to identify your platform."
              iconClass="bg-emerald-50 text-emerald-700"
            />

            <OverviewCard
              icon={Server}
              title="API connection"
              value="Laravel API"
              description="Settings are loaded and saved through your API endpoint."
              iconClass="bg-slate-100 text-slate-700"
            />

            <OverviewCard
              icon={ShieldCheck}
              title="Authentication"
              value="Bearer token"
              description="API requests use the available login token."
              iconClass="bg-amber-50 text-amber-700"
            />
          </div>
        </section>

        {/* Settings workspace */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
            <SectionHeading
              icon={SlidersHorizontal}
              title="Settings workspace"
              description="Select a category to manage the corresponding preferences."
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* Navigation sidebar on desktop; scrollable tabs on mobile */}
            <aside className="min-w-0 border-b border-slate-200 bg-slate-50/60 p-3 lg:border-b-0 lg:border-r lg:p-4">
              <p className="hidden px-3 pb-3 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 lg:block">
                Settings menu
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
                      className={`flex min-w-max flex-1 items-center gap-3 rounded-xl border px-3 py-3 text-left transition lg:min-w-0 lg:flex-none ${
                        isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm"
                          : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isActive
                            ? "bg-white text-emerald-700"
                            : "bg-white text-slate-500"
                        }`}
                      >
                        <Icon size={18} />
                      </span>

                      <span className="min-w-0">
                        <span className="block whitespace-nowrap text-sm font-semibold">
                          {tab.label}
                        </span>
                        <span
                          className={`mt-0.5 hidden text-xs leading-5 lg:block ${
                            isActive ? "text-emerald-700/80" : "text-slate-500"
                          }`}
                        >
                          {tab.description}
                        </span>
                      </span>

                      {isActive && (
                        <ChevronRight
                          size={16}
                          className="ml-auto hidden shrink-0 lg:block"
                        />
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-5 hidden rounded-xl border border-emerald-100 bg-white p-4 lg:block">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <ShieldCheck size={17} className="text-emerald-600" />
                  Configuration safety
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Changes are sent to the Laravel API. Keep authentication
                  and server-side validation enabled.
                </p>
              </div>
            </aside>

            {/* Active settings panel */}
            <div className="min-w-0">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                    <ActiveTabIcon size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">
                      {activeTabInfo.label}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {activeTabInfo.description}
                    </p>
                  </div>
                </div>

                {saved && (
                  <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 sm:self-center">
                    <CircleCheck size={14} />
                    Changes saved
                  </span>
                )}
              </div>

              {/* General */}
              {activeTab === "general" && (
                <div>
                  <div className="px-4 py-5 sm:px-6 sm:py-6">
                    <div className="mb-5">
                      <h3 className="text-sm font-bold text-slate-900">
                        Platform identity
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Set the name and public URL used for this installation.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      {renderInput(
                        "Platform name",
                        "platformName",
                        "Enter platform name",
                        "text",
                        "Choose a clear name for your workflow platform."
                      )}

                      {renderInput(
                        "Platform URL",
                        "platformUrl",
                        "https://example.com",
                        "url",
                        "Use your public HTTPS URL in production."
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
                        "Used as the preferred platform timezone."
                      )}

                      {renderSelect(
                        "Default language",
                        "language",
                        [
                          { value: "English", label: "English" },
                          { value: "Hindi", label: "Hindi" },
                        ],
                        "Select the default language preference."
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
                    <div className="flex items-start gap-2.5">
                      <Globe
                        size={17}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />
                      <p className="text-xs leading-5 text-slate-500">
                        Ensure the platform URL matches your deployed domain
                        and your server's trusted URL configuration.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* API configuration */}
              {activeTab === "api" && (
                <div>
                  <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Connection settings
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Review the configured API endpoint and request timeout.
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
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="apiBaseUrl"
                          type="url"
                          value={API_BASE_URL}
                          readOnly
                          className={`${inputClass} bg-slate-50 pl-10`}
                        />
                      </div>
                    </SettingsField>

                    {renderSelect(
                      "Request timeout",
                      "requestTimeout",
                      [
                        { value: "10", label: "10 seconds" },
                        { value: "30", label: "30 seconds" },
                        { value: "60", label: "60 seconds" },
                        { value: "120", label: "120 seconds" },
                      ],
                      "Maximum time the settings request helper will wait before aborting a request."
                    )}

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-white p-2.5 text-emerald-700 shadow-sm">
                          <Server size={19} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-emerald-950">
                            API request behavior
                          </h3>
                          <p className="mt-1.5 text-sm leading-6 text-emerald-900/80">
                            The selected timeout is used by the settings
                            load/save request helper. The Laravel backend
                            should still enforce its own timeout and validation
                            rules.
                          </p>
                          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800">
                            <Clock3 size={14} />
                            Selected timeout: {settings.requestTimeout} seconds
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck
                          size={19}
                          className="mt-0.5 shrink-0 text-slate-500"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Authentication and access
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Requests include the stored Bearer token when
                            available. Protect settings routes with Laravel
                            authentication and authorization middleware.
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
                  <div className="px-4 py-5 sm:px-6 sm:py-6">
                    <div className="mb-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Notification preferences
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Select which platform notification channels are enabled.
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                      <ToggleRow
                        icon={Bell}
                        label="Email notifications"
                        description="Enable the platform preference for email notifications."
                        checked={settings.emailNotifications}
                        onChange={(value) =>
                          updateSetting("emailNotifications", value)
                        }
                        disabled={loading || saving}
                      />

                      <ToggleRow
                        icon={MessageCircle}
                        label="Webhook notifications"
                        description="Enable the platform preference for webhook event notifications."
                        checked={settings.webhookNotifications}
                        onChange={(value) =>
                          updateSetting("webhookNotifications", value)
                        }
                        disabled={loading || saving}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
                    <div className="flex items-start gap-2.5">
                      <Info
                        size={17}
                        className="mt-0.5 shrink-0 text-slate-500"
                      />
                      <p className="text-xs leading-5 text-slate-500">
                        These switches save notification preferences. Actual
                        email delivery and webhook dispatch must be implemented
                        by your backend notification services.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Panel footer */}
              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs leading-5 text-slate-500">
                  Changes are persisted through your Laravel API.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={loadSettings}
                    disabled={loading || saving}
                    className={secondaryButtonClass}
                  >
                    <RotateCcw
                      size={15}
                      className={loading ? "animate-spin" : ""}
                    />
                    Discard / reload
                  </button>

                  {saveButton}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-2 border-t border-slate-200/80 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            Platform configuration
          </p>
          <p className="flex items-center gap-1.5">
            <Languages size={14} />
            {settings.language} · {settings.timezone}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default PlatformSettings;
