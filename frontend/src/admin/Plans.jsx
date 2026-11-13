import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Wallet,
  Zap,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Users,
  Edit3,
  PlusCircle,
  MinusCircle,
  Search,
  Bell,
  Check,
  X,
  Layers,
  SlidersHorizontal,
  Receipt,
  TrendingUp,
  Crown,
} from "lucide-react";

import { isSuperAdmin } from "../utils/permission";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

const DEFAULT_PLANS = [
  {
    id: 1,
    name: "Free Trial Pack",
    slug: "trial-100",
    selling_price: 100,
    message_credits: 100,
    validity_days: null,
    description: "Free ₹100 Welcome credits for testing WhatsApp workflows & messages.",
  },
  {
    id: 2,
    name: "Starter Pack",
    slug: "starter-1000",
    selling_price: 1000,
    message_credits: 1000,
    validity_days: null,
    description: "Ideal for small businesses to start sending messages and automation.",
  },
  {
    id: 3,
    name: "Business Growth Pack",
    slug: "business-10000",
    selling_price: 10000,
    message_credits: 10000,
    validity_days: null,
    description: "Power pack for growing teams with higher message volumes.",
  },
  {
    id: 4,
    name: "Enterprise Volume Pack",
    slug: "enterprise-100000",
    selling_price: 100000,
    message_credits: 100000,
    validity_days: null,
    description: "Highest volume plan with dedicated support and lowest per-message rates.",
  },
];

const ESTIMATOR_PRESETS = [500, 2000, 10000, 50000, 100000];

const DASHBOARD_CARD_THEMES = {
  emerald: {
    card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 hover:border-emerald-300",
    topBar: "from-emerald-500 via-emerald-400 to-teal-400",
    glow: "bg-emerald-300/30",
    iconBox: "bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-emerald-600/25",
    pill: "border-emerald-200/90 bg-emerald-50/90 text-emerald-700",
    cta: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20",
    stroke: "#059669",
  },
  teal: {
    card: "border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-white to-teal-50/40 hover:border-teal-300",
    topBar: "from-teal-500 via-teal-400 to-cyan-400",
    glow: "bg-teal-300/30",
    iconBox: "bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-teal-600/25",
    pill: "border-teal-200/90 bg-teal-50/90 text-teal-700",
    cta: "bg-slate-900 text-white hover:bg-teal-700 shadow-sm shadow-slate-900/15",
    stroke: "#0d9488",
  },
  green: {
    card: "border-green-200/80 bg-gradient-to-br from-green-50/90 via-white to-green-50/40 hover:border-green-300",
    topBar: "from-green-500 via-emerald-400 to-lime-400",
    glow: "bg-green-300/30",
    iconBox: "bg-gradient-to-br from-green-600 to-emerald-500 text-white shadow-green-600/25",
    pill: "border-green-200/90 bg-green-50/90 text-green-700",
    cta: "bg-slate-900 text-white hover:bg-green-700 shadow-sm shadow-slate-900/15",
    stroke: "#16a34a",
  },
  cyan: {
    card: "border-cyan-200/80 bg-gradient-to-br from-cyan-50/90 via-white to-cyan-50/40 hover:border-cyan-300",
    topBar: "from-cyan-500 via-teal-400 to-emerald-400",
    glow: "bg-cyan-300/30",
    iconBox: "bg-gradient-to-br from-cyan-600 to-teal-500 text-white shadow-cyan-600/25",
    pill: "border-cyan-200/90 bg-cyan-50/90 text-cyan-700",
    cta: "bg-slate-900 text-white hover:bg-cyan-700 shadow-sm shadow-slate-900/15",
    stroke: "#0891b2",
  },
  lime: {
    card: "border-lime-200/80 bg-gradient-to-br from-lime-50/90 via-white to-lime-50/40 hover:border-lime-300",
    topBar: "from-lime-500 via-green-400 to-emerald-400",
    glow: "bg-lime-300/30",
    iconBox: "bg-gradient-to-br from-lime-600 to-green-600 text-white shadow-lime-600/25",
    pill: "border-lime-200/90 bg-lime-50/90 text-lime-800",
    cta: "bg-gradient-to-r from-emerald-700 to-green-700 text-white hover:from-emerald-800 hover:to-green-800 shadow-md shadow-green-700/20",
    stroke: "#65a30d",
  },
};

const getPlanTierKey = (plan) => {
  if (plan?.slug === "trial-100" || plan?.id === 1) return "trial";
  if (plan?.slug === "business-10000" || plan?.id === 3) return "business";
  if (plan?.slug === "enterprise-100000" || plan?.id === 4) return "enterprise";
  return "starter";
};

const PLAN_TIER_META = {
  trial: { pillLabel: "Free Trial", themeKey: "teal", icon: Sparkles },
  starter: { pillLabel: "Starter", themeKey: "cyan", icon: Zap },
  business: { pillLabel: "Most Popular", themeKey: "emerald", icon: TrendingUp },
  enterprise: { pillLabel: "High Volume", themeKey: "lime", icon: Crown },
};

/**
 * Dashboard-style KPI card matching PastelKpiCard visual design.
 */
function DashboardMetricCard({
  title,
  value,
  subtitle,
  pill,
  metaRight,
  icon: Icon,
  theme = "emerald",
  loading = false,
  compactValue = false,
}) {
  const t = DASHBOARD_CARD_THEMES[theme] || DASHBOARD_CARD_THEMES.emerald;

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 shadow-sm shadow-slate-900/[0.03] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/[0.06] ${t.card}`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-85 transition-opacity group-hover:opacity-100 ${t.topBar}`}
      />
      <span
        className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125 ${t.glow}`}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-105 ${t.iconBox}`}
            >
              <Icon size={16} strokeWidth={2.3} />
            </span>
            <span className="truncate text-xs font-bold text-slate-700">
              {title}
            </span>
          </div>
        </div>

        <div className="mt-3.5">
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p
              className={`font-black tracking-tight tabular-nums text-slate-900 truncate ${
                compactValue ? "text-xl sm:text-[22px]" : "text-2xl sm:text-[28px]"
              }`}
            >
              {value}
            </p>
          )}
          <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="relative mt-3.5 flex items-center justify-between gap-2 border-t border-slate-100/80 pt-2.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-2xs ${t.pill}`}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: t.stroke }}
          />
          {pill}
        </span>

        {metaRight && (
          <span className="text-[11px] font-bold text-slate-500 tabular-nums truncate">
            {metaRight}
          </span>
        )}
      </div>
    </div>
  );
}

const getToken = () => {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token")
  );
};

const getCurrentUser = () => {
  try {
    const raw =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user") ||
      localStorage.getItem("auth_user") ||
      sessionStorage.getItem("auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function Plans() {
  const [searchParams] = useSearchParams();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const isAdmin = useMemo(() => isSuperAdmin(currentUser), [currentUser]);

  // Active Tab for Admin & Client Sub-Section
  const [activeTab, setActiveTab] = useState(isAdmin ? "clients" : "plans");
  const [clientSection, setClientSection] = useState("plans");
  const [estimatedMessages, setEstimatedMessages] = useState(2000);
  const [inspectedPlanId, setInspectedPlanId] = useState(null);
  const [txFilter, setTxFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");

  // Client / Personal Wallet State
  const [wallet, setWallet] = useState({
    balance: 0,
    remaining_balance: 0,
    total_taken: 0,
    total_used: 0,
    total_plan_amount: 0,
    active_plan_amount: 0,
    active_plan_name: null,
    usage_percentage: 0,
    rate: 0.5,
    currency: "INR",
    estimated_messages: 0,
    used_messages: 0,
    total_messages: 0,
    has_active_plan: false,
    active_subscription: null,
    active_plan_id: null,
    has_used_trial: false,
  });

  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin Specific State
  const [clients, setClients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [clientSearch, setClientSearch] = useState("");

  // Modals State
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [recharging, setRecharging] = useState(false);

  // Admin Rate Setting Modal
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [targetClient, setTargetClient] = useState(null);
  const [customRate, setCustomRate] = useState("0.50");
  const [savingRate, setSavingRate] = useState(false);

  // Admin Wallet Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  // Alert Feedback
  const [feedback, setFeedback] = useState(null);

  const getHeaders = useCallback(() => {
    const token = getToken();
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = getHeaders();

      // Parallel requests
      const promises = [
        axios.get(`${API}/user-wallet`, headers).catch(() => ({ data: {} })),
        axios.get(`${API}/plans`, headers).catch(() => ({ data: {} })),
        axios.get(`${API}/user-wallet/transactions?per_page=20`, headers).catch(() => ({ data: {} })),
      ];

      if (isAdmin) {
        promises.push(
          axios.get(`${API}/admin/client-subscriptions`, headers).catch(() => ({ data: {} })),
          axios.get(`${API}/admin/notifications`, headers).catch(() => ({ data: {} }))
        );
      }

      const results = await Promise.all(promises);
      const [walletRes, plansRes, txRes, clientsRes, notifRes] = results;
      
      console.log("ACTIVE SUBSCRIPTION:", walletRes.data?.active_subscription);
      console.log("ACTIVE PLAN:", walletRes.data?.active_subscription?.plan);
      console.log("ACTIVE PLAN ID:", walletRes.data?.active_plan_id);
      if (walletRes.data?.success) {
        setWallet(walletRes.data);
      }
      if (plansRes.data?.success && Array.isArray(plansRes.data.plans) && plansRes.data.plans.length > 0) {
        setPlans(plansRes.data.plans);
      }
      if (txRes.data?.success) {
        const txList = txRes.data.data?.data || txRes.data.data || [];
        setTransactions(Array.isArray(txList) ? txList : []);
      }
      if (clientsRes?.data?.success && Array.isArray(clientsRes.data.clients)) {
        setClients(clientsRes.data.clients);
      }
      if (notifRes?.data?.success && Array.isArray(notifRes.data.notifications)) {
        setNotifications(notifRes.data.notifications);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle URL query parameters (e.g. ?client_id=11&action=rate or ?tab=alerts)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["clients", "alerts", "plans"].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    const clientIdParam = searchParams.get("client_id") || searchParams.get("user_id");
    const actionParam = searchParams.get("action");

    if (clientIdParam && clients.length > 0) {
      const foundClient = clients.find((c) => String(c.id) === String(clientIdParam));
      if (foundClient) {
        if (actionParam === "rate") {
          setActiveTab("clients");
          handleOpenRateModal(foundClient);
        } else if (actionParam === "adjust") {
          setActiveTab("clients");
          handleOpenAdjustModal(foundClient);
        }
      }
    }
  }, [searchParams, clients]);

  // ------------------------------------------
  // CLIENT RECHARGE & RAZORPAY PAYMENT LOGIC
  // ------------------------------------------
  const loadRazorpaySdk = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleOpenRecharge = (plan) => {
    setSelectedPlan(plan);
    setRechargeModalOpen(true);
    setFeedback(null);
  };

  const handleConfirmRecharge = async () => {
    if (!selectedPlan) return;

    const isFreeTrial = selectedPlan.id === 1 || Number(selectedPlan.selling_price) === 0;

    // A. FREE TRIAL ACTIVATION
    if (isFreeTrial) {
      try {
        setRecharging(true);
        const res = await axios.post(
          `${API}/plans/recharge`,
          { plan_id: selectedPlan.id },
          getHeaders()
        );

        if (res.data?.success) {
          setFeedback({
            type: "success",
            text: res.data.message || `Successfully claimed ${selectedPlan.name}! ₹100 Welcome credits added.`,
          });
          setRechargeModalOpen(false);
          fetchData();
          window.dispatchEvent(new CustomEvent("wallet-updated"));
          window.dispatchEvent(new CustomEvent("notifications-updated"));
        } else {
          setFeedback({
            type: "error",
            text: res.data?.message || "Failed to activate Free Trial.",
          });
        }
      } catch (err) {
        setFeedback({
          type: "error",
          text: err.response?.data?.message || "Free trial claim failed.",
        });
      } finally {
        setRecharging(false);
      }
      return;
    }

    // B. PAID PLAN ACTIVATION VIA RAZORPAY GATEWAY
    try {
      setRecharging(true);
      setFeedback(null);

      // 1. Ensure Razorpay checkout script is loaded
      const isLoaded = await loadRazorpaySdk();
      if (!isLoaded && !window.Razorpay) {
        throw new Error("Unable to load Razorpay payment SDK. Please check your internet connection.");
      }

      // 2. Create order on backend
      const orderRes = await axios.post(
        `${API}/razorpay/create-order`,
        {
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          amount: selectedPlan.selling_price,
        },
        getHeaders()
      );

      if (!orderRes.data?.success) {
        throw new Error(orderRes.data?.message || "Failed to initiate Razorpay order.");
      }

      const orderData = orderRes.data;
      const razorpayKey =
        orderData.key ||
        import.meta.env.VITE_RAZORPAY_KEY ||
        "rzp_test_SuOPCHwupVAzCH";

      // 3. Configure Razorpay Checkout options
      const options = {
        key: razorpayKey,
        amount: orderData.amount, // in paise
        currency: orderData.currency || "INR",
        name: "WABA Bot Platform",
        description: `${selectedPlan.name} Subscription`,
        image: "/WABA favicon.png",
        order_id: orderData.order_id,
        handler: async function (paymentResponse) {
          try {
            setRecharging(true);
            setFeedback({
              type: "info",
              text: "Payment received! Verifying transaction signature with bank...",
            });

            // 4. Verify payment on backend
            const verifyRes = await axios.post(
              `${API}/razorpay/verify-payment`,
              {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                plan_id: selectedPlan.id,
                plan_name: selectedPlan.name,
                amount: selectedPlan.selling_price,
              },
              getHeaders()
            );

            if (verifyRes.data?.success) {
              setFeedback({
                type: "success",
                text:
                  verifyRes.data.message ||
                  `Payment of ₹${Number(selectedPlan.selling_price).toLocaleString("en-IN")} Successful! ${selectedPlan.name} is now active.`,
              });
              setRechargeModalOpen(false);
              fetchData();
              window.dispatchEvent(new CustomEvent("wallet-updated"));
              window.dispatchEvent(new CustomEvent("notifications-updated"));
            } else {
              setFeedback({
                type: "error",
                text: verifyRes.data?.message || "Payment verification failed.",
              });
            }
          } catch (verifyErr) {
            setFeedback({
              type: "error",
              text:
                verifyErr.response?.data?.message ||
                "Payment verification failed. Please contact support with Payment ID: " +
                  paymentResponse.razorpay_payment_id,
            });
          } finally {
            setRecharging(false);
          }
        },
        prefill: {
          name: currentUser?.name || "Client User",
          email: currentUser?.email || "",
          contact: currentUser?.phone || currentUser?.mobile || "",
        },
        notes: {
          plan_id: String(selectedPlan.id),
          plan_name: selectedPlan.name,
          user_id: String(currentUser?.id || ""),
        },
        theme: {
          color: "#00a884",
        },
        modal: {
          ondismiss: function () {
            setRecharging(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        setRecharging(false);
        setFeedback({
          type: "error",
          text:
            resp.error?.description ||
            "Payment was cancelled or failed by bank. Please try again.",
        });
      });

      rzp.open();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err.response?.data?.message || err.message || "Unable to start Razorpay payment. Please try again.",
      });
      setRecharging(false);
    }
  };

  // ------------------------------------------
  // ADMIN ACTIONS: SET RATE & ADJUST WALLET
  // ------------------------------------------
  const handleOpenRateModal = (client) => {
    setTargetClient(client);
    setCustomRate(client.rate ? String(client.rate) : "0.50");
    setRateModalOpen(true);
    setFeedback(null);
  };

  const handleSaveRate = async () => {
    if (!targetClient || !customRate) return;
    const numRate = parseFloat(customRate);
    if (isNaN(numRate) || numRate <= 0) {
      alert("Please enter a valid rate (e.g. 0.40)");
      return;
    }

    try {
      setSavingRate(true);
      const res = await axios.post(
        `${API}/admin/set-user-rate`,
        {
          user_id: targetClient.id,
          rate: numRate,
          channel: "whatsapp",
        },
        getHeaders()
      );

      if (res.data?.success) {
        setFeedback({
          type: "success",
          text: `Message rate for ${targetClient.name} updated to ₹${numRate.toFixed(4)}/msg!`,
        });
        setRateModalOpen(false);
        fetchData();
        window.dispatchEvent(new CustomEvent("wallet-updated"));
      } else {
        setFeedback({
          type: "error",
          text: res.data?.message || "Failed to update rate.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        text: err.response?.data?.message || "Error updating message rate.",
      });
    } finally {
      setSavingRate(false);
    }
  };

  const handleOpenAdjustModal = (client) => {
    setTargetClient(client);
    setAdjustType("credit");
    setAdjustAmount("");
    setAdjustNotes("");
    setAdjustModalOpen(true);
    setFeedback(null);
  };

  const handleSaveAdjustment = async () => {
    if (!targetClient || !adjustAmount) return;
    const amountVal = parseFloat(adjustAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("Please enter a valid positive amount");
      return;
    }

    try {
      setSavingAdjustment(true);
      const res = await axios.post(
        `${API}/admin/adjust-user-wallet`,
        {
          user_id: targetClient.id,
          type: adjustType,
          amount: amountVal,
          notes: adjustNotes || `Admin manual adjustment (${adjustType})`,
        },
        getHeaders()
      );

      if (res.data?.success) {
        setFeedback({
          type: "success",
          text: res.data.message || `Wallet adjusted for ${targetClient.name}.`,
        });
        setAdjustModalOpen(false);
        fetchData();
        window.dispatchEvent(new CustomEvent("wallet-updated"));
      } else {
        setFeedback({
          type: "error",
          text: res.data?.message || "Adjustment failed.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        text: err.response?.data?.message || "Error adjusting wallet balance.",
      });
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${API}/admin/notifications/read-all`, {}, getHeaders());
      fetchData();
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (amount) => {
    const num = Number(amount);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(isNaN(num) ? 0 : num);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (rechargeModalOpen && !recharging) setRechargeModalOpen(false);
      if (rateModalOpen && !savingRate) setRateModalOpen(false);
      if (adjustModalOpen && !savingAdjustment) setAdjustModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rechargeModalOpen, recharging, rateModalOpen, savingRate, adjustModalOpen, savingAdjustment]);

  const activeRate = Number(wallet.rate) > 0 ? Number(wallet.rate) : 0.5;
  const estimatedSpend = Math.round(estimatedMessages * activeRate * 100) / 100;

  const recommendedPlan = useMemo(() => {
    const sorted = [...(plans || [])].sort(
      (a, b) => Number(a.selling_price || 0) - Number(b.selling_price || 0)
    );
    if (sorted.length === 0) return null;
    return (
      sorted.find((p) => Number(p.selling_price || 0) >= estimatedSpend) ||
      sorted[sorted.length - 1]
    );
  }, [plans, estimatedSpend]);

  const inspectedPlan = useMemo(
    () => (plans || []).find((p) => p.id === inspectedPlanId) || null,
    [plans, inspectedPlanId]
  );

  const adminMetrics = useMemo(() => {
    const list = Array.isArray(clients) ? clients : [];
    const activeSubscribers = list.filter((c) => Boolean(c.active_plan)).length;
    const totalWalletBalance = list.reduce(
      (sum, c) => sum + Number(c.wallet_balance || 0),
      0
    );
    return {
      totalClients: list.length,
      activeSubscribers,
      totalWalletBalance,
    };
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!Array.isArray(clients)) return [];
    return clients.filter((c) => {
      if (clientFilter === "active" && !c.active_plan) return false;
      if (clientFilter === "zero" && Number(c.wallet_balance || 0) > 0) return false;
      if (!clientSearch.trim()) return true;
      const term = clientSearch.toLowerCase();
      return (
        c.name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.role?.toLowerCase().includes(term)
      );
    });
  }, [clients, clientSearch, clientFilter]);

  const filteredTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter((tx) => {
      const txKind = tx.type || (tx.transaction_type === "credit" ? "credit" : "debit");
      if (txFilter !== "all" && txKind !== txFilter) return false;
      if (!txSearch.trim()) return true;
      const term = txSearch.toLowerCase();
      return (
        tx.description?.toLowerCase().includes(term) ||
        tx.notes?.toLowerCase().includes(term) ||
        tx.transaction_type?.toLowerCase().includes(term) ||
        String(tx.reference_id || "").toLowerCase().includes(term)
      );
    });
  }, [transactions, txFilter, txSearch]);

  const txTotals = useMemo(() => {
    return (transactions || []).reduce(
      (acc, tx) => {
        const amt = Math.abs(Number(tx.amount ?? tx.credits ?? 0));
        const isCredit =
          tx.type === "credit" || tx.transaction_type === "credit";
        if (isCredit) acc.credits += amt;
        else acc.debits += amt;
        return acc;
      },
      { credits: 0, debits: 0 }
    );
  }, [transactions]);

  const usagePercent = Math.min(
    100,
    Math.max(0, Number(wallet.usage_percentage || 0))
  );

  const unreadAlertCount = useMemo(
    () => (notifications || []).filter((n) => !n.is_read).length,
    [notifications]
  );

  const adminTabs = useMemo(
    () => [
      {
        id: "clients",
        label: "Client Subscriptions & Rates",
        count: (clients || []).length,
        icon: Users,
      },
      {
        id: "alerts",
        label: "Plan Purchase Alerts",
        count: unreadAlertCount,
        icon: Bell,
        highlightUnread: unreadAlertCount > 0,
      },
      {
        id: "plans",
        label: "Package Plans & Subscribers",
        count: (plans || []).length,
        icon: Layers,
      },
    ],
    [clients, unreadAlertCount, plans]
  );

  return (
    <div className="space-y-7 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Interactive Showcase Header */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/60 p-5 sm:p-7 shadow-sm card-fade-up">
        <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-16 h-40 w-40 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-200/80 bg-white/85 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 shadow-2xs backdrop-blur-xs">
              <span>{isAdmin ? "Billing Control Center" : "Wallet & Plan Hub"}</span>
            </div>

            <h1 className="mt-2.5 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isAdmin ? "Plans, Subscriptions & Rate Management" : "Plans, Credits & Wallet"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              {isAdmin
                ? "Manage client subscriptions, customize per-message rates, adjust credit balances, and review purchase alerts."
                : "Inspect your plan credits, calculate campaign volume, compare tiers, and top-up your WhatsApp wallet instantly."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isAdmin && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/90 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-2xs">
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                <span>Rate:</span>
                <span className="font-mono text-emerald-700">₹{activeRate.toFixed(2)}/msg</span>
              </div>
            )}

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="group inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700 hover:shadow-sm disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 transition-transform duration-300 ${
                  loading ? "animate-spin text-emerald-600" : "group-hover:rotate-90 text-slate-500 group-hover:text-emerald-600"
                }`}
              />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`modal-pop-in p-4 rounded-2xl text-sm font-medium flex items-center justify-between shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : feedback.type === "info"
              ? "bg-blue-50 text-blue-900 border border-blue-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle
                className={`w-5 h-5 shrink-0 ${
                  feedback.type === "info" ? "text-blue-600" : "text-rose-600"
                }`}
              />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline hover:opacity-80 ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Super Admin Segmented Pill Tabs */}
      {isAdmin && (
        <div className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xs">
          {adminTabs.map(({ id, label, count, icon: Icon, highlightUnread }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`cursor-pointer flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/20"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums ${
                    active
                      ? "bg-white/20 text-white"
                      : highlightUnread
                      ? "bg-rose-100 text-rose-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1 (ADMIN): CLIENT SUBSCRIPTIONS & RATES TABLE          */}
      {/* ========================================================= */}
      {isAdmin && activeTab === "clients" && (
        <div className="space-y-5 card-fade-up">
          {/* Live Admin KPI Strip (Dashboard Pastel Card Style) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DashboardMetricCard
              title="Total Registered Clients"
              value={adminMetrics.totalClients.toLocaleString("en-IN")}
              subtitle="Accounts on billing platform"
              pill="Clients"
              metaRight="Directory"
              icon={Users}
              theme="emerald"
              loading={loading}
            />
            <DashboardMetricCard
              title="Active Plan Subscribers"
              value={adminMetrics.activeSubscribers.toLocaleString("en-IN")}
              subtitle="Clients with active subscription"
              pill="Subscribed"
              metaRight={`${
                adminMetrics.totalClients > 0
                  ? Math.round((adminMetrics.activeSubscribers / adminMetrics.totalClients) * 100)
                  : 0
              }% conversion`}
              icon={Sparkles}
              theme="teal"
              loading={loading}
            />
            <DashboardMetricCard
              title="Combined Wallet Balance"
              value={formatCurrency(adminMetrics.totalWalletBalance)}
              subtitle="Aggregate INR credit across clients"
              pill="INR Total"
              metaRight="Active credits"
              icon={Wallet}
              theme="cyan"
              loading={loading}
            />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Subscriptions, Balances & Message Rates
              </h2>
              <p className="text-xs text-slate-500">
                Set custom per-message rates and top-up or adjust client credits directly.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                {[
                  ["all", "All"],
                  ["active", "Active Plan"],
                  ["zero", "Zero Balance"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setClientFilter(key)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      clientFilter === key
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-68">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search client name or email..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            {filteredClients.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No clients match your current search or filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-bold text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Client Details</th>
                      <th className="py-3.5 px-4">Active Plan</th>
                      <th className="py-3.5 px-4">Wallet Balance</th>
                      <th className="py-3.5 px-4">Per-Msg Rate</th>
                      <th className="py-3.5 px-4">Est. Messages</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.map((client) => {
                      const clientRate = client.rate ? Number(client.rate) : 0.5;
                      const clientBal = client.wallet_balance ? Number(client.wallet_balance) : 0;
                      const estMsgs = clientRate > 0 ? Math.floor(clientBal / clientRate) : 0;

                      return (
                        <tr key={client.id} className="hover:bg-emerald-50/35 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm">{client.name}</div>
                            <div className="text-slate-500">{client.email}</div>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                              Role: {client.role || "client"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {client.active_plan ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  {client.active_plan.name}
                                </span>
                                <div className="text-[11px] text-slate-500">
                                  Deducted per message
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                No active pack
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                              {formatCurrency(clientBal)}
                            </div>
                            <span className="text-[10px] text-slate-400">INR Balance</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-bold text-xs font-mono">
                              <Zap className="w-3.5 h-3.5 text-blue-600" />
                              <span>₹{clientRate.toFixed(4)}</span>
                              <span className="text-[10px] text-blue-600 font-sans font-normal">/msg</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 tabular-nums">
                              {estMsgs.toLocaleString("en-IN")}
                            </span>
                            <span className="text-slate-400 text-[11px]"> msgs</span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenRateModal(client)}
                                className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition shadow-2xs"
                                title="Set message rate for this user"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Set Rate</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenAdjustModal(client)}
                                className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs"
                                title="Credit or Debit wallet manually"
                              >
                                <Wallet className="w-3.5 h-3.5 text-slate-500" />
                                <span>Adjust</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2 (ADMIN): PLAN PURCHASE ALERTS / NOTIFICATIONS        */}
      {/* ========================================================= */}
      {isAdmin && activeTab === "alerts" && (
        <div className="space-y-5 card-fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Plan Purchase & Subscription Alerts
              </h2>
              <p className="text-xs text-slate-500">
                Whenever any client activates a plan, it appears here so you can review or customize pricing.
              </p>
            </div>
            {unreadAlertCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="cursor-pointer self-start px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition shadow-2xs"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="space-y-3">
            {(notifications || []).length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
                No subscription alerts recorded yet.
              </div>
            ) : (
              (notifications || []).map((n) => {
                const clientMatch = (clients || []).find((c) => c.id === n.user_id);
                return (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:-translate-y-0.5 ${
                      n.is_read
                        ? "bg-white border-slate-200 text-slate-700"
                        : "bg-emerald-50/60 border-emerald-200 text-slate-900 shadow-xs"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold">
                          ₹
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                        {!n.is_read && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        {n.message}
                      </p>
                      <div className="text-[11px] text-slate-400">
                        {new Date(n.created_at).toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {clientMatch && (
                        <button
                          type="button"
                          onClick={() => handleOpenRateModal(clientMatch)}
                          className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
                        >
                          Set Rate for {clientMatch.name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3 / CLIENT VIEW: RECHARGE PLANS & WALLET OVERVIEW       */}
      {/* ========================================================= */}
      {(!isAdmin || activeTab === "plans") && (
        <div className="space-y-8 card-fade-up">
          {/* CLIENT WALLET BENTO & PROGRESS (CLIENT ONLY - Admin has no wallet) */}
          {!isAdmin && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <DashboardMetricCard
                  title="Remaining Balance"
                  value={formatCurrency(wallet.remaining_balance ?? wallet.balance)}
                  subtitle={`${(wallet.estimated_messages || 0).toLocaleString("en-IN")} msgs left at ₹${activeRate.toFixed(2)}/msg`}
                  pill={
                    Number(wallet.remaining_balance ?? wallet.balance) > 0
                      ? "Available"
                      : "Low Balance"
                  }
                  metaRight={`₹${activeRate.toFixed(2)}/msg`}
                  icon={Wallet}
                  theme="emerald"
                  loading={loading}
                />

                <DashboardMetricCard
                  title="Total Plan Taken"
                  value={formatCurrency(wallet.total_taken ?? wallet.balance)}
                  subtitle={
                    wallet.active_subscription
                      ? `Credits added (${(wallet.total_messages || 0).toLocaleString("en-IN")} msgs total)`
                      : "Total plan & wallet credits taken"
                  }
                  pill="Plan Credits"
                  metaRight={`${(wallet.total_messages || 0).toLocaleString("en-IN")} msgs`}
                  icon={Layers}
                  theme="teal"
                  loading={loading}
                />

                <DashboardMetricCard
                  title="Amount Used"
                  value={formatCurrency(wallet.total_used ?? 0)}
                  subtitle={`${(wallet.used_messages || 0).toLocaleString("en-IN")} msgs sent across bots`}
                  pill={`${usagePercent.toFixed(1)}% Used`}
                  metaRight={`${(wallet.used_messages || 0).toLocaleString("en-IN")} sent`}
                  icon={TrendingUp}
                  theme="cyan"
                  loading={loading}
                />

                <DashboardMetricCard
                  title="Current Active Plan"
                  value={
                    wallet?.active_subscription?.plan?.name ||
                    wallet?.active_plan_name ||
                    "No Active Plan"
                  }
                  subtitle={
                    wallet.active_subscription
                      ? wallet.active_subscription.expires_at
                        ? `Valid until ${new Date(
                            wallet.active_subscription.expires_at
                          ).toLocaleDateString("en-IN")}`
                        : "Lifetime validity · Per message"
                      : "Select a plan below to activate"
                  }
                  pill={wallet.active_subscription ? "Active" : "No Plan"}
                  metaRight={wallet.active_subscription ? "Lifetime" : "Choose tier"}
                  icon={Sparkles}
                  theme="green"
                  loading={loading}
                  compactValue
                />
              </div>

              {/* Wallet Breakdown Progress Strip */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs font-semibold">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                    <span className="text-slate-600">
                      Plan Taken:{" "}
                      <strong className="font-extrabold text-slate-900 tabular-nums">
                        {formatCurrency(wallet.total_taken ?? wallet.balance)}
                      </strong>
                    </span>
                    <span className="text-rose-700">
                      Used:{" "}
                      <strong className="font-extrabold tabular-nums">
                        {formatCurrency(wallet.total_used ?? 0)}
                      </strong>
                    </span>
                    <span className="text-emerald-700">
                      Remaining:{" "}
                      <strong className="font-extrabold tabular-nums">
                        {formatCurrency(wallet.remaining_balance ?? wallet.balance)}
                      </strong>
                    </span>
                  </div>
                  <span className="font-bold text-slate-700 tabular-nums">
                    {usagePercent.toFixed(1)}% Used · {(100 - usagePercent).toFixed(1)}% Left
                  </span>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 transition-all duration-500"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>

              {/* Client Interactive Section Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xs">
                  {[
                    { id: "plans", label: "Recharge Plans & Estimator", icon: Layers },
                    {
                      id: "passbook",
                      label: "Credit Passbook",
                      count: (transactions || []).length,
                      icon: Receipt,
                    },
                  ].map(({ id, label, count, icon: Icon }) => {
                    const active = clientSection === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setClientSection(id)}
                        className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 ${
                          active
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                        {typeof count === "number" && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums ${
                              active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CLIENT INTERACTIVE MESSAGE COST ESTIMATOR + PLANS CATALOG */}
          {(isAdmin || clientSection === "plans") && (
            <div className="space-y-6">
              {!isAdmin && (
                <div className="rounded-3xl border border-emerald-200/80 bg-white p-5 sm:p-6 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <SlidersHorizontal className="w-4 h-4" />
                          </span>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900">
                              Interactive Message Volume & Plan Finder
                            </h3>
                            <p className="text-xs text-slate-500">
                              Slide your expected WhatsApp message volume to preview cost & best-fit pack.
                            </p>
                          </div>
                        </div>

                        <div className="inline-flex items-baseline gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5">
                          <span className="text-base font-extrabold text-slate-900 tabular-nums">
                            {estimatedMessages.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">messages</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-sm font-extrabold text-emerald-700 tabular-nums">
                            {formatCurrency(estimatedSpend)}
                          </span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min={100}
                        max={200000}
                        step={100}
                        value={estimatedMessages}
                        onChange={(e) => setEstimatedMessages(Number(e.target.value))}
                        aria-label="Estimated WhatsApp message volume"
                        className="waba-range w-full cursor-pointer"
                      />

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-400 mr-1">
                          Quick presets:
                        </span>
                        {ESTIMATOR_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setEstimatedMessages(preset)}
                            className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition tabular-nums ${
                              estimatedMessages === preset
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                            }`}
                          >
                            {preset.toLocaleString("en-IN")} msgs
                          </button>
                        ))}
                      </div>
                    </div>

                    {recommendedPlan && (
                      <div className="lg:w-72 shrink-0 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/70 p-4">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                          Recommended Pack
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900 truncate">
                            {recommendedPlan.name}
                          </h4>
                          <span className="font-mono text-xs font-extrabold text-emerald-800">
                            ₹{Number(recommendedPlan.selling_price).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">
                          Covers up to{" "}
                          <strong className="text-slate-900 tabular-nums">
                            {Math.floor(Number(recommendedPlan.selling_price) / activeRate).toLocaleString("en-IN")}
                          </strong>{" "}
                          messages at ₹{activeRate.toFixed(2)}/msg
                        </p>
                        <button
                          type="button"
                          disabled={
                            !isAdmin &&
                            (recommendedPlan.slug === "trial-100" || recommendedPlan.id === 1) &&
                            wallet.has_used_trial &&
                            wallet.active_plan_id !== 1
                          }
                          onClick={() => handleOpenRecharge(recommendedPlan)}
                          className="mt-3 w-full cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>Activate Best Fit</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {isAdmin ? "Package Plans & Active Subscribers" : "Choose Your Recharge Plan"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {isAdmin
                        ? "Overview of available recharge plans, subscriber distribution, and revenue generated from each plan."
                        : "Instant Razorpay top-up with zero hidden expiry — balance deducts only per delivered bot message."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {(plans || []).map((plan) => {
                    const tierKey = getPlanTierKey(plan);
                    const meta = PLAN_TIER_META[tierKey] || PLAN_TIER_META.starter;
                    const theme =
                      DASHBOARD_CARD_THEMES[meta.themeKey] || DASHBOARD_CARD_THEMES.emerald;
                    const TierIcon = meta.icon;
                    const isTrial = tierKey === "trial";
                    const isBusiness = tierKey === "business";

                    const isActivePlan =
                      !isAdmin &&
                      (wallet.active_plan_id === plan.id ||
                        (isTrial && !wallet.active_plan_id && Number(wallet.balance) > 0));

                    const isMatchedRecommendation =
                      !isAdmin && recommendedPlan?.id === plan.id;

                    const isTrialClaimed =
                      !isAdmin && isTrial && wallet.has_used_trial && wallet.active_plan_id !== 1;

                    const isInspected = inspectedPlan?.id === plan.id;
                    const planEstMessages = Math.floor(
                      Number(plan.selling_price || 0) / activeRate
                    );
                    const postRechargeBalance =
                      Number(wallet.balance || 0) + Number(plan.selling_price || 0);

                    const subCount = Number(plan.subscribers_count || 0);
                    const subList = Array.isArray(plan.subscribers) ? plan.subscribers : [];

                    return (
                      <div
                        key={plan.id}
                        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 shadow-sm shadow-slate-900/[0.03] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/[0.06] ${
                          theme.card
                        } ${
                          isActivePlan
                            ? "ring-2 ring-emerald-500/60"
                            : isMatchedRecommendation
                            ? "ring-2 ring-teal-500/45"
                            : ""
                        }`}
                      >
                        {/* Dashboard 3px top gradient ribbon */}
                        <span
                          className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-85 transition-opacity group-hover:opacity-100 ${theme.topBar}`}
                        />
                        {/* Dashboard ambient corner glow */}
                        <span
                          className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125 ${theme.glow}`}
                        />

                        <div className="relative">
                          {/* Top Header Row matching PastelKpiCard */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-105 ${theme.iconBox}`}
                              >
                                <TierIcon size={16} strokeWidth={2.3} />
                              </span>
                              <h3 className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                                {plan.name}
                              </h3>
                            </div>
                          </div>

                          {/* Status Pill Strip */}
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-2xs ${
                                isActivePlan
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : theme.pill
                              }`}
                            >
                              {isActivePlan ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: theme.stroke }}
                                />
                              )}
                              <span>{isActivePlan ? "Active Plan" : meta.pillLabel}</span>
                            </span>

                            {isMatchedRecommendation && !isActivePlan && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-2xs">
                                <Sparkles className="w-3 h-3" />
                                Best Match
                              </span>
                            )}
                          </div>

                          <div className="mt-3.5 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-[28px] font-black tracking-tight tabular-nums text-slate-900">
                              ₹{Number(plan.selling_price).toLocaleString("en-IN")}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              credits
                            </span>
                          </div>

                          {!isAdmin && (
                            <div
                              className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums shadow-2xs ${theme.pill}`}
                            >
                              <Zap className="w-3 h-3 shrink-0" />
                              <span>≈ {planEstMessages.toLocaleString("en-IN")} messages</span>
                            </div>
                          )}

                          <p className="mt-3 text-xs leading-relaxed text-slate-600 min-h-[38px]">
                            {plan.description}
                          </p>

                          <ul className="mt-4 space-y-2 border-t border-slate-200/70 pt-3.5 text-xs text-slate-600">
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                              <span>
                                <strong>₹{Number(plan.selling_price).toLocaleString("en-IN")}</strong> Wallet Credit
                              </span>
                            </li>

                            <li className="flex items-center gap-2">
                              <Zap className="w-4 h-4 shrink-0 text-slate-400" />
                              <span>Full access to WhatsApp Automation</span>
                            </li>

                            <li className="flex items-center gap-2">
                              <Clock className="w-4 h-4 shrink-0 text-emerald-600" />
                              <span>Deducted per delivered bot message</span>
                            </li>
                          </ul>

                          {/* Client Balance Impact Toggle Preview */}
                          {!isAdmin && !isTrialClaimed && (
                            <div className="mt-3.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setInspectedPlanId(isInspected ? null : plan.id)
                                }
                                className="cursor-pointer text-[11px] font-bold text-emerald-700 underline-offset-2 hover:underline"
                              >
                                {isInspected ? "Hide balance impact" : "Preview wallet impact"}
                              </button>

                              {isInspected && (
                                <div className="mt-2 rounded-xl border border-emerald-200 bg-white/85 p-2.5 text-[11px] text-slate-700 space-y-1 shadow-2xs">
                                  <div className="flex justify-between">
                                    <span>New Balance:</span>
                                    <strong className="tabular-nums text-slate-900">
                                      {formatCurrency(postRechargeBalance)}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Msgs After:</span>
                                    <strong className="tabular-nums text-emerald-700">
                                      {Math.floor(postRechargeBalance / activeRate).toLocaleString("en-IN")} msgs
                                    </strong>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Admin Subscriber List Section on Plan Card */}
                          {isAdmin && (
                            <div className="mt-4 pt-3.5 border-t border-slate-200/70">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                                <span className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                                  Subscribed Users ({subCount})
                                </span>
                                {Number(plan.total_revenue || 0) > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 tabular-nums">
                                    ₹{Number(plan.total_revenue).toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>

                              {subList.length > 0 ? (
                                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                  {subList.map((sub) => (
                                    <div
                                      key={sub.user_id}
                                      className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-slate-200/70 text-xs"
                                    >
                                      <div className="min-w-0 pr-2">
                                        <p className="font-bold text-slate-800 truncate">{sub.user_name}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{sub.user_email}</p>
                                      </div>
                                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                        {sub.status || "active"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-400 italic py-1">
                                  No users subscribed to this plan yet.
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Action Button */}
                        <div className="relative mt-5 pt-3 border-t border-slate-100/80">
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab("clients")}
                              className="w-full cursor-pointer rounded-xl py-2.5 text-center text-xs font-bold bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 transition shadow-2xs flex items-center justify-center gap-1.5"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>View Subscribed Clients ({subCount})</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isTrialClaimed}
                              onClick={() => handleOpenRecharge(plan)}
                              className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-4 text-center text-xs font-bold transition-all duration-200 ${
                                isTrialClaimed
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                  : `cursor-pointer ${
                                      isActivePlan || isBusiness
                                        ? DASHBOARD_CARD_THEMES.emerald.cta
                                        : theme.cta
                                    }`
                              }`}
                            >
                              <span>
                                {isTrialClaimed
                                  ? "Trial Already Used"
                                  : isActivePlan
                                  ? "Top-up / Renew Plan"
                                  : isTrial
                                  ? "Claim ₹100 Free Trial"
                                  : `Activate ₹${Number(plan.selling_price).toLocaleString("en-IN")} Plan`}
                              </span>
                              {!isTrialClaimed && (
                                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* LIVE CLIENT CREDIT PASSBOOK TAB */}
          {!isAdmin && clientSection === "passbook" && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5 card-fade-up">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Credit Passbook & Transactions
                  </h2>
                  <p className="text-xs text-slate-500">
                    Audit log of plan credits, manual adjustments, and per-message wallet deductions.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 font-bold text-emerald-800 tabular-nums">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    Credited: {formatCurrency(txTotals.credits)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5 font-bold text-rose-800 tabular-nums">
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                    Debited: {formatCurrency(txTotals.debits)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 self-start">
                  {[
                    ["all", "All Entries"],
                    ["credit", "Credits Only"],
                    ["debit", "Debits Only"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTxFilter(key)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        txFilter === key
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter by description or reference..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-600">
                    {(transactions || []).length === 0
                      ? "No wallet transactions recorded yet."
                      : "No transactions match your filter criteria."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setClientSection("plans")}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                  >
                    <span>Explore Recharge Plans</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Balance After</th>
                        <th className="py-3 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map((tx) => {
                        const isCredit =
                          tx.type === "credit" || tx.transaction_type === "credit";
                        const amountVal = Math.abs(Number(tx.amount ?? tx.credits ?? 0));
                        return (
                          <tr key={tx.id} className="hover:bg-emerald-50/30 transition-colors">
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap tabular-nums">
                              {tx.created_at
                                ? new Date(tx.created_at).toLocaleString("en-IN")
                                : "-"}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  isCredit
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {isCredit ? (
                                  <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <ArrowUpRight className="w-3 h-3 text-rose-600" />
                                )}
                                {isCredit ? "Credit" : "Debit"}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                                {tx.transaction_type || tx.type || "wallet"}
                              </span>
                            </td>
                            <td
                              className={`py-3 px-4 font-extrabold whitespace-nowrap tabular-nums ${
                                isCredit ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {isCredit ? "+" : "-"}
                              {formatCurrency(amountVal)}
                            </td>
                            <td className="py-3 px-4 text-slate-900 font-bold whitespace-nowrap tabular-nums">
                              {formatCurrency(tx.balance_after ?? 0)}
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                              {tx.description || tx.notes || tx.reference_id || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CONFIRM PLAN RECHARGE                            */}
      {/* ========================================================= */}
      {rechargeModalOpen && selectedPlan && (
        <div
          onClick={() => !recharging && setRechargeModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-pop-in w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CreditCard className="w-4 h-4" />
                </span>
                Confirm Plan Activation
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                disabled={recharging}
                onClick={() => setRechargeModalOpen(false)}
                className="cursor-pointer rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Plan Selected</span>
                <span className="font-extrabold text-slate-900">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Recharge Credits</span>
                <span className="font-extrabold text-emerald-700 text-base tabular-nums">
                  ₹{Number(selectedPlan.selling_price).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Est. Messages Added</span>
                <span className="font-bold text-slate-800 tabular-nums">
                  +{Math.floor(Number(selectedPlan.selling_price || 0) / activeRate).toLocaleString("en-IN")} msgs
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Usage Validity</span>
                <span className="font-semibold text-emerald-700">
                  Deducted per message (No expiry)
                </span>
              </div>

              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 mt-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Current Balance</span>
                  <span className="font-bold tabular-nums">{formatCurrency(wallet.balance)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-sm text-emerald-900">
                  <span className="font-bold">New Estimated Balance</span>
                  <span className="font-extrabold tabular-nums">
                    {formatCurrency(Number(wallet.balance) + Number(selectedPlan.selling_price))}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={recharging}
                onClick={() => setRechargeModalOpen(false)}
                className="flex-1 cursor-pointer py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={recharging}
                onClick={handleConfirmRecharge}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold hover:from-emerald-700 hover:to-teal-700 transition shadow-md shadow-emerald-700/20 disabled:opacity-50 cursor-pointer"
              >
                {recharging ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : selectedPlan.id === 1 || Number(selectedPlan.selling_price) === 0 ? (
                  <span>Claim Free Trial</span>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay ₹{Number(selectedPlan.selling_price).toLocaleString("en-IN")}</span>
                  </>
                )}
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Secured by <strong>Razorpay</strong> · UPI, Cards & NetBanking</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADMIN SET USER MESSAGE RATE                      */}
      {/* ========================================================= */}
      {rateModalOpen && targetClient && (
        <div
          onClick={() => !savingRate && setRateModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-pop-in w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Zap className="w-4 h-4" />
                </span>
                Set Per-Message Rate
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                disabled={savingRate}
                onClick={() => setRateModalOpen(false)}
                className="cursor-pointer rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Target Client
                </div>
                <div className="font-extrabold text-sm text-slate-900 mt-0.5">{targetClient.name}</div>
                <div className="text-xs text-slate-500">{targetClient.email}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Message Rate (₹ INR per message)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.0001"
                    max="10.0"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder="0.50"
                    className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-extrabold font-mono"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                  Quick Presets:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[0.2, 0.25, 0.3, 0.4, 0.5, 0.65, 0.75].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomRate(String(preset))}
                      className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition ${
                        parseFloat(customRate) === preset
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      ₹{preset.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>

              {parseFloat(customRate) > 0 && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-blue-900 flex items-center justify-between">
                  <span>Projected Message Capacity:</span>
                  <strong className="font-extrabold tabular-nums">
                    {Math.floor(Number(targetClient.wallet_balance || 0) / parseFloat(customRate)).toLocaleString("en-IN")} msgs
                  </strong>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={savingRate}
                onClick={() => setRateModalOpen(false)}
                className="flex-1 cursor-pointer py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingRate}
                onClick={handleSaveRate}
                className="flex-1 cursor-pointer py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-sm shadow-blue-600/20"
              >
                {savingRate ? "Updating..." : "Save Rate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADMIN ADJUST WALLET BALANCE                      */}
      {/* ========================================================= */}
      {adjustModalOpen && targetClient && (
        <div
          onClick={() => !savingAdjustment && setAdjustModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-pop-in w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Wallet className="w-4 h-4" />
                </span>
                Adjust Client Wallet
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                disabled={savingAdjustment}
                onClick={() => setAdjustModalOpen(false)}
                className="cursor-pointer rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Client Wallet
                </div>
                <div className="font-extrabold text-sm text-slate-900 mt-0.5">{targetClient.name}</div>
                <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  Current Balance:{" "}
                  <strong className="text-slate-800">
                    {formatCurrency(targetClient.wallet_balance || 0)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("credit")}
                    className={`cursor-pointer py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      adjustType === "credit"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Credit (Add ₹)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType("debit")}
                    className={`cursor-pointer py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      adjustType === "debit"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" />
                    Debit (Deduct ₹)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Amount (₹ INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="500.00"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-extrabold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Notes / Reason (Optional)
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Special promotional discount, bank refund..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {parseFloat(adjustAmount) > 0 && (
                <div
                  className={`rounded-xl border px-3 py-2 text-xs flex items-center justify-between ${
                    adjustType === "credit"
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                      : "border-rose-200 bg-rose-50/70 text-rose-900"
                  }`}
                >
                  <span>Projected Balance After Adjustment:</span>
                  <strong className="font-extrabold tabular-nums">
                    {formatCurrency(
                      adjustType === "credit"
                        ? Number(targetClient.wallet_balance || 0) + parseFloat(adjustAmount)
                        : Math.max(0, Number(targetClient.wallet_balance || 0) - parseFloat(adjustAmount))
                    )}
                  </strong>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={savingAdjustment}
                onClick={() => setAdjustModalOpen(false)}
                className="flex-1 cursor-pointer py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAdjustment}
                onClick={handleSaveAdjustment}
                className={`flex-1 cursor-pointer py-2.5 rounded-xl text-white text-xs font-bold transition disabled:opacity-50 ${
                  adjustType === "credit"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
                    : "bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20"
                }`}
              >
                {savingAdjustment ? "Processing..." : `Confirm ${adjustType === "credit" ? "Credit" : "Debit"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}