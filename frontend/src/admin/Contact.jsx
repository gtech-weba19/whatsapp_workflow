import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

import {
  Contact as ContactIcon,
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Mail,
  Phone,
  UserRound,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

const emptyForm = {
  tenant_id: "",
  phone: "",
  name: "",
  email: "",
  status: "active",
  tags: "",
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const Contact = () => {
  const [contacts, setContacts] = useState([]);
  const [tenants, setTenants] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantLoading, setTenantLoading] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState(null);

  // --------------------------------------------------
  // FETCH TENANTS
  // GET /api/v1/tenants
  // --------------------------------------------------
  const fetchTenants = useCallback(async () => {
    setTenantLoading(true);

    try {
      const response = await axios.get(`${API_URL}/tenants`, {
        headers: getAuthHeaders(),
      });

      const result = response.data;
      const tenantData = result.data;

      const list = Array.isArray(tenantData)
        ? tenantData
        : Array.isArray(tenantData?.data)
          ? tenantData.data
          : [];

      setTenants(list);
    } catch (err) {
      setTenants([]);

      console.error(
        "Tenant list load nahi hui:",
        err.response?.data || err.message
      );
    } finally {
      setTenantLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // --------------------------------------------------
  // FETCH CONTACTS
  // --------------------------------------------------
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API_URL}/contacts`, {
        headers: getAuthHeaders(),
        params: {
          search: search.trim() || undefined,
          status: status || undefined,
          page,
        },
      });

      const result = response.data;
      const paginator = result.data;

      const list = Array.isArray(paginator)
        ? paginator
        : Array.isArray(paginator?.data)
          ? paginator.data
          : [];

      setContacts(list);

      setPagination({
        current_page: Number(paginator?.current_page || page),
        last_page: Number(paginator?.last_page || 1),
        total: Number(paginator?.total ?? list.length),
      });
    } catch (err) {
      setContacts([]);
      setPagination({
        current_page: page,
        last_page: 1,
        total: 0,
      });

      setError(
        err.response?.data?.message ||
          "Contacts load nahi ho sake. API URL aur login token check karein."
      );
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // --------------------------------------------------
  // OPEN ADD MODAL
  // --------------------------------------------------
  const openAddModal = () => {
    setEditingContact(null);
    setForm({ ...emptyForm });
    setError("");
    setModalOpen(true);
  };

  // --------------------------------------------------
  // OPEN EDIT MODAL
  // --------------------------------------------------
  const openEditModal = (contact) => {
    setEditingContact(contact);

    setForm({
      tenant_id: String(contact.tenant_id || ""),
      phone: contact.phone || "",
      name: contact.name || "",
      email: contact.email || "",
      status: contact.status || "active",
      tags: Array.isArray(contact.tags)
        ? contact.tags.join(", ")
        : "",
    });

    setError("");
    setModalOpen(true);
  };

  // --------------------------------------------------
  // CLOSE MODAL
  // --------------------------------------------------
  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingContact(null);
    setForm({ ...emptyForm });
    setError("");
  };

  // --------------------------------------------------
  // FORM CHANGE
  // --------------------------------------------------
  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // SAVE / UPDATE CONTACT
  // --------------------------------------------------
  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setNotice("");

    if (!editingContact && !form.tenant_id) {
      setError("Contact save karne se pehle tenant select karein.");
      setSaving(false);
      return;
    }

    const payload = {
      phone: form.phone.trim(),
      name: form.name.trim() || null,
      email: form.email.trim() || null,
      status: form.status,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    // Tenant is required for super_admin contact creation.
    if (!editingContact) {
      payload.tenant_id = Number(form.tenant_id);
    }

    try {
      if (editingContact) {
        await axios.put(
          `${API_URL}/contacts/${editingContact.id}`,
          payload,
          { headers: getAuthHeaders() }
        );

        setNotice("Contact successfully update ho gaya.");
      } else {
        await axios.post(`${API_URL}/contacts`, payload, {
          headers: getAuthHeaders(),
        });

        setNotice("Contact successfully add ho gaya.");
      }

      setModalOpen(false);
      setEditingContact(null);
      setForm({ ...emptyForm });
      setPage(1);

      await fetchContacts();
    } catch (err) {
      const validationErrors = err.response?.data?.errors;

      const firstValidationError = validationErrors
        ? Object.values(validationErrors).flat()[0]
        : null;

      setError(
        firstValidationError ||
          err.response?.data?.message ||
          "Contact save nahi ho saka."
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // DELETE CONTACT
  // --------------------------------------------------
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await axios.delete(`${API_URL}/contacts/${deleteTarget.id}`, {
        headers: getAuthHeaders(),
      });

      setDeleteTarget(null);
      setNotice("Contact successfully delete ho gaya.");

      if (contacts.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await fetchContacts();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Contact delete nahi ho saka."
      );
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------
  const getInitials = (name, phone) => {
    if (name?.trim()) {
      return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
    }

    return phone?.slice(-2) || "CT";
  };

  const statusStyle = (value) => {
    switch (value) {
      case "active":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "blocked":
        return "bg-red-50 text-red-700 ring-red-600/20";
      case "archived":
        return "bg-slate-100 text-slate-600 ring-slate-500/20";
      default:
        return "bg-slate-100 text-slate-600 ring-slate-500/20";
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <ContactIcon size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Contacts
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage your WhatsApp contacts in one place.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchContacts}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Contact
            </button>
          </div>
        </div>

        {/* Notices */}
        {notice && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {error && !modalOpen && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Contacts
            </p>
            <div className="mt-3 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-slate-900">
                {pagination.total}
              </h2>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <ContactIcon size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Active on Page
            </p>
            <div className="mt-3 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-slate-900">
                {contacts.filter((contact) => contact.status === "active").length}
              </h2>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <UserRound size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Blocked on Page
            </p>
            <div className="mt-3 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-slate-900">
                {contacts.filter((contact) => contact.status === "blocked").length}
              </h2>
              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <AlertCircle size={21} />
              </div>
            </div>
          </div>
        </div>

        {/* Contacts table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">All Contacts</h2>
              <p className="mt-1 text-xs text-slate-500">
                Search and manage saved contacts.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, phone, email..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
                />
              </div>

              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Last Seen</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <LoaderCircle
                        size={28}
                        className="mx-auto animate-spin text-blue-600"
                      />
                      <p className="mt-3 text-sm text-slate-500">
                        Loading contacts...
                      </p>
                    </td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <ContactIcon size={27} />
                      </div>
                      <h3 className="mt-4 font-semibold text-slate-900">
                        No contacts found
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Add a contact or change your search filters.
                      </p>
                      <button
                        type="button"
                        onClick={openAddModal}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        <Plus size={16} />
                        Add Contact
                      </button>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                            {getInitials(contact.name, contact.phone)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {contact.name || "Unnamed contact"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              ID: {contact.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Phone size={15} className="text-slate-400" />
                          {contact.phone || "—"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail size={15} className="text-slate-400" />
                          {contact.email || "—"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyle(
                            contact.status
                          )}`}
                        >
                          {contact.status || "active"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {contact.last_seen_at
                          ? new Date(contact.last_seen_at).toLocaleString()
                          : "Never"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(contact)}
                            title="Edit contact"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(contact)}
                            title="Delete contact"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-slate-500">
              Total{" "}
              <span className="font-semibold text-slate-800">
                {pagination.total}
              </span>{" "}
              contacts · Page {pagination.current_page} of {pagination.last_page}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                disabled={page >= pagination.last_page || loading}
                onClick={() =>
                  setPage((previous) =>
                    Math.min(pagination.last_page, previous + 1)
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingContact ? "Edit Contact" : "Add New Contact"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the contact details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Tenant */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Tenant <span className="text-red-500">*</span>
                  </label>

                  <select
                    name="tenant_id"
                    value={form.tenant_id}
                    onChange={handleFormChange}
                    required={!editingContact}
                    disabled={
                      tenantLoading ||
                      !!editingContact ||
                      tenants.length === 0
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      {tenantLoading
                        ? "Loading tenants..."
                        : tenants.length === 0
                          ? "No tenants available"
                          : "Select tenant"}
                    </option>

                    {tenants.map((tenant) => (
                      <option
                        key={tenant.id}
                        value={String(tenant.id)}
                      >
                        {tenant.name || `Tenant ${tenant.id}`} (ID: {tenant.id})
                      </option>
                    ))}
                  </select>

                  {!tenantLoading && tenants.length === 0 && (
                 <p className="mt-1.5 text-xs text-red-600">
                        No tenants found. Please check the tenant API endpoint and ensure that at least one tenant exists in the database.
                        </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Phone number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    maxLength={30}
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="e.g. 919876543210"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Full name
                  </label>
                  <input
                    type="text"
                    name="name"
                    maxLength={150}
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="Enter contact name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    name="email"
                    maxLength={190}
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                {/* Tags */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Tags
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={form.tags}
                    onChange={handleFormChange}
                    placeholder="customer, vip, new (comma-separated)"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Separate multiple tags with commas.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || (!editingContact && tenants.length === 0)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}
                  {saving
                    ? "Saving..."
                    : editingContact
                      ? "Update Contact"
                      : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={23} />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Delete contact?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-800">
                {deleteTarget.name || deleteTarget.phone}
              </span>
              ? This action cannot be undone.
            </p>

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setError("");
                }}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {saving && (
                  <LoaderCircle size={16} className="animate-spin" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;