
import React, { useEffect, useMemo, useState, useRef } from "react";
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
  ShieldCheck,
  CircleAlert,
} from "lucide-react";
import { createPortal } from "react-dom";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

const emptyForm = {
  name: "",
  slug: "",
  email: "",
  mobile: "",
  status: "active",
};

const statusOptions = [
  ["all", "All clients"],
  ["active", "Active"],
  ["inactive", "Inactive"],
  ["suspended", "Suspended"],
];

export default function AllUsers() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const menuButtonRefs = useRef({});
  const dropdownRef = useRef(null);

  const getHeaders = () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("auth_token");

    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_BASE_URL}/clients`, {
        headers: getHeaders(),
      });

      const data = response?.data?.data;
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch clients error:", err);
      setError(err?.response?.data?.message || "Unable to load clients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesSearch =
        !keyword ||
        client.name?.toLowerCase().includes(keyword) ||
        client.slug?.toLowerCase().includes(keyword) ||
        client.email?.toLowerCase().includes(keyword) ||
        client.mobile?.toLowerCase().includes(keyword);

      return (
        matchesSearch &&
        (statusFilter === "all" || client.status === statusFilter)
      );
    });
  }, [clients, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: clients.length,
      active: clients.filter((c) => c.status === "active").length,
      inactive: clients.filter((c) => c.status === "inactive").length,
      suspended: clients.filter((c) => c.status === "suspended").length,
    }),
    [clients]
  );

  const openCreateModal = () => {
    setEditingClient(null);
    setForm({ ...emptyForm });
    setError("");
    setShowModal(true);
    setOpenMenu(null);
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setForm({
      name: client.name || "",
      slug: client.slug || "",
      email: client.email || "",
      mobile: client.mobile || "",
      status: client.status || "active",
    });
    setError("");
    setShowModal(true);
    setOpenMenu(null);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingClient(null);
    setForm({ ...emptyForm });
    setError("");
  };

  const handleChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "name") {
        updated.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      if (field === "mobile") {
        updated.mobile = value.replace(/\D/g, "").slice(0, 10);
      }

      if (field === "email") {
        updated.email = value.trimStart();
      }

      return updated;
    });
  };

  const validateForm = () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const mobile = form.mobile.trim();
    const slug = form.slug.trim();

    if (!name) return "Client name is required.";
    if (name.length < 2) return "Client name must be at least 2 characters.";
    if (name.length > 255) return "Client name cannot exceed 255 characters.";

    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return "Please enter a valid email address.";
      }
      if (email.length > 255) return "Email cannot exceed 255 characters.";
    }

    if (mobile) {
      if (!/^\d{10}$/.test(mobile)) {
        return "Mobile number must be exactly 10 digits.";
      }
      if (!/^[6-9]\d{9}$/.test(mobile)) {
        return "Enter a valid 10-digit Indian mobile number.";
      }
    }

    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return "Slug can contain only lowercase letters, numbers and hyphens.";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        email: form.email.trim() || null,
        mobile: form.mobile.trim() || null,
        status: form.status,
      };

      if (editingClient) {
        await axios.put(
          `${API_BASE_URL}/clients/${editingClient.id}`,
          payload,
          { headers: getHeaders() }
        );
      } else {
        await axios.post(`${API_BASE_URL}/clients`, payload, {
          headers: getHeaders(),
        });
      }

      setShowModal(false);
      setEditingClient(null);
      setForm({ ...emptyForm });
      setNotice(editingClient ? "Client updated successfully." : "Client created successfully.");
      await fetchClients();
    } catch (err) {
      console.error("Save client error:", err);

      const validationErrors = err?.response?.data?.errors;
      if (validationErrors) {
        const firstError = Object.values(validationErrors).flat().find(Boolean);
        setError(firstError || "Please check the entered information.");
      } else {
        setError(err?.response?.data?.message || "Unable to save client.");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActionMenu = (clientId) => {
    if (openMenu === clientId) {
      setOpenMenu(null);
      return;
    }

    const button = menuButtonRefs.current[clientId];
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = 184;
    const menuHeight = 230;
    const left = Math.max(
      8,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)
    );
    const openAbove =
      window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;

    setMenuPosition({
      top: openAbove
        ? Math.max(8, rect.top - menuHeight)
        : Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 8),
      left,
    });
    setOpenMenu(clientId);
  };

  useEffect(() => {
    if (openMenu === null) return;

    const closeOnOutsideClick = (event) => {
      if (
        dropdownRef.current?.contains(event.target) ||
        menuButtonRefs.current[openMenu]?.contains(event.target)
      ) {
        return;
      }
      setOpenMenu(null);
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    const closeOnScroll = () => setOpenMenu(null);

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnScroll);
    window.addEventListener("scroll", closeOnScroll, true);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnScroll);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [openMenu]);

  const updateStatus = async (client, status) => {
    try {
      setOpenMenu(null);
      setError("");
      setNotice("");

      await axios.patch(
        `${API_BASE_URL}/clients/${client.id}/status`,
        { status },
        { headers: getHeaders() }
      );

      setNotice(`Client status changed to ${status}.`);
      await fetchClients();
    } catch (err) {
      console.error("Status update error:", err);
      setError(err?.response?.data?.message || "Unable to update client status.");
    }
  };

  const deleteClient = async (client) => {
    const confirmed = window.confirm(`Delete client "${client.name}"?`);
    if (!confirmed) return;

    try {
      setOpenMenu(null);
      setError("");
      setNotice("");

      await axios.delete(`${API_BASE_URL}/clients/${client.id}`, {
        headers: getHeaders(),
      });

      setNotice("Client deleted successfully.");
      await fetchClients();
    } catch (err) {
      console.error("Delete client error:", err);
      setError(err?.response?.data?.message || "Unable to delete client.");
    }
  };

  const statusClass = (status) => {
    if (status === "active") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "suspended") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }
    return "border-slate-200 bg-slate-100 text-slate-600";
  };

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
   
<header className="relative isolate min-h-[120px] w-full rounded-2xl border border-emerald-100 bg-white shadow-sm">
  {/* Background decoration */}
  <div className="pointer-events-none absolute right-0 top-0 -z-10 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" />

  <div className="flex min-h-[186px] w-full flex-col justify-center gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:p-8">

    {/* Heading */}
    <div className="min-w-0 flex-1">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
        <Building2 size={14} className="shrink-0" />
        <span>Client management</span>
      </div>

      <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-emerald-950 sm:text-3xl">
        Clients
      </h1>

   
    </div>

    {/* Add Client button */}
    <div className="flex w-full shrink-0 sm:w-auto">
      <button
        type="button"
        onClick={openCreateModal}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto"
      >
        <Plus size={18} />
        Add Client
      </button>
    </div>
  </div>
</header>
        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Clients"
            value={stats.total}
            icon={<Building2 size={20} />}
            iconClass="bg-emerald-100 text-emerald-700"
            note="All registered businesses"
          />
          <StatCard
            label="Active Clients"
            value={stats.active}
            icon={<CheckCircle2 size={20} />}
            iconClass="bg-green-100 text-green-700"
            note="Currently active"
          />
          <StatCard
            label="Inactive Clients"
            value={stats.inactive}
            icon={<Ban size={20} />}
            iconClass="bg-slate-100 text-slate-600"
            note="Not currently active"
          />
          <StatCard
            label="Suspended Clients"
            value={stats.suspended}
            icon={<PauseCircle size={20} />}
            iconClass="bg-amber-100 text-amber-700"
            note="Temporarily suspended"
          />
        </section>

        {/* Notices */}
        {error && !showModal && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="ml-auto rounded p-1 hover:bg-red-100" aria-label="Dismiss error">
              <X size={15} />
            </button>
          </div>
        )}

        {notice && (
          <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} className="ml-auto rounded p-1 hover:bg-emerald-100" aria-label="Dismiss message">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Search and filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">All clients</h2>
              <p className="mt-1 text-xs text-slate-500">
                {filteredClients.length} of {clients.length} clients shown
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72 lg:w-80">
                <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, slug..."
                  aria-label="Search clients"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Clear search">
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-50 p-1.5">
                {statusOptions.map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    aria-pressed={statusFilter === value}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      statusFilter === value
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "text-slate-600 hover:bg-white hover:text-emerald-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Client directory</h2>
              <p className="mt-1 text-xs text-slate-500">Business and account information</p>
            </div>
            <button
              type="button"
              onClick={fetchClients}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="animate-spin text-emerald-600" />
              <p className="text-sm text-slate-500">Loading clients...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                {search || statusFilter !== "all" ? <Search size={25} /> : <Building2 size={25} />}
              </div>
              <h3 className="font-bold text-slate-800">No clients found</h3>
              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                {search || statusFilter !== "all"
                  ? "Try changing your search or status filter."
                  : "Create your first client to get started."}
              </p>
              {search || statusFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  Clear filters
                </button>
              ) : (
                <button type="button" onClick={openCreateModal} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
                  <Plus size={16} />
                  Add first client
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    {["Client", "Contact information", "Users", "Bots", "Status", "Actions"].map((heading) => (
                      <th
                        key={heading}
                        className={`px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                          heading === "Actions" ? "text-right" : "text-left"
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="transition-colors hover:bg-emerald-50/30">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                            <Building2 size={19} />
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate text-sm font-bold text-slate-900">{client.name}</p>
                            <p className="mt-1 truncate text-xs text-slate-400">/{client.slug || "no-slug"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <p className="flex max-w-[240px] items-center gap-2 truncate text-sm text-slate-700">
                            <Mail size={14} className="shrink-0 text-slate-400" />
                            <span className="truncate">{client.email || "No email"}</span>
                          </p>
                          <p className="flex items-center gap-2 text-xs text-slate-500">
                            <Phone size={13} className="shrink-0 text-slate-400" />
                            {client.mobile || "No mobile"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <CountPill icon={<Users size={15} />} value={client.users_count ?? 0} />
                      </td>

                      <td className="px-5 py-4">
                        <CountPill icon={<Bot size={15} />} value={client.bots_count ?? 0} />
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${statusClass(client.status)}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            client.status === "active"
                              ? "bg-emerald-500"
                              : client.status === "suspended"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                          }`} />
                          {client.status || "inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          ref={(element) => {
                            menuButtonRefs.current[client.id] = element;
                          }}
                          type="button"
                          aria-label={`Actions for ${client.name}`}
                          aria-expanded={openMenu === client.id}
                          onClick={() => toggleActionMenu(client.id)}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                            openMenu === client.id
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-transparent text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-700"
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

          {!loading && filteredClients.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {filteredClients.length} client{filteredClients.length === 1 ? "" : "s"}</span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                Client records
              </span>
            </div>
          )}
        </section>
      </div>

      {/* Action dropdown portal */}
      {openMenu !== null && createPortal(
        (() => {
          const client = clients.find((item) => item.id === openMenu);
          if (!client) return null;

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
              <MenuAction icon={<Edit size={15} />} onClick={() => openEditModal(client)}>
                Edit client
              </MenuAction>

              {client.status !== "active" && (
                <MenuAction
                  icon={<CheckCircle2 size={15} />}
                  color="green"
                  onClick={() => updateStatus(client, "active")}
                >
                  Activate
                </MenuAction>
              )}

              {client.status === "active" && (
                <MenuAction
                  icon={<PauseCircle size={15} />}
                  onClick={() => updateStatus(client, "inactive")}
                >
                  Deactivate
                </MenuAction>
              )}

              {client.status !== "suspended" && (
                <MenuAction
                  icon={<Ban size={15} />}
                  color="amber"
                  onClick={() => updateStatus(client, "suspended")}
                >
                  Suspend
                </MenuAction>
              )}

              <div className="my-1.5 border-t border-slate-100" />

              <MenuAction
                icon={<Trash2 size={15} />}
                color="red"
                onClick={() => deleteClient(client)}
              >
                Delete client
              </MenuAction>
            </div>
          );
        })(),
        document.body
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto left-sidebar-scroll bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-modal-title"
            className="my-auto max-h-[94vh] w-full max-w-4xl overflow-y-auto left-sidebar-scroll rounded-2xl border border-emerald-100 bg-white shadow-2xl shadow-slate-950/20"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
              <div>
                <div className="mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  <Building2 size={13} />
                  Client account
                </div>
                <h2 id="client-modal-title" className="text-lg font-extrabold text-emerald-950">
                  {editingClient ? "Edit client" : "Add new client"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {editingClient
                    ? "Update the business account information."
                    : "Enter the details to register a new business."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              {error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <CircleAlert size={17} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField label="Client name" required hint="Minimum 2 characters.">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g. Acme Solutions"
                    maxLength={255}
                    disabled={saving}
                    required
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Client slug" hint="Generated automatically from the name.">
                  <input
                    type="text"
                    value={form.slug}
                    readOnly
                    placeholder="client-name"
                    disabled={saving}
                    className={`${inputClass} bg-slate-50 text-slate-500`}
                  />
                </FormField>

                <FormField label="Email address" hint="Used for business contact.">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="admin@company.com"
                    maxLength={255}
                    disabled={saving}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Mobile number" hint="10 digits, starting with 6–9.">
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={form.mobile}
                    onChange={(e) => handleChange("mobile", e.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                    disabled={saving}
                    className={inputClass}
                  />
                </FormField>
              </div>

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
                  <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </FormField>

              <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-950">Business account</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    This client will be registered in GTech Bot Automation.
                    Users, bots and workflows can be linked to this client.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {editingClient ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      {editingClient ? "Save changes" : "Create client"}
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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50";

function FormField({ label, required = false, hint, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-emerald-700">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-5 text-slate-400">{hint}</p>}
    </div>
  );
}

function StatCard({ icon, label, value, iconClass, note }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </div>
        <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-emerald-600" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function CountPill({ icon, value }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-sm font-semibold text-slate-700">
      <span className="text-emerald-600">{icon}</span>
      {value}
    </span>
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
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${styles[color]}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
