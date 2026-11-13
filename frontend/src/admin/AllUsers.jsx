import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Edit,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  Bot,
  Ban,
  PauseCircle,
  Mail,
  Phone,
  RefreshCw,
  ArrowUpRight,
  CircleAlert,
  Globe,
  MapPin,
  ShieldCheck,
  Hash,
  LogIn,
  AlertTriangle,
  LayoutGrid,
  List,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { createPortal } from "react-dom";
import { PastelKpiCard } from "../components/admin/DashboardCharts";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

// Keep the existing Laravel route unchanged.
const CLIENTS_URL = `${API_BASE_URL}/clients`;

const emptyForm = {
  name: "",
  email: "",
  mobile: "",
  status: "active",
  role: "client",
  role_id: "",
  onboarding_step: "",
  business_name: "",
  business_type: "",
  industry: "",
  country: "India",
  website: "",
  gstin: "",
  city: "",
  address: "",
};

const statusOptions = [
  ["all", "All users"],
  ["active", "Active"],
  ["inactive", "Inactive"],
  ["suspended", "Suspended"],
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50";

const getInitials = (name) => {
  if (!name) return "U";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function AllUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const menuButtonRefs = useRef({});
  const dropdownRef = useRef(null);
  const [impersonatingUserId, setImpersonatingUserId] = useState(null);
  const [showImpersonationModal, setShowImpersonationModal] = useState(false);
const [selectedImpersonationUser, setSelectedImpersonationUser] = useState(null);


const startImpersonation = (targetUser) => {
  if (!targetUser?.id) return;

  setSelectedImpersonationUser(targetUser);
  setShowImpersonationModal(true);
  setOpenMenu(null);
};


const confirmImpersonation = async () => {
  const targetUser = selectedImpersonationUser;

  if (!targetUser?.id || impersonatingUserId !== null) return;

  const adminToken =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("auth_token");

  const adminUser = localStorage.getItem("user");

  if (!adminToken || !adminUser) {
    setError("Original Super Admin session not found.");
    return;
  }

  try {
    setImpersonatingUserId(targetUser.id);
    setError("");
    setOpenMenu(null);

    const response = await axios.post(
      `${API_BASE_URL}/admin/users/${targetUser.id}/impersonate`,
      {},
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data?.success || !response.data?.token) {
      throw new Error(
        response.data?.message || "Unable to access user account."
      );
    }

    const parsedAdminUser = JSON.parse(adminUser);

    localStorage.setItem("admin_original_token", adminToken);
    localStorage.setItem("admin_original_user", adminUser);

    localStorage.setItem(
      "impersonation_session",
      JSON.stringify({
        admin_id: parsedAdminUser.id,
        target_user_id: response.data.user.id,
        target_user_name: response.data.user.name,
        expires_at: response.data.expires_at,
      })
    );

    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));

    window.location.href = "/";
  } catch (err) {
    console.error("START IMPERSONATION ERROR:", err.response?.data || err);

    setError(
      err.response?.data?.message ||
      err.message ||
      "Unable to access user account."
    );

    setImpersonatingUserId(null);
  }
};

  const getHeaders = useCallback(() => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("auth_token");
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchUsers = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError("");
        const response = await axios.get(CLIENTS_URL, {
          headers: getHeaders(),
          params: {
            page,
            per_page: 10,
            ...(search.trim() ? { search: search.trim() } : {}),
          },
        });
        const payload = response?.data?.data;
        if (Array.isArray(payload)) {
          setUsers(payload);
          setCurrentPage(1);
          setLastPage(1);
          setTotal(payload.length);
        } else {
          setUsers(Array.isArray(payload?.data) ? payload.data : []);
          setCurrentPage(Number(payload?.current_page || page));
          setLastPage(Number(payload?.last_page || 1));
          setTotal(Number(payload?.total || 0));
        }
      } catch (err) {
        console.error("Fetch users error:", err);
        setUsers([]);
        setError(
          err?.response?.data?.message ||
            "Unable to load users. Check the API URL and permissions.",
        );
      } finally {
        setLoading(false);
      }
    },
    [getHeaders, search],
  );

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) => statusFilter === "all" || user.status === statusFilter,
      ),
    [users, statusFilter],
  );

  const stats = useMemo(
    () => ({
      total,
      active: users.filter((user) => user.status === "active").length,
      inactive: users.filter((user) => user.status === "inactive").length,
      suspended: users.filter((user) => user.status === "suspended").length,
    }),
    [users, total],
  );

  // const openCreateModal = () => {
  //   setEditingUser(null);
  //   setForm({ ...emptyForm });
  //   setError("");
  //   setShowModal(true);
  //   setOpenMenu(null);
  // };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      ...emptyForm,
      name: user.name || "",
      email: user.email || "",
      mobile: user.mobile || "",
      status: user.status || "active",
      role: user.role || "client",
      role_id: user.role_id == null ? "" : String(user.role_id),
      onboarding_step: user.onboarding_step || "",
      business_name: user.business_name || "",
      business_type: user.business_type || "",
      industry: user.industry || "",
      country: user.country || "India",
      website: user.website || "",
      gstin: user.gstin || "",
      city: user.city || "",
      address: user.address || "",
    });
    setError("");
    setShowModal(true);
    setOpenMenu(null);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingUser(null);
    setForm({ ...emptyForm });
    setError("");
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]:
        field === "mobile"
          ? value.replace(/\D/g, "").slice(0, 10)
          : field === "email"
            ? value.trimStart()
            : field === "role_id"
              ? value.replace(/\D/g, "")
              : value,
    }));
  };

  const validateForm = () => {
    if (!editingUser)
      return "Select an existing user to create a business profile.";
    if (!form.name.trim()) return "Name is required.";
    if (
      !form.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())
    ) {
      return "Enter a valid email address.";
    }
    if (form.mobile.trim() && !/^[6-9]\d{9}$/.test(form.mobile.trim())) {
      return "Enter a valid 10-digit Indian mobile number.";
    }
    if (!form.role.trim()) return "Role is required.";
    if (form.business_name.trim().length > 190)
      return "Business name cannot exceed 190 characters.";
    if (form.website.trim()) {
      try {
        new URL(form.website.trim());
      } catch {
        return "Enter a valid website URL, including https://.";
      }
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim() || null,
      status: form.status,
      role: form.role.trim(),
      role_id: form.role_id === "" ? null : Number(form.role_id),
    };


    if (editingUser.has_business_profile) {
      Object.assign(payload, {
        business_name: form.business_name.trim(),
        business_type: form.business_type.trim() || null,
        industry: form.industry.trim() || null,
        country: form.country.trim() || "India",
        website: form.website.trim() || null,
        gstin: form.gstin.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
      });
    }

    try {
      setSaving(true);
      await axios.put(`${CLIENTS_URL}/${editingUser.id}`, payload, {
        headers: getHeaders(),
      });
      setShowModal(false);
      setEditingUser(null);
      setNotice("User details updated successfully.");
      await fetchUsers(currentPage);
    } catch (err) {
      console.error("Save user error:", err);
      const validationErrors = err?.response?.data?.errors;
      setError(
        validationErrors
          ? Object.values(validationErrors).flat().find(Boolean) ||
              "Please check the entered information."
          : err?.response?.data?.message || "Unable to update user.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActionMenu = (userId) => {
    if (openMenu === userId) {
      setOpenMenu(null);
      return;
    }
    const button = menuButtonRefs.current[userId];
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 184;
    const menuHeight = 190;
    const left = Math.max(
      8,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
    );
    const openAbove =
      window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
    setMenuPosition({
      top: openAbove
        ? Math.max(8, rect.top - menuHeight)
        : Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 8),
      left,
    });
    setOpenMenu(userId);
  };

  useEffect(() => {
    if (openMenu === null) return undefined;
    const closeOutside = (event) => {
      if (
        dropdownRef.current?.contains(event.target) ||
        menuButtonRefs.current[openMenu]?.contains(event.target)
      )
        return;
      setOpenMenu(null);
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    const closeOnScroll = () => setOpenMenu(null);
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("touchstart", closeOutside);
    document.addEventListener("keydown", closeEscape);
    window.addEventListener("resize", closeOnScroll);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("touchstart", closeOutside);
      document.removeEventListener("keydown", closeEscape);
      window.removeEventListener("resize", closeOnScroll);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [openMenu]);

  const updateStatus = async (user, status) => {
    try {
      setOpenMenu(null);
      setError("");
      setNotice("");
      await axios.patch(
        `${CLIENTS_URL}/${user.id}/status`,
        { status },
        { headers: getHeaders() },
      );
      setNotice(`User status changed to ${status}.`);
      await fetchUsers(currentPage);
    } catch (err) {
      console.error("Status update error:", err);
      setError(err?.response?.data?.message || "Unable to update user status.");
    }
  };

  const deleteUser = async (user) => {
    const confirmed = window.confirm(
      `Delete user account for "${user.name || user.email}"? This may permanently remove the account.`,
    );
    if (!confirmed) return;
    try {
      setOpenMenu(null);
      setError("");
      setNotice("");
      await axios.delete(`${CLIENTS_URL}/${user.id}`, {
        headers: getHeaders(),
      });
      setNotice("User account deleted successfully.");
      await fetchUsers(currentPage);
    } catch (err) {
      console.error("Delete user error:", err);
      setError(err?.response?.data?.message || "Unable to delete user.");
    }
  };

  const statusClass = (status) => {
    if (status === "active")
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "suspended")
      return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-slate-200 bg-slate-100 text-slate-600";
  };

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Page heading */}
        <header className="relative isolate overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/60 p-6 sm:p-7 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-600/25 ring-4 ring-emerald-50">
                <Users size={30} strokeWidth={1.9} />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
                    User Management
                  </h1>
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur-sm">
                    {stats.active} Active of {stats.total} Users
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-500 max-w-xl">
                  Manage client accounts, business profiles, role permissions, and administrative account access.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => fetchUsers(currentPage)}
                disabled={loading}
                title="Refresh users list"
                className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? "animate-spin text-emerald-600" : ""} />
                <span>Refresh Users</span>
              </button>
            </div>
          </div>
        </header>

        {/* Elevated Pastel KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PastelKpiCard
            title="Total Users"
            value={stats.total}
            subtitle="Registered accounts"
            pill="Directory"
            icon={Users}
            theme="emerald"
            sparkline={[Math.max(1, stats.total - 2), Math.max(1, stats.total - 1), stats.total]}
            loading={loading}
          />
          <PastelKpiCard
            title="Active Users"
            value={stats.active}
            subtitle={`${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% active fleet`}
            pill="Verified"
            icon={CheckCircle2}
            theme="green"
            sparkline={[Math.max(0, stats.active - 2), Math.max(0, stats.active - 1), stats.active]}
            loading={loading}
          />
          <PastelKpiCard
            title="Inactive Users"
            value={stats.inactive}
            subtitle="Pending or paused"
            pill="Standby"
            icon={Ban}
            theme="cyan"
            sparkline={[Math.max(0, stats.inactive - 1), stats.inactive, stats.inactive]}
            loading={loading}
          />
          <PastelKpiCard
            title="Suspended Users"
            value={stats.suspended}
            subtitle="Restricted access"
            pill="Alert"
            icon={PauseCircle}
            theme="lime"
            sparkline={[Math.max(0, stats.suspended - 1), stats.suspended, stats.suspended]}
            loading={loading}
          />
        </section>

        {/* Impersonation Confirmation Modal */}
        {showImpersonationModal && selectedImpersonationUser && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && impersonatingUserId === null) {
                setShowImpersonationModal(false);
                setSelectedImpersonationUser(null);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="impersonation-title"
              className="w-full max-w-md overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl transition-all"
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                    <LogIn size={20} />
                  </div>
                  <div>
                    <h3
                      id="impersonation-title"
                      className="text-lg font-bold text-slate-900"
                    >
                      Login as User
                    </h3>
                    <p className="text-xs text-slate-500">
                      Temporary account impersonation
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={impersonatingUserId !== null}
                  onClick={() => {
                    setShowImpersonationModal(false);
                    setSelectedImpersonationUser(null);
                  }}
                  className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  aria-label="Close dialog"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="px-6 py-6">
                <h4 className="text-base font-semibold text-slate-800">
                  Access this user's account?
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  You are about to securely access the workspace of{" "}
                  <span className="font-bold text-slate-900">
                    {selectedImpersonationUser.name || selectedImpersonationUser.email}
                  </span>
                  . You will temporarily act with this user's permissions.
                </p>

                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle
                      size={19}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        Admin Session Security
                      </p>
                      <p className="mt-1 text-xs leading-5 text-amber-700">
                        Your original Super Admin session will be preserved.
                        You can return to your admin dashboard anytime by stopping
                        the session banner.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  disabled={impersonatingUserId !== null}
                  onClick={() => {
                    setShowImpersonationModal(false);
                    setSelectedImpersonationUser(null);
                  }}
                  className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmImpersonation}
                  disabled={impersonatingUserId !== null}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {impersonatingUserId !== null ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Accessing...
                    </>
                  ) : (
                    <>
                      <LogIn size={16} />
                      Confirm & Login
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alerts & Notifications */}
        {error && !showModal && (
          <Notice type="error" message={error} onClose={() => setError("")} />
        )}
        {notice && (
          <Notice
            type="success"
            message={notice}
            onClose={() => setNotice("")}
          />
        )}

        {/* Users Fleet Section */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* Search, Filter & View Switcher Toolbar */}
          <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Search + Filter */}
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setCurrentPage(1);
                    setSearch(event.target.value);
                  }}
                  placeholder="Search by name, email, mobile, role, business..."
                  aria-label="Search users"
                  className={`${inputClass} pl-10 pr-9`}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage(1);
                      setSearch("");
                    }}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative sm:w-52 shrink-0">
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setStatusFilter(e.target.value);
                  }}
                  className={`${inputClass} appearance-none pr-9 font-medium`}
                >
                  <option value="all">All Users ({stats.total})</option>
                  <option value="active">Active Only ({stats.active})</option>
                  <option value="inactive">Inactive Only ({stats.inactive})</option>
                  <option value="suspended">Suspended Only ({stats.suspended})</option>
                </select>
              </div>
            </div>

            {/* View Switcher & Clear button */}
            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t border-slate-100 lg:border-t-0">
              {(search || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(1);
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline decoration-emerald-300 underline-offset-2"
                >
                  Clear filters
                </button>
              )}

              {/* View Mode Switcher */}
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Grid Cards View"
                  className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === "grid"
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LayoutGrid size={15} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  title="Table View"
                  className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === "table"
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <List size={15} />
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-slate-500">Loading user accounts...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-sm">
                {search || statusFilter !== "all" ? (
                  <Search size={28} />
                ) : (
                  <Users size={28} />
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900">No users found</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {search || statusFilter !== "all"
                  ? "Try changing your search keywords or clearing active status filter."
                  : "No user accounts were returned by the API."}
              </p>
              {(search || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(1);
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* ================= USER CARDS GRID ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-5 sm:p-6 bg-slate-50/50">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/5"
                >
                  {/* Top colored accent ribbon */}
                  <div
                    className={`absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r ${
                      user.status === "active"
                        ? "from-emerald-500 via-teal-500 to-green-500"
                        : user.status === "suspended"
                        ? "from-amber-400 via-amber-500 to-orange-400"
                        : "from-slate-300 via-slate-400 to-slate-300"
                    }`}
                  />

                  {/* Ambient corner glow on hover */}
                  <div
                    className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${
                      user.status === "active"
                        ? "bg-emerald-300/25"
                        : user.status === "suspended"
                        ? "bg-amber-300/25"
                        : "bg-slate-200/40"
                    }`}
                  />

                  {/* Top Card Body */}
                  <div>
                    {/* Avatar + Name + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black text-sm tracking-wider shadow-md transition-transform duration-300 group-hover:scale-105 ${
                              user.status === "active"
                                ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-600/25 ring-2 ring-emerald-100"
                                : user.status === "suspended"
                                ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-600/25 ring-2 ring-amber-100"
                                : "bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-slate-600/25 ring-2 ring-slate-100"
                            }`}
                          >
                            {getInitials(user.name || user.email)}
                          </div>
                          {user.status === "active" && (
                            <span
                              title="Active user"
                              className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white ring-2 ring-white"
                            >
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="min-w-0 flex-1">
                          <h3
                            title={user.name}
                            className="truncate text-base font-bold text-slate-900 group-hover:text-emerald-950 transition-colors"
                          >
                            {user.name || "Name not set"}
                          </h3>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                            <span className="font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                              #{user.id}
                            </span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                              <ShieldCheck size={12} />
                              {user.role || "Client"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
                            user.status
                          )}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.status === "active"
                                ? "bg-emerald-500"
                                : user.status === "suspended"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {user.status || "inactive"}
                        </span>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="mt-4 space-y-2 rounded-xl bg-slate-50/70 p-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail size={13} className="shrink-0 text-blue-500" />
                        <span
                          title={user.email}
                          className="truncate font-medium text-slate-700"
                        >
                          {user.email || "No email provided"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone size={13} className="shrink-0 text-violet-500" />
                        <span className="font-medium text-slate-700">
                          {user.mobile || "No mobile number"}
                        </span>
                      </div>
                    </div>

                    {/* Business Profile Details */}
                    <div className="mt-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <Building2 size={12} className="text-emerald-600" />
                        Business Profile
                      </p>

                      {user.business_name ? (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-1.5 transition hover:bg-emerald-50/70">
                          <p className="truncate text-xs font-bold text-slate-900">
                            {user.business_name}
                          </p>

                          {(user.industry || user.business_type) && (
                            <p className="truncate text-[11px] text-emerald-800 font-medium">
                              {[user.industry, user.business_type].filter(Boolean).join(" · ")}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                            {[user.city, user.country].filter(Boolean).length > 0 && (
                              <span className="flex items-center gap-1">
                                <MapPin size={11} className="text-slate-400 shrink-0" />
                                <span className="truncate max-w-[140px]">
                                  {[user.city, user.country].filter(Boolean).join(", ")}
                                </span>
                              </span>
                            )}

                            {user.website && (
                              <a
                                href={
                                  /^https?:\/\//i.test(user.website)
                                    ? user.website
                                    : `https://${user.website}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                              >
                                <Globe size={11} className="shrink-0" />
                                <span className="truncate max-w-[110px]">Website</span>
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-400">
                          <Building2 size={14} className="text-slate-300" />
                          <span>No business profile attached</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Impersonate + Edit + More Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                    {/* Login As User button */}
                    <button
                      type="button"
                      onClick={() => startImpersonation(user)}
                      disabled={impersonatingUserId !== null}
                      title="Login as this user"
                      className="cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                    >
                      <LogIn size={13} />
                      <span>Login as User</span>
                    </button>

                    {/* Quick Edit */}
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      title="Edit user details"
                      className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                    >
                      <Edit size={13} />
                      <span>Edit</span>
                    </button>

                    {/* More Menu Trigger */}
                    <button
                      ref={(element) => {
                        menuButtonRefs.current[user.id] = element;
                      }}
                      type="button"
                      aria-label={`Actions for ${user.name || "user"}`}
                      aria-expanded={openMenu === user.id}
                      onClick={() => toggleActionMenu(user.id)}
                      className={`cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                        openMenu === user.id
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <MoreVertical size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ================= TABLE VIEW ================= */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">User Details</th>
                    <th className="px-5 py-4">Contact Details</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Business Details</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="transition hover:bg-emerald-50/30"
                    >
                      {/* User Details */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 font-bold text-xs text-emerald-700 shadow-sm">
                            {getInitials(user.name || user.email)}
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-[180px] truncate text-sm font-bold text-slate-900">
                              {user.name || "Name not set"}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              ID: #{user.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Mail size={13} className="shrink-0 text-blue-500" />
                            <span className="max-w-[200px] break-all text-xs font-medium text-slate-700">
                              {user.email || "No email"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Phone size={13} className="shrink-0 text-violet-500" />
                            <span className="text-xs font-medium text-slate-700">
                              {user.mobile || "No mobile"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-700">
                          <ShieldCheck size={13} />
                          {user.role || "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
                            user.status
                          )}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.status === "active"
                                ? "bg-emerald-500"
                                : user.status === "suspended"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {user.status || "inactive"}
                        </span>
                      </td>

                      {/* Business Details */}
                      <td className="px-5 py-4">
                        <div className="max-w-[220px]">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {user.business_name || "Not provided"}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {user.industry ||
                              user.business_type ||
                              "No industry set"}
                          </p>

                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                            <MapPin size={12} />
                            {[user.city, user.country]
                              .filter(Boolean)
                              .join(", ") || "No location"}
                          </p>

                          {user.website && (
                            <a
                              href={
                                /^https?:\/\//i.test(user.website)
                                  ? user.website
                                  : `https://${user.website}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-emerald-700 hover:underline"
                            >
                              <Globe size={11} />
                              {user.website}
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <button
                          ref={(element) => {
                            menuButtonRefs.current[user.id] = element;
                          }}
                          type="button"
                          aria-label={`Actions for ${user.name || "user"}`}
                          aria-expanded={openMenu === user.id}
                          onClick={() => toggleActionMenu(user.id)}
                          className={`cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                            openMenu === user.id
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                          }`}
                        >
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Unified Pagination Footer */}
          {!loading && (
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page <span className="font-semibold text-slate-800">{currentPage}</span> of {lastPage} · <span className="font-semibold text-slate-800">{total}</span> total user(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => fetchUsers(currentPage - 1)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= lastPage || loading}
                  onClick={() => fetchUsers(currentPage + 1)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {openMenu !== null &&
        createPortal(
          (() => {
            const user = users.find((item) => item.id === openMenu);
            if (!user) return null;
            return (
              <div
                ref={dropdownRef}
                style={{
                  position: "fixed",
                  top: menuPosition.top,
                  left: menuPosition.left,
                  width: 184,
                  zIndex: 99999,
                }}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
              >
                <MenuAction
                  icon={<Edit size={15} />}
                  onClick={() => openEditModal(user)}
                >
                  Edit user
                </MenuAction>

                <MenuAction
                icon={
                  impersonatingUserId === user.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <LogIn size={15} />
                  )
                }
                color="green"
                onClick={() => startImpersonation(user)}
              >
                {impersonatingUserId === user.id
                  ? "Accessing account..."
                  : "Login as User"}
              </MenuAction>
                {user.status !== "active" && (
                  <MenuAction
                    icon={<CheckCircle2 size={15} />}
                    color="green"
                    onClick={() => updateStatus(user, "active")}
                  >
                    Activate
                  </MenuAction>
                )}
                {user.status === "active" && (
                  <MenuAction
                    icon={<PauseCircle size={15} />}
                    onClick={() => updateStatus(user, "inactive")}
                  >
                    Deactivate
                  </MenuAction>
                )}
                {user.status !== "suspended" && (
                  <MenuAction
                    icon={<Ban size={15} />}
                    color="amber"
                    onClick={() => updateStatus(user, "suspended")}
                  >
                    Suspend
                  </MenuAction>
                )}
                <div className="my-1.5 border-t border-slate-100" />
                <MenuAction
                  icon={<Trash2 size={15} />}
                  color="red"
                  onClick={() => deleteUser(user)}
                >
                  Delete user
                </MenuAction>
              </div>
            );
          })(),
          document.body,
        )}

 {showModal && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeModal();
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      className="my-auto max-h-[94vh] w-full max-w-5xl overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl shadow-slate-950/20"
    >
      {/* HEADER */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <Users size={13} />
            User account
          </div>

          <h2
            id="user-modal-title"
            className="text-lg font-extrabold text-emerald-950"
          >
            Edit user details
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Account fields are saved in users. Business fields are saved
            in business_profiles.
          </p>
        </div>

        <button
          type="button"
          onClick={closeModal}
          disabled={saving}
          aria-label="Close dialog"
          className="cursor-pointer rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          <X size={19} />
        </button>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
        {error && (
          <Notice
            type="error"
            message={error}
            onClose={() => setError("")}
          />
        )}

        {/* USER ACCOUNT DETAILS */}
        <section>
          <SectionHeading
            icon={<Users size={16} />}
            title="User account details"
            subtitle="Name, email, mobile, role and account status."
          />

          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField label="Name" required>
              <input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                maxLength={255}
                required
                disabled={saving}
                className={inputClass}
              />
            </FormField>

            <FormField label="Email address" required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                maxLength={255}
                required
                disabled={saving}
                className={inputClass}
              />
            </FormField>

            <FormField
              label="Mobile number"
              hint="10-digit Indian mobile number."
            >
              <input
                type="tel"
                inputMode="numeric"
                value={form.mobile}
                onChange={(e) => handleChange("mobile", e.target.value)}
                maxLength={10}
                disabled={saving}
                className={inputClass}
              />
            </FormField>

            <FormField label="Role" required>
              <input
                value={form.role}
                onChange={(e) => handleChange("role", e.target.value)}
                maxLength={50}
                required
                disabled={saving}
                className={inputClass}
              />
            </FormField>

            <FormField label="Account status">
              <div className="relative">
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  disabled={saving}
                  className={`${inputClass} appearance-none pr-10`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </FormField>
          </div>
        </section>

        {/* BUSINESS PROFILE */}
        {editingUser?.has_business_profile ? (
          <section>
            <SectionHeading
              icon={<Building2 size={16} />}
              title="Business profile"
              subtitle="These fields are saved in business_profiles."
            />

            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField label="Business name">
                <input
                  value={form.business_name}
                  onChange={(e) =>
                    handleChange("business_name", e.target.value)
                  }
                  maxLength={190}
                  disabled={saving}
                  className={inputClass}
                />
              </FormField>

              <FormField label="Business type">
                <input
                  value={form.business_type}
                  onChange={(e) =>
                    handleChange("business_type", e.target.value)
                  }
                  maxLength={100}
                  disabled={saving}
                  className={inputClass}
                />
              </FormField>

              <FormField label="Industry">
                <input
                  value={form.industry}
                  onChange={(e) =>
                    handleChange("industry", e.target.value)
                  }
                  maxLength={120}
                  disabled={saving}
                  className={inputClass}
                />
              </FormField>

              <FormField label="Country">
                <input
                  value={form.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  maxLength={100}
                  disabled={saving}
                  className={inputClass}
                />
              </FormField>

              <FormField label="Website">
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) =>
                    handleChange("website", e.target.value)
                  }
                  maxLength={255}
                  disabled={saving}
                  className={inputClass}
                  placeholder="https://example.com"
                />
              </FormField>

              <FormField label="GSTIN">
                <input
                  value={form.gstin}
                  onChange={(e) => handleChange("gstin", e.target.value)}
                  maxLength={30}
                  disabled={saving}
                  className={inputClass}
                />
              </FormField>

              <FormField label="City">
                <input
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  maxLength={120}
                  disabled={saving}
                  className={inputClass}
                />
              </FormField>

              <FormField label="Address">
                <textarea
                  value={form.address}
                  onChange={(e) =>
                    handleChange("address", e.target.value)
                  }
                  rows={3}
                  disabled={saving}
                  className={inputClass}
                />
              </FormField>
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This user does not have a business profile yet. You can update
            the user account details here; business details can be added
            after creating a profile.
          </div>
        )}

        {/* BUTTONS */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeModal}
            disabled={saving}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Save changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </div>
  );
}

function SectionHeading({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function FormField({ label, required = false, hint, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-emerald-700">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs leading-5 text-slate-400">{hint}</p>
      )}
    </div>
  );
}


function MenuAction({ icon, color = "default", onClick, children }) {
  const styles = {
    default: "text-slate-700 hover:bg-slate-50",
    green: "text-emerald-700 hover:bg-emerald-50",
    amber: "text-amber-700 hover:bg-amber-50",
    red: "text-red-600 hover:bg-red-50",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${styles[color]}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function Notice({ type = "error", message, onClose }) {
  const success = type === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
    >
      {success ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      ) : (
        <CircleAlert size={18} className="mt-0.5 shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 hover:bg-black/5"
          aria-label="Dismiss message"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
