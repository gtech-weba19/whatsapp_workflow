
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

  const [profileOpen, setProfileOpen] = useState(false);
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

  // Real-time wallet balance state
  const [walletBalance, setWalletBalance] = useState(null);

  const fetchWallet = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await axios.get(`${API}/user-wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setWalletBalance(res.data.balance);
      }
    } catch {
      // silently ignore
    }
  }, [getToken]);

  useEffect(() => {
    fetchWallet();
    const handleWalletUpdated = () => fetchWallet();
    window.addEventListener("wallet-updated", handleWalletUpdated);
    return () => window.removeEventListener("wallet-updated", handleWalletUpdated);
  }, [fetchWallet, location.pathname]);

  // Admin Real-time notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifDropdownRef = useRef(null);

// Notifications: Super Admin uses existing admin API.
// Other users use their personal notifications API.

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
  if (!notification.read_at) {
    await handleMarkAsRead(notification.id);
  }

  setNotifOpen(false);

  const actionUrl = notification.action_url;

  if (actionUrl && actionUrl.startsWith("/") && !actionUrl.startsWith("//")) {
    navigate(actionUrl);
  } else if (user.isSuperAdmin) {
    navigate("/plans");
  } else {
    navigate("/dashboard");
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

      // Prevent stale profile information from being displayed.
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

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full min-w-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 shadow-sm shadow-slate-900/[0.02] backdrop-blur-xl sm:px-5 lg:h-[76px] lg:px-7">
      {/* LEFT: HEADER CONTEXT */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
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

          <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
            {pageInfo.subtitle}
          </p>
        </div>
      </div>

      {/* RIGHT: WALLET BADGE & USER MENU */}
      <div className="ml-auto flex items-center gap-2.5 sm:gap-3.5">
        <Link
          to="/plans"
          title="Click to view Plans & Recharge Wallet"
          className="group flex items-center gap-1.5 rounded-xl border border-emerald-200/90 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-bold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-xs"
        >
          <span className="text-sm">💰</span>
          <span>₹{walletBalance !== null ? Number(walletBalance).toFixed(2) : "100.00"}</span>
          <span className="hidden rounded-md bg-emerald-200/60 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 sm:inline">
            Recharge
          </span>
        </Link>



{/* NOTIFICATIONS */}
<div className="relative shrink-0" ref={notifDropdownRef}>
  <button
    type="button"
    onClick={() => {
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

                  {notification.action_label && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      {notification.action_label}
                      <ArrowUpRight size={13} />
                    </span>
                  )}

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
          onClick={() => setProfileOpen((current) => !current)}
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