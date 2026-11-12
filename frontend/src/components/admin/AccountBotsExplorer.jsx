import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  Building2,
  ChevronRight,
  GitBranch,
  MessageCircle,
  MousePointerClick,
  Search,
  Smartphone,
  Workflow,
  X,
  Zap,
} from "lucide-react";

function StatusPill({ status }) {
  const normalized = String(status || "unknown").toLowerCase();
  const isGood = ["active", "connected", "published", "success"].includes(
    normalized
  );
  const isWarn = ["pending", "waiting", "draft"].includes(normalized);

  const cls = isGood
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : isWarn
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${cls}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isGood ? "bg-emerald-500" : isWarn ? "bg-amber-500" : "bg-slate-400"
        }`}
      />
      {normalized}
    </span>
  );
}

export default function AccountBotsExplorer({
  accounts = [],
  loading = false,
  superAdmin = false,
  canViewWorkflows = true,
}) {
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [search, setSearch] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [workflowSearch, setWorkflowSearch] = useState("");

  const safeAccounts = useMemo(
    () => (Array.isArray(accounts) ? accounts : []),
    [accounts]
  );

  const totals = useMemo(
    () =>
      safeAccounts.reduce(
        (acc, item) => ({
          bots: acc.bots + Number(item?.bots_count || 0),
          workflows: acc.workflows + Number(item?.workflows_count || 0),
        }),
        { bots: 0, workflows: 0 }
      ),
    [safeAccounts]
  );

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return safeAccounts;

    return safeAccounts.filter((acc) => {
      const name = String(acc?.name || "").toLowerCase();
      const waba = String(acc?.waba_id || "").toLowerCase();
      const owner = String(acc?.owner_name || "").toLowerCase();
      const email = String(acc?.owner_email || "").toLowerCase();
      return (
        name.includes(q) ||
        waba.includes(q) ||
        owner.includes(q) ||
        email.includes(q)
      );
    });
  }, [safeAccounts, search]);

  const selectedAccount = useMemo(
    () =>
      safeAccounts.find((acc) => String(acc?.id) === String(selectedAccountId)) ||
      null,
    [safeAccounts, selectedAccountId]
  );

  const botScopedWorkflows = useMemo(() => {
    if (!selectedAccount) return [];
    const list = selectedAccount.workflows || [];
    if (!selectedBotId) return list;
    return list.filter((wf) => String(wf.bot_id) === String(selectedBotId));
  }, [selectedAccount, selectedBotId]);

  const workflowStatusCounts = useMemo(() => {
    let published = 0;
    let draft = 0;
    botScopedWorkflows.forEach((wf) => {
      const st = String(wf.status || "").toLowerCase();
      if (st === "published" || st === "active") published += 1;
      else if (st === "draft" || st === "pending") draft += 1;
    });
    return {
      all: botScopedWorkflows.length,
      published,
      draft,
    };
  }, [botScopedWorkflows]);

  const visibleWorkflows = useMemo(() => {
    const q = workflowSearch.trim().toLowerCase();
    return botScopedWorkflows.filter((wf) => {
      const st = String(wf.status || "").toLowerCase();
      if (
        workflowFilter === "published" &&
        st !== "published" &&
        st !== "active"
      ) {
        return false;
      }
      if (workflowFilter === "draft" && st !== "draft" && st !== "pending") {
        return false;
      }
      if (!q) return true;
      return (
        String(wf.name || "")
          .toLowerCase()
          .includes(q) ||
        String(wf.trigger_keyword || "")
          .toLowerCase()
          .includes(q) ||
        String(wf.id || "").includes(q)
      );
    });
  }, [botScopedWorkflows, workflowFilter, workflowSearch]);

  const handleSelectAccount = (accountId) => {
    if (String(selectedAccountId) === String(accountId)) {
      setSelectedAccountId(null);
      setSelectedBotId(null);
    } else {
      setSelectedAccountId(accountId);
      setSelectedBotId(null);
      setWorkflowFilter("all");
      setWorkflowSearch("");
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-100/90 bg-white p-5 shadow-sm shadow-emerald-950/[0.03] sm:p-6">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 opacity-85" />

      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 shadow-2xs">
            <Building2 size={21} />
          </span>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                WhatsApp Accounts, Bots &amp; Workflows
              </h2>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                {safeAccounts.length} Account
                {safeAccounts.length === 1 ? "" : "s"}
              </span>
              {safeAccounts.length > 0 && (
                <>
                  <span className="hidden rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800 sm:inline-flex">
                    {totals.bots} Bot{totals.bots === 1 ? "" : "s"}
                  </span>
                  <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 sm:inline-flex">
                    {totals.workflows} Workflow{totals.workflows === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Click any WhatsApp account card to explore its numbered Bots and
              Workflows
            </p>
          </div>
        </div>

        {safeAccounts.length > 1 && (
          <div className="relative w-full sm:w-72">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search account, number, owner..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        )}
      </div>

      {/* Account Cards Grid */}
      {loading ? (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
          <Smartphone className="mx-auto text-slate-400" size={28} />
          <p className="mt-2 text-sm font-bold text-slate-800">
            No WhatsApp Accounts Found
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Connect a WhatsApp account to see its bots and workflows here.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {filteredAccounts.map((acc, idx) => {
            const isSelected = String(selectedAccountId) === String(acc.id);
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectAccount(acc.id)}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-emerald-500 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 shadow-md ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-950/[0.04]"
                }`}
              >
                {isSelected && (
                  <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-2xs transition ${
                        isSelected
                          ? "bg-emerald-600 text-white shadow-emerald-600/25"
                          : "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white"
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-900">
                        {acc.name || `Account #${acc.id}`}
                      </p>
                      <p className="truncate text-[11px] font-medium text-slate-500">
                        {acc.waba_id || "No WABA number"}
                        {superAdmin && acc.owner_name
                          ? ` · ${acc.owner_name}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <StatusPill status={acc.status} />
                </div>

                {/* Count Badges */}
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800">
                      <Bot size={12} />
                      {acc.bots_count} Bot{acc.bots_count === 1 ? "" : "s"}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-lg border border-teal-200/80 bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-800">
                      <Workflow size={12} />
                      {acc.workflows_count} Workflow
                      {acc.workflows_count === 1 ? "" : "s"}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
                      <MessageCircle size={12} />
                      {acc.sessions_count}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold transition ${
                      isSelected
                        ? "bg-emerald-600 text-white"
                        : "text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-700"
                    }`}
                  >
                    {isSelected ? "Opened" : "Explore"}
                    <ChevronRight size={13} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Clicked Account Drill-down */}
      {!selectedAccount ? (
        safeAccounts.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-3 text-xs font-medium text-emerald-800">
            <MousePointerClick
              size={15}
              className="shrink-0 text-emerald-600"
            />
            <span>
              Click any WhatsApp account card above to view its numbered Bots
              and Workflows.
            </span>
          </div>
        )
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/60 via-[#f8fcfa] to-[#f4faf7] p-4 shadow-inner sm:p-5">
          {/* Selected Account Banner */}
          <div className="flex flex-col gap-3 border-b border-emerald-200/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/25">
                <Smartphone size={19} />
              </span>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 sm:text-base">
                    {selectedAccount.name}
                  </h3>
                  {selectedAccount.waba_id && (
                    <span className="rounded-lg border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600">
                      {selectedAccount.waba_id}
                    </span>
                  )}
                  <StatusPill status={selectedAccount.status} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Showing {selectedAccount.bots_count} numbered Bot
                  {selectedAccount.bots_count === 1 ? "" : "s"} ·{" "}
                  {selectedAccount.workflows_count} Workflow
                  {selectedAccount.workflows_count === 1 ? "" : "s"} ·{" "}
                  {selectedAccount.sessions_count} Conversation
                  {selectedAccount.sessions_count === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {botScopedWorkflows.length > 0 && (
                <div className="inline-flex rounded-xl border border-emerald-200/80 bg-white p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setWorkflowFilter("all")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      workflowFilter === "all"
                        ? "bg-emerald-600 text-white"
                        : "text-slate-600 hover:text-emerald-700"
                    }`}
                  >
                    All ({workflowStatusCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkflowFilter("published")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      workflowFilter === "published"
                        ? "bg-emerald-600 text-white"
                        : "text-slate-600 hover:text-emerald-700"
                    }`}
                  >
                    Published ({workflowStatusCounts.published})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkflowFilter("draft")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      workflowFilter === "draft"
                        ? "bg-amber-500 text-white"
                        : "text-slate-600 hover:text-amber-700"
                    }`}
                  >
                    Draft ({workflowStatusCounts.draft})
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedAccountId(null);
                  setSelectedBotId(null);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50"
              >
                <X size={13} />
                Close
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* NUMBERED BOTS LIST */}
            <div className="lg:col-span-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  <Bot size={15} />
                  Bots ({selectedAccount.bots_count})
                </h4>

                {selectedBotId && (
                  <button
                    type="button"
                    onClick={() => setSelectedBotId(null)}
                    className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-200"
                  >
                    Show all workflows
                  </button>
                )}
              </div>

              {(selectedAccount.bots || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-xs text-slate-500">
                  No bots created on this account yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedAccount.bots.map((bot, bIdx) => {
                    const botActive = String(selectedBotId) === String(bot.id);
                    return (
                      <button
                        key={bot.id}
                        type="button"
                        onClick={() =>
                          setSelectedBotId(botActive ? null : bot.id)
                        }
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all ${
                          botActive
                            ? "border-emerald-500 bg-white shadow-md ring-2 ring-emerald-500/20"
                            : "border-slate-200/90 bg-white hover:border-emerald-300 hover:shadow-xs"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                              botActive
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {bot.number || bIdx + 1}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-extrabold text-slate-900">
                              {bot.name}
                            </p>
                            <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                              Bot #{bot.number || bIdx + 1} · ID {bot.id} ·{" "}
                              <span className="font-bold text-emerald-700">
                                {bot.workflows_count} workflow
                                {bot.workflows_count === 1 ? "" : "s"}
                              </span>
                            </p>
                          </div>
                        </div>

                        <StatusPill status={bot.status} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* NUMBERED WORKFLOWS LIST */}
            <div className="lg:col-span-8">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-800">
                    <GitBranch size={15} />
                    Workflows ({visibleWorkflows.length})
                  </h4>
                  {selectedBotId && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      Filtered by Bot
                    </span>
                  )}
                </div>

                {botScopedWorkflows.length > 3 && (
                  <div className="relative w-full sm:w-52">
                    <Search
                      size={12}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      value={workflowSearch}
                      onChange={(e) => setWorkflowSearch(e.target.value)}
                      placeholder="Filter workflows..."
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2.5 text-[11px] text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                )}
              </div>

              {visibleWorkflows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
                  No workflows match the selected filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {visibleWorkflows.map((wf, wIdx) => {
                    const wfStatus = String(wf.status || "").toLowerCase();
                    const isPublished =
                      wfStatus === "published" || wfStatus === "active";

                    return (
                      <div
                        key={wf.id}
                        className={`group flex h-full flex-col justify-between rounded-xl border border-slate-200/90 border-l-4 bg-white p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md ${
                          isPublished
                            ? "border-l-emerald-500"
                            : "border-l-amber-400"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                                  isPublished
                                    ? "bg-teal-50 text-teal-800"
                                    : "bg-amber-50 text-amber-800"
                                }`}
                              >
                                #{wIdx + 1}
                              </span>

                              <div className="min-w-0">
                                <p
                                  className="truncate text-xs font-extrabold text-slate-900"
                                  title={wf.name}
                                >
                                  {wf.name}
                                </p>
                                <p className="truncate text-[10px] font-medium text-slate-400">
                                  {wf.bot_name ? `Bot: ${wf.bot_name} · ` : ""}
                                  ID #{wf.id}
                                </p>
                              </div>
                            </div>

                            <StatusPill status={wf.status} />
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                            {wf.trigger_keyword ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                                <Zap size={10} />
                                {wf.trigger_keyword}
                              </span>
                            ) : (
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-400">
                                No trigger set
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                              <MessageCircle size={10} />
                              {wf.sessions_count} Conversation
                              {wf.sessions_count === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px]">
                          <Link
                            to={`/message-logs?client_id=${selectedAccount.user_id}&account_id=${selectedAccount.id}&workflow_id=${wf.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 transition hover:bg-emerald-600 hover:text-white"
                          >
                            <MessageCircle size={12} />
                            Message Logs
                          </Link>

                          {canViewWorkflows && (
                            <Link
                              to={`/workflow-builder?workflow_id=${wf.id}&user_id=${selectedAccount.user_id}${wf.bot_id ? `&bot_id=${wf.bot_id}` : ""}`}
                              className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                            >
                              Builder
                              <ChevronRight size={13} />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
