
import {
  Menu,
  ChevronDown,
  LogOut,
  UserRound,
  ShieldCheck,
  Settings,
  Check,
  CircleUserRound,
  LayoutDashboard,
  Bot,
  Workflow,
  MessageCircle,
  Users,
  BarChart3,
  FileText,
  AlertTriangle,
  Wallet,
  Bell,
  CreditCard,
  Sparkles,
  Clock,
  ArrowUpRight,
  CheckCheck,
} from "lucide-react";


import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  Link,
} from "react-router-dom";

import axios from "axios";
import { isSuperAdmin } from "../../utils/permission";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

const getPageInfo = (pathname, user = {}) => {
  const path = pathname.replace(/\/+$/, "") || "/dashboard";

  if (path === "/dashboard" || path === "") {
    let dashboardTitle = `${user?.role || "User"} Dashboard`;
    let dashboardSubtitle = "Manage your account, channels, and preferences";

    if (user?.isSuperAdmin || user?.roleSlug === "super_admin") {
      dashboardTitle = "Super Admin Dashboard";
      dashboardSubtitle = "Platform administration, tenants, and system overview";
    } else if (user?.roleSlug === "client" || user?.roleSlug === "admin") {
      dashboardTitle = "Client Dashboard";
      dashboardSubtitle = "Manage your WhatsApp automation, bots, and team";
    } else if (user?.roleSlug === "manager") {
      dashboardTitle = "Manager Dashboard";
      dashboardSubtitle = "Team operations, bots, and workflows overview";
    } else if (user?.roleSlug === "agent") {
      dashboardTitle = "Support Agent Dashboard";
      dashboardSubtitle = "Support conversations, bots, and contacts";
    } else if (user?.roleSlug === "user") {
      dashboardTitle = "User Dashboard";
      dashboardSubtitle = "Account activity, contacts, and message templates";
    }

    return {
      title: dashboardTitle,
      subtitle: dashboardSubtitle,
      Icon: LayoutDashboard,
    };
  }

  const routes = {
    "/roles-permissions": {
      title: "Roles & Permissions",
      subtitle: "Dynamic role management and permission matrix",
      Icon: ShieldCheck,
    },
    "/client-users": {
      title: "Client Users",
      subtitle: "Manage team members, roles, and account access",
      Icon: UserRound,
    },
    "/clients": {
      title: "Clients Management",
      subtitle: "Overview of registered client organizations and workspaces",
      Icon: Users,
    },
    "/whatsapp-accounts": {
      title: "WhatsApp Accounts",
      subtitle: "Connected WhatsApp Business numbers and credentials",
      Icon: MessageCircle,
    },
    "/bots": {
      title: "Bots Management",
      subtitle: "Create, configure, and monitor AI WhatsApp bots",
      Icon: Bot,
    },
    "/workflow-builder": {
      title: "Workflow Builder",
      subtitle: "Visual chatbot workflow and automation builder",
      Icon: Workflow,
    },
    "/failed-workflows": {
      title: "Failed Workflows",
      subtitle: "Track errors and retry failed workflow executions",
      Icon: AlertTriangle,
    },
    "/contacts": {
      title: "Contacts",
      subtitle: "Customer directory, phone numbers, and tags",
      Icon: Users,
    },
    "/templates": {
      title: "Message Templates",
      subtitle: "WhatsApp approved templates and broadcast messages",
      Icon: FileText,
    },
    "/whatsapp-simulator": {
      title: "WhatsApp Simulator",
      subtitle: "Test and preview bot conversations in real-time sandbox",
      Icon: MessageCircle,
    },
    "/usage": {
      title: "Usage & Analytics",
      subtitle: "Monthly message limits, sessions, and credits",
      Icon: BarChart3,
    },
    "/message-logs": {
      title: "Message Logs & Live Preview",
      subtitle: "Workflow-wise WhatsApp conversations & mobile preview",
      Icon: MessageCircle,
    },
    "/system-logs": {
      title: "System Logs",
      subtitle: "Audit trails, errors, and application activity logs",
      Icon: FileText,
    },
    "/platform-settings": {
      title: "Platform Settings",
      subtitle: "Global platform configuration and system parameters",
      Icon: Settings,
    },
    "/profile": {
      title: "My Profile",
      subtitle: "Personal information, account security, and credentials",
      Icon: UserRound,
    },
    "/plans": {
      title: "Plans & Wallet",
      subtitle: "Recharge wallet, choose plans, and view transaction passbook",
      Icon: Wallet,
    },

    "/users": {
      title: "All Users",
      subtitle: "Manage all users and their permissions",
      Icon: Users,
    },

  };

  return (
    routes[path] || {
      title: `${user?.role || "User"} Portal`,
      subtitle: "Manage your account and preferences",
      Icon: ShieldCheck,
    }
  );
};

