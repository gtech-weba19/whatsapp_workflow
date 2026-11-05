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
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  AlertCircle,
  Users,
  Edit3,
  DollarSign,
  PlusCircle,
  MinusCircle,
  Search,
  Bell,
  Check,
  X,
  Layers,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const isAdmin = useMemo(() => isSuperAdmin(currentUser), [currentUser]);

  // Active Tab for Admin
  const [activeTab, setActiveTab] = useState(isAdmin ? "clients" : "plans");

  // Client / Personal Wallet State
  const [wallet, setWallet] = useState({
    balance: 0,
    rate: 0.5,
    currency: "INR",
    estimated_messages: 0,
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

  const filteredClients = useMemo(() => {
    if (!Array.isArray(clients)) return [];
    if (!clientSearch.trim()) return clients;
    const term = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.role?.toLowerCase().includes(term)
    );
  }, [clients, clientSearch]);

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isAdmin ? "Plans, Subscriptions & Rate Management" : "Plans & Wallet"}
            </h1>
            {isAdmin && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                Super Admin
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "Manage client subscriptions, customize per-message rates, adjust credit balances, and review purchase alerts."
              : "Recharge your message balance, choose a plan, and track deduction passbook history."}
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between shadow-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline hover:opacity-80 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Super Admin Navigation Tabs */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("clients")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "clients"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Client Subscriptions & Rates ({(clients || []).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("alerts")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "alerts"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Plan Purchase Alerts ({(notifications || []).filter((n) => !n.is_read).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "plans"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Package Plans & Subscribers ({(plans || []).length})</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1 (ADMIN): CLIENT SUBSCRIPTIONS & RATES TABLE          */}
      {/* ========================================================= */}
      {isAdmin && activeTab === "clients" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                All Clients — Subscriptions, Balances & Message Rates
              </h2>
              <p className="text-xs text-slate-500">
                Set custom rates per message (e.g. ₹0.30 or ₹0.50) and top-up or adjust credits directly.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
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

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No clients match your search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase tracking-wider font-semibold text-[11px]">
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
                        <tr key={client.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm">{client.name}</div>
                            <div className="text-slate-500">{client.email}</div>
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
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
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                No active pack
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-sm font-extrabold text-slate-900">
                              {formatCurrency(clientBal)}
                            </div>
                            <span className="text-[10px] text-slate-400">INR Balance</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-bold text-xs">
                              <Zap className="w-3.5 h-3.5 text-blue-600" />
                              <span>₹{clientRate.toFixed(4)}</span>
                              <span className="text-[10px] text-blue-600 font-normal">/ msg</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800">{estMsgs.toLocaleString()}</span>
                            <span className="text-slate-400 text-[11px]"> msgs</span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenRateModal(client)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition shadow-2xs"
                                title="Set message rate for this user"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Set Rate</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenAdjustModal(client)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs"
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
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Live Plan Purchase & Subscription Alerts
              </h2>
              <p className="text-xs text-slate-500">
                Whenever any client activates a plan, it appears here in real-time so you can set custom pricing.
              </p>
            </div>
            {(notifications || []).some((n) => !n.is_read) && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
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
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
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
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
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
        <div className="space-y-8">
          {/* Stats Cards: Balance, Rate, Estimated Messages, Active Plan (CLIENT ONLY - Admin has no wallet) */}
          {!isAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Wallet Balance Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white shadow-lg shadow-emerald-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                    Live Wallet Balance
                  </span>
                  <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {formatCurrency(wallet.balance)}
                  </h2>
                  <p className="mt-1 text-xs text-emerald-100">
                    Available for WhatsApp & SMS messages
                  </p>
                </div>
              </div>

              {/* Per Message Rate Card */}
              <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Per Message Rate
                  </span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    ₹{Number(wallet.rate || 0.5).toFixed(2)}
                    <span className="text-sm font-normal text-slate-500"> / msg</span>
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Configured rate per delivered message
                  </p>
                </div>
              </div>

              {/* Estimated Messages Remaining */}
              <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Est. Messages Left
                  </span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {(wallet.estimated_messages || 0).toLocaleString()}
                    <span className="text-sm font-normal text-slate-500"> msgs</span>
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Calculated dynamically: Balance ÷ Rate
                  </p>
                </div>
              </div>

              {/* Active Subscription Plan */}
              <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Current Active Plan
                  </span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                 <h3 className="text-xl font-extrabold text-slate-900 tracking-tight truncate">
                      {wallet?.active_subscription?.plan?.name || "No Active Plan"}
                    </h3>
                   <p className="mt-1 text-xs font-semibold text-emerald-700">
                    {wallet.active_subscription
                      ? wallet.active_subscription.expires_at
                        ? `Valid until ${new Date(
                            wallet.active_subscription.expires_at
                          ).toLocaleDateString("en-IN")}`
                        : "Lifetime validity · Deducted per message"
                      : "No active subscription"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Catalog of Plans (Rendered if tab is plans or for non-admin) */}
          {(!isAdmin || activeTab === "plans") && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isAdmin ? "Package Plans & Active Subscribers" : "Select a Recharge Plan"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {isAdmin
                      ? "Overview of available recharge plans, subscriber distribution, and revenue generated from each plan."
                      : "Instantly top-up your message wallet. Admin is notified immediately to configure rates."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(plans || []).map((plan) => {
                  const isTrial = plan.slug === "trial-100" || plan.id === 1;
                  const isStarter = plan.slug === "starter-1000" || plan.id === 2;
                  const isBusiness = plan.slug === "business-10000" || plan.id === 3;
                  const isEnterprise = plan.slug === "enterprise-100000" || plan.id === 4;

                  const isActivePlan =
                    !isAdmin && (
                      wallet.active_plan_id === plan.id ||
                      (isTrial && !wallet.active_plan_id && Number(wallet.balance) > 0)
                    );

                  const isTrialClaimed =
                    !isAdmin && isTrial && wallet.has_used_trial && wallet.active_plan_id !== 1;

                  const subCount = Number(plan.subscribers_count || 0);
                  const subList = Array.isArray(plan.subscribers) ? plan.subscribers : [];

                  return (
                    <div
                      key={plan.id}
                      className={`relative flex flex-col justify-between rounded-2xl p-6 transition duration-200 border ${
                        isAdmin
                          ? subCount > 0
                            ? "border-emerald-300 bg-white shadow-sm ring-1 ring-emerald-400/20"
                            : "border-slate-200 bg-white shadow-xs"
                          : isActivePlan
                          ? "border-emerald-500 bg-emerald-50/30 shadow-md ring-2 ring-emerald-500/40"
                          : isBusiness
                          ? "border-emerald-300 bg-white shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                      }`}
                    >
                      {/* Top Badges */}
                      {isAdmin ? (
                        <span
                          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1 ${
                            subCount > 0
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-700 text-white"
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          {subCount > 0
                            ? `${subCount} Client${subCount === 1 ? "" : "s"} Subscribed`
                            : "0 Subscribed"}
                        </span>
                      ) : (
                        <>
                          {isActivePlan && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-600 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Active Plan
                            </span>
                          )}

                          {!isActivePlan && isBusiness && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-xs">
                              Most Popular
                            </span>
                          )}

                          {!isActivePlan && isTrial && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-teal-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-xs">
                              Free Trial Pack
                            </span>
                          )}
                        </>
                      )}

                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                          {isEnterprise && <Sparkles className="w-5 h-5 text-amber-500" />}
                        </div>

                        <div className="mt-4 flex items-baseline">
                          <span className="text-3xl font-extrabold text-slate-900">
                            ₹{Number(plan.selling_price).toLocaleString("en-IN")}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-600 min-h-[36px]">
                          {plan.description}
                        </p>

                        <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-xs text-slate-600">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              <strong>₹{Number(plan.selling_price).toLocaleString()}</strong> Wallet Credit
                            </span>
                          </li>

                          <li className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>Full access to WhatsApp Automation</span>
                          </li>

                          <li className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Deducted per delivered bot message</span>
                          </li>
                        </ul>

                        {/* Admin Subscriber List Section on Plan Card */}
                        {isAdmin && (
                          <div className="mt-5 pt-3.5 border-t border-slate-100">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                              <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-emerald-600" />
                                Subscribed Users ({subCount})
                              </span>
                              {Number(plan.total_revenue || 0) > 0 && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  ₹{Number(plan.total_revenue).toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>

                            {subList.length > 0 ? (
                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {subList.map((sub) => (
                                  <div
                                    key={sub.user_id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
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
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => setActiveTab("clients")}
                          className="mt-6 w-full rounded-xl py-2.5 text-center text-xs font-bold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>View Subscribed Clients ({subCount})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isTrialClaimed}
                          onClick={() => handleOpenRecharge(plan)}
                          className={`mt-6 w-full rounded-xl py-2.5 text-center text-xs font-bold transition shadow-xs ${
                            isTrialClaimed
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                              : isActivePlan
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : isBusiness
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-slate-900 text-white hover:bg-slate-800"
                          }`}
                        >
                          {isTrialClaimed
                            ? "Trial Already Used"
                            : isActivePlan
                            ? "Top-up / Renew Plan"
                            : isTrial
                            ? "Claim ₹100 Free Trial"
                            : `Activate Plan ₹${Number(plan.selling_price).toLocaleString("en-IN")}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transaction Passbook: Only for Client / Non-Admin */}
          {/* {!isAdmin && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Credit Passbook & Transactions</h2>
                  <p className="text-xs text-slate-500">
                    Complete audit log of credits added, plan subscriptions, and message deductions.
                  </p>
                </div>
              </div>

              {(transactions || []).length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No transactions recorded in this wallet yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Balance After</th>
                        <th className="py-3 px-4">Reference / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(transactions || []).map((tx) => {
                        const isCredit = tx.transaction_type === "credit";
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {tx.created_at ? new Date(tx.created_at).toLocaleString("en-IN") : "-"}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
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
                            <td
                              className={`py-3 px-4 font-bold whitespace-nowrap ${
                                isCredit ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {isCredit ? "+" : "-"}₹{Math.abs(Number(tx.credits)).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-slate-900 font-semibold whitespace-nowrap">
                              ₹{Number(tx.balance_after || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                              {tx.notes || tx.reference_type || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )} */}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CONFIRM PLAN RECHARGE                            */}
      {/* ========================================================= */}
      {rechargeModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Confirm Plan Activation
              </h3>
              <button
                onClick={() => setRechargeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Plan Selected</span>
                <span className="font-bold text-slate-900">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Recharge Amount</span>
                <span className="font-extrabold text-emerald-700 text-base">
                  ₹{Number(selectedPlan.selling_price).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Usage Validity</span>
                <span className="font-semibold text-emerald-700">
                  Deducted per message (No expiry)
                </span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100 pt-2">
                <span className="text-slate-500">New Estimated Balance</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(Number(wallet.balance) + Number(selectedPlan.selling_price))}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRechargeModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={recharging}
                onClick={handleConfirmRecharge}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 text-white text-xs font-bold hover:from-emerald-700 hover:to-green-800 transition shadow-md shadow-emerald-700/20 disabled:opacity-50 cursor-pointer"
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
                    <span>Pay ₹{Number(selectedPlan.selling_price).toLocaleString("en-IN")} with Razorpay</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Set Per-Message Rate
              </h3>
              <button
                onClick={() => setRateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs text-slate-500">Client Name</div>
                <div className="font-bold text-sm text-slate-900">{targetClient.name}</div>
                <div className="text-xs text-slate-500">{targetClient.email}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message Rate (₹ INR per message)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
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
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Quick Presets:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[0.2, 0.25, 0.3, 0.4, 0.5, 0.65, 0.75].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomRate(String(preset))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        parseFloat(customRate) === preset
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      ₹{preset.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRateModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingRate}
                onClick={handleSaveRate}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                Adjust Client Wallet
              </h3>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs text-slate-500">Client</div>
                <div className="font-bold text-sm text-slate-900">{targetClient.name}</div>
                <div className="text-xs text-slate-500">
                  Current Balance: ₹{Number(targetClient.wallet_balance || 0).toFixed(2)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("credit")}
                    className={`py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      adjustType === "credit"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Credit (Add ₹)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType("debit")}
                    className={`py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      adjustType === "debit"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" />
                    Debit (Deduct ₹)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount (₹ INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="500.00"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Reason (Optional)
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Special promotional discount, bank refund..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAdjustment}
                onClick={handleSaveAdjustment}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition disabled:opacity-50 ${
                  adjustType === "credit"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
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