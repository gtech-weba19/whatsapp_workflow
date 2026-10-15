import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  Files,
  Search,
  RefreshCw,
  Eye,
  X,
  MessageSquare,
  CheckCircle2,
  Clock3,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

const STATUS_STYLES = {
  approved: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-700",
  paused: "bg-gray-100 text-gray-700",
};

function getStatus(template) {
  return String(
    template?.status || template?.approval_status || "pending"
  ).toLowerCase();
}

function getTemplateName(template) {
  return (
    template?.name ||
    template?.template_name ||
    template?.elementName ||
    "Untitled template"
  );
}

function getTemplateBody(template) {
  if (typeof template?.body === "string") return template.body;
  if (typeof template?.content === "string") return template.content;
  if (typeof template?.text === "string") return template.text;

  const components = Array.isArray(template?.components)
    ? template.components
    : [];

  const bodyComponent = components.find(
    (item) => String(item?.type || "").toUpperCase() === "BODY"
  );

  return bodyComponent?.text || "";
}

/**
 * Read a token from common storage keys.
 *
 * IMPORTANT:
 * Change these keys to match the exact key used by your login code.
 */
function getAuthToken() {
  const keys = ["token", "auth_token", "access_token"];

  for (const key of keys) {
    const token = localStorage.getItem(key);

    if (token) {
      return token.replace(/^Bearer\s+/i, "").trim();
    }
  }

  return null;
}

function getErrorMessage(error) {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (status === 401) {
    return "Unauthenticated. Your login token is missing or invalid. Please log in again and verify the token storage key.";
  }

  if (status === 403) {
    return "You are logged in, but you do not have permission to view templates.";
  }

  if (status === 404) {
    return "Templates API endpoint not found. Check your Laravel API route.";
  }

  if (status === 422) {
    return serverMessage || "The API rejected the supplied filters.";
  }

  if (status >= 500) {
    return serverMessage || "Laravel server error. Check the Laravel logs.";
  }

  if (!error?.response) {
    return "Could not connect to Laravel. Check that the backend is running and the API URL is correct.";
  }

  return serverMessage || error?.message || "Unable to load templates.";
}

function StatusBadge({ status }) {
  const normalized = STATUS_STYLES[status] ? status : "pending";

  const Icon =
    normalized === "approved"
      ? CheckCircle2
      : normalized === "rejected"
        ? XCircle
        : normalized === "pending"
          ? Clock3
          : AlertCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        STATUS_STYLES[normalized]
      }`}
    >
      <Icon size={13} />
      {status || "pending"}
    </span>
  );
}

function SummaryCard({ title, value, icon: Icon, iconClass }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>

        <div className={`rounded-lg p-2.5 ${iconClass}`}>
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="text-xs text-gray-500">{label}</p>

      <p className="mt-1 break-all text-sm font-medium text-gray-800">
        {String(value ?? "—")}
      </p>
    </div>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    from: null,
    to: null,
  });

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getAuthToken();

      const response = await axios.get(`${API_URL}/templates`, {
        params: {
          search: search.trim() || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          page,
          per_page: perPage,
        },
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            }
          : {
              Accept: "application/json",
            },
      });

      const payload = response.data;

      // Supports Laravel paginator and common API response formats.
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.templates)
            ? payload.templates
            : Array.isArray(payload?.data?.templates)
              ? payload.data.templates
              : null;

      if (!rows) {
        throw new Error(
          "Unexpected API response. The endpoint must return a templates array."
        );
      }

      setTemplates(rows);

      if (!Array.isArray(payload) && payload?.current_page != null) {
        setPagination({
          currentPage: Number(payload.current_page) || 1,
          lastPage: Number(payload.last_page) || 1,
          total: Number(payload.total) || 0,
          from: payload.from ?? null,
          to: payload.to ?? null,
        });
      } else if (
        !Array.isArray(payload) &&
        payload?.meta?.current_page != null
      ) {
        const meta = payload.meta;

        setPagination({
          currentPage: Number(meta.current_page) || 1,
          lastPage: Number(meta.last_page) || 1,
          total: Number(meta.total) || rows.length,
          from: meta.from ?? null,
          to: meta.to ?? null,
        });
      } else {
        setPagination({
          currentPage: page,
          lastPage: 1,
          total: rows.length,
          from: rows.length ? 1 : null,
          to: rows.length || null,
        });
      }
    } catch (err) {
      setTemplates([]);

      setPagination({
        currentPage: 1,
        lastPage: 1,
        total: 0,
        from: null,
        to: null,
      });

      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, page, perPage]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates, refreshKey]);

  const categories = useMemo(() => {
    const values = templates
      .map((template) => template.category || "Uncategorized")
      .filter(Boolean);

    return [...new Set(values)];
  }, [templates]);

  const approvedCount = templates.filter(
    (template) => getStatus(template) === "approved"
  ).length;

  const pendingCount = templates.filter(
    (template) => getStatus(template) === "pending"
  ).length;

  const rejectedCount = templates.filter(
    (template) => getStatus(template) === "rejected"
  ).length;

  function changeSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function changeStatus(value) {
    setStatusFilter(value);
    setPage(1);
  }

  function changeCategory(value) {
    setCategoryFilter(value);
    setPage(1);
  }

  function changePerPage(value) {
    setPerPage(Number(value));
    setPage(1);
  }

  function refreshTemplates() {
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Files size={23} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                WhatsApp Templates
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                View and manage your WhatsApp message templates.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshTemplates}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total templates"
            value={pagination.total}
            icon={Files}
            iconClass="bg-blue-50 text-blue-600"
          />

          <SummaryCard
            title="Approved on this page"
            value={approvedCount}
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <SummaryCard
            title="Pending on this page"
            value={pendingCount}
            icon={Clock3}
            iconClass="bg-amber-50 text-amber-600"
          />

          <SummaryCard
            title="Rejected on this page"
            value={rejectedCount}
            icon={XCircle}
            iconClass="bg-red-50 text-red-600"
          />
        </div>

        {/* Search and filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => changeSearch(event.target.value)}
                placeholder="Search templates..."
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => changeStatus(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="paused">Paused</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => changeCategory(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All categories</option>

              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />

            <div className="min-w-0">
              <p className="font-semibold">
                Templates could not be loaded
              </p>

              <p className="mt-1 break-words">{error}</p>

              <button
                type="button"
                onClick={refreshTemplates}
                className="mt-3 font-semibold underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Template table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-gray-900">
                Template list
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                {pagination.total} template(s) found
              </p>
            </div>

            <select
              value={perPage}
              onChange={(event) => changePerPage(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              aria-label="Templates per page"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Template</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Language</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <RefreshCw
                        size={22}
                        className="mx-auto animate-spin text-blue-500"
                      />

                      <p className="mt-3 text-gray-500">
                        Loading templates...
                      </p>
                    </td>
                  </tr>
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <MessageSquare
                        size={30}
                        className="mx-auto text-gray-300"
                      />

                      <p className="mt-3 font-medium text-gray-700">
                        No templates found
                      </p>

                      <p className="mt-1 text-gray-500">
                        {error
                          ? "Fix the API issue and try again."
                          : "Try changing your search or filters."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  templates.map((template, index) => {
                    const status = getStatus(template);
                    const name = getTemplateName(template);
                    const body = getTemplateBody(template);

                    return (
                      <tr
                        key={
                          template.id ??
                          template.template_id ??
                          template.name ??
                          index
                        }
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <MessageSquare size={18} />
                            </div>

                            <div className="max-w-md">
                              <p className="font-semibold text-gray-900">
                                {name}
                              </p>

                              <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                {body || "No body text available"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                            {template.category || "Uncategorized"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {template.language ||
                            template.language_code ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={status} />
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTemplate(template)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye size={15} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center">
            <p className="text-xs text-gray-500">
              {pagination.total === 0
                ? "No results"
                : `Showing ${pagination.from ?? 1}–${
                    pagination.to ?? templates.length
                  } of ${pagination.total}`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span className="text-sm text-gray-600">
                Page {pagination.currentPage} of {pagination.lastPage}
              </span>

              <button
                type="button"
                disabled={
                  loading ||
                  pagination.currentPage >= pagination.lastPage
                }
                onClick={() =>
                  setPage((value) =>
                    Math.min(pagination.lastPage, value + 1)
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Template details modal */}
      {selectedTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedTemplate(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-modal-title"
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-gray-100 p-5">
              <div>
                <h2
                  id="template-modal-title"
                  className="text-lg font-bold text-gray-900"
                >
                  {getTemplateName(selectedTemplate)}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Template details
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                aria-label="Close details"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={getStatus(selectedTemplate)} />

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs capitalize text-gray-700">
                  {selectedTemplate.category || "Uncategorized"}
                </span>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                  {selectedTemplate.language ||
                    selectedTemplate.language_code ||
                    "Language not specified"}
                </span>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Message preview
                </p>

                <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                  {getTemplateBody(selectedTemplate) ||
                    "No body text available for this template."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DetailField
                  label="Template ID"
                  value={
                    selectedTemplate.id ??
                    selectedTemplate.template_id ??
                    "—"
                  }
                />

                <DetailField
                  label="Provider ID"
                  value={selectedTemplate.provider_id || "—"}
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 p-4">
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}