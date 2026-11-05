
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import CreateBotPopup from "./CreateBotPopup";
import axios from "axios";

import {
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Smartphone,
  X,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Bot,
  Clock3,
  CircleCheck,
} from "lucide-react";

const STATUS_CACHE_KEY = "whatsapp_account_status";




function WhatsAppIcon({ size = 28, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="WhatsApp"
      role="img"
    >
      <path
        d="M16 2.5C8.55 2.5 2.5 8.52 2.5 15.95c0 2.37.62 4.68 1.8 6.73L2.4 29.5l7.02-1.84a13.5 13.5 0 0 0 6.57 1.7h.01c7.43 0 13.48-6.04 13.5-13.47A13.42 13.42 0 0 0 16 2.5Z"
        fill="currentColor"
      />
      <path
        d="M16 5.05c6.05 0 10.97 4.9 10.97 10.93 0 6.04-4.92 10.95-10.97 10.95-2.04 0-4.03-.57-5.76-1.64l-.41-.25-4.17 1.1 1.11-4.06-.27-.43a10.84 10.84 0 0 1-1.48-5.48C5.02 9.95 9.95 5.05 16 5.05Z"
        fill="white"
      />
      <path
        d="M12.1 9.55c-.25-.57-.52-.58-.76-.59h-.65c-.23 0-.6.09-.92.44-.32.35-1.2 1.17-1.2 2.85 0 1.68 1.22 3.3 1.39 3.52.17.22 2.36 3.77 5.83 5.13 2.89 1.13 3.48.91 4.11.85.63-.06 2.03-.83 2.32-1.64.29-.81.29-1.51.2-1.66-.09-.15-.32-.24-.67-.41-.35-.17-2.03-1-2.35-1.11-.32-.12-.55-.17-.78.17-.23.35-.9 1.11-1.1 1.34-.2.23-.41.26-.76.09-.35-.17-1.47-.54-2.8-1.72-1.04-.93-1.74-2.08-1.94-2.43-.2-.35-.02-.54.15-.71.15-.15.35-.4.52-.6.17-.2.23-.35.35-.58.11-.23.05-.43-.03-.6-.09-.17-.78-1.86-1.07-2.54Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ---------------------------------------
   Connect WhatsApp form popup
--------------------------------------- */

function WhatsAppConnectPopup({
  open,
  onClose,
  onSubmit,
  submitting = false,
}) {
  const [businessNumber, setBusinessNumber] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setBusinessNumber("");
      setAccessToken("");
      setShowToken(false);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    const number = businessNumber.trim().replace(/[\s()-]/g, "");
    const token = accessToken.trim();

    if (!/^\+?[0-9]{8,16}$/.test(number)) {
      setError("Country code ke saath valid WhatsApp number enter karein.");
      return;
    }

      if (!token) {
      setError("Please enter your Meta Access Token.");
      return;
    }

    setError("");

    try {
      await onSubmit({
        name: "WhatsApp Business",
        waba_id: number,
        access_token: token,
        provider: "meta",
        sender_name: "Whatsappdemo",
        webhook_dn_id: "1001",
        status: "pending",
      });
    } catch (err) {
      const errors = err?.response?.data?.errors;
      const firstError = errors
        ? Object.values(errors).flat()[0]
        : null;

      setError(
        firstError ||
          err?.response?.data?.message ||
          err?.message ||
          "WhatsApp account submit nahi ho paya."
      );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-popup-title"
        className="my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="relative bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-6 py-6 text-white sm:px-8">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close popup"
            className="absolute right-4 top-4 rounded-xl p-2 text-white/80 hover:bg-white/15 disabled:opacity-50"
          >
            <X size={20} />
          </button>

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
            <WhatsAppIcon size={32} />
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
            WhatsApp Business Setup
          </p>

          <h2
            id="whatsapp-popup-title"
            className="mt-2 text-2xl font-extrabold"
          >
            Connect WhatsApp
          </h2>

         
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">
          <div>
            <label
              htmlFor="whatsapp-business-number"
              className="mb-2 block text-sm font-bold text-slate-800"
            >
              WhatsApp Business Number
            </label>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
              <Phone size={19} className="shrink-0 text-emerald-700" />

              <input
                id="whatsapp-business-number"
                type="tel"
                autoComplete="tel"
                autoFocus
                required
                value={businessNumber}
                onChange={(event) => {
                  setBusinessNumber(event.target.value);
                  setError("");
                }}
                placeholder="919876543210"
                className="min-w-0 flex-1 bg-transparent py-4 text-sm font-semibold text-slate-900 outline-none"
              />
            </div>

           
          </div>

          <div>
            <label
              htmlFor="whatsapp-access-token"
              className="mb-2 block text-sm font-bold text-slate-800"
            >
              Meta Access Token
            </label>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
              <ShieldCheck size={19} className="shrink-0 text-emerald-700" />

         <input
          id="whatsapp-access-token"
          type={showToken ? "text" : "password"}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={accessToken}
          onChange={(event) => {
            setAccessToken(event.target.value);
            setError("");
          }}
          onPaste={(event) => {
            event.stopPropagation();
            setError("");
          }}
          onCopy={(event) => event.stopPropagation()}
          onCut={(event) => event.stopPropagation()}
          placeholder="Enter your Meta Access Token"
          className="min-w-0 flex-1 bg-transparent py-4 text-sm text-slate-900 outline-none"
        />
              <button
                type="button"
                onClick={() => setShowToken((value) => !value)}
                aria-label={showToken ? "Hide token" : "Show token"}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
              >
                {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

         
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Submit for Approval
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ---------------------------------------
   Success popup after successful submission
--------------------------------------- */

function RequestSubmittedPopup({ open, onClose }) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-success-title"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-2xl sm:p-9"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close confirmation dialog"
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <X size={20} />
        </button>

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CircleCheck
            size={44}
            className="text-emerald-700"
            aria-hidden="true"
          />
        </div>

        <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">
          Request Submitted
        </p>

        <h2
          id="whatsapp-success-title"
          className="mt-2 text-2xl font-extrabold text-slate-950"
        >
          Your Request Has Been Submitted
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your WhatsApp Business connection request has been submitted
          successfully. Our administrator will review your request and update
          its status once a decision has been made.
        </p>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
          <Clock3
            size={21}
            className="mt-0.5 shrink-0 text-amber-700"
            aria-hidden="true"
          />

          <div>
            <p className="text-sm font-bold text-amber-900">
              Awaiting Administrator Approval
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              Bot creation will become available after your WhatsApp Business
              account has been approved.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300"
        >
          Return to Dashboard
        </button>
      </div>
    </div>,
    document.body
  );
}




/* ---------------------------------------
   Main WhatsApp connection status component
--------------------------------------- */

export default function WhatsAppConnectionStatus({
  status,
  senderNumber = null,
  loading = false,
  onRefresh,
  onConnectWhatsApp,
  compact = false,
}) {
  const [showPopup, setShowPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [createdBotId, setCreatedBotId] = useState(null);
const [showBotSuccess, setShowBotSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingBot, setExistingBot] = useState(null);
const [checkingBot, setCheckingBot] = useState(true);

const navigate = useNavigate();

const [showCreateBotPopup, setShowCreateBotPopup] = useState(false);
const [creatingBot, setCreatingBot] = useState(false);



const normalizedStatus = String(status || "")
  .trim()
  .toLowerCase();

const statusLoading = loading || !normalizedStatus;

const connected = ["connected", "approved"].includes(normalizedStatus);

const pending = ["pending", "pending_approval"].includes(
  normalizedStatus
);

const verifying = ["connecting", "verifying"].includes(
  normalizedStatus
);

const rejected = normalizedStatus === "rejected";

const numberToShow = senderNumber || "";

  const refreshStatus = useCallback(async () => {
    if (typeof onRefresh === "function") {
      await onRefresh();
    }
  }, [onRefresh]);


useEffect(() => {
  let cancelled = false;

  const checkExistingBot = async () => {
    setCheckingBot(true);

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("token");

      if (!token) {
        if (!cancelled) setExistingBot(null);
        return;
      }

      const API = (
        import.meta.env.VITE_API_URL ||
        "http://localhost:8000/api"
      ).replace(/\/$/, "");

      const response = await axios.get(`${API}/bots`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // API response ke format ke mutabik bot list nikalein.
      const payload = response.data?.data;
      const bots = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      if (!cancelled) {
        setExistingBot(bots.length > 0 ? bots[0] : null);
      }
    } catch (error) {
      if (!cancelled) {
        console.error("Unable to check existing bot:", error);
      }
    } finally {
      if (!cancelled) setCheckingBot(false);
    }
  };

  checkExistingBot();

  return () => {
    cancelled = true;
  };
}, []);


  // Poll the backend every 10 seconds while waiting for approval.
  useEffect(() => {
    if (loading || typeof onRefresh !== "function") return;
    if (!pending && !verifying) return;

    const timer = window.setInterval(() => {
      Promise.resolve(onRefresh()).catch(() => {});
    }, 10000);

    return () => window.clearInterval(timer);
  }, [loading, onRefresh, pending, verifying]);

  // Keep the success popup accessible with Escape.
  useEffect(() => {
    if (!showSuccessPopup) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowSuccessPopup(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [showSuccessPopup]);

  const theme = connected
    ? {
        border: "border-emerald-200",
        background: "from-emerald-50 via-white to-teal-50",
        iconBg: "bg-emerald-100",
        iconText: "text-emerald-700",
        accent: "bg-emerald-500",
        badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
        dot: "bg-emerald-500",
        title: "text-emerald-950",
        footer: "border-emerald-100 bg-emerald-50/70",
      }
    : pending || verifying
      ? {
          border: "border-amber-200",
          background: "from-amber-50 via-white to-orange-50/70",
          iconBg: "bg-amber-100",
          iconText: "text-amber-800",
          accent: "bg-amber-500",
          badge: "border-amber-200 bg-amber-100 text-amber-800",
          dot: "bg-amber-500",
          title: "text-amber-950",
          footer: "border-amber-100 bg-amber-50/70",
        }
      : {
          border: "border-slate-200",
          background: "from-slate-50 via-white to-slate-50",
          iconBg: "bg-slate-100",
          iconText: "text-slate-700",
          accent: "bg-slate-400",
          badge: "border-slate-200 bg-slate-100 text-slate-700",
          dot: "bg-slate-400",
          title: "text-slate-950",
          footer: "border-slate-100 bg-slate-50",
        };

  const label = connected
    ? "WhatsApp Connected"
    : pending
      ? "Pending Approval"
      : verifying
        ? "Verifying WhatsApp..."
        : rejected
          ? "WhatsApp Request Rejected"
          : "Connect Your WhatsApp";

  const badgeLabel = connected
    ? "Approved"
    : pending
      ? "Pending"
      : verifying
        ? "Verifying"
        : rejected
          ? "Rejected"
          : "Not Connected";

  const handleConnect = async (details) => {
    if (typeof onConnectWhatsApp !== "function") {
      throw new Error(
        "Dashboard se onConnectWhatsApp handler pass nahi hua."
      );
    }

    setSubmitting(true);

    try {
      // Parent handler must resolve only after the POST succeeds.
      await onConnectWhatsApp(details);

     setShowPopup(false);
    setShowSuccessPopup(true);

      // Refresh status in the background; do not block the success popup.
      Promise.resolve(refreshStatus()).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section
        aria-label="WhatsApp connection status"
        aria-live="polite"
        className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${theme.background} ${theme.border} shadow-md`}
      >
        <div className={`absolute inset-y-0 left-0 w-1 ${theme.accent}`} />

        <div
          className={`flex flex-col gap-5 pl-7 ${
            compact
              ? "p-4 sm:flex-row sm:items-center sm:justify-between"
              : "p-5 sm:p-6 sm:pl-8 lg:flex-row lg:items-center lg:justify-between"
          }`}
        >
          <div className="flex min-w-0 items-start gap-4 sm:items-center">
            <div
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${theme.iconBg} ${theme.iconText}`}
            >
              <WhatsAppIcon size={30} />

              <span
                className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${theme.dot}`}
              >
                {connected && (
                  <CheckCircle2
                    size={12}
                    className="text-white"
                    strokeWidth={3}
                  />
                )}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`text-base font-extrabold sm:text-lg ${theme.title}`}>
                  {label}
                </h3>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${theme.badge}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                  {badgeLabel}
                </span>
              </div>

      <p className="mt-1.5 max-w-2xl break-words text-xs leading-5 text-slate-600 sm:text-sm">
                {connected
                  ? "Your WhatsApp Business account is approved and ready for chatbot automation and messaging."
                  : pending
                    ? "Your connection request has been submitted successfully and is awaiting administrator approval."
                    : verifying
                      ? "We are verifying your WhatsApp Business account. This may take a few moments."
                      : rejected
                        ? "Your connection request could not be approved. Please contact your administrator for assistance or submit a new request."
                        : "Connect your WhatsApp Business account to enable automated messaging and create your first chatbot."}
              </p>

              {connected && numberToShow && (
                <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                  <Smartphone
                    size={14}
                    className="shrink-0 text-emerald-700"
                  />

                  <span className="truncate text-xs font-bold text-slate-800">
                    +{String(numberToShow).replace(/^\+/, "")}
                  </span>

                  <ShieldCheck
                    size={15}
                    className="shrink-0 text-emerald-600"
                  />
                </div>
              )}

              {pending && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-xs font-semibold text-amber-800">
                  <Clock3 size={15} />
                  Admin approval is required
                </div>
              )}
            </div>
          </div>

<div className="flex shrink-0 flex-wrap items-center gap-2">
  {statusLoading ? (
    <span
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600"
      role="status"
      aria-live="polite"
    >
      <Loader2 size={17} className="animate-spin" />
      Checking Status...
    </span>
  ) : pending ? (
    <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-100 px-4 py-3 text-sm font-bold text-amber-800">
      <Clock3 size={17} />
      Pending Approval
    </span>
  ) : verifying ? (
    <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-100 px-4 py-3 text-sm font-bold text-amber-800">
      <Loader2 size={17} className="animate-spin" />
      Verifying...
    </span>
  ) : connected ? (
    <button
      type="button"
      disabled={checkingBot}
      onClick={() => {
        if (existingBot?.id) {
          navigate('/workflow-builder');
        } else {
          setShowCreateBotPopup(true);
        }
      }}
className="cursor-pointer inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 bg-gradient-to-b from-neutral-700 via-neutral-900 to-black px-4 py-3 text-sm font-extrabold text-white shadow-[0_6px_0_#000,0_10px_18px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-white/50 hover:from-neutral-600 hover:via-neutral-800 hover:to-black hover:shadow-[0_9px_0_#000,0_14px_22px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.45)] active:translate-y-1 active:shadow-[0_2px_0_#000,inset_0_2px_4px_rgba(0,0,0,0.6)] focus:outline-none focus:ring-4 focus:ring-neutral-400/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">      {checkingBot ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Checking Bot...
        </>
      ) : existingBot?.id ? (
        <>
          <Bot size={18} />
          Create Workflow
          <ArrowRight size={16} />
        </>
      ) : (
        <>
          <Bot size={18} />
          Create Your First Bot
          <ArrowRight size={16} />
        </>
      )}
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setShowPopup(true)}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 bg-gradient-to-b from-neutral-700 via-neutral-900 to-black px-4 py-3 text-sm font-extrabold text-white shadow-[0_6px_0_#000,0_10px_18px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-white/50 hover:from-neutral-600 hover:via-neutral-800 hover:to-black hover:shadow-[0_9px_0_#000,0_14px_22px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.45)] active:translate-y-1 active:shadow-[0_2px_0_#000,inset_0_2px_4px_rgba(0,0,0,0.6)] focus:outline-none focus:ring-4 focus:ring-neutral-400/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
    >
      <WhatsAppIcon size={18} />
      {rejected ? "Submit Again" : "Connect WhatsApp"}
      <ArrowUpRight size={16} />
    </button>
  )}
</div>
        </div>

        <div
          className={`flex items-center gap-2 border-t px-5 py-3 sm:px-7 ${theme.footer}`}
        >
          {connected ? (
            <CheckCircle2 size={14} className="text-emerald-600" />
          ) : pending || verifying ? (
            <Clock3 size={14} className="text-amber-700" />
          ) : (
            <AlertCircle size={14} className="text-slate-500" />
          )}

     <p className="text-xs font-semibold text-slate-600">
          {connected
            ? "Your WhatsApp account is connected and ready to use."
            : pending
              ? "Your request is under review. Your WhatsApp connection will be activated after admin approval."
              : verifying
                ? "Your WhatsApp connection is being verified. Please wait."
                : rejected
                  ? "Your connection request was not approved. Please contact your administrator or submit a new request."
                  : "Connect your WhatsApp Business account to enable messaging and chatbot automation."}
        </p>
        </div>
      </section>

      <WhatsAppConnectPopup
        open={showPopup}
        submitting={submitting}
        onClose={() => {
          if (submitting) return;

          setShowPopup(false);
          Promise.resolve(refreshStatus()).catch(() => {});
        }}
        onSubmit={handleConnect}
      />

      <RequestSubmittedPopup
        open={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
      />


{showCreateBotPopup && (
  <CreateBotPopup
    submitting={creatingBot}
    onClose={() => {
      if (!creatingBot) {
        setShowCreateBotPopup(false);
      }
    }}
   onConfirm={async (botDetails) => {
  setCreatingBot(true);

  try {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("token");

    if (!token) {
      throw new Error("Session expired. Please log in again.");
    }

    const API = (
      import.meta.env.VITE_API_URL ||
      "http://localhost:8000/api"
    ).replace(/\/$/, "");

    const response = await axios.post(
      `${API}/bots`,
      {
        name: botDetails.name,
        status: "active",
      },
      
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const botId = response.data?.data?.id;

    if (!response.data?.success || !botId) {
      throw new Error(
        response.data?.message || "Bot could not be saved."
      );
    }

    // Bot ID save karein aur success popup kholein.
    setCreatedBotId(botId);
    setShowCreateBotPopup(false);
    setShowBotSuccess(true);

    return response.data;
  } catch (error) {
    const validationMessage = error.response?.data?.errors
      ? Object.values(error.response.data.errors).flat()[0]
      : null;

    throw new Error(
      validationMessage ||
        error.response?.data?.message ||
        error.message ||
        "Unable to save bot."
    );
  } finally {
    setCreatingBot(false);
  }
}}
  />
)}


{showBotSuccess && (
  <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bot-success-title"
      aria-describedby="bot-success-description"
      className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
    >
      {/* Success accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />

      <div className="p-6 sm:p-8">
        {/* Success icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-8 border-emerald-50 bg-emerald-100">
          <CheckCircle2
            size={40}
            strokeWidth={2.2}
            className="text-emerald-600"
            aria-hidden="true"
          />
        </div>

        {/* Congratulations */}
        <div className="mt-5 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Success · Bot Created
          </p>

          <h2
            id="bot-success-title"
            className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
          >
            🎉 Congratulations!
          </h2>

          <p className="mt-3 text-lg font-bold text-slate-800">
            Your bot is ready! 🤖
          </p>

          <p
            id="bot-success-description"
            className="mt-2 text-sm leading-6 text-slate-600"
          >
            Your bot has been successfully created and saved. Now
            let’s bring it to life by creating your workflow.
          </p>
        </div>

        {/* Next step */}
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
              🚀
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">
                What’s next?
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                Create your workflow to set up automated WhatsApp
                messages, buttons, conditions, and customer journeys.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => {
              setShowBotSuccess(false);
              navigate("/workflow-builder");
            }}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-700/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-200"
          >
            ✨ Create Your Workflow
            <ArrowRight
              size={18}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </button>

          <button
            type="button"
            onClick={() => setShowBotSuccess(false)}
            className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
          >
            Stay on This Page
          </button>
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          <CheckCircle2
            size={13}
            className="mr-1 inline-block text-emerald-600"
            aria-hidden="true"
          />
          Your bot has been saved successfully.
        </p>
      </div>
    </div>
  </div>
)}

    </>
  );
}
