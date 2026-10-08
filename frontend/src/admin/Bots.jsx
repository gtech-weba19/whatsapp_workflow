import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  Plus,
  Search,
  Bot as BotIcon,
  MoreVertical,
  Pencil,
  Trash2,
  Workflow,
  MessageCircle,
  Activity,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Power,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_BASE_URL || "http://localhost:8000/api";

const Bots = () => {
  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [bots, setBots] = useState([]);
  const [clients, setClients] = useState([]);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [editingBot, setEditingBot] = useState(null);

  const [openMenu, setOpenMenu] = useState(null);

  const [form, setForm] = useState({
    tenant_id: "",
    name: "",
    description: "",
    status: "draft",
    whatsapp_account_id: "",
  });

  /*
  |--------------------------------------------------------------------------
  | AUTH HEADERS
  |--------------------------------------------------------------------------
  */

  const getHeaders = () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("auth_token");

    return {
      Accept: "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    };
  };

  /*
  |--------------------------------------------------------------------------
  | FETCH BOTS
  |--------------------------------------------------------------------------
  */

  const fetchBots = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/bots`,
        {
          headers: getHeaders(),
        }
      );

      const data = response.data?.data || [];

      setBots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch bots error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to fetch bots."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | FETCH CLIENTS
  |--------------------------------------------------------------------------
  */

  const fetchClients = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/bots/clients`,
        {
          headers: getHeaders(),
        }
      );

      const data = response.data?.data || [];

      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch clients error:", err);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchBots();
    fetchClients();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SEARCH
  |--------------------------------------------------------------------------
  */

  const filteredBots = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return bots;
    }

    return bots.filter((bot) => {
      return (
        String(bot.name || "")
          .toLowerCase()
          .includes(value) ||
        String(bot.description || "")
          .toLowerCase()
          .includes(value) ||
        String(bot.client?.name || "")
          .toLowerCase()
          .includes(value)
      );
    });
  }, [bots, search]);

  /*
  |--------------------------------------------------------------------------
  | STATUS CONFIG
  |--------------------------------------------------------------------------
  */

  const getStatusConfig = (status) => {
    switch (status) {
      case "active":
        return {
          label: "Active",
          className:
            "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
        };

      case "inactive":
        return {
          label: "Inactive",
          className:
            "bg-gray-50 text-gray-600 border-gray-200",
          dot: "bg-gray-400",
        };

      default:
        return {
          label: "Draft",
          className:
            "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
        };
    }
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN CREATE MODAL
  |--------------------------------------------------------------------------
  */

  const openCreateModal = () => {
    setEditingBot(null);

    setForm({
      tenant_id: "",
      name: "",
      description: "",
      status: "draft",
      whatsapp_account_id: "",
    });

    setError("");

    setShowModal(true);
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN EDIT MODAL
  |--------------------------------------------------------------------------
  */

  const openEditModal = (bot) => {
    setEditingBot(bot);

    setForm({
      tenant_id: bot.tenant_id || "",
      name: bot.name || "",
      description: bot.description || "",
      status: bot.status || "draft",
      whatsapp_account_id:
        bot.whatsapp_account_id || "",
    });

    setError("");

    setOpenMenu(null);
    setShowModal(true);
  };

  /*
  |--------------------------------------------------------------------------
  | CLOSE MODAL
  |--------------------------------------------------------------------------
  */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingBot(null);

    setForm({
      tenant_id: "",
      name: "",
      description: "",
      status: "draft",
      whatsapp_account_id: "",
    });

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE / UPDATE BOT
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.tenant_id) {
      setError("Please select a client.");
      return;
    }

    if (!form.name.trim()) {
      setError("Bot name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        tenant_id: Number(form.tenant_id),
        name: form.name.trim(),
        description:
          form.description.trim() || null,
        status: form.status,
        whatsapp_account_id:
          form.whatsapp_account_id
            ? Number(form.whatsapp_account_id)
            : null,
      };

      if (editingBot) {
        /*
        |--------------------------------------------------------------------------
        | UPDATE
        |--------------------------------------------------------------------------
        */

        const response = await axios.put(
          `${API_BASE_URL}/admin/bots/${editingBot.id}`,
          payload,
          {
            headers: {
              ...getHeaders(),
              "Content-Type": "application/json",
            },
          }
        );

        const updatedBot = response.data?.data;

        if (updatedBot) {
          setBots((prev) =>
            prev.map((bot) =>
              bot.id === editingBot.id
                ? updatedBot
                : bot
            )
          );
        }
      } else {
        /*
        |--------------------------------------------------------------------------
        | CREATE
        |--------------------------------------------------------------------------
        */

        const response = await axios.post(
          `${API_BASE_URL}/admin/bots`,
          payload,
          {
            headers: {
              ...getHeaders(),
              "Content-Type": "application/json",
            },
          }
        );

        const newBot = response.data?.data;

        if (newBot) {
          setBots((prev) => [
            newBot,
            ...prev,
          ]);
        }
      }

      closeModal();
    } catch (err) {
      console.error("Save bot error:", err);

      const validationErrors =
        err.response?.data?.errors;

      if (validationErrors) {
        const firstError =
          Object.values(validationErrors)
            ?.flat?.()[0];

        setError(
          firstError ||
            "Please check the entered information."
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to save bot."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DELETE BOT
  |--------------------------------------------------------------------------
  */

  const handleDelete = async (bot) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${bot.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await axios.delete(
        `${API_BASE_URL}/admin/bots/${bot.id}`,
        {
          headers: getHeaders(),
        }
      );

      setBots((prev) =>
        prev.filter(
          (item) => item.id !== bot.id
        )
      );

      setOpenMenu(null);
    } catch (err) {
      console.error("Delete bot error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to delete bot."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CHANGE STATUS
  |--------------------------------------------------------------------------
  */

  const handleStatusChange = async (
    bot,
    newStatus
  ) => {
    try {
      setError("");

      const response = await axios.patch(
        `${API_BASE_URL}/admin/bots/${bot.id}/status`,
        {
          status: newStatus,
        },
        {
          headers: {
            ...getHeaders(),
            "Content-Type": "application/json",
          },
        }
      );

      const updatedBot =
        response.data?.data;

      if (updatedBot) {
        setBots((prev) =>
          prev.map((item) =>
            item.id === bot.id
              ? updatedBot
              : item
          )
        );
      } else {
        setBots((prev) =>
          prev.map((item) =>
            item.id === bot.id
              ? {
                  ...item,
                  status: newStatus,
                }
              : item
          )
        );
      }

      setOpenMenu(null);
    } catch (err) {
      console.error(
        "Status update error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to update bot status."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | SUMMARY
  |--------------------------------------------------------------------------
  */

  const totalBots = bots.length;

  const activeBots = bots.filter(
    (bot) => bot.status === "active"
  ).length;

  const totalWorkflows = bots.reduce(
    (total, bot) =>
      total +
      Number(bot.workflows_count || 0),
    0
  );

  const connectedWhatsApp = bots.filter(
    (bot) =>
      bot.whatsapp_account_id ||
      bot.whatsapp === "Connected"
  ).length;

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Bots
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage your WhatsApp automation bots.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={18} />
          Create Bot
        </button>

      </div>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && !showModal && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>

        </div>
      )}


      {/* =====================================================
          SUMMARY CARDS
      ====================================================== */}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Total Bots */}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Bots
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                {loading ? "—" : totalBots}
              </h2>
            </div>

            <div className="rounded-lg bg-gray-100 p-3">
              <BotIcon
                size={21}
                className="text-gray-700"
              />
            </div>

          </div>

        </div>


        {/* Active Bots */}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm font-medium text-gray-500">
                Active Bots
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                {loading ? "—" : activeBots}
              </h2>
            </div>

            <div className="rounded-lg bg-emerald-50 p-3">
              <Activity
                size={21}
                className="text-emerald-600"
              />
            </div>

          </div>

        </div>


        {/* Workflows */}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Workflows
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                {loading
                  ? "—"
                  : totalWorkflows}
              </h2>
            </div>

            <div className="rounded-lg bg-blue-50 p-3">
              <Workflow
                size={21}
                className="text-blue-600"
              />
            </div>

          </div>

        </div>


        {/* WhatsApp */}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm font-medium text-gray-500">
                WhatsApp Connected
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                {loading
                  ? "—"
                  : connectedWhatsApp}
              </h2>
            </div>

            <div className="rounded-lg bg-green-50 p-3">
              <MessageCircle
                size={21}
                className="text-green-600"
              />
            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          BOT LIST
      ====================================================== */}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

        {/* LIST HEADER */}

        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-base font-semibold text-gray-900">
              All Bots
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Manage your automation bots and their workflows.
            </p>
          </div>


          {/* Search */}

          <div className="relative w-full md:w-72">

            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search bots..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100"
            />

          </div>

        </div>


        {/* =====================================================
            LOADING
        ====================================================== */}

        {loading ? (

          <div className="flex items-center justify-center px-6 py-16">

            <div className="flex items-center gap-3 text-sm text-gray-500">

              <Loader2
                size={20}
                className="animate-spin"
              />

              Loading bots...

            </div>

          </div>

        ) : filteredBots.length === 0 ? (

          /* =====================================================
              EMPTY
          ====================================================== */

          <div className="px-6 py-16 text-center">

            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">

              <BotIcon
                size={22}
                className="text-gray-500"
              />

            </div>

            <h3 className="text-sm font-semibold text-gray-900">
              No bots found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {search
                ? "Try changing your search."
                : "Create your first automation bot."}
            </p>

          </div>

        ) : (

          /* =====================================================
              BOT LIST
          ====================================================== */

          <div className="divide-y divide-gray-100">

            {filteredBots.map((bot) => {

              const status =
                getStatusConfig(bot.status);

              return (

                <div
                  key={bot.id}
                  className="group px-5 py-5 transition hover:bg-gray-50/70 md:px-6"
                >

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                    {/* BOT INFO */}

                    <div className="flex min-w-0 items-start gap-4">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">

                        <BotIcon size={21} />

                      </div>


                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="truncate text-sm font-semibold text-gray-900">
                            {bot.name}
                          </h3>

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}
                          >

                            <span
                              className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                            />

                            {status.label}

                          </span>

                        </div>


                        {/* CLIENT */}

                        {bot.client?.name && (
                          <p className="mt-1 text-xs font-medium text-indigo-600">
                            Client: {bot.client.name}
                          </p>
                        )}


                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                          {bot.description ||
                            "No description added."}
                        </p>


                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">

                          <span className="inline-flex items-center gap-1.5">
                            <Workflow size={14} />

                            {Number(
                              bot.workflows_count || 0
                            )}{" "}
                            Workflows
                          </span>


                          <span className="inline-flex items-center gap-1.5">

                            <MessageCircle size={14} />

                            {bot.whatsapp_account_id
                              ? "Connected"
                              : "Not Connected"}

                          </span>


                          {bot.updated_at && (
                            <span>
                              Updated{" "}
                              {new Date(
                                bot.updated_at
                              ).toLocaleString()}
                            </span>
                          )}

                        </div>

                      </div>

                    </div>


                    {/* ACTIONS */}

                    <div className="flex items-center gap-2 lg:shrink-0">

                      {/* WORKFLOWS */}

                      <button
                        type="button"
                        onClick={() => {
                          // Yahan later workflow page navigate kar sakte ho
                          console.log(
                            "Open workflows:",
                            bot.id
                          );
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                      >
                        <Workflow size={16} />
                        Workflows
                      </button>


                      {/* EDIT */}

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(bot)
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>


                      {/* MORE */}

                      <div className="relative">

                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenu(
                              openMenu === bot.id
                                ? null
                                : bot.id
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                        >
                          <MoreVertical size={18} />
                        </button>


                        {openMenu === bot.id && (

                          <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">

                            {/* ACTIVATE */}

                            {bot.status !== "active" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(
                                    bot,
                                    "active"
                                  )
                                }
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Power
                                  size={16}
                                  className="text-emerald-600"
                                />

                                Activate
                              </button>
                            )}


                            {/* DEACTIVATE */}

                            {bot.status === "active" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(
                                    bot,
                                    "inactive"
                                  )
                                }
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Power
                                  size={16}
                                  className="text-gray-500"
                                />

                                Deactivate
                              </button>
                            )}


                            {/* EDIT */}

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(bot)
                              }
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil size={16} />

                              Edit Bot
                            </button>


                            {/* DELETE */}

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(bot)
                              }
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={16} />

                              Delete Bot
                            </button>

                          </div>

                        )}

                      </div>


                      {/* DELETE */}

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(bot)
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 transition hover:bg-red-50"
                        title="Delete bot"
                      >
                        <Trash2 size={17} />
                      </button>

                    </div>

                  </div>

                </div>

              );
            })}

          </div>

        )}

      </div>


      {/* =====================================================
          CREATE / EDIT MODAL
      ====================================================== */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">

              <div>

                <h2 className="text-lg font-semibold text-gray-900">
                  {editingBot
                    ? "Edit Bot"
                    : "Create Bot"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingBot
                    ? "Update your WhatsApp automation bot."
                    : "Create a new WhatsApp automation bot."}
                </p>

              </div>


              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={19} />
              </button>

            </div>


            {/* MODAL ERROR */}

            {error && (

              <div className="mx-6 mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <span>{error}</span>

              </div>

            )}


            {/* FORM */}

            <form onSubmit={handleSubmit}>

              <div className="space-y-5 px-6 py-6">

                {/* CLIENT */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Client
                  </label>

                  <select
                    value={form.tenant_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tenant_id:
                          e.target.value,
                      })
                    }
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-50"
                  >

                    <option value="">
                      Select Client
                    </option>

                    {clients.map((client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.name}
                      </option>
                    ))}

                  </select>

                </div>


                {/* BOT NAME */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Bot Name
                  </label>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                    disabled={saving}
                    placeholder="e.g. WhatsApp Bot"
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-50"
                  />

                </div>


                {/* DESCRIPTION */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Description
                  </label>

                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description:
                          e.target.value,
                      })
                    }
                    disabled={saving}
                    placeholder="Describe what this bot will automate..."
                    className="w-full resize-none rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-50"
                  />

                </div>


                {/* STATUS */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value,
                      })
                    }
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-50"
                  >

                    <option value="draft">
                      Draft
                    </option>

                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>

                  </select>

                </div>

              </div>


              {/* FOOTER */}

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {saving ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />

                      {editingBot
                        ? "Update Bot"
                        : "Create Bot"}
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
};

export default Bots;