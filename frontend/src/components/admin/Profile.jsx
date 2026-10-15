
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
  ArrowRight,
  Fingerprint,
  ShieldCheck as SecurityIcon,
  Sparkles,
  CircleUserRound,
  KeyRound,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
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

function AlertMessage({ type = "error", message, onDismiss }) {
  if (!message) return null;

  const success = type === "success";

  return (
    <div
      role={success ? "status" : "alert"}
      aria-live={success ? "polite" : "assertive"}
      className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 ${
        success
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-rose-200 bg-rose-50/80 text-rose-800"
      }`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          success ? "bg-emerald-100" : "bg-rose-100"
        }`}
      >
        {success ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {success ? "All done!" : "Something needs attention"}
        </p>
        <p className="mt-1 break-words text-sm leading-5 opacity-90">
          {message}
        </p>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 text-current opacity-60 transition hover:bg-black/5 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="mb-6 flex items-start gap-3.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
        <Icon className="h-5 w-5" />
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
}

const inputClass =
  "block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const passwordInputClass =
  "block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50";

const labelClass =
  "mb-2 block text-sm font-semibold text-slate-700";

function Field({ id, label, icon: Icon, hint, children }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>

      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        {children}
      </div>

      {hint && (
        <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function PrimaryButton({
  children,
  loading = false,
  disabled = false,
  type = "submit",
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-900/10 transition duration-200 hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-900/10 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
    >
      {loading ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {children}
    </button>
  );
}

export default function Profile() {
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

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
        throw new Error("Request cancel ho gayi. Dobara try karein.");
      }

      throw new Error(
        "Server se connection nahi ho pa raha. API URL aur backend server check karein."
      );
    }

    const raw = await response.text();
    let result = {};

    if (raw) {
      try {
        result = JSON.parse(raw);
      } catch {
        if (response.ok) {
          throw new Error("Server se invalid response mila.");
        }
      }
    }

    if (!response.ok || result.success === false) {
      if (response.status === 422 && result.errors) {
        const firstError = Object.values(result.errors).flat()[0];
        throw new Error(firstError || "Please check the entered details.");
      }

      if (response.status === 401) {
        throw new Error(
          "Login session expire ho gaya. Dobara login karein."
        );
      }

      if (response.status === 403) {
        throw new Error("Aapko is action ki permission nahi hai.");
      }

      throw new Error(
        result.message || `Request failed (${response.status}).`
      );
    }

    return result;
  }, []);

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
        throw new Error("Profile data ka format sahi nahi hai.");
      }

      setForm({
        name: user.name ?? "",
        email: user.email ?? "",
        mobile: user.mobile ?? user.phone ?? "",
      });
    } catch (err) {
      setError(err.message || "Profile load nahi ho saka.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

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
      setError("Mobile number exactly 10 digits ka hona chahiye.");
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
        setForm((current) => ({
          name: user.name ?? current.name,
          email: user.email ?? current.email,
          mobile: user.mobile ?? user.phone ?? current.mobile,
        }));
      } else {
        setForm({ name, email, mobile });
      }

      setSuccess(result.message || "Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Profile update nahi ho saka.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  };

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
      setPasswordError(
        "New password kam se kam 8 characters ka hona chahiye."
      );
      return;
    }

    if (password !== password_confirmation) {
      setPasswordError(
        "New password aur confirm password match nahi karte."
      );
      return;
    }

    if (current_password === password) {
      setPasswordError(
        "New password current password se alag hona chahiye."
      );
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

      setPasswordSuccess(
        result.message || "Password updated successfully."
      );

      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });

      setShowPasswords(false);
    } catch (err) {
      setPasswordError(
        err.message || "Password update nahi ho saka."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const displayName = form.name.trim() || "Your Name";
  const initials = form.name.trim()
    ? form.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
    : "U";

  const passwordFields = [
    {
      name: "current_password",
      label: "Current password",
      placeholder: "Enter your current password",
      autoComplete: "current-password",
    },
    {
      name: "password",
      label: "New password",
      placeholder: "Create a strong new password",
      autoComplete: "new-password",
    },
    {
      name: "password_confirmation",
      label: "Confirm new password",
      placeholder: "Enter your new password again",
      autoComplete: "new-password",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Page heading */}
         <header className="relative isolate min-h-[160px] w-full rounded-2xl border border-emerald-100 bg-white shadow-sm mb-8">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Account settings
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              My Profile
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              Manage your personal information and keep your account secure.
            </p>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white px-3.5 py-2 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-slate-600">
              Account settings
            </span>
          </div>
        </header>

        <AlertMessage
          type="error"
          message={error}
          onDismiss={() => setError("")}
        />

        <AlertMessage
          type="success"
          message={success}
          onDismiss={() => setSuccess("")}
        />

        {/* Main profile area */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Profile summary */}
          <aside className="min-w-0 lg:col-span-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="h-24 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500">
                <div className="flex h-full items-start justify-end p-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Profile overview
                  </span>
                </div>
              </div>

              <div className="px-5 pb-6 sm:px-6">
                <div className="-mt-10 flex h-[76px] w-[76px] items-center justify-center rounded-2xl border-4 border-white bg-emerald-50 text-2xl font-bold text-emerald-800 shadow-sm">
                  {loading ? (
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                  ) : (
                    initials
                  )}
                </div>

                <div className="mt-4 min-w-0">
                  <h2 className="break-words text-xl font-bold tracking-tight text-slate-900">
                    {loading ? "Loading profile..." : displayName}
                  </h2>

                  <p className="mt-1 break-all text-sm text-slate-500">
                    {form.email || "No email address added"}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                    <CircleUserRound className="h-3.5 w-3.5" />
                    Personal account
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                    <Fingerprint className="h-3.5 w-3.5" />
                    Account details
                  </span>
                </div>

                <div className="my-6 border-t border-slate-100" />

                <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  Contact information
                </h3>

                <div className="space-y-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-400">
                        Full name
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                        {form.name || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-400">
                        Email address
                      </p>
                      <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                        {form.email || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-400">
                        Mobile number
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                        {form.mobile || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        Keep your details up to date
                      </p>
                      <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                        Accurate contact information helps keep your account
                        information current.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </aside>

          {/* Personal information form */}
          <section className="min-w-0 lg:col-span-8">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
              <SectionHeading
                icon={User}
                title="Personal information"
                description="Review and update the information associated with your account."
              />

              {loading ? (
                <div
                  className="flex min-h-64 flex-col items-center justify-center gap-3"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                    <RefreshCw className="h-5 w-5 animate-spin text-emerald-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Loading your profile
                  </p>
                  <p className="text-xs text-slate-400">
                    Please wait while we retrieve your details.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <Field
                    id="profile-name"
                    label="Full name"
                    icon={User}
                    hint="Enter the name you want associated with your account."
                  >
                    <input
                      id="profile-name"
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      maxLength={255}
                      autoComplete="name"
                      disabled={saving}
                      className={inputClass}
                      placeholder="Enter your full name"
                    />
                  </Field>

                  <Field
                    id="profile-email"
                    label="Email address"
                    icon={Mail}
                    hint="Email is optional if your account does not require it."
                  >
                    <input
                      id="profile-email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      maxLength={255}
                      autoComplete="email"
                      disabled={saving}
                      className={inputClass}
                      placeholder="you@example.com"
                    />
                  </Field>

                  <Field
                    id="profile-mobile"
                    label="Mobile number"
                    icon={Phone}
                    hint="Enter your 10-digit mobile number without the country code."
                  >
                    <input
                      id="profile-mobile"
                      type="tel"
                      name="mobile"
                      value={form.mobile}
                      onChange={handleChange}
                      required
                      maxLength={10}
                      pattern="[0-9]{10}"
                      autoComplete="tel-national"
                      inputMode="numeric"
                      disabled={saving}
                      className={inputClass}
                      placeholder="9876543210"
                    />
                  </Field>

                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-slate-400">
                      Changes are saved to your account when you submit.
                    </p>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={loadProfile}
                        disabled={loading || saving}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reload
                      </button>

                      <PrimaryButton loading={saving} disabled={loading}>
                        {saving ? "Saving changes..." : "Save changes"}
                      </PrimaryButton>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Password section */}
            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
              <SectionHeading
                icon={LockKeyhole}
                title="Change password"
                description="Update your password periodically to help protect your account."
              />

              <AlertMessage
                type="error"
                message={passwordError}
                onDismiss={() => setPasswordError("")}
              />

              <AlertMessage
                type="success"
                message={passwordSuccess}
                onDismiss={() => setPasswordSuccess("")}
              />

              <form
                onSubmit={handlePasswordSubmit}
                className="space-y-5"
              >
                {passwordFields.map((field) => (
                  <Field
                    key={field.name}
                    id={field.name}
                    label={field.label}
                    icon={LockKeyhole}
                    hint={
                      field.name === "password"
                        ? "Use at least 8 characters. A unique password is recommended."
                        : undefined
                    }
                  >
                    <input
                      id={field.name}
                      type={showPasswords ? "text" : "password"}
                      name={field.name}
                      value={passwordForm[field.name]}
                      onChange={handlePasswordChange}
                      required
                      minLength={
                        field.name === "current_password" ? undefined : 8
                      }
                      autoComplete={field.autoComplete}
                      disabled={changingPassword}
                      className={passwordInputClass}
                      placeholder={field.placeholder}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords((current) => !current)
                      }
                      disabled={changingPassword}
                      aria-label={
                        showPasswords ? "Hide passwords" : "Show passwords"
                      }
                      aria-pressed={showPasswords}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showPasswords ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </Field>
                ))}

                <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200/70">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Password security
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Your current password is required to authorize this
                        change.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <PrimaryButton loading={changingPassword}>
                      {changingPassword
                        ? "Updating password..."
                        : "Update password"}
                    </PrimaryButton>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>

        {/* Security footer */}
        <footer className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <SecurityIcon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900">
                Protect your account
              </h3>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                Never share your password or authentication token with anyone.
                Use a unique password and sign out when using a shared device.
              </p>
            </div>

            <ArrowRight className="mt-1 hidden h-4 w-4 shrink-0 text-slate-300 sm:block" />
          </div>
        </footer>

        <p className="mt-5 text-center text-xs text-slate-400">
          Account settings · Your information is managed by your application.
        </p>
      </div>
    </main>
  );
}
