import React from "react";
import { Link } from "react-router-dom";
import {
  Smartphone,
  Workflow,
  MessageCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  Bot,
} from "lucide-react";

/**
 * ClientSetupActivationCard
 * Rendered on Client Dashboard when WhatsApp account is approved,
 * but workflows have not been created or no message flow has run yet.
 * Replaces empty graphs with a clean, actionable onboarding experience.
 */
export default function ClientSetupActivationCard({
  hasApprovedWhatsApp = false,
  hasWorkflowsCreated = false,
  hasActiveTraffic = false,
  whatsAppAccount = null,
  workflowCount = 0,
}) {
  const accountStatus = String(whatsAppAccount?.status || "").toLowerCase();
  const isPendingApproval =
    accountStatus === "pending" ||
    accountStatus === "pending_approval" ||
    accountStatus === "in_review" ||
    accountStatus === "verifying";

  // Determine which step is currently next
  const activeStep = !hasApprovedWhatsApp ? 1 : !hasWorkflowsCreated ? 2 : 3;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-100/90 bg-white p-6 shadow-sm shadow-emerald-950/[0.03] sm:p-7">
      {/* Top Emerald Gradient Ribbon */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-90" />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/25">
            <Sparkles size={20} strokeWidth={2.3} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
                WhatsApp Bot Analytics &amp; Pulse
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                <Clock size={11} />
                Setup in Progress
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
              Your 30-Day Activity Pulse, Interaction Charts, and Trigger Leaderboard will unlock automatically once your WhatsApp bot starts receiving messages.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Step Interactive Checklist */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Step 1: WhatsApp Account */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
            hasApprovedWhatsApp
              ? "border-emerald-200 bg-emerald-50/40"
              : activeStep === 1
              ? "border-emerald-300 bg-white shadow-sm ring-2 ring-emerald-100"
              : "border-slate-200 bg-slate-50/50"
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${
                  hasApprovedWhatsApp
                    ? "bg-emerald-600 shadow-xs"
                    : "bg-slate-700"
                }`}
              >
                <Smartphone size={16} />
              </div>
              {hasApprovedWhatsApp ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 size={11} className="text-emerald-700" />
                  Approved
                </span>
              ) : isPendingApproval ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  <Clock size={11} />
                  In Review
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  Step 1
                </span>
              )}
            </div>

            <h3 className="mt-3 text-sm font-bold text-slate-900">
              1. WhatsApp Account
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {hasApprovedWhatsApp
                ? `Account connected (${whatsAppAccount?.sender_number || "Active"}). Ready for incoming chats.`
                : isPendingApproval
                ? "Your WhatsApp Business Account is submitted and awaiting Meta approval."
                : "Connect your official WhatsApp Business number via Meta to start."}
            </p>
          </div>

          {!hasApprovedWhatsApp && (
            <div className="mt-4 pt-2">
              <Link
                to="/whatsapp-accounts"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
              >
                <Smartphone size={13} />
                Connect WhatsApp
              </Link>
            </div>
          )}
        </div>

        {/* Step 2: Bot Workflow */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
            hasWorkflowsCreated
              ? "border-emerald-200 bg-emerald-50/40"
              : activeStep === 2
              ? "border-emerald-300 bg-white shadow-sm ring-2 ring-emerald-100"
              : "border-slate-200 bg-slate-50/50"
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${
                  hasWorkflowsCreated
                    ? "bg-teal-600 shadow-xs"
                    : "bg-slate-700"
                }`}
              >
                <Workflow size={16} />
              </div>
              {hasWorkflowsCreated ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 size={11} className="text-emerald-700" />
                  {workflowCount > 0 ? `${workflowCount} Created` : "Configured"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  Step 2
                </span>
              )}
            </div>

            <h3 className="mt-3 text-sm font-bold text-slate-900">
              2. Chatbot Workflow
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {hasWorkflowsCreated
                ? "Your interactive chatbot workflow and trigger keywords are ready."
                : "Create an automated bot workflow with triggers, menus, and instant replies."}
            </p>
          </div>

          {!hasWorkflowsCreated && (
            <div className="mt-4 pt-2">
              <Link
                to="/workflow-builder"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
              >
                <Bot size={13} />
                Create Workflow
                <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>

        {/* Step 3: Message Flow & Pulse */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
            hasActiveTraffic
              ? "border-emerald-200 bg-emerald-50/40"
              : activeStep === 3
              ? "border-teal-300 bg-white shadow-sm ring-2 ring-teal-100"
              : "border-slate-200 bg-slate-50/50"
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${
                  hasActiveTraffic
                    ? "bg-cyan-600 shadow-xs"
                    : "bg-slate-700"
                }`}
              >
                <MessageCircle size={16} />
              </div>
              {hasActiveTraffic ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 size={11} className="text-emerald-700" />
                  Traffic Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                  Step 3
                </span>
              )}
            </div>

            <h3 className="mt-3 text-sm font-bold text-slate-900">
              3. Live Message Flow
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {hasActiveTraffic
                ? "Live messages and conversation sessions are actively flowing."
                : "Send a test message from WhatsApp to your connected number to trigger the bot."}
            </p>
          </div>

          <div className="mt-4 pt-2">
            <Link
              to="/message-logs"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            >
              <Zap size={13} className="text-emerald-600" />
              View Message Logs
            </Link>
          </div>
        </div>
      </div>

      {/* Friendly Bottom Tip */}
      <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-black">
            💡
          </span>
          <p className="text-xs font-medium text-slate-700">
            {hasApprovedWhatsApp && hasWorkflowsCreated
              ? "Your bot is configured and ready! Send a WhatsApp message to your bot number to see your 30-day activity pulse and interaction graphs appear here."
              : !hasApprovedWhatsApp
              ? "Get started by connecting your WhatsApp Business account. Once approved, you can build interactive workflows."
              : "Next step: Build your first workflow to automate customer interactions."}
          </p>
        </div>

        {hasApprovedWhatsApp && hasWorkflowsCreated && (
          <div className="mt-2 shrink-0 sm:mt-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">
              <Zap size={11} className="text-emerald-600" />
              Ready for First Test
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

