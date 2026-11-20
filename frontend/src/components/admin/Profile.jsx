import React, { useCallback, useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  Eye,
  EyeOff,
  Sparkles,
  CircleUserRound,
  KeyRound,
  ChevronRight,
  SlidersHorizontal,
  Fingerprint,
  Check,
  Building2,
  Clock,
  ArrowRight,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* API CONFIGURATION & HELPERS                                                */
/* -------------------------------------------------------------------------- */

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const getToken = () => {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("auth_token") ||
      sessionStorage.getItem("access_token")
    );
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/* STYLES & SUBCOMPONENTS                                                     */
/* -------------------------------------------------------------------------- */

const inputClass =
  "block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 shadow-2xs";

const labelClass =
  "block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5";

function NotificationAlert({ type = "error", message, onDismiss }) {
  if (!message) return null;

  const isSuccess = type === "success";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={`mb-6 flex items-start gap-3.5 rounded-2xl border p-4 shadow-sm transition-all duration-200 ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
          : "border-rose-200 bg-rose-50/90 text-rose-900"
      }`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          isSuccess
            ? "bg-emerald-100 text-emerald-700"
            : "bg-rose-100 text-rose-700"
        }`}
      >
        {isSuccess ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {isSuccess ? "Success" : "Action Required"}
        </p>
        <p className="mt-0.5 text-xs sm:text-sm leading-relaxed opacity-90">
          {message}
        </p>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 text-current opacity-60 transition hover:bg-black/5 hover:opacity-100"
          aria-label="Dismiss notice"
        >
          <span className="text-lg leading-none">&times;</span>
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN PROFILE COMPONENT                                                     */
/* -------------------------------------------------------------------------- */

export default function Profile() {
  const [activeTab, setActiveTab] = useState("personal"); // "personal" | "security" | "all"

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const storedUser = getStoredUser();
  const roleName = storedUser?.role_name || (storedUser?.role === "super_admin" ? "Super Admin" : "Client");

  /* API Request Wrapper */
  const request = useCallback(async (path, options = {}) => {
    const token = getToken();

    const headers = {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    let response;

    try {
      response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
      });
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error("The request was cancelled. Please try again.");
      }

      throw new Error(
        "Unable to connect to the server. Please check your network connection."
      );
    }

    const raw = await response.text();
    let result = {};

    if (raw) {
      try {
        result = JSON.parse(raw);
      } catch {
        if (response.ok) {
          throw new Error("Received an invalid response from the server.");
        }
      }
    }

    if (!response.ok || result.success === false) {
      if (response.status === 422 && result.errors) {
        const firstError = Object.values(result.errors).flat()[0];
        throw new Error(firstError || "Please check the entered details.");
      }

      if (response.status === 401) {
        throw new Error("Your login session has expired. Please log in again.");
      }

      if (response.status === 403) {
        throw new Error("You do not have permission to perform this action.");
      }

      throw new Error(result.message || `Request failed (${response.status}).`);
    }

    return result;
  }, []);

  /* Load Profile Info */
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await request("/profile");

      const user =
        result.data?.user ??
        result.user ??
        result.data ??
        result;

      if (!user || typeof user !== "object" || Array.isArray(user)) {
        throw new Error("The profile data format is invalid.");
      }

      setForm({
        name: user.name ?? "",
        email: user.email ?? "",
        mobile: user.mobile ?? user.phone ?? "",
      });
    } catch (err) {
      setError(err.message || "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* Handle Profile Inputs */
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  /* Handle Profile Save */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || loading) return;

    const name = form.name.trim();
    const email = form.email.trim();
    const mobile = form.mobile.trim();

    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      setError("Mobile number must contain exactly 10 digits.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result = await request("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          name,
          email: email || null,
          mobile,
        }),
      });

      const user =
        result.data?.user ??
        result.user ??
        result.data;

      if (user && typeof user === "object" && !Array.isArray(user)) {
        setForm({
          name: user.name ?? name,
          email: user.email ?? email,
          mobile: user.mobile ?? user.phone ?? mobile,
        });

        // Update local storage so Header reflects name immediately
        try {
          const currentStored = getStoredUser() || {};
          const updated = {
            ...currentStored,
            name: user.name ?? name,
            email: user.email ?? email,
            mobile: user.mobile ?? mobile,
          };
          localStorage.setItem("user", JSON.stringify(updated));
          window.dispatchEvent(new Event("user-updated"));
        } catch {}
      }

      setSuccess(result.message || "Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  /* Handle Password Inputs */
  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  };

  /* Handle Password Submit */
  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (changingPassword) return;

    const {
      current_password,
      password,
      password_confirmation,
    } = passwordForm;

    if (!current_password || !password || !password_confirmation) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (password.length < 8) {
      setPasswordError("New password must contain at least 8 characters.");
      return;
    }

    if (password !== password_confirmation) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    if (current_password === password) {
      setPasswordError("New password must be different from the current password.");
      return;
    }

    setChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const result = await request("/change-password", {
        method: "PUT",
        body: JSON.stringify(passwordForm),
      });

      setPasswordSuccess(result.message || "Password updated successfully.");

      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      setPasswordError(err.message || "Unable to update password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const displayName = form.name.trim() || storedUser?.name || "Abhishek";
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
    : "U";

  return (
    <main className="min-h-screen bg-slate-50/70 px-3 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-[1320px] space-y-6">

        {/* ------------------------------------------------------------------ */}
        {/* HERO BANNER & TABS                                                 */}
        {/* ------------------------------------------------------------------ */}
        <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10">
          {/* Ambient blurred glow blobs */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute right-1/4 -bottom-16 h-48 w-48 rounded-full bg-teal-400/15 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-200/90">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm border border-white/10">
                  <CircleUserRound size={13} className="text-emerald-300" />
                  Account Center
                </span>
                <span className="text-emerald-400/40">/</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200 border border-emerald-500/30">
                  <Sparkles size={13} className="text-emerald-300" />
                  Profile & Security
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-13 w-13 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25">
                  <User size={26} className="stroke-[2.2]" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    My Profile & Credentials
                  </h1>
                  <p className="mt-0.5 text-xs sm:text-sm text-emerald-100/80">
                    Manage your personal identity, contact credentials, and login security preferences.
                  </p>
                </div>
              </div>
            </div>

            {/* Right quick actions & status */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3.5 py-2 backdrop-blur-md text-xs font-semibold text-emerald-100">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span>Active Account</span>
              </div>

              <button
                type="button"
                onClick={loadProfile}
                disabled={loading || saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 backdrop-blur-md text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Navigation Tab Switcher */}
          <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === "personal"
                  ? "bg-white text-emerald-950 shadow-md shadow-black/10"
                  : "bg-white/10 text-white/90 hover:bg-white/15 hover:text-white"
              }`}
            >
              <User size={15} />
              <span>Personal Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === "security"
                  ? "bg-white text-emerald-950 shadow-md shadow-black/10"
                  : "bg-white/10 text-white/90 hover:bg-white/15 hover:text-white"
              }`}
            >
              <LockKeyhole size={15} />
              <span>Security & Password</span>
              {passwordSuccess && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === "all"
                  ? "bg-white text-emerald-950 shadow-md shadow-black/10"
                  : "bg-white/10 text-white/90 hover:bg-white/15 hover:text-white"
              }`}
            >
              <SlidersHorizontal size={15} />
              <span>View All</span>
            </button>
          </div>
        </header>

        {/* Alerts */}
        <NotificationAlert
          type="error"
          message={error}
          onDismiss={() => setError("")}
        />

        <NotificationAlert
          type="success"
          message={success}
          onDismiss={() => setSuccess("")}
        />

        {/* ------------------------------------------------------------------ */}
        {/* MAIN TWO-COLUMN LAYOUT                                             */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">

          {/* LEFT COLUMN: IDENTITY & ACCOUNT SUMMARY                           */}
          <aside className="min-w-0 lg:col-span-4 space-y-6">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md">
              {/* Decorative Banner Header */}
              <div className="relative h-28 bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-800">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
                <div className="flex h-full items-start justify-end p-3.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/20 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md shadow-2xs">
                    <ShieldCheck size={13} />
                    {roleName}
                  </span>
                </div>
              </div>

              <div className="px-5 pb-6 sm:px-6">
                {/* Avatar with Status Ring */}
                <div className="relative -mt-12 flex items-center justify-between">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-black text-white shadow-md">
                    {loading ? (
                      <RefreshCw className="h-6 w-6 animate-spin text-white" />
                    ) : (
                      initials
                    )}
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-2xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                  </div>

                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
                      <CheckCircle2 size={12} />
                      Verified
                    </span>
                  </div>
                </div>

                {/* User Name & Email */}
                <div className="mt-4">
                  <h2 className="truncate text-lg font-black tracking-tight text-slate-900">
                    {loading ? "Loading..." : displayName}
                  </h2>
                  <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                    {form.email || "No email address linked"}
                  </p>
                </div>

                {/* Badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    <CircleUserRound size={13} className="text-slate-400" />
                    {roleName} Account
                  </span>
                  {form.mobile && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                      <Phone size={13} className="text-emerald-600" />
                      +91 {form.mobile}
                    </span>
                  )}
                </div>

                <div className="my-5 border-t border-slate-100" />

                {/* Quick Navigation Links */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Quick Jump
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("personal")}
                    className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                      activeTab === "personal"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <User size={15} className={activeTab === "personal" ? "text-emerald-700" : "text-slate-400"} />
                      <span>Personal Information</span>
                    </span>
                    <ChevronRight size={14} className={activeTab === "personal" ? "text-emerald-700" : "text-slate-400"} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("security")}
                    className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                      activeTab === "security"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <LockKeyhole size={15} className={activeTab === "security" ? "text-emerald-700" : "text-slate-400"} />
                      <span>Security & Password</span>
                    </span>
                    <ChevronRight size={14} className={activeTab === "security" ? "text-emerald-700" : "text-slate-400"} />
                  </button>
                </div>

                {/* Account Security Box */}
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">
                        Account Security Protected
                      </p>
                      <p className="mt-0.5 text-[11px] leading-4 text-emerald-800/80">
                        Your profile is active. Keep your credentials safe to protect your WhatsApp bot campaigns & logs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Security Tips Card */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-600" />
                Security Guidelines
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Never share your password or session auth tokens with anyone.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Use at least 8 characters with a mix of numbers and letters.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Always sign out when using shared office computers.</span>
                </li>
              </ul>
            </div>
          </aside>

          {/* RIGHT COLUMN: FORMS                                                */}
          <div className="min-w-0 lg:col-span-8 space-y-6">

            {/* 1. PERSONAL INFORMATION SECTION */}
            {(activeTab === "personal" || activeTab === "all") && (
              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm transition hover:shadow-md">
                {/* Heading */}
                <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 border border-emerald-200/60 shadow-2xs">
                      <User size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Personal Information
                      </h2>
                      <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                        Update your full name, primary WhatsApp phone number, and official email address.
                      </p>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="flex min-h-60 flex-col items-center justify-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Loading profile details...</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      {/* Full Name */}
                      <div className="min-w-0">
                        <label htmlFor="profile-name" className={labelClass}>
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative mt-1">
                          <User
                            size={16}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            id="profile-name"
                            name="name"
                            type="text"
                            value={form.name}
                            onChange={handleChange}
                            required
                            maxLength={255}
                            disabled={saving}
                            placeholder="e.g. Abhishek Kumar"
                            className={inputClass}
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-400">
                          Appears across your portal, reports, and generated estimates.
                        </p>
                      </div>

                      {/* Mobile Number with Flag */}
                      <div className="min-w-0">
                        <label htmlFor="profile-mobile" className={labelClass}>
                          Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative mt-1 flex rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition">
                          <span className="inline-flex items-center gap-1.5 border-r border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 select-none">
                            <span className="text-base leading-none">🇮🇳</span>
                            <span>+91</span>
                          </span>
                          <div className="relative flex-1">
                            <Phone
                              size={15}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              id="profile-mobile"
                              name="mobile"
                              type="tel"
                              value={form.mobile}
                              onChange={handleChange}
                              required
                              maxLength={10}
                              pattern="[0-9]{10}"
                              inputMode="numeric"
                              disabled={saving}
                              placeholder="9876543210"
                              className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-400">
                          10-digit number for SMS alerts and WhatsApp account verification.
                        </p>
                      </div>

                      {/* Email Address */}
                      <div className="min-w-0 md:col-span-2">
                        <label htmlFor="profile-email" className={labelClass}>
                          Email Address
                        </label>
                        <div className="relative mt-1">
                          <Mail
                            size={16}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            id="profile-email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            maxLength={255}
                            disabled={saving}
                            placeholder="you@example.com"
                            className={inputClass}
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-400">
                          Used for invoices, payment receipts, and security announcements.
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Sparkles size={14} className="text-emerald-600 shrink-0" />
                        <span>Changes take effect immediately across all panels.</span>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={loadProfile}
                          disabled={loading || saving}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
                        >
                          <RefreshCw size={14} />
                          <span>Reset</span>
                        </button>

                        <button
                          type="submit"
                          disabled={loading || saving}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 active:scale-95 transition disabled:opacity-50"
                        >
                          {saving ? (
                            <RefreshCw size={15} className="animate-spin" />
                          ) : (
                            <Save size={15} />
                          )}
                          <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </section>
            )}

            {/* 2. SECURITY & PASSWORD SECTION */}
            {(activeTab === "security" || activeTab === "all") && (
              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm transition hover:shadow-md">
                {/* Heading */}
                <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 border border-emerald-200/60 shadow-2xs">
                      <LockKeyhole size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Change Password
                      </h2>
                      <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                        Update your login credentials regularly to maintain strong security.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <NotificationAlert
                    type="error"
                    message={passwordError}
                    onDismiss={() => setPasswordError("")}
                  />

                  <NotificationAlert
                    type="success"
                    message={passwordSuccess}
                    onDismiss={() => setPasswordSuccess("")}
                  />

                  <form onSubmit={handlePasswordSubmit} className="space-y-5">
                    {/* Current Password */}
                    <div className="min-w-0">
                      <label htmlFor="current_password" className={labelClass}>
                        Current Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative mt-1">
                        <LockKeyhole
                          size={16}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="current_password"
                          name="current_password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordForm.current_password}
                          onChange={handlePasswordChange}
                          required
                          autoComplete="current-password"
                          disabled={changingPassword}
                          placeholder="Enter your current password"
                          className={`${inputClass} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                          aria-label="Toggle current password visibility"
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      {/* New Password */}
                      <div className="min-w-0">
                        <label htmlFor="new_password" className={labelClass}>
                          New Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative mt-1">
                          <LockKeyhole
                            size={16}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            id="new_password"
                            name="password"
                            type={showNewPassword ? "text" : "password"}
                            value={passwordForm.password}
                            onChange={handlePasswordChange}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            disabled={changingPassword}
                            placeholder="Minimum 8 characters"
                            className={`${inputClass} pr-11`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                            aria-label="Toggle new password visibility"
                          >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <p
                          className={`mt-1.5 text-[11px] font-semibold transition ${
                            passwordForm.password.length >= 8
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }`}
                        >
                          {passwordForm.password.length >= 8
                            ? "✓ Minimum 8 characters satisfied"
                            : "Must contain at least 8 characters"}
                        </p>
                      </div>

                      {/* Confirm New Password */}
                      <div className="min-w-0">
                        <label htmlFor="password_confirmation" className={labelClass}>
                          Confirm New Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative mt-1">
                          <LockKeyhole
                            size={16}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            id="password_confirmation"
                            name="password_confirmation"
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordForm.password_confirmation}
                            onChange={handlePasswordChange}
                            required
                            autoComplete="new-password"
                            disabled={changingPassword}
                            placeholder="Repeat new password"
                            className={`${inputClass} pr-11`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                            aria-label="Toggle confirm password visibility"
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <p
                          className={`mt-1.5 text-[11px] font-semibold transition ${
                            passwordForm.password &&
                            passwordForm.password_confirmation &&
                            passwordForm.password === passwordForm.password_confirmation
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }`}
                        >
                          {passwordForm.password &&
                          passwordForm.password_confirmation &&
                          passwordForm.password === passwordForm.password_confirmation
                            ? "✓ Passwords match"
                            : "Must match new password"}
                        </p>
                      </div>
                    </div>

                    {/* Notice Card */}
                    <div className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-2xs border border-slate-200/60">
                        <KeyRound size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800">
                          Password Security & Session Notice
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                          Your current password is required for verification. You will remain logged in on this active browser session after changing your password.
                        </p>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex items-center justify-end border-t border-slate-100 pt-6">
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 active:scale-95 transition disabled:opacity-50"
                      >
                        {changingPassword ? (
                          <RefreshCw size={15} className="animate-spin" />
                        ) : (
                          <KeyRound size={15} />
                        )}
                        <span>
                          {changingPassword ? "Updating Password..." : "Update Password"}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            )}

          </div>
        </div>

      </div>
    </main>
  );
}
