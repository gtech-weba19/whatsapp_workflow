import React, {
  useEffect,
  useMemo,
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
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_BASE_URL ||
  "http://localhost:8000/api";

/* =========================================================
   EMPTY FORM
========================================================= */

const emptyForm = {
  name: "",
  slug: "",
  email: "",
  mobile: "",
  status: "active",
};

/* =========================================================
   CLIENTS
========================================================= */

export default function Clients() {
  const [clients, setClients] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [showModal, setShowModal] =
    useState(false);

  const [editingClient, setEditingClient] =
    useState(null);

  const [form, setForm] =
    useState(emptyForm);

  const [openMenu, setOpenMenu] =
    useState(null);

  const [error, setError] =
    useState("");

  /* =======================================================
     AUTH HEADERS
  ======================================================= */

  const getHeaders = () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("auth_token");

    return {
      Accept: "application/json",
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    };
  };

  /* =======================================================
     FETCH CLIENTS
  ======================================================= */

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/admin/clients`,
        {
          headers: getHeaders(),
        }
      );

      setClients(
        response?.data?.data || []
      );
    } catch (err) {
      console.error(
        "Fetch clients error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to load clients."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    fetchClients();
  }, []);

  /* =======================================================
     FILTERED CLIENTS
  ======================================================= */

  const filteredClients = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesSearch =
        !keyword ||
        client.name
          ?.toLowerCase()
          .includes(keyword) ||
        client.slug
          ?.toLowerCase()
          .includes(keyword) ||
        client.email
          ?.toLowerCase()
          .includes(keyword) ||
        client.mobile
          ?.toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        client.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    clients,
    search,
    statusFilter,
  ]);

  /* =======================================================
     STATS
  ======================================================= */

  const stats = useMemo(() => {
    return {
      total: clients.length,

      active: clients.filter(
        (client) =>
          client.status === "active"
      ).length,

      inactive: clients.filter(
        (client) =>
          client.status === "inactive"
      ).length,

      suspended: clients.filter(
        (client) =>
          client.status === "suspended"
      ).length,
    };
  }, [clients]);

  /* =======================================================
     OPEN CREATE MODAL
  ======================================================= */

  const openCreateModal = () => {
    setEditingClient(null);

    setForm({
      ...emptyForm,
    });

    setError("");

    setShowModal(true);
  };

  /* =======================================================
     OPEN EDIT MODAL
  ======================================================= */

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

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);

    setEditingClient(null);

    setForm({
      ...emptyForm,
    });

    setError("");
  };

  /* =======================================================
     HANDLE FORM CHANGE
  ======================================================= */

  const handleChange = (
    field,
    value
  ) => {
    setForm((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      /* ===================================================
         AUTO GENERATE SLUG FROM CLIENT NAME
      =================================================== */

      if (field === "name") {
        updated.slug = value
          .toLowerCase()
          .trim()
          .replace(
            /[^a-z0-9\s-]/g,
            ""
          )
          .replace(
            /\s+/g,
            "-"
          )
          .replace(
            /-+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            "");
      }

      /* ===================================================
         MOBILE
         ONLY NUMBERS
      =================================================== */

      if (field === "mobile") {
        updated.mobile = value
          .replace(/\D/g, "")
          .slice(0, 10);
      }

      /* ===================================================
         EMAIL
      =================================================== */

      if (field === "email") {
        updated.email =
          value.trimStart();
      }

      return updated;
    });
  };

  /* =======================================================
     VALIDATE FORM
  ======================================================= */

  const validateForm = () => {
    const clientName =
      form.name.trim();

    const email =
      form.email.trim();

    const mobile =
      form.mobile.trim();

    const slug =
      form.slug.trim();

    /* ===================================================
       CLIENT NAME
    =================================================== */

    if (!clientName) {
      return "Client name is required.";
    }

    if (clientName.length < 2) {
      return (
        "Client name must be at least 2 characters."
      );
    }

    if (clientName.length > 255) {
      return (
        "Client name cannot exceed 255 characters."
      );
    }

    /* ===================================================
       EMAIL
    =================================================== */

    if (email) {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

      if (!emailRegex.test(email)) {
        return (
          "Please enter a valid email address."
        );
      }

      if (email.length > 255) {
        return (
          "Email cannot exceed 255 characters."
        );
      }
    }

    /* ===================================================
       MOBILE
    =================================================== */

    if (mobile) {
      if (!/^\d+$/.test(mobile)) {
        return (
          "Mobile number must contain numbers only."
        );
      }

      if (!/^\d{10}$/.test(mobile)) {
        return (
          "Mobile number must be exactly 10 digits."
        );
      }

      if (!/^[6-9]\d{9}$/.test(mobile)) {
        return (
          "Please enter a valid 10-digit Indian mobile number."
        );
      }
    }

    /* ===================================================
       SLUG
    =================================================== */

    if (slug) {
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
          slug
        )
      ) {
        return (
          "Slug can contain only lowercase letters, numbers and hyphens."
        );
      }
    }

    return "";
  };

  /* =======================================================
     SUBMIT FORM
  ======================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    /* ===================================================
       FRONTEND VALIDATION
    =================================================== */

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),

        slug:
          form.slug.trim() ||
          undefined,

        email:
          form.email.trim() ||
          null,

        mobile:
          form.mobile.trim() ||
          null,

        status:
          form.status,
      };

      /* =================================================
         UPDATE CLIENT
      ================================================= */

      if (editingClient) {
        await axios.put(
          `${API_BASE_URL}/admin/clients/${editingClient.id}`,
          payload,
          {
            headers: getHeaders(),
          }
        );
      }

      /* =================================================
         CREATE CLIENT
      ================================================= */

      else {
        await axios.post(
          `${API_BASE_URL}/admin/clients`,
          payload,
          {
            headers: getHeaders(),
          }
        );
      }

      setShowModal(false);

      setEditingClient(null);

      setForm({
        ...emptyForm,
      });

      setError("");

      await fetchClients();
    } catch (err) {
      console.error(
        "Save client error:",
        err
      );

      /* ================================================
         LARAVEL VALIDATION ERRORS
      ================================================= */

      const validationErrors =
        err?.response?.data?.errors;

      if (validationErrors) {
        const firstError =
          Object.values(
            validationErrors
          )
            .flat()
            .find(Boolean);

        setError(
          firstError ||
            "Please check the entered information."
        );
      } else {
        setError(
          err?.response?.data?.message ||
            "Unable to save client."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     UPDATE STATUS
  ======================================================= */

  const updateStatus = async (
    client,
    status
  ) => {
    try {
      setOpenMenu(null);

      await axios.patch(
        `${API_BASE_URL}/admin/clients/${client.id}/status`,
        {
          status,
        },
        {
          headers: getHeaders(),
        }
      );

      await fetchClients();
    } catch (err) {
      console.error(
        "Status update error:",
        err
      );

      alert(
        err?.response?.data?.message ||
          "Unable to update client status."
      );
    }
  };

  /* =======================================================
     DELETE CLIENT
  ======================================================= */

  const deleteClient = async (
    client
  ) => {
    const confirmed =
      window.confirm(
        `Delete client "${client.name}"?`
      );

    if (!confirmed) return;

    try {
      setOpenMenu(null);

      await axios.delete(
        `${API_BASE_URL}/admin/clients/${client.id}`,
        {
          headers: getHeaders(),
        }
      );

      await fetchClients();
    } catch (err) {
      console.error(
        "Delete client error:",
        err
      );

      alert(
        err?.response?.data?.message ||
          "Unable to delete client."
      );
    }
  };

  /* =======================================================
     STATUS CLASS
  ======================================================= */

  const statusClass = (
    status
  ) => {
    if (status === "active") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (status === "suspended") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }

    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* ===================================================
          HEADER
      ==================================================== */}

      <div className="mb-6 flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Clients
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage all businesses using
            GTech Bot Automation.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus size={18} />
          Add Client
        </button>

      </div>

      {/* ===================================================
          STATS
      ==================================================== */}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">

        <StatCard
          icon={
            <Building2 size={20} />
          }
          label="Total Clients"
          value={stats.total}
        />

        <StatCard
          icon={
            <CheckCircle2 size={20} />
          }
          label="Active"
          value={stats.active}
        />

        <StatCard
          icon={
            <Ban size={20} />
          }
          label="Inactive"
          value={stats.inactive}
        />

        <StatCard
          icon={
            <PauseCircle size={20} />
          }
          label="Suspended"
          value={stats.suspended}
        />

      </div>

      {/* ===================================================
          FILTER
      ==================================================== */}

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          {/* SEARCH */}

          <div className="relative w-full md:max-w-md">

            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search clients..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />

          </div>

          {/* STATUS FILTER */}

          <div className="flex items-center gap-2">

            {[
              ["all", "All"],
              ["active", "Active"],
              ["inactive", "Inactive"],
              [
                "suspended",
                "Suspended",
              ],
            ].map(
              ([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() =>
                    setStatusFilter(
                      value
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    statusFilter ===
                    value
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              )
            )}

          </div>

        </div>

      </div>

      {/* ===================================================
          PAGE ERROR
      ==================================================== */}

      {error &&
        !showModal && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

      {/* ===================================================
          TABLE
      ==================================================== */}

      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white">

        {/* LOADING */}

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">

            <Loader2
              size={28}
              className="animate-spin text-indigo-600"
            />

          </div>
        ) : filteredClients.length ===
          0 ? (

          /* EMPTY */

          <div className="flex min-h-[300px] flex-col items-center justify-center">

            <Building2
              size={40}
              className="mb-3 text-slate-300"
            />

            <p className="font-semibold text-slate-700">
              No clients found
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Create your first client
              to get started.
            </p>

          </div>
        ) : (

          /* DATA */

          <div className="overflow-x-auto">

            <table className="w-full">

              {/* TABLE HEADER */}

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50">

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Client
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Contact
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Users
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Bots
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Action
                  </th>

                </tr>

              </thead>

              {/* TABLE BODY */}

              <tbody>

                {filteredClients.map(
                  (client) => (

                    <tr
                      key={client.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >

                      {/* CLIENT */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Building2
                              size={19}
                            />
                          </div>

                          <div>

                            <p className="font-semibold text-slate-900">
                              {client.name}
                            </p>

                            <p className="text-xs text-slate-400">
                              /
                              {client.slug}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* CONTACT */}

                      <td className="px-5 py-4">

                        <p className="text-sm text-slate-700">
                          {client.email ||
                            "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {client.mobile ||
                            "No mobile"}
                        </p>

                      </td>

                      {/* USERS */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2 text-sm text-slate-700">

                          <Users
                            size={16}
                            className="text-slate-400"
                          />

                          {client.users_count ||
                            0}

                        </div>

                      </td>

                      {/* BOTS */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2 text-sm text-slate-700">

                          <Bot
                            size={16}
                            className="text-slate-400"
                          />

                          {client.bots_count ||
                            0}

                        </div>

                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass(
                            client.status
                          )}`}
                        >
                          {client.status}
                        </span>

                      </td>

                      {/* ACTION */}

                      <td className="relative px-5 py-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenu(
                              openMenu ===
                                client.id
                                ? null
                                : client.id
                            )
                          }
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <MoreVertical
                            size={18}
                          />
                        </button>

                        {/* DROPDOWN */}

                        {openMenu ===
                          client.id && (
                          <div className="absolute right-5 top-12 z-50 w-44 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-xl">

                            {/* EDIT */}

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  client
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              <Edit
                                size={15}
                              />

                              Edit
                            </button>

                            {/* ACTIVATE */}

                            {client.status !==
                              "active" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatus(
                                    client,
                                    "active"
                                  )
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle2
                                  size={15}
                                />

                                Activate
                              </button>
                            )}

                            {/* DEACTIVATE */}

                            {client.status ===
                              "active" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatus(
                                    client,
                                    "inactive"
                                  )
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                              >
                                <PauseCircle
                                  size={15}
                                />

                                Deactivate
                              </button>
                            )}

                            {/* SUSPEND */}

                            {client.status !==
                              "suspended" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatus(
                                    client,
                                    "suspended"
                                  )
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                              >
                                <Ban
                                  size={15}
                                />

                                Suspend
                              </button>
                            )}

                            <div className="my-1 border-t border-slate-100" />

                            {/* DELETE */}

                            <button
                              type="button"
                              onClick={() =>
                                deleteClient(
                                  client
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2
                                size={15}
                              />

                              Delete
                            </button>

                          </div>
                        )}

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ===================================================
          CREATE / EDIT MODAL
      ==================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">

          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

            {/* =================================================
                MODAL HEADER
            ================================================== */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>

                <h2 className="text-lg font-bold text-slate-900">
                  {editingClient
                    ? "Edit Client"
                    : "Add Client"}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {editingClient
                    ? "Update client business information."
                    : "Add a new business client to GTech Bot Automation."}
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={19} />
              </button>

            </div>

            {/* =================================================
                FORM
            ================================================== */}

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5 p-6"
            >

              {/* =================================================
                  ERROR
              ================================================== */}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* =================================================
                  CLIENT NAME + SLUG
              ================================================== */}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* CLIENT NAME */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Client Name *
                  </label>

                  <input
                    type="text"
                    value={
                      form.name
                    }
                    onChange={(e) =>
                      handleChange(
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="e.g.example"
                    maxLength={255}
                    disabled={
                      saving
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Minimum 2 characters.
                  </p>

                </div>

                {/* SLUG */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Slug
                  </label>

                  <input
                    type="text"
                    value={
                      form.slug
                    }
                    readOnly
                    placeholder="Automatically generated"
                    disabled={
                      saving
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Automatically generated from client name.
                  </p>

                </div>

              </div>

              {/* =================================================
                  EMAIL + MOBILE
              ================================================== */}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* EMAIL */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={
                      form.email
                    }
                    onChange={(e) =>
                      handleChange(
                        "email",
                        e.target.value
                      )
                    }
                    placeholder="admin@company.com"
                    maxLength={255}
                    disabled={
                      saving
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Enter a valid email address.
                  </p>

                </div>

                {/* MOBILE */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Mobile
                  </label>

                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={
                      form.mobile
                    }
                    onChange={(e) =>
                      handleChange(
                        "mobile",
                        e.target.value
                      )
                    }
                    onKeyDown={(e) => {
                      const allowedKeys =
                        [
                          "Backspace",
                          "Delete",
                          "ArrowLeft",
                          "ArrowRight",
                          "ArrowUp",
                          "ArrowDown",
                          "Tab",
                          "Home",
                          "End",
                        ];

                      if (
                        !/[0-9]/.test(
                          e.key
                        ) &&
                        !allowedKeys.includes(
                          e.key
                        ) &&
                        !(
                          e.ctrlKey ||
                          e.metaKey
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="9876543210"
                    maxLength={10}
                    disabled={
                      saving
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    10 digits, starting with 6, 7, 8 or 9.
                  </p>

                </div>

              </div>

              {/* =================================================
                  STATUS
              ================================================== */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Status
                </label>

                <div className="relative">

                  <select
                    value={
                      form.status
                    }
                    onChange={(e) =>
                      handleChange(
                        "status",
                        e.target.value
                      )
                    }
                    disabled={
                      saving
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                  >

                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>

                    <option value="suspended">
                      Suspended
                    </option>

                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                </div>

              </div>

              {/* =================================================
                  CLIENT INFORMATION
              ================================================== */}

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">

                <div className="flex items-start gap-3">

                  <Building2
                    size={18}
                    className="mt-0.5 shrink-0 text-indigo-500"
                  />

                  <div>

                    <p className="text-xs font-semibold text-slate-700">
                      Client Account
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      This client will become a tenant in the
                      GTech Bot Automation platform. Users,
                      bots and workflows can later be linked
                      to this client.
                    </p>

                  </div>

                </div>

              </div>

              {/* =================================================
                  BUTTONS
              ================================================== */}

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">

                {/* CANCEL */}

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                {/* SAVE */}

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {saving ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />

                      {editingClient
                        ? "Updating..."
                        : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editingClient
                        ? "Update Client"
                        : "Create Client"}
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

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">

      <div className="mb-4 flex items-center justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          {icon}
        </div>

      </div>

      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}