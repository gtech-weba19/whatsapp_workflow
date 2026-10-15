
import {
  ChevronDown,
  LogOut,
  UserRound,
  ShieldCheck,
  Settings,
  Check,
  CircleUserRound,
  X,
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
  Link
} from "react-router-dom";

import axios from "axios";

const AdminHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState({
    name: "Administrator",
    email: "",
    role: "Super Admin",
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
          // Ignore malformed user data and try the next storage.
        }
      }

      if (!storedUser) {
        setUser({
          name: "Administrator",
          email: "",
          role: "Super Admin",
        });
        return;
      }

      const roleValue =
        storedUser.role?.name ??
        storedUser.role ??
        storedUser.user_type ??
        storedUser.userType ??
        storedUser.type ??
        "Super Admin";

      setUser({
        name:
          storedUser.name ??
          storedUser.full_name ??
          storedUser.fullName ??
          storedUser.username ??
          "Administrator",

        email:
          storedUser.email ??
          storedUser.email_address ??
          "",

        role:
          typeof roleValue === "string"
            ? roleValue
            : "Administrator",
      });
    } catch {
      setUser({
        name: "Administrator",
        email: "",
        role: "Super Admin",
      });
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser, location.pathname]);

  // ------------------------------------------
  // AVATAR INITIALS
  // ------------------------------------------
  const initials = user.name
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
        name: "Administrator",
        email: "",
        role: "Super Admin",
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

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full min-w-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 shadow-sm shadow-slate-900/[0.02] backdrop-blur-xl sm:px-5 lg:h-[76px] lg:px-7">
      {/* LEFT: HEADER CONTEXT */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
          <ShieldCheck className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base">
            Admin Dashboard
          </h1>

          <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
            Manage your account and preferences
          </p>
        </div>
      </div>

      {/* RIGHT: USER MENU */}
      <div className="relative ml-auto shrink-0" ref={dropdownRef}>
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
    </header>
  );
};

export default AdminHeader;
