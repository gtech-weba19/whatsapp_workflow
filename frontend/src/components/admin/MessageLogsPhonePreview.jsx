import React, { useEffect, useRef } from "react";
import {
  ArrowLeft,
  Video,
  Phone,
  MoreVertical,
  Plus,
  Camera,
  Mic,
  MessageSquare,
  Check,
  CheckCheck,
  AlertCircle,
  FileText,
  ExternalLink,
  CornerDownRight,
  Smartphone,
  Bot,
  Loader2,
  Download,
  ShieldCheck,
  MapPin,
} from "lucide-react";

function getInitials(name, mobile) {
  const cleanName = String(name || "").trim();
  if (cleanName) {
    return cleanName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  const digits = String(mobile || "").replace(/\D/g, "");
  return digits ? digits.slice(-2) : "WA";
}

function DeliveryTicks({ status, errorReason }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase();

  if (normalized === "read") {
    return (
      <CheckCheck
        size={14}
        className="inline-block shrink-0 text-[#53bdeb]"
        title="Read"
      />
    );
  }

  if (normalized === "delivered") {
    return (
      <CheckCheck
        size={14}
        className="inline-block shrink-0 text-slate-400"
        title="Delivered"
      />
    );
  }

  if (normalized === "sent") {
    return (
      <Check
        size={14}
        className="inline-block shrink-0 text-slate-400"
        title="Sent"
      />
    );
  }

  if (normalized === "failed" || normalized === "error") {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-rose-500"
        title={errorReason || "Failed to send"}
      >
        <AlertCircle size={13} />
      </span>
    );
  }

  return (
    <Check
      size={13}
      className="inline-block shrink-0 text-slate-300"
      title="Pending"
    />
  );
}

function MediaAttachment({ media }) {
  if (!media || !media.url) return null;

  if (media.type === "image") {
    return (
      <a
        href={media.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-1.5 block overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
      >
        <img
          src={media.url}
          alt={media.filename || "Image attachment"}
          className="max-h-44 w-full object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (media.type === "video") {
    return (
      <div className="mb-1.5 overflow-hidden rounded-lg bg-black">
        <video
          src={media.url}
          controls
          className="max-h-44 w-full"
        />
      </div>
    );
  }

  if (media.type === "audio") {
    return (
      <div className="mb-1.5 rounded-lg bg-slate-100 p-2">
        <audio src={media.url} controls className="h-8 w-full" />
      </div>
    );
  }

  return (
    <a
      href={media.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 transition hover:bg-slate-100"
    >
      <span className="flex min-w-0 items-center gap-2">
        <FileText size={16} className="shrink-0 text-rose-600" />
        <span className="truncate font-medium">
          {media.filename || "Document"}
        </span>
      </span>
      <Download size={14} className="shrink-0 text-slate-500" />
    </a>
  );
}

export default function MessageLogsPhonePreview({
  device,
  onDeviceChange,
  session,
  messages,
  loading,
  onMobileBack,
}) {
  const scrollRef = useRef(null);
  const isIphone = device === "iphone";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, session?.id]);

  const headerTitle = session
    ? session.display_name ||
      `+${String(session.user_identifier || "").replace(/^\+/, "")}`
    : "Select Conversation";

  const headerSubtitle = session
    ? `${session.workflow_name || "Workflow"} · ${session.status || "active"}`
    : "Choose from left list";

  const initials = session
    ? getInitials(session.display_name, session.user_identifier)
    : "WA";

  return (
    <div className="flex w-full flex-col items-center">
      {/* Device Switcher */}
      <div className="mb-2.5 inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-white p-1 shadow-sm shadow-emerald-950/[0.04]">
        <button
          type="button"
          onClick={() => onDeviceChange("iphone")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition ${
            isIphone
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
          }`}
        >
          <Smartphone size={12} />
          iPhone 15 Pro
        </button>

        <button
          type="button"
          onClick={() => onDeviceChange("android")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition ${
            !isIphone
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
          }`}
        >
          <Smartphone size={12} />
          Android Galaxy
        </button>
      </div>

      {/* Realistic Phone Frame */}
      <div
        className={`relative flex h-[558px] w-full max-w-[304px] flex-col overflow-hidden bg-[#efeae2] shadow-xl shadow-emerald-950/15 transition-all duration-300 2xl:max-w-[324px] ${
          isIphone
            ? "rounded-[40px] border-[8px] border-slate-900 ring-2 ring-emerald-500/20"
            : "rounded-[24px] border-[7px] border-slate-800 ring-2 ring-emerald-500/20"
        }`}
      >
        {/* Device Status Bar */}
        <div className="relative flex h-7 shrink-0 items-center justify-between bg-[#075e54] px-5 text-[10px] font-bold text-white/95">
          <span>9:41</span>

          {isIphone ? (
            <div className="absolute left-1/2 top-1.5 h-4 w-20 -translate-x-1/2 rounded-full bg-slate-950 shadow-inner" />
          ) : (
            <div className="absolute left-1/2 top-2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-slate-950" />
          )}

          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-100">
            <span>5G</span>
            <span className="rounded border border-emerald-200/60 px-1 py-[1px] text-[8px] leading-none">
              88%
            </span>
          </div>
        </div>

        {/* Authentic WhatsApp Emerald Top Bar */}
        <div className="flex shrink-0 items-center justify-between gap-2 bg-[#075e54] px-2.5 pb-2.5 pt-1.5 text-white shadow-sm">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onMobileBack}
              className="rounded-full p-1 text-emerald-100 transition hover:bg-white/15"
              title="Back to conversations"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-extrabold text-white ring-1 ring-white/25">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">
                {headerTitle}
              </p>
              <p className="truncate text-[10px] text-emerald-100/85">
                {headerSubtitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 pr-1 text-emerald-100">
            <Video size={15} />
            <Phone size={14} />
            <MoreVertical size={14} className="text-emerald-200" />
          </div>
        </div>

        {/* Chat Messages Area */}
        <div
          ref={scrollRef}
          className="relative min-h-0 flex-1 overflow-y-auto px-3 py-3"
          style={{
            backgroundColor: "#efeae2",
            backgroundImage:
              "radial-gradient(rgba(7, 94, 84, 0.06) 1px, transparent 0)",
            backgroundSize: "16px 16px",
          }}
        >
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Loader2 size={26} className="animate-spin text-emerald-700" />
              <p className="mt-2 text-xs font-semibold text-slate-600">
                Loading conversation...
              </p>
            </div>
          ) : !session ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-white/90 text-emerald-600 shadow-sm">
                <MessageSquare size={22} />
              </div>
              <p className="mt-3 text-xs font-extrabold text-slate-800">
                No Conversation Selected
              </p>
              <p className="mt-1 max-w-[215px] text-[10.5px] leading-4 text-slate-500">
                Select any number from the left conversation list to view
                chat and messages.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-white/90 text-emerald-600 shadow-sm">
                <Bot size={22} />
              </div>
              <p className="mt-3 text-xs font-extrabold text-slate-800">
                No Messages Recorded
              </p>
              <p className="mt-1 max-w-[215px] text-[10.5px] leading-4 text-slate-500">
                This session has no stored messages yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Session Workflow Context Pill */}
              <div className="mb-2 flex justify-center">
                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200/70 bg-white/90 px-2.5 py-1 text-[9px] font-semibold text-emerald-800 shadow-2xs">
                  <ShieldCheck size={10} className="text-emerald-600" />
                  {session.workflow_name || "Workflow Conversation"}
                </span>
              </div>

              {messages.map((msg, idx) => {
                const prevDate = idx > 0 ? messages[idx - 1].date_label : null;
                const showDate = msg.date_label && msg.date_label !== prevDate;
                const isCustomer = msg.direction === "inbound";

                return (
                  <React.Fragment key={msg.id || idx}>
                    {showDate && (
                      <div className="my-2 flex justify-center">
                        <span className="rounded-lg bg-white/90 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 shadow-2xs">
                          {msg.date_label}
                        </span>
                      </div>
                    )}

                    <div
                      className={`flex ${
                        isCustomer ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-2.5 py-1.5 shadow-xs ${
                          isCustomer
                            ? "rounded-tr-xs bg-[#d9fdd3] text-slate-900"
                            : "rounded-tl-xs bg-white text-slate-900"
                        }`}
                      >
                        {/* Sender badge */}
                        <div className="mb-0.5 flex items-center justify-between gap-2 text-[9px] font-bold">
                          <span
                            className={
                              isCustomer ? "text-emerald-800" : "text-[#008069]"
                            }
                          >
                            {isCustomer ? "Customer" : "Bot"}
                          </span>

                          {msg.template?.name && (
                            <span className="rounded bg-emerald-50 px-1.5 py-[1px] text-[8px] font-semibold text-emerald-700">
                              {msg.template.name}
                            </span>
                          )}
                        </div>

                        {/* Media */}
                        <MediaAttachment media={msg.media} />

                        {/* Location Pin */}
                        {(msg.type === "location" || msg.message_type === "location") && (
                          <div className="mb-1.5 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-2 text-slate-800">
                            <MapPin size={18} className="mt-0.5 shrink-0 text-[#008069]" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-slate-900 truncate">
                                {msg.location_name || msg.name || "Location"}
                              </p>
                              {(msg.address || msg.location_address) && (
                                <p className="mt-0.5 text-[10px] text-slate-600 line-clamp-2">
                                  {msg.address || msg.location_address}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Main Text */}
                        {msg.display_text && (
                          <p className="whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-slate-800">
                            {msg.display_text}
                          </p>
                        )}

                        {/* Menu Options */}
                        {Array.isArray(msg.options) &&
                          msg.options.length > 0 && (
                            <div className="mt-1.5 space-y-1 border-t border-slate-100 pt-1.5">
                              {msg.options.map((opt, oIdx) => (
                                <div
                                  key={opt.id || oIdx}
                                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200/70 bg-emerald-50/50 px-2 py-1 text-[10.5px] font-semibold text-[#008069]"
                                >
                                  <CornerDownRight
                                    size={11}
                                    className="shrink-0 opacity-75"
                                  />
                                  <span className="truncate">{opt.title}</span>
                                </div>
                              ))}
                            </div>
                          )}

                        {/* Interactive Buttons */}
                        {Array.isArray(msg.buttons) &&
                          msg.buttons.length > 0 && (
                            <div className="mt-1.5 space-y-1 border-t border-slate-100 pt-1.5">
                              {msg.buttons.map((btn, bIdx) => (
                                <div
                                  key={btn.id || bIdx}
                                  className="flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2 py-1 text-[10.5px] font-bold text-[#008069]"
                                >
                                  {btn.type === "url" ? (
                                    <ExternalLink size={11} />
                                  ) : (
                                    <CornerDownRight size={11} />
                                  )}
                                  <span className="truncate">{btn.title}</span>
                                </div>
                              ))}
                            </div>
                          )}

                        {/* Failure reason */}
                        {msg.delivery_status === "failed" &&
                          msg.error_reason && (
                            <div className="mt-1 rounded bg-rose-50 px-1.5 py-1 text-[9px] text-rose-700">
                              {msg.error_reason}
                            </div>
                          )}

                        {/* Timestamp & Ticks */}
                        <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-400">
                          <span>{msg.time_label}</span>
                          {!isCustomer && (
                            <DeliveryTicks
                              status={msg.delivery_status}
                              errorReason={msg.error_reason}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Read-only WhatsApp Input Bar */}
        <div className="flex shrink-0 items-center gap-2 border-t border-slate-200/70 bg-[#f0f2f5] px-2.5 py-2">
          <span className="text-[#008069]">
            <Plus size={18} />
          </span>

          <div className="flex flex-1 items-center justify-between rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-400">
            <span>Message (Read-only preview)</span>
            <Camera size={14} className="text-slate-400" />
          </div>

          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#008069] text-white shadow-2xs">
            <Mic size={13} />
          </span>
        </div>

        {/* Home Indicator */}
        <div className="flex h-4 shrink-0 items-center justify-center bg-[#f0f2f5]">
          <div
            className={`rounded-full bg-slate-900/75 ${
              isIphone ? "h-1 w-24" : "h-1 w-16"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