const AdminHeader = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const walletDropdownRef = useRef(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState({
    name: "User",
    email: "",
    role: "User",
    roleSlug: "user",
    isSuperAdmin: false,
  });

  // ------------------------------------------
  // READ USER DETAILS
  // ------------------------------------------
  const loadUser = useCallback(() => {
    try {
      let storedUser = null;

      const candidates = [
        localStorage.getItem("user"),
        sessionStorage.getItem("user"),
      ];

      for (const candidate of candidates) {
        if (!candidate) continue;

        try {
          const parsed = JSON.parse(candidate);

          if (parsed && typeof parsed === "object") {
            storedUser = parsed;
            break;
          }
        } catch {
          
        }
      }

      if (!storedUser) {
        setUser({
          name: "User",
          email: "",
          role: "User",
          roleSlug: "user",
          isSuperAdmin: false,
        });
        return;
      }

      const roleSlug =
        typeof storedUser.role === "string"
          ? storedUser.role
          : storedUser.role?.slug || "user";

      const isSuperAdminUser = isSuperAdmin(storedUser);

      let roleDisplayName = storedUser.role_name;
      if (!roleDisplayName || typeof roleDisplayName !== "string") {
        if (isSuperAdminUser) {
          roleDisplayName = "Super Admin";
        } else if (roleSlug === "client" || roleSlug === "admin") {
          roleDisplayName = "Client";
        } else if (roleSlug === "manager") {
          roleDisplayName = "Manager";
        } else if (roleSlug === "agent") {
          roleDisplayName = "Support Agent";
        } else if (roleSlug === "user") {
          roleDisplayName = "User";
        } else {
          roleDisplayName = roleSlug.charAt(0).toUpperCase() + roleSlug.slice(1).replace(/_/g, " ");
        }
      }

      setUser({
        name:
          storedUser.name ??
          storedUser.full_name ??
          storedUser.fullName ??
          storedUser.username ??
          "User",

        email:
          storedUser.email ??
          storedUser.email_address ??
          "",

        role: roleDisplayName,
        roleSlug: roleSlug,
        isSuperAdmin: isSuperAdminUser,
      });
    } catch {
      setUser({
        name: "User",
        email: "",
        role: "User",
        roleSlug: "user",
        isSuperAdmin: false,
      });
    }
  }, []);


  useEffect(() => {
    loadUser();
  }, [loadUser, location.pathname]);

  const getToken = useCallback(() => {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token") ||
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token")
    );
  }, []);

  // Real-time wallet & plan breakdown state
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletSummary, setWalletSummary] = useState({
    totalTaken: 0,
    totalUsed: 0,
    remainingBalance: 0,
    usagePercentage: 0,
    activePlanName: null,
    activePlanAmount: 0,
    hasActivePlan: false,
    rate: 0.5,
    usedMessages: 0,
    estimatedMessages: 0,
  });
  const [walletLoading, setWalletLoading] = useState(true);

  const fetchWallet = useCallback(async () => {
    const token = getToken();

    if (!token || isSuperAdmin()) {
      setWalletBalance(null);
      setWalletSummary({
        totalTaken: 0,
        totalUsed: 0,
        remainingBalance: 0,
        usagePercentage: 0,
        activePlanName: null,
        activePlanAmount: 0,
        hasActivePlan: false,
        rate: 0.5,
        usedMessages: 0,
        estimatedMessages: 0,
      });
      setWalletLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API}/wallet`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.data?.success) {
        const walletData = res.data?.data || {};
        const nextBalance = Number(walletData.balance ?? 0);

        setWalletBalance(nextBalance);
        setWalletSummary({
          totalTaken: Number(walletData.total_taken ?? nextBalance),
          totalUsed: Number(walletData.total_used ?? 0),
          remainingBalance: Number(walletData.remaining_balance ?? nextBalance),
          usagePercentage: Number(walletData.usage_percentage ?? 0),
          activePlanName: walletData.active_plan_name || null,
          activePlanAmount: Number(walletData.active_plan_amount ?? 0),
          hasActivePlan: Boolean(
            walletData.has_active_plan || walletData.active_plan_id
          ),
          rate: Number(walletData.message_rate ?? 0.5),
          usedMessages: Number(walletData.used_messages ?? 0),
          estimatedMessages: Number(walletData.estimated_messages ?? 0),
        });
      }
    } catch (error) {
      console.error(
        "Wallet fetch failed:",
        error.response?.data || error.message
      );
    } finally {
      setWalletLoading(false);
    }
  }, [getToken]);

useEffect(() => {
  fetchWallet();

  // Refresh after recharge or wallet deduction.
  const handleWalletUpdated = () => {
    fetchWallet();
  };

  window.addEventListener("wallet-updated", handleWalletUpdated);
  window.addEventListener("user-updated", handleWalletUpdated);

  // Automatic refresh every 30 seconds.
  const interval = setInterval(fetchWallet, 30000);

  return () => {
    window.removeEventListener(
      "wallet-updated",
      handleWalletUpdated
    );
    window.removeEventListener(
      "user-updated",
      handleWalletUpdated
    );

    clearInterval(interval);
  };
}, [fetchWallet, location.pathname]);

  
  
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifDropdownRef = useRef(null);


const fetchNotifications = useCallback(async () => {
  try {
    const token = getToken();
    if (!token) return;

    const endpoint = user.isSuperAdmin
      ? `${API}/admin/notifications`
      : `${API}/notifications`;

    const res = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (res.data?.success) {
      setNotifications(res.data.notifications || []);
      setUnreadCount(Number(res.data.unread_count || 0));
    }
  } catch (error) {
    console.error(
      "Failed to fetch notifications:",
      error.response?.data || error.message
    );
  }
}, [getToken, user.isSuperAdmin]);

useEffect(() => {
  if (!getToken()) return;

  fetchNotifications();

  const interval = setInterval(fetchNotifications, 15000);

  const handleNotificationsUpdated = () => {
    fetchNotifications();
  };

  window.addEventListener(
    "notifications-updated",
    handleNotificationsUpdated
  );

  return () => {
    clearInterval(interval);
    window.removeEventListener(
      "notifications-updated",
      handleNotificationsUpdated
    );
  };
}, [fetchNotifications, getToken]);

const handleMarkAsRead = async (id, event) => {
  event?.stopPropagation();

  try {
    const token = getToken();

    const endpoint = user.isSuperAdmin
      ? `${API}/admin/notifications/${id}/read`
      : `${API}/notifications/${id}/read`;

    await axios.post(
      endpoint,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    await fetchNotifications();
  } catch (error) {
    console.error(
      "Failed to mark notification as read:",
      error.response?.data || error.message
    );
  }
};

const handleMarkAllAsRead = async () => {
  // Keep the existing admin API; personal users can mark
  // notifications individually using the current backend routes.
  if (!user.isSuperAdmin) {
    const unreadNotifications = notifications.filter((n) => !n.read_at);

    for (const notification of unreadNotifications) {
      await handleMarkAsRead(notification.id);
    }

    return;
  }

  try {
    const token = getToken();

    await axios.post(
      `${API}/admin/notifications/read-all`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    await fetchNotifications();
  } catch (error) {
    console.error(
      "Failed to mark all notifications as read:",
      error.response?.data || error.message
    );
  }
};

const handleNotificationClick = async (notification) => {
  try {
    if (!notification.read_at) {
      await handleMarkAsRead(notification.id);
    }

    setNotifOpen(false);
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
};

  useEffect(() => {
    if (user.isSuperAdmin) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      window.addEventListener("notifications-updated", fetchNotifications);
      return () => {
        clearInterval(interval);
        window.removeEventListener("notifications-updated", fetchNotifications);
      };
    }
  }, [fetchNotifications, user.isSuperAdmin]);

  useEffect(() => {
    if (!notifOpen) return;
    const handlePointerDown = (event) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [notifOpen]);


  // ------------------------------------------
  // AVATAR INITIALS
  // ------------------------------------------
  const initials = String(user?.name || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";

  // ------------------------------------------
  // CLOSE DROPDOWN
  // ------------------------------------------
  useEffect(() => {
    if (!profileOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handlePointerDown = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!walletOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setWalletOpen(false);
      }
    };

    const handlePointerDown = (event) => {
      if (
        walletDropdownRef.current &&
        !walletDropdownRef.current.contains(event.target)
      ) {
        setWalletOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [walletOpen]);

  useEffect(() => {
    setWalletOpen(false);
  }, [location.pathname]);

  // ------------------------------------------
  // NAVIGATION
  // ------------------------------------------
  const goToProfile = () => {
    setProfileOpen(false);
    navigate("/profile");
  };

  const goToSettings = () => {
    setProfileOpen(false);
    navigate("/settings");
  };

  // ------------------------------------------
  // LOGOUT
  // ------------------------------------------
  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setProfileOpen(false);

    try {
      // Clear all supported client-side token keys.
      [
        "token",
        "auth_token",
        "access_token",
        "user",
      ].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      delete axios.defaults.headers.common.Authorization;

      setUser({
        name: "User",
        email: "",
        role: "User",
        roleSlug: "user",
        isSuperAdmin: false,
      });

      sessionStorage.setItem(
        "logoutMessage",
        "You have been logged out successfully."
      );

      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const pageInfo = getPageInfo(location.pathname, user);
  const PageIcon = pageInfo.Icon || ShieldCheck;

  const formatRupees = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full min-w-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-3 shadow-sm shadow-slate-900/[0.02] backdrop-blur-xl sm:px-5 lg:h-[76px] lg:px-7">
      {/* LEFT: HEADER CONTEXT */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={onOpenMobileMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 lg:hidden"
          >
            <Menu size={22} />
          </button>
        )}

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-2xs">
          <PageIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base">
            {pageInfo.title}
          </h1>

          <p className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">
            {pageInfo.subtitle}
          </p>
        </div>
      </div>

      {/* RIGHT: WALLET BADGE & USER MENU */}
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
      {!user?.isSuperAdmin && (
        <div className="relative shrink-0" ref={walletDropdownRef}>
          <div
            className={`flex h-10 items-center rounded-xl border p-1 transition ${
              walletOpen
                ? "border-emerald-300 bg-emerald-50/90 text-emerald-950 shadow-sm shadow-emerald-600/10"
                : "border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/80 text-emerald-950 hover:border-emerald-300 hover:shadow-xs"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                setNotifOpen(false);
                setWalletOpen((open) => !open);
              }}
              aria-expanded={walletOpen}
              aria-haspopup="dialog"
              title="Click to view Plan Taken, Used & Remaining Balance"
              className="flex h-8 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-2xs">
                <Wallet size={13} />
              </span>

              {walletLoading ? (
                <span className="text-xs font-semibold text-emerald-700">...</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="hidden text-left leading-none sm:block">
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          walletSummary.hasActivePlan
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      />
                      Wallet
                    </span>
                    <span className="mt-0.5 block text-xs font-extrabold tabular-nums text-slate-900">
                      ₹
                      {formatRupees(
                        walletBalance ?? walletSummary.remainingBalance
                      )}
                    </span>
                  </span>

                  <span className="text-xs font-extrabold tabular-nums text-slate-900 sm:hidden">
                    ₹
                    {formatRupees(
                      walletBalance ?? walletSummary.remainingBalance
                    )}
                  </span>
                </span>
              )}

              <ChevronDown
                size={13}
                className={`shrink-0 text-emerald-700 transition-transform duration-150 ${
                  walletOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <Link
              to="/plans"
              onClick={() => setWalletOpen(false)}
              className="hidden h-7 shrink-0 items-center whitespace-nowrap rounded-lg bg-emerald-600 px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-2xs transition hover:bg-emerald-700 sm:inline-flex"
            >
              Recharge
            </Link>
          </div>

          {walletOpen && (
            <div
              role="dialog"
              aria-label="Wallet summary"
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-[336px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/15 sm:w-[372px]"
            >
              {/* Popover Hero Header */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 px-4 py-4 text-white">
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/20 blur-xl" />

                <div className="relative flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                      Active Plan &amp; Wallet
                    </p>
                    <p className="mt-0.5 truncate text-sm font-extrabold text-white">
                      {walletSummary.hasActivePlan
                        ? walletSummary.activePlanName || "Active Plan"
                        : "No Active Plan"}
                    </p>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      walletSummary.hasActivePlan
                        ? "border-emerald-300/40 bg-emerald-500/25 text-emerald-100"
                        : "border-amber-300/40 bg-amber-500/25 text-amber-100"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        walletSummary.hasActivePlan
                          ? "bg-emerald-300"
                          : "bg-amber-300"
                      }`}
                    />
                    {walletSummary.hasActivePlan ? "Active" : "No Plan"}
                  </span>
                </div>

                <div className="relative mt-3 flex items-baseline justify-between border-t border-white/15 pt-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200/90">
                      Remaining Balance
                    </p>
                    <p className="mt-0.5 text-xl font-black tracking-tight tabular-nums text-white">
                      ₹
                      {formatRupees(
                        walletBalance ?? walletSummary.remainingBalance
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-emerald-200/90">
                      Est. Messages Left
                    </p>
                    <p className="mt-0.5 text-sm font-extrabold tabular-nums text-emerald-100">
                      {Number(
                        walletSummary.estimatedMessages || 0
                      ).toLocaleString("en-IN")}{" "}
                      msgs
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 p-4">
                {/* Utilization bar */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-slate-500">Plan Usage</span>
                    <span className="font-bold tabular-nums text-slate-800">
                      {walletSummary.usagePercentage.toFixed(1)}% Used
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, walletSummary.usagePercentage))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 3-Box Breakdown: Plan Taken / Used / Remaining */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Plan Taken
                    </p>
                    <p className="mt-1 truncate text-xs font-extrabold tabular-nums text-slate-900 sm:text-sm">
                      ₹{formatRupees(walletSummary.totalTaken)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Total Credits
                    </p>
                  </div>

                  <div className="rounded-xl border border-rose-100 bg-rose-50/75 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">
                      Used
                    </p>
                    <p className="mt-1 truncate text-xs font-extrabold tabular-nums text-rose-800 sm:text-sm">
                      ₹{formatRupees(walletSummary.totalUsed)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-rose-600/80">
                      {Number(walletSummary.usedMessages || 0).toLocaleString(
                        "en-IN"
                      )}{" "}
                      msgs
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      Remaining
                    </p>
                    <p className="mt-1 truncate text-xs font-extrabold tabular-nums text-emerald-900 sm:text-sm">
                      ₹
                      {formatRupees(
                        walletBalance ?? walletSummary.remainingBalance
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] text-emerald-700/85">
                      {Number(
                        walletSummary.estimatedMessages || 0
                      ).toLocaleString("en-IN")}{" "}
                      msgs
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                  <span>Configured Message Rate</span>
                  <span className="font-bold tabular-nums text-slate-900">
                    ₹{Number(walletSummary.rate || 0.5).toFixed(2)} / msg
                  </span>
                </div>

                <Link
                  to="/plans"
                  onClick={() => setWalletOpen(false)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700"
                >
                  <Wallet size={14} />
                  <span>
                    {walletSummary.hasActivePlan
                      ? "Recharge / Manage Plan"
                      : "Activate Plan & Recharge"}
                  </span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}



{/* NOTIFICATIONS */}
<div className="relative shrink-0" ref={notifDropdownRef}>
  <button
    type="button"
    onClick={() => {
      setWalletOpen(false);
      setProfileOpen(false);
      setNotifOpen((open) => !open);
      fetchNotifications();
    }}
    className={`relative rounded-xl p-2 transition ${
      notifOpen
        ? "bg-emerald-50 text-emerald-700"
        : "text-gray-600 hover:bg-gray-100"
    }`}
    aria-label="Notifications"
    aria-expanded={notifOpen}
  >
    <Bell size={20} />

    {unreadCount > 0 && (
      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    )}
  </button>

  {notifOpen && (
    <div className="absolute right-0 top-full z-[100] mt-3 flex max-h-[min(80vh,520px)] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Notifications
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "You're all caught up"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              <CheckCheck size={14} />
              Read all
            </button>
          )}

          <button
            type="button"
            onClick={() => setNotifOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
            aria-label="Close notifications"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Bell size={22} />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No notifications yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Account approvals and other updates will appear here.
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const isUnread = !notification.read_at;

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition hover:bg-slate-50 ${
                  isUnread ? "bg-emerald-50/50" : "bg-white"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    notification.type === "whatsapp_account_approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {notification.type === "whatsapp_account_approved" ? (
                    <Check size={19} />
                  ) : (
                    <Bell size={19} />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {notification.title || "Notification"}
                    </span>

                    {isUnread && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    )}
                  </span>

                  <span className="mt-1 block break-words text-xs leading-5 text-slate-600">
                    {notification.message || "You have a new update."}
                  </span>

                  {/* {notification.action_label && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      {notification.action_label}
                      <ArrowUpRight size={13} />
                    </span>
                  )} */}

                  {notification.created_at && (
                    <span className="mt-1.5 block text-[10px] text-slate-400">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 bg-white px-4 py-2.5">
        <button
          type="button"
          onClick={() => {
            setNotifOpen(false);
            navigate(user.isSuperAdmin ? "/plans" : "/dashboard");
          }}
          className="w-full rounded-lg py-1.5 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-700"
        >
          Close notifications
        </button>
      </div>
    </div>
  )}
</div>



        {/* USER DROPDOWN */}
        <div className="relative shrink-0" ref={dropdownRef}>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Open account menu"
          aria-expanded={profileOpen}
          aria-haspopup="menu"
          onClick={() => {
            setWalletOpen(false);
            setNotifOpen(false);
            setProfileOpen((current) => !current);
          }}
          className={`group flex items-center gap-2 rounded-xl border px-2 py-1.5 transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15 sm:gap-3 sm:px-3 ${
            profileOpen
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
          }`}
        >
          {/* Avatar */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200/70 transition group-hover:ring-emerald-300 sm:h-10 sm:w-10">
            {initials}
          </div>

          {/* User information */}
          <div className="hidden min-w-0 text-left sm:block">
            <p className="max-w-36 truncate text-sm font-semibold text-slate-800">
              {user.name}
            </p>

            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span className="max-w-28 truncate">{user.role}</span>
            </p>
          </div>

          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
              profileOpen ? "rotate-180 text-emerald-700" : ""
            }`}
          />
        </button>

        {/* Dropdown */}
        {profileOpen && (
          <div
            role="menu"
            aria-label="Account menu"
            className="absolute right-0 top-full z-50 mt-3 w-72 max-w-[calc(100vw-1.5rem)] origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            {/* User summary */}
            <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-base font-bold text-emerald-800 shadow-sm">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {user.name}
                  </p>

                  {user.email ? (
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  ) : (
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {user.role}
                    </p>
                  )}

                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-2 py-1 text-[10px] font-semibold text-emerald-700">
                    <Check className="h-3 w-3" />
                    Account
                  </span>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="space-y-1 p-2">
           <Link
            to="/profile"
            role="menuitem"
            onClick={() => setProfileOpen(false)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-emerald-100">
              <UserRound className="h-[17px] w-[17px]" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-700">
                My Profile
              </span>

              <span className="mt-0.5 block text-xs text-slate-400">
                Personal information and password
              </span>
            </span>
          </Link>

          <Link
            to="/plans"
            role="menuitem"
            onClick={() => setProfileOpen(false)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-emerald-100">
              <Wallet className="h-[17px] w-[17px]" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-700">
                Plans & Wallet
              </span>

              <span className="mt-0.5 block text-xs text-slate-400">
                Recharge and view passbook
              </span>
            </span>
          </Link>
            </div>

            {/* Logout */}
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  {loggingOut ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600" />
                  ) : (
                    <LogOut className="h-[17px] w-[17px]" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-rose-600">
                    {loggingOut ? "Signing out..." : "Logout"}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    End your current session
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </header>
  );
};

export default AdminHeader;