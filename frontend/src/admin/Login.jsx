
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
  ShieldCheck,
  MessageCircle,
  Headset,
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

  useEffect(() => {
    const logoutMessage = sessionStorage.getItem("logoutMessage");

    if (logoutMessage) {
      toast.success(logoutMessage);
      sessionStorage.removeItem("logoutMessage");
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setLogin((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const doLogin = async (event) => {
    event.preventDefault();

    if (loginLoading) return;

    const email = login.email.trim();

    if (!email || !login.password) {
      toast.warning("Please enter your email and password.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    setLoginLoading(true);

    try {
      const response = await axios.post(
        `${API}/login`,
        {
          email,
          password: login.password,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      const token =
        data?.token ||
        data?.access_token ||
        data?.data?.token ||
        data?.data?.access_token;

      if (!token) {
        toast.error(data?.message || "Login token was not received.");
        return;
      }

      const user = data?.user || data?.data?.user || null;

      if (!user) {
        toast.error("User information was not received from the server.");
        return;
      }

      // Remove old authentication data.
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

      // Save the latest authentication response.
      if (rememberMe) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        if (data?.tenant) {
          localStorage.setItem("tenant", JSON.stringify(data.tenant));
        } else if (data?.data?.tenant) {
          localStorage.setItem(
            "tenant",
            JSON.stringify(data.data.tenant)
          );
        }
      } else {
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));

        if (data?.tenant) {
          sessionStorage.setItem("tenant", JSON.stringify(data.tenant));
        } else if (data?.data?.tenant) {
          sessionStorage.setItem(
            "tenant",
            JSON.stringify(data.data.tenant)
          );
        }
      }

      // Set Axios authorization header.
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;

      // Determine the correct destination from backend status.
      const role = user?.role;
      const onboardingStep = user?.onboarding_step;

      let destination;

      if (role === "super_admin") {
        destination = "/dashboard";
      } else {
        switch (onboardingStep) {
          case "connect_whatsapp":
            destination = "/connect-whatsapp";
            break;

          case "completed":
            destination = "/dashboard";
            break;

          case "choose_plan":
          default:
            destination = "/plans";
            break;
        }
      }

      console.log("Login successful");
      console.log("User role:", role);
      console.log("Onboarding step:", onboardingStep);
      console.log("Redirect destination:", destination);

      toast.success(data?.message || "Login successful!");

      // Replace Login history entry after authentication.
      navigate(destination, { replace: true });
    } catch (error) {
      console.error(
        "Login error:",
        error?.response?.data || error.message
      );

      if (error.code === "ECONNABORTED") {
        toast.error("The request timed out. Please try again.");
      } else if (!error.response) {
        toast.error(
          "Unable to connect to the server. Please check your connection."
        );
      } else {
        const errors = error.response.data?.errors;

        const validationMessage = errors
          ? Object.values(errors).flat().join(" ")
          : null;

        const status = error.response.status;

        toast.error(
          error.response.data?.message ||
            error.response.data?.error ||
            validationMessage ||
            (status === 401
              ? "Invalid email or password."
              : status === 429
                ? "Too many attempts. Please try again later."
                : "Login failed. Please try again.")
        );
      }
    } finally {
      setLoginLoading(false);
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

        {/* RIGHT: LOGIN FORM */}
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

            {/* Login Card */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/40 sm:p-6">
              <div className="mb-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <LockKeyhole size={21} />
                </div>

                <p className="mb-1.5 text-xs font-semibold tracking-wider text-emerald-700 uppercase">
                  Build Your WhatsApp Chatbot
                </p>

                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-5 text-slate-500">
                  Sign in to manage your WhatsApp business communications.
                </p>
              </div>

              <form onSubmit={doLogin} className="space-y-4">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Email address
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

                {/* Password */}
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
                      aria-pressed={showPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      disabled={loginLoading}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500"
                    />
                    Remember me on this device
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-700/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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

              {/* Security Notice */}
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

            {/* Register Link */}
            <p className="mt-4 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Create account
              </Link>
            </p>

            {/* Footer */}
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
