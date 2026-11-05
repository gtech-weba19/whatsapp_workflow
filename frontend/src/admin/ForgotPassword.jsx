
import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast,ToastContainer  } from "react-toastify";
import {
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Email validation
  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  // Resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setTimeout(() => {
      setResendCooldown((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Send reset link API
  const sendResetLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (loading || resendCooldown > 0) return;

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/forgot-password`,
        {
          email: normalizedEmail,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );

      toast.success(
        response.data?.message ||
          "If the email is registered, a reset link will be sent."
      );

      setEmail(normalizedEmail);
      setSent(true);
      setResendCooldown(60);

    } catch (error) {
      console.error(
        "Forgot Password API Error:",
        error.response?.data || error.message
      );

      const status = error.response?.status;
      const errors = error.response?.data?.errors;

      if (status === 429) {
        toast.error("Too many requests. Please try again later.");
      } else if (errors?.email?.[0]) {
        toast.error(errors.email[0]);
      } else if (error.code === "ECONNABORTED") {
        toast.error("Request timed out. Please try again.");
      } else if (!error.response) {
        toast.error(
          "Unable to connect to server. Please try again."
        );
      } else {
        toast.error(
          error.response?.data?.message ||
            "Unable to process your request. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    sendResetLink();
  };

  // Change email
  const handleChangeEmail = () => {
    setSent(false);
    setEmail("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 py-10">

    <ToastContainer
      position="top-center"
      autoClose={3000}
      newestOnTop
      closeOnClick
      pauseOnHover
      theme="light"
    />

      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-green-100/60 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />

      <div className="relative w-full max-w-md">

        {/* Main Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-green-900/5 sm:p-8">

          {!sent ? (
            <>
              <div className="mb-6">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <Mail size={22} />
                </div>

                <h2 className="text-xl font-bold text-gray-900">
                  Forgot Password?
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  No worries! Enter your registered email address and
                  we'll send you a secure password reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail
                      size={19}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      maxLength={255}
                      required
                      disabled={loading}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-green-600/20 transition duration-200 hover:bg-green-700 hover:shadow-lg hover:shadow-green-600/20 focus:outline-none focus:ring-4 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="py-3 text-center">

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
                <CheckCircle2 size={36} />
              </div>

              <h2 className="text-xl font-bold text-gray-900">
                Check Your Email
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                If an account exists for{" "}
                <span className="font-semibold text-gray-800">
                  {email}
                </span>
                , a password reset link will be sent.
              </p>

              <div className="mt-6 rounded-xl border border-green-100 bg-green-50 p-4 text-left">
                <div className="flex gap-3">
                  <Mail
                    size={20}
                    className="mt-0.5 shrink-0 text-green-700"
                  />

                  <div>
                    <p className="text-sm font-semibold text-green-900">
                      Check your inbox
                    </p>

                    <p className="mt-1 text-xs leading-5 text-green-800">
                      Open the email and follow the password reset link.
                      Also check your spam folder.
                    </p>
                  </div>
                </div>
              </div>

              {/* Change Email */}
              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Change Email Address
              </button>

              {/* Resend Link */}
              <button
                type="button"
                onClick={sendResetLink}
                disabled={loading || resendCooldown > 0}
                className="mt-4 text-sm font-semibold text-green-700 transition hover:text-green-800 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin" />
                    Sending...
                  </span>
                ) : resendCooldown > 0 ? (
                  `Resend link in ${resendCooldown}s`
                ) : (
                  "Resend Reset Link"
                )}
              </button>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-7 border-t border-gray-100 pt-6">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-green-700"
            >
              <ArrowLeft size={17} />
              Back to Login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          <ShieldCheck size={13} className="mr-1 inline-block" />
          Your account security is our priority.
        </p>

      </div>
    </div>
  );
}
