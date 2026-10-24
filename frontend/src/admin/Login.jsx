
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

import {
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  MessageCircle,
  Headset,
  RefreshCw,
} from "lucide-react";

import "react-toastify/dist/ReactToastify.css";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const LOGO = "/WABA Tech Chatbot Logo.png";

const Login = () => {
  const navigate = useNavigate();

  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Both steps stay on this page; no verification route is created.
  const [step, setStep] = useState("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);


  useEffect(() => {
    const registrationMessage = sessionStorage.getItem(
      "registration_success_message"
    );

    if (registrationMessage) {
      toast.success(registrationMessage);
      sessionStorage.removeItem("registration_success_message");
    }

    const logoutMessage = sessionStorage.getItem("logoutMessage");

    if (logoutMessage) {
      toast.success(logoutMessage);
      sessionStorage.removeItem("logoutMessage");
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("email_verification_token");
    const email = params.get("email");

    if (token && email) {
      confirmEmailVerification(email, token);
    }
    // Run once when the component loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
  const handleUnauthorized = (event) => {
    if (event.detail?.status !== 401) return;

    clearAuthData();

    sessionStorage.setItem(
      "logoutMessage",
      "Your session has expired. Please log in again."
    );

    if (window.location.pathname !== "/") {
      window.location.replace("/");
    }
  };

  window.addEventListener("auth:unauthorized", handleUnauthorized);

  return () => {
    window.removeEventListener(
      "auth:unauthorized",
      handleUnauthorized
    );
  };
}, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setLogin((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

const clearAuthData = () => {
  [
    "token",
    "auth_token",
    "access_token",
    "user",
    "tenant",
  ].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  delete axios.defaults.headers.common.Authorization;
};

  const saveAuthData = (data) => {
    const token =
      data?.token ||
      data?.access_token ||
      data?.data?.token ||
      data?.data?.access_token;

    const user = data?.user || data?.data?.user || null;

    if (!token || !user) {
      throw new Error("Login response did not include a token and user.");
    }

    clearAuthData();

    const storage = rememberMe ? localStorage : sessionStorage;

    storage.setItem("token", token);
    storage.setItem("user", JSON.stringify(user));

    const tenant = data?.tenant || data?.data?.tenant || null;

    if (tenant) {
      storage.setItem("tenant", JSON.stringify(tenant));
    }

    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  };

  const finishLogin = async (email, password) => {
    const response = await axios.post(
      `${API}/login`,
      { email, password },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    saveAuthData(response.data);

    toast.success(response.data?.message || "Login successful!");
    navigate("/dashboard", { replace: true });
  };

  const doLogin = async (event) => {
    event.preventDefault();

    if (loginLoading) return;

    const email = login.email.trim().toLowerCase();
    const password = login.password;

    if (!email || !password) {
      toast.warning("Please enter your email and password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    setLoginLoading(true);

    try {
      await finishLogin(email, password);
    } catch (error) {
      console.error("Login error:", error?.response?.data || error.message);

      const status = error?.response?.status;
      const errorData = error?.response?.data;

      if (
        status === 403 &&
        errorData?.email_verified === false
      ) {
        setVerificationEmail(
          String(errorData?.email || email).trim().toLowerCase()
        );
        setVerificationSent(false);
        setStep("verify-email");

        toast.info("Please verify your email to continue.");
        return;
      }

      if (error.code === "ECONNABORTED") {
        toast.error("The request timed out. Please try again.");
        return;
      }

      if (!error.response) {
        toast.error(
          "Unable to connect to the server. Please check your connection."
        );
        return;
      }

      const validationMessage = errorData?.errors
        ? Object.values(errorData.errors).flat().join(" ")
        : null;

      toast.error(
        errorData?.message ||
          errorData?.error ||
          validationMessage ||
          (status === 401 || status === 422
            ? "Invalid email or password."
            : status === 429
              ? "Too many attempts. Please try again later."
              : "Login failed. Please try again.")
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // Sends the verification email to the address displayed in Step 2.
  const sendVerificationLink = async () => {
    if (verificationLoading) return;

    if (!verificationEmail) {
      toast.error("Email Address is missing.");
      return;
    }

    setVerificationLoading(true);

    try {
      const response = await axios.post(
        `${API}/email/send-verification-link`,
        { email: verificationEmail },
        {
          headers: { Accept: "application/json" },
          timeout: 30000,
        }
      );

      if (response.data?.success) {
        setVerificationSent(true);
        toast.success(
          response.data?.message ||
            "Verification link sent. Please check your inbox."
        );
      } else if (response.data?.verified) {
        toast.info("Your email is already verified. Please sign in.");
        setStep("login");
      } else {
        toast.error(
          response.data?.message || "Unable to send verification email."
        );
      }
    } catch (error) {
      console.error(
        "Send verification email error:",
        error?.response?.data || error.message
      );

      toast.error(
        error?.response?.data?.message ||
          "Unable to send verification email. Please try again."
      );
    } finally {
      setVerificationLoading(false);
    }
  };

      // This endpoint must validate the token and update users.email_verified_at.
      const confirmEmailVerification = async (email, token) => {
        setStep("verify-email");
        setVerificationEmail(String(email).trim().toLowerCase());
        setVerificationLoading(true);

        try {
          const response = await axios.post(
            `${API}/email/confirm-verification`,
            { email, token },
            {
              headers: { Accept: "application/json" },
              timeout: 30000,
            }
          );

      if (response.data?.verified) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      setVerificationSent(false);
      setStep("login");

      setLogin((previous) => ({
        ...previous,
        email: String(email).trim().toLowerCase(),
        password: "",
      }));

      toast.success("Email verified successfully. Please log in.");
    }

      // No password is saved or reused after following the email link.
      // The user signs in again with their password.
    } catch (error) {
      console.error(
        "Email confirmation error:",
        error?.response?.data || error.message
      );

      toast.error(
        error?.response?.data?.message ||
          "Verification link is invalid or expired. Please request a new link."
      );
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f7f9fc] text-slate-800">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />

      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-2">
        {/* LEFT: BRANDING */}
        <section className="relative hidden min-h-0 overflow-hidden bg-[#10251f] px-10 py-6 text-white lg:flex lg:flex-col xl:px-16">
          <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-green-400/10 blur-3xl" />

          <div className="relative z-10 flex shrink-0 items-center gap-3">
            <div className="flex h-20 w-[160px] shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white p-2 shadow-lg">
              <img
                src={LOGO}
                alt="Logo"
                className="h-full w-full object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>

          <div className="relative z-10 my-auto w-full max-w-xl py-4">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3.5 py-2 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              WhatsApp communication made simple
            </div>

            <h2 className="text-3xl font-bold leading-[1.2] tracking-tight xl:text-5xl">
              Connect with
              <br />
              your customers.
              <br />
              <span className="text-emerald-400">
                Right on WhatsApp.
              </span>
            </h2>

            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400 xl:text-base xl:leading-7">
              Manage customer conversations, send messages, and deliver
              timely updates through one streamlined WhatsApp workspace.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-400/10 p-2 text-emerald-300">
                  <MessageCircle size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Customer messaging
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Manage conversations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-400/10 p-2 text-emerald-300">
                  <Headset size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Business support
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Stay connected
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} WABA</span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-400" />
              Secure workspace access
            </span>
          </div>
        </section>

        {/* RIGHT: LOGIN / VERIFICATION STEPS */}
        <main className="flex h-full min-h-0 items-center justify-center overflow-y-auto px-5 py-4 sm:px-8 lg:px-10">
          <div className="my-auto w-full max-w-md py-2">
            {/* Mobile Logo */}
            <div className="mb-5 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <img
                  src={LOGO}
                  alt="GTechFlow Logo"
                  className="h-full w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  GTech<span className="text-emerald-600">Flow</span>
                </h1>
                <p className="text-xs text-slate-500">
                  WhatsApp Business Platform
                </p>
              </div>
            </div>



            {step === "login" ? (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/40 sm:p-6">
                <div className="mb-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                    <LockKeyhole size={21} />
                  </div>

                  <p className="mb-1.5 text-xs font-semibold tracking-wider text-emerald-700 uppercase">
                    Build Your WhatsApp Chatbot
                  </p>

                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Welcome Back
                  </h2>

                  <p className="mt-2 text-sm leading-5 text-slate-500">
                    Sign in to manage your WhatsApp Business Communications.
                  </p>
                </div>

                <form onSubmit={doLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                      Email Address
                    </label>

                    <div className="relative">
                      <Mail
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={login.email}
                        onChange={handleChange}
                        placeholder="you@company.com"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        disabled={loginLoading}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-semibold text-slate-700"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={login.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                        disabled={loginLoading}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        disabled={loginLoading}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) =>
                        setRememberMe(event.target.checked)
                      }
                      disabled={loginLoading}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                    Remember me on this device
                  </label>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loginLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Signing you in...
                      </>
                    ) : (
                      <>
                        Sign in to WhatsApp workspace
                        <ArrowRight
                          size={17}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    Your workspace is protected. Never share your password
                    or authentication token with anyone.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/40 sm:p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={24} />
                </div>

                <p className="mb-1.5 text-xs font-semibold tracking-wider text-emerald-700 uppercase">
                  Step 2 of 2
                </p>

                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Verify your email
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Verify your email address to unlock your WhatsApp workspace.
                </p>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Verification email will be sent to
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                    {verificationEmail}
                  </p>
                </div>

                {verificationSent && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-5 text-emerald-800">
                    Verification email sent. Open the link in your email,
                    then return here and sign in.
                  </div>
                )}

                <button
                  type="button"
                  onClick={sendVerificationLink}
                  disabled={verificationLoading}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verificationLoading ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      Please wait...
                    </>
                  ) : (
                    <>
                      <Mail size={17} />
                      Send Verification Link
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("login");
                    setVerificationSent(false);
                  }}
                  disabled={verificationLoading}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <ArrowLeft size={17} />
                  Back to Login
                </button>

                <p className="mt-5 text-center text-xs leading-5 text-slate-500">
                  Already clicked the verification link? Sign in again to
                  continue to your dashboard.
                </p>
              </div>
            )}

            <p className="mt-4 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Create Account
              </Link>
            </p>

            <p className="mt-4 text-center text-xs leading-5 text-slate-400">
              © {new Date().getFullYear()} WABA. All rights reserved.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;
