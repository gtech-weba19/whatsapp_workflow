import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Building2, CheckCircle2, ChevronDown, Edit, Loader2, MoreVertical,
  Plus, Search, Trash2, Users, X, Bot, Ban, PauseCircle, Mail, Phone,
  RefreshCw, ArrowUpRight, CircleAlert, Globe, MapPin, ShieldCheck, Hash
} from "lucide-react";
import { createPortal } from "react-dom";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api")
  .replace(/\/+$/, "");

// Keep the existing Laravel route unchanged.
const CLIENTS_URL = `${API_BASE_URL}/clients`;

const emptyForm = {
  name: "", email: "", mobile: "", status: "active", role: "client", role_id: "",
  onboarding_step: "", business_name: "", business_type: "", industry: "",
  country: "India", website: "", gstin: "", city: "", address: ""
};

const statusOptions = [
  ["all", "All users"], ["active", "Active"], ["inactive", "Inactive"], ["suspended", "Suspended"]
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50";

export default function AllUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("auth_token");
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }, []);

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(CLIENTS_URL, {
        headers: getHeaders(),
        params: { page, per_page: 10, ...(search.trim() ? { search: search.trim() } : {}) }
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
      setError(err?.response?.data?.message || "Unable to load users. Check the API URL and permissions.");
    } finally {
      setLoading(false);
    }
  }, [getHeaders, search]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const filteredUsers = useMemo(
    () => users.filter(user => statusFilter === "all" || user.status === statusFilter),
    [users, statusFilter]
  );

  const stats = useMemo(() => ({
    total,
    active: users.filter(user => user.status === "active").length,
    inactive: users.filter(user => user.status === "inactive").length,
    suspended: users.filter(user => user.status === "suspended").length
  }), [users, total]);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({ ...emptyForm });
    setError("");
    setShowModal(true);
    setOpenMenu(null);
  };

  const openEditModal = user => {
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
      address: user.address || ""
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
    setForm(previous => ({
      ...previous,
      [field]: field === "mobile" ? value.replace(/\D/g, "").slice(0, 10)
        : field === "email" ? value.trimStart()
        : field === "role_id" ? value.replace(/\D/g, "")
        : value
    }));
  };

  const validateForm = () => {
    if (!editingUser) return "Select an existing user to create a business profile.";
    if (!form.name.trim()) return "Name is required.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      return "Enter a valid email address.";
    }
    if (form.mobile.trim() && !/^[6-9]\d{9}$/.test(form.mobile.trim())) {
      return "Enter a valid 10-digit Indian mobile number.";
    }
    if (!form.role.trim()) return "Role is required.";
    if (form.business_name.trim().length > 190) return "Business name cannot exceed 190 characters.";
    if (form.website.trim()) {
      try { new URL(form.website.trim()); }
      catch { return "Enter a valid website URL, including https://."; }
    }
    return "";
  };

  const handleSubmit = async event => {
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
      role_id: form.role_id === "" ? null : Number(form.role_id)
    };

    // Only send business fields if this user already has a business profile.
    // The current backend update() updates an existing profile but does not create one.
    if (editingUser.has_business_profile) {
      Object.assign(payload, {
        business_name: form.business_name.trim(),
        business_type: form.business_type.trim() || null,
        industry: form.industry.trim() || null,
        country: form.country.trim() || "India",
        website: form.website.trim() || null,
        gstin: form.gstin.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null
      });
    }

    try {
      setSaving(true);
      await axios.put(`${CLIENTS_URL}/${editingUser.id}`, payload, { headers: getHeaders() });
      setShowModal(false);
      setEditingUser(null);
      setNotice("User details updated successfully.");
      await fetchUsers(currentPage);
    } catch (err) {
      console.error("Save user error:", err);
      const validationErrors = err?.response?.data?.errors;
      setError(validationErrors
        ? Object.values(validationErrors).flat().find(Boolean) || "Please check the entered information."
        : err?.response?.data?.message || "Unable to update user.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActionMenu = userId => {
    if (openMenu === userId) {
      setOpenMenu(null);
      return;
    }
    const button = menuButtonRefs.current[userId];
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 184;
    const menuHeight = 190;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    const openAbove = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
    setMenuPosition({
      top: openAbove ? Math.max(8, rect.top - menuHeight) : Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 8),
      left
    });
    setOpenMenu(userId);
  };

  useEffect(() => {
    if (openMenu === null) return undefined;
    const closeOutside = event => {
      if (dropdownRef.current?.contains(event.target) ||
        menuButtonRefs.current[openMenu]?.contains(event.target)) return;
      setOpenMenu(null);
    };
    const closeEscape = event => { if (event.key === "Escape") setOpenMenu(null); };
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
      await axios.patch(`${CLIENTS_URL}/${user.id}/status`, { status }, { headers: getHeaders() });
      setNotice(`User status changed to ${status}.`);
      await fetchUsers(currentPage);
    } catch (err) {
      console.error("Status update error:", err);
      setError(err?.response?.data?.message || "Unable to update user status.");
    }
  };

  const deleteUser = async user => {
    const confirmed = window.confirm(
      `Delete user account for "${user.name || user.email}"? This may permanently remove the account.`
    );
    if (!confirmed) return;
    try {
      setOpenMenu(null);
      setError("");
      setNotice("");
      await axios.delete(`${CLIENTS_URL}/${user.id}`, { headers: getHeaders() });
      setNotice("User account deleted successfully.");
      await fetchUsers(currentPage);
    } catch (err) {
      console.error("Delete user error:", err);
      setError(err?.response?.data?.message || "Unable to delete user.");
    }
  };

  const statusClass = status => {
    if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "suspended") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-slate-200 bg-slate-100 text-slate-600";
  };

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
            <header className="relative isolate min-h-[120px] w-full rounded-2xl border border-emerald-100 bg-white shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                      <Bot size={28} strokeWidth={1.8} />
                    </div>
        
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                           <Users size={14} /><span>User management</span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Management
                        </span>
                      </div>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        View user accounts, roles, onboarding status, and linked business information.
                      </p>
                    </div>
                  </div>
        
                  <div className="flex flex-wrap items-center gap-2">
                
        
            <button type="button" onClick={() => fetchUsers(1)} disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50">
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} /> Refresh users
            </button>
                  </div>
            </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total users" value={stats.total} icon={<Users size={20} />} iconClass="bg-emerald-100 text-emerald-700" note="Users returned by API" />
          <StatCard label="Active users" value={stats.active} icon={<CheckCircle2 size={20} />} iconClass="bg-green-100 text-green-700" note="Status is active" />
          <StatCard label="Inactive users" value={stats.inactive} icon={<Ban size={20} />} iconClass="bg-slate-100 text-slate-600" note="Status is inactive" />
          <StatCard label="Suspended users" value={stats.suspended} icon={<PauseCircle size={20} />} iconClass="bg-amber-100 text-amber-700" note="Status is suspended" />
        </section>

        {error && !showModal && <Notice type="error" message={error} onClose={() => setError("")} />}
        {notice && <Notice type="success" message={notice} onClose={() => setNotice("")} />}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">All users</h2>
              <p className="mt-1 text-xs text-slate-500">Showing {filteredUsers.length} of {total} users on this page</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72 lg:w-80">
                <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="search" value={search}
                  onChange={event => { setCurrentPage(1); setSearch(event.target.value); }}
                  placeholder="Search name, email, role, mobile..."
                  aria-label="Search users" className={`${inputClass} py-3 pl-10 pr-10`} />
                {search && <button type="button" onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"
                  aria-label="Clear search"><X size={15} /></button>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-50 p-1.5">
                {statusOptions.map(([value, label]) => (
                  <button type="button" key={value} onClick={() => setStatusFilter(value)}
                    aria-pressed={statusFilter === value}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${statusFilter === value ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-emerald-800"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl ">
        

          {loading ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="animate-spin text-emerald-600" />
              <p className="text-sm text-slate-500">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-5 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                {search || statusFilter !== "all" ? <Search size={25} /> : <Users size={25} />}
              </div>
              <h3 className="font-bold text-slate-800">No users found</h3>
              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                {search || statusFilter !== "all" ? "Try changing your search or status filter." : "No user accounts were returned by the API."}
              </p>
              {(search || statusFilter !== "all") && <button type="button"
                onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-900">Clear filters</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
  {filteredUsers.map((user) => (
    <div
      key={user.id}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-emerald-200 hover:shadow-md"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/60 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
            <Users size={22} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-900">
              {user.name || "Name not set"}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              User ID: {user.user_id ?? user.id}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {user.has_business_profile
                ? `Profile ID: ${user.business_profile_id}`
                : "No business profile"}
            </p>
          </div>
        </div>

        {/* Actions Menu */}
        <button
          ref={(element) => {
            menuButtonRefs.current[user.id] = element;
          }}
          type="button"
          aria-label={`Actions for ${user.name || "user"}`}
          aria-expanded={openMenu === user.id}
          onClick={() => toggleActionMenu(user.id)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            openMenu === user.id
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Card Body */}
      <div className="space-y-5 p-5">
        {/* Contact Details */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Contact details
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Mail size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">Email address</p>
                <p className="break-all text-sm font-medium text-slate-700">
                  {user.email || "No email"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Phone size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">Mobile number</p>
                <p className="text-sm font-medium text-slate-700">
                  {user.mobile || "No mobile"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Role and Status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
            <p className="mb-2 text-xs font-medium text-slate-500">
              User role
            </p>

            <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-indigo-100 bg-white px-2.5 py-1.5 text-xs font-semibold capitalize text-indigo-700">
              <ShieldCheck size={14} />
              <span className="truncate">{user.role || "—"}</span>
            </span>

            <p className="mt-2 text-xs text-slate-500">
              Role ID: {user.role_id ?? "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <p className="mb-2 text-xs font-medium text-slate-500">
              Account status
            </p>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold capitalize ${statusClass(
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

        {/* Business Details */}
        <div className="rounded-xl border border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Globe size={16} />
            </div>

            <h4 className="text-sm font-bold text-slate-800">
              Business details
            </h4>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400">Business name</p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                {user.business_name || "Not provided"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Industry / Type</p>
                <p className="mt-1 break-words text-sm text-slate-700">
                  {user.industry ||
                    user.business_type ||
                    "Not provided"}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-xs text-slate-400">Location</p>
                <p className="mt-1 flex items-start gap-1.5 break-words text-sm text-slate-700">
                  <MapPin
                    size={14}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />
                  <span>
                    {[user.city, user.country].filter(Boolean).join(", ") ||
                      "Not provided"}
                  </span>
                </p>
              </div>
            </div>

            {user.website && (
              <div>
                <p className="text-xs text-slate-400">Website</p>
                <a
                  className="mt-1 inline-flex max-w-full items-center gap-1.5 break-all text-sm text-emerald-700 hover:underline"
                  href={
                    /^https?:\/\//i.test(user.website)
                      ? user.website
                      : `https://${user.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <Globe size={14} className="shrink-0" />
                  {user.website}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ))}
</div>

{/* Empty State */}
{filteredUsers.length === 0 && (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
      <Users size={26} />
    </div>

    <h3 className="mt-4 text-base font-bold text-slate-800">
      No users found
    </h3>

    <p className="mt-2 text-sm text-slate-500">
      Try changing your search or filter to find users.
    </p>
  </div>
)}
            </div>
          )}

          {!loading && (
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Page {currentPage} of {lastPage} · {total} user(s)</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={currentPage <= 1} onClick={() => fetchUsers(currentPage - 1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                <button type="button" disabled={currentPage >= lastPage} onClick={() => fetchUsers(currentPage + 1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </section>
      </div>

      {openMenu !== null && createPortal(
        (() => {
          const user = users.find(item => item.id === openMenu);
          if (!user) return null;
          return (
            <div ref={dropdownRef} style={{ position: "fixed", top: menuPosition.top, left: menuPosition.left, width: 184, zIndex: 99999 }}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
              <MenuAction icon={<Edit size={15} />} onClick={() => openEditModal(user)}>Edit user</MenuAction>
              {user.status !== "active" && <MenuAction icon={<CheckCircle2 size={15} />} color="green" onClick={() => updateStatus(user, "active")}>Activate</MenuAction>}
              {user.status === "active" && <MenuAction icon={<PauseCircle size={15} />} onClick={() => updateStatus(user, "inactive")}>Deactivate</MenuAction>}
              {user.status !== "suspended" && <MenuAction icon={<Ban size={15} />} color="amber" onClick={() => updateStatus(user, "suspended")}>Suspend</MenuAction>}
              <div className="my-1.5 border-t border-slate-100" />
              <MenuAction icon={<Trash2 size={15} />} color="red" onClick={() => deleteUser(user)}>Delete user</MenuAction>
            </div>
          );
        })(),
        document.body
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={event => { if (event.target === event.currentTarget) closeModal(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="user-modal-title"
            className="my-auto max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-emerald-100 bg-white shadow-2xl shadow-slate-950/20">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
              <div>
                <div className="mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700"><Users size={13} /> User account</div>
                <h2 id="user-modal-title" className="text-lg font-extrabold text-emerald-950">Edit user details</h2>
                <p className="mt-1 text-xs text-slate-500">Account fields are saved in users. Business fields are saved in business_profiles.</p>
              </div>
              <button type="button" onClick={closeModal} disabled={saving} aria-label="Close dialog"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X size={19} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
              {error && <Notice type="error" message={error} onClose={() => setError("")} />}
              <section>
                <SectionHeading icon={<Users size={16} />} title="User account details" subtitle="Name, email, mobile, role and account status." />
                <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormField label="Name" required><input value={form.name} onChange={e => handleChange("name", e.target.value)} maxLength={255} required disabled={saving} className={inputClass} /></FormField>
                  <FormField label="Email address" required><input type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} maxLength={255} required disabled={saving} className={inputClass} /></FormField>
                  <FormField label="Mobile number" hint="10-digit Indian mobile number."><input type="tel" inputMode="numeric" value={form.mobile} onChange={e => handleChange("mobile", e.target.value)} maxLength={10} disabled={saving} className={inputClass} /></FormField>
                  <FormField label="Role" required><input value={form.role} onChange={e => handleChange("role", e.target.value)} maxLength={50} required disabled={saving} className={inputClass} /></FormField>
                  <FormField label="Role ID"><input type="number" min="1" value={form.role_id} onChange={e => handleChange("role_id", e.target.value)} disabled={saving} className={inputClass} placeholder="Optional role ID" /></FormField>
                  <FormField label="Account status">
                    <div className="relative">
                      <select value={form.status} onChange={e => handleChange("status", e.target.value)} disabled={saving} className={`${inputClass} appearance-none pr-10`}>
                        <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </FormField>
                </div>
              </section>

              {editingUser?.has_business_profile ? (
                <section>
                  <SectionHeading icon={<Building2 size={16} />} title="Business profile" subtitle="These fields are saved in business_profiles." />
                  <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormField label="Business name"><input value={form.business_name} onChange={e => handleChange("business_name", e.target.value)} maxLength={190} disabled={saving} className={inputClass} /></FormField>
                    <FormField label="Business type"><input value={form.business_type} onChange={e => handleChange("business_type", e.target.value)} maxLength={100} disabled={saving} className={inputClass} /></FormField>
                    <FormField label="Industry"><input value={form.industry} onChange={e => handleChange("industry", e.target.value)} maxLength={120} disabled={saving} className={inputClass} /></FormField>
                    <FormField label="Country"><input value={form.country} onChange={e => handleChange("country", e.target.value)} maxLength={100} disabled={saving} className={inputClass} /></FormField>
                    <FormField label="Website"><input type="url" value={form.website} onChange={e => handleChange("website", e.target.value)} maxLength={255} disabled={saving} className={inputClass} placeholder="https://example.com" /></FormField>
                    <FormField label="GSTIN"><input value={form.gstin} onChange={e => handleChange("gstin", e.target.value)} maxLength={30} disabled={saving} className={inputClass} /></FormField>
                    <FormField label="City"><input value={form.city} onChange={e => handleChange("city", e.target.value)} maxLength={120} disabled={saving} className={inputClass} /></FormField>
                    <FormField label="Address"><textarea value={form.address} onChange={e => handleChange("address", e.target.value)} rows={3} disabled={saving} className={inputClass} /></FormField>
                  </div>
                </section>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  This user does not have a business profile yet. You can update the user account details here; business details can be added after creating a profile.
                </div>
              )}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeModal} disabled={saving} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Updating...</> : <><CheckCircle2 size={16} /> Save changes</>}
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
  return <div className="flex items-start gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">{icon}</div>
    <div><h3 className="text-sm font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div>
  </div>;
}

function FormField({ label, required = false, hint, children }) {
  return <div className="min-w-0">
    <label className="mb-2 block text-sm font-semibold text-slate-700">{label}{required && <span className="ml-1 text-emerald-700">*</span>}</label>
    {children}
    {hint && <p className="mt-1.5 text-xs leading-5 text-slate-400">{hint}</p>}
  </div>;
}

function StatCard({ icon, label, value, iconClass, note }) {
  return <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>{icon}</div>
      <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-emerald-600" />
    </div>
    <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
    <p className="mt-2 text-xs text-slate-400">{note}</p>
  </div>;
}

function CountPill({ icon, value }) {
  return <span className="inline-flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-sm font-semibold text-slate-700">
    <span className="text-emerald-600">{icon}</span>{value}
  </span>;
}

function MenuAction({ icon, color = "default", onClick, children }) {
  const styles = {
    default: "text-slate-700 hover:bg-slate-50",
    green: "text-emerald-700 hover:bg-emerald-50",
    amber: "text-amber-700 hover:bg-amber-50",
    red: "text-red-600 hover:bg-red-50"
  };
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${styles[color]}`}>
    {icon}<span>{children}</span>
  </button>;
}

function Notice({ type = "error", message, onClose }) {
  const success = type === "success";
  return <div role={success ? "status" : "alert"}
    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
    {success ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <CircleAlert size={18} className="mt-0.5 shrink-0" />}
    <span className="flex-1">{message}</span>
    {onClose && <button type="button" onClick={onClose} className="rounded p-1 hover:bg-black/5" aria-label="Dismiss message"><X size={15} /></button>}
  </div>;
}