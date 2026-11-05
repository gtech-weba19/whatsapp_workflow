
import { useState } from "react";
import axios from "axios";
import {
  Link,
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { toast } from "react-toastify";
import {
  Lock,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  KeyRound,
  Mail,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordChecks = [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "One uppercase letter",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "One lowercase letter",
      valid: /[a-z]/.test(password),
    },
    {
      label: "One number",
      valid: /[0-9]/.test(password),
    },
  ];

  const isPasswordStrong = passwordChecks.every((item) => item.valid);

  const passwordsMatch =
    passwordConfirmation.length > 0 &&
    password === passwordConfirmation;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!token || !email) {
      toast.error("Invalid password reset link.");
      return;
    }

    if (!isPasswordStrong) {
      toast.error("Please meet all password requirements.");
      return;
    }

    if (!passwordsMatch) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/reset-password`,
        {
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );

      setSuccess(true);

      toast.success(
        response.data?.message ||
          "Your password has been reset successfully."
      );

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1500);
    } catch (error) {
      const status = error.response?.status;
      const errors = error.response?.data?.errors;

      if (status === 429) {
        toast.error("Too many attempts. Please try again later.");
      } else if (errors?.password?.[0]) {
        toast.error(errors.password[0]);
      } else if (errors?.email?.[0]) {
        toast.error(errors.email[0]);
      } else {
        toast.error(
          error.response?.data?.message ||
            "Password reset failed. The link may be invalid or expired."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // No token or email means the user did not arrive through a complete reset link.
  const invalidLink = !token || !email;

  if (invalidLink) {
    return <Navigate to="/forgot-password" replace />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 py-10">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-green-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-green-900/5 sm:p-8">
          {success ? (
            <div className="py-5 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
                <CheckCircle2 size={36} />
              </div>

              <h2 className="text-xl font-bold text-gray-900">
                Password Reset Successful!
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Your password has been updated successfully. You can now
                sign in using your new password.
              </p>

              <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-green-700">
                <Loader2 size={16} className="animate-spin" />
                Redirecting to login...
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <KeyRound size={22} />
                </div>

                <h2 className="text-xl font-bold text-gray-900">
                  Reset Your Password
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Choose a strong password that you haven't used before.
                </p>
              </div>

              {/* Email */}
              <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                    <Mail size={17} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">
                      Resetting password for
                    </p>

                    <p className="truncate text-sm font-semibold text-gray-800">
                      {email}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    New Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      maxLength={128}
                      required
                      disabled={loading}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-green-700"
                    >
                      {showPassword ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Password Requirements
                  </p>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {passwordChecks.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-2"
                      >
                        {item.valid ? (
                          <CheckCircle2
                            size={15}
                            className="shrink-0 text-green-600"
                          />
                        ) : (
                          <XCircle
                            size={15}
                            className="shrink-0 text-gray-300"
                          />
                        )}

                        <span
                          className={`text-xs ${
                            item.valid
                              ? "font-medium text-green-700"
                              : "text-gray-500"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="password_confirmation"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Confirm New Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="password_confirmation"
                      type={showConfirmation ? "text" : "password"}
                      value={passwordConfirmation}
                      onChange={(e) =>
                        setPasswordConfirmation(e.target.value)
                      }
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      maxLength={128}
                      required
                      disabled={loading}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmation(!showConfirmation)
                      }
                      aria-label={
                        showConfirmation
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-green-700"
                    >
                      {showConfirmation ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>

                  {passwordConfirmation.length > 0 && (
                    <p
                      className={`mt-2 flex items-center gap-1.5 text-xs ${
                        passwordsMatch ? "text-green-700" : "text-red-500"
                      }`}
                    >
                      {passwordsMatch ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <XCircle size={14} />
                      )}

                      {passwordsMatch
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !isPasswordStrong ||
                    !passwordsMatch
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-green-600/20 transition duration-200 hover:bg-green-700 hover:shadow-lg hover:shadow-green-600/20 focus:outline-none focus:ring-4 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      Reset Password
                    </>
                  )}
                </button>
              </form>
            </>
          )}

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
