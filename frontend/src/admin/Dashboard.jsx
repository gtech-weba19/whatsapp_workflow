import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Layers,
  MessageCircle,
  MessagesSquare,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Users,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react";

import {
  getStoredUser,
  hasPermission,
  isSuperAdmin,
} from "../utils/permission";

import CreateBotPopup from "../components/admin/CreateBotPopup";
import WhatsAppConnectionStatus from "../components/admin/WhatsAppConnectionStatus";

// Dedicated Custom Stylesheet (Unified Font, Zero Overlaps, Robot Mascot & Graph)
import "./ClientDashboard.css";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

const initialData = {
  stats: {
    total_contacts: 0,
    active_conversations: 0,
    messages_today: 0,
    workflow_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
    active_workflows: 0,
  },
  monthly_usage: {
    used: 0,
    limit: 100000,
    remaining: 100000,
    percentage: 0,
  },
  execution_summary: {
    success_rate: 0,
    failure_rate: 0,
    total: 0,
  },
  whatsapp: {
    status: "not_configured",
    sender_number: null,
    active_numbers: 0,
  },
  recent_executions: [],
};

const numberFormat = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 3D-Style Cute Robot Mascot (Clean Self-Contained SVG, Zero Overlaps)
function RobotMascot() {
  return (
    <div className="cd-mascot-box">
      <svg
        viewBox="0 0 200 170"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="cd-mascot-svg"
      >
        {/* Soft shadow */}
        <ellipse cx="100" cy="164" rx="55" ry="6" fill="#00a884" opacity="0.12" />

        {/* Floating WhatsApp Badge on left */}
        <circle cx="28" cy="38" r="16" fill="#25D366" />
        <path
          d="M28 28c-5.5 0-10 4.5-10 10 0 1.9.5 3.8 1.5 5.3L18 49l5.8-1.5c1.3.7 2.7 1.1 4.2 1.1 5.5 0 10-4.5 10-10s-4.5-10-10-10z"
          fill="#ffffff"
        />

        {/* Floating Chat Bubble on right */}
        <rect x="150" y="24" width="34" height="26" rx="9" fill="#ffffff" stroke="#c7f0e1" strokeWidth="2" />
        <circle cx="161" cy="37" r="2.5" fill="#00a884" />
        <circle cx="167" cy="37" r="2.5" fill="#00a884" />
        <circle cx="173" cy="37" r="2.5" fill="#00a884" />

        {/* Robot Antenna */}
        <path d="M100 46V30" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="26" r="7.5" fill="#00a884" />
        <circle cx="100" cy="26" r="3" fill="#ffffff" />

        {/* Robot Head */}
        <rect x="52" y="44" width="96" height="68" rx="28" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2.5" />
        <rect x="62" y="52" width="76" height="52" rx="18" fill="#0f172a" />

        {/* Glowing Screen Eyes */}
        <ellipse cx="81" cy="77" rx="7.5" ry="9.5" fill="#00a884" />
        <circle cx="79" cy="74" r="2.5" fill="#ffffff" />
        <ellipse cx="119" cy="77" rx="7.5" ry="9.5" fill="#00a884" />
        <circle cx="117" cy="74" r="2.5" fill="#ffffff" />

        {/* Robot Smile */}
        <path d="M94 89Q100 94 106 89" stroke="#00a884" strokeWidth="2.5" strokeLinecap="round" />

        {/* Ear Bumpers */}
        <rect x="44" y="64" width="9" height="24" rx="4" fill="#00a884" />
        <rect x="147" y="64" width="9" height="24" rx="4" fill="#00a884" />

        {/* Robot Body */}
        <rect x="71" y="112" width="58" height="42" rx="16" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2.5" />
        <circle cx="100" cy="132" r="8" fill="#00a884" />
        <circle cx="100" cy="132" r="3" fill="#ffffff" />

        {/* Floating Arms */}
        <ellipse cx="58" cy="130" rx="6.5" ry="11" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" transform="rotate(-15 58 130)" />
        <ellipse cx="142" cy="130" rx="6.5" ry="11" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" transform="rotate(15 142 130)" />
      </svg>
    </div>
  );
}

// Conversation Analytics SVG Curved Line Chart
function AnalyticsGraph({ timeframe = "7D" }) {
  const chartData = useMemo(() => {
    if (timeframe === "30D") {
      return [
        { label: "Day 1", val: 120 },
        { label: "Day 6", val: 190 },
        { label: "Day 12", val: 150 },
        { label: "Day 18", val: 280 },
        { label: "Day 24", val: 220 },
        { label: "Day 30", val: 360 },
      ];
    }
    if (timeframe === "90D") {
      return [
        { label: "Month 1", val: 180 },
        { label: "Month 2", val: 310 },
        { label: "Month 3", val: 420 },
      ];
    }
    return [
      { label: "Oct 16", val: 100 },
      { label: "Oct 17", val: 180 },
      { label: "Oct 18", val: 120 },
      { label: "Oct 19", val: 190 },
      { label: "Oct 20", val: 170 },
      { label: "Oct 21", val: 280 },
      { label: "Oct 22", val: 350 },
    ];
  }, [timeframe]);

  const maxVal = 400;
  const width = 600;
  const height = 180;
  const paddingLeft = 38;
  const paddingBottom = 26;
  const paddingTop = 12;
  const paddingRight = 18;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const points = chartData.map((d, index) => {
    const x = paddingLeft + (index / (chartData.length - 1)) * chartW;
    const y = paddingTop + chartH - (d.val / maxVal) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i, a) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = a[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${paddingTop + chartH} Z`;

  return (
    <div className="cd-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cdChartGradientArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00a884" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00a884" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 100, 200, 300, 400].map((v) => {
          const y = paddingTop + chartH - (v / maxVal) * chartH;
          return (
            <g key={v}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={paddingLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="#94a3b8"
                fontWeight="600"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#cdChartGradientArea)" />

        {/* Smooth line */}
        <path d={pathD} fill="none" stroke="#00a884" strokeWidth="2.5" strokeLinecap="round" />

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4" fill="#00a884" stroke="#ffffff" strokeWidth="2" />
            <text
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#94a3b8"
              fontWeight="600"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [whatsAppAccount, setWhatsAppAccount] = useState(null);
  const [whatsAppLoading, setWhatsAppLoading] = useState(true);
  const [whatsAppError, setWhatsAppError] = useState("");

  const [bots, setBots] = useState([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [botsError, setBotsError] = useState("");

  const [workflows, setWorkflows] = useState([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [workflowsError, setWorkflowsError] = useState("");

  const [timeframe, setTimeframe] = useState("7D");

  // Create Bot Popup
  const [showCreateBotPopup, setShowCreateBotPopup] = useState(false);
  const [creatingBot, setCreatingBot] = useState(false);

  const user = getStoredUser();
  const superAdmin = isSuperAdmin(user);

  const canViewContacts = superAdmin || hasPermission("contacts.view", user);
  const canViewBots = superAdmin || hasPermission("bots.view", user);
  const canViewWorkflows = superAdmin || hasPermission("workflows.view", user);
  const canViewUsage = superAdmin || hasPermission("usage.view", user);
  const canViewWhatsApp = superAdmin || hasPermission("whatsapp_accounts.view", user);

  // Fetch Dashboard Stats from API
  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("token");

      const response = await axios.get(`${API}/dashboard`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = response.data?.data ?? response.data ?? {};
      setDashboard({
        ...initialData,
        ...result,
        stats: { ...initialData.stats, ...(result.stats || {}) },
        monthly_usage: { ...initialData.monthly_usage, ...(result.monthly_usage || {}) },
        execution_summary: { ...initialData.execution_summary, ...(result.execution_summary || {}) },
        whatsapp: { ...initialData.whatsapp, ...(result.whatsapp || {}) },
        recent_executions: Array.isArray(result.recent_executions) ? result.recent_executions : [],
      });
    } catch (err) {
      console.error("Dashboard API error:", err);
      setError(err.response?.data?.message || "Dashboard could not sync.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch WhatsApp Status from API
  const fetchWhatsAppStatus = useCallback(async ({ silent = false } = {}) => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("token");

    if (!token) {
      setWhatsAppAccount(null);
      setWhatsAppLoading(false);
      return;
    }

    if (!silent) setWhatsAppLoading(true);
    setWhatsAppError("");

    try {
      const response = await axios.get(`${API}/whatsapp-accounts`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
        params: { _t: Date.now() },
      });

      const accounts = response.data?.data;
      if (Array.isArray(accounts) && accounts.length > 0) {
        setWhatsAppAccount(accounts[0]);
      } else {
        setWhatsAppAccount(null);
      }
    } catch (err) {
      console.error("WhatsApp status error:", err);
      setWhatsAppError("Failed to fetch WhatsApp status.");
    } finally {
      if (!silent) setWhatsAppLoading(false);
    }
  }, []);

  // Fetch Bots from API
  const fetchBots = useCallback(async () => {
    setLoadingBots(true);
    setBotsError("");
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("token");

      if (!token) return;

      const response = await axios.get(`${API}/bots`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = response.data?.data;
      const botList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(response.data?.bots)
            ? response.data.bots
            : [];
      setBots(botList);
    } catch (err) {
      console.error("Bots error:", err);
      setBotsError("Unable to load bots.");
    } finally {
      setLoadingBots(false);
    }
  }, []);

  // Fetch Workflows from API
  const fetchWorkflows = useCallback(async () => {
    setLoadingWorkflows(true);
    setWorkflowsError("");
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("token");

      if (!token) return;

      const response = await axios.get(`${API}/workflows`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const payload = response.data?.data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(response.data?.workflows)
            ? response.data.workflows
            : [];
      setWorkflows(list);
    } catch (error) {
      console.error("Workflows error:", error);
      setWorkflowsError("Unable to load workflows.");
    } finally {
      setLoadingWorkflows(false);
    }
  }, []);

  // Connect WhatsApp handler
  const handleConnectWhatsApp = useCallback(
    async (details) => {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("token");

      if (!token) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await axios.post(`${API}/whatsapp-accounts`, details, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      await fetchWhatsAppStatus();
      await fetchDashboard(true);
      return response.data;
    },
    [fetchWhatsAppStatus, fetchDashboard]
  );

  // Create Bot confirm handler
  const handleCreateBotConfirm = async (botDetails) => {
    setCreatingBot(true);
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("token");

      const response = await axios.post(
        `${API}/bots`,
        { name: botDetails.name, status: "active" },
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await fetchBots();
      await fetchDashboard(true);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat()[0]
        : error.response?.data?.message || "Failed to create bot";
      throw new Error(msg);
    } finally {
      setCreatingBot(false);
    }
  };

  const handleRefreshAll = () => {
    fetchDashboard(true);
    fetchWhatsAppStatus();
    fetchBots();
    fetchWorkflows();
  };

  useEffect(() => {
    fetchDashboard();
    fetchWhatsAppStatus();
    fetchBots();
    fetchWorkflows();
  }, [fetchDashboard, fetchWhatsAppStatus, fetchBots, fetchWorkflows]);

  const stats = dashboard.stats;
  const usage = dashboard.monthly_usage;
  const recentExecutions = dashboard.recent_executions || [];

  return (
    <div className="cd-dashboard-wrap">
      <div className="cd-dashboard-container">
        {/* ================================================================= */}
        {/* 1. HERO BANNER WITH ROBOT MASCOT (Zero Overlap, Responsive)       */}
        {/* ================================================================= */}
        <section className="cd-hero-card">
          <div className="cd-hero-content">
            <div className="cd-hero-pill">
              <span className="cd-hero-dot" />
              <span>WhatsApp AI Command Center</span>
            </div>

            <h1 className="cd-hero-title">
              Welcome back, <span className="cd-hero-name">{user?.name || "User"}</span> 👋
            </h1>

            <p className="cd-hero-subtitle">
              Create, manage and grow your WhatsApp chatbot with ease.
            </p>

            <div className="cd-hero-actions-row">
              {canViewWorkflows && (
                <Link to="/workflow-builder" className="cd-btn cd-btn-primary">
                  <span>Build Your First Flow</span>
                  <ArrowRight size={16} />
                </Link>
              )}

              {canViewBots && (
                <button
                  type="button"
                  onClick={() => setShowCreateBotPopup(true)}
                  className="cd-btn cd-btn-secondary"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Create Bot</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={refreshing || loading}
                title="Refresh Dashboard"
                className="cd-btn cd-btn-secondary"
              >
                <RefreshCw
                  size={15}
                  className={refreshing || loading ? "animate-spin" : ""}
                />
                <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>

          {/* Robot Mascot Illustration */}
          <RobotMascot />
        </section>

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={19} />
              <div>
                <p className="text-sm font-bold text-red-900">Dashboard sync issue</p>
                <p className="text-xs text-red-800">{error}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="cd-btn cd-btn-secondary cd-btn-sm"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Try again
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. TOP 4 METRIC STAT CARDS (Responsive Auto-Fit)                 */}
        {/* ================================================================= */}
        <section className="cd-stats-grid">
          {/* Card 1: Active Bots */}
          {canViewBots && (
            <div className="cd-stat-card">
              <div className="cd-stat-head">
                <div>
                  <div className="cd-stat-title">Active Bots</div>
                  <div className="cd-stat-value">
                    {loadingBots ? "..." : numberFormat(bots.length)}
                  </div>
                </div>
                <div className="cd-stat-icon-box green">
                  <Bot size={22} />
                </div>
              </div>
              <div className="cd-stat-foot">
                <span>Configured Assistants</span>
                <Link to="/bots" className="cd-link">
                  View <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          )}

          {/* Card 2: Active Workflows */}
          {canViewWorkflows && (
            <div className="cd-stat-card">
              <div className="cd-stat-head">
                <div>
                  <div className="cd-stat-title">Workflows</div>
                  <div className="cd-stat-value">
                    {loadingWorkflows ? "..." : numberFormat(workflows.length)}
                  </div>
                </div>
                <div className="cd-stat-icon-box blue">
                  <Workflow size={22} />
                </div>
              </div>
              <div className="cd-stat-foot">
                <span>Active Funnels</span>
                <Link to="/workflow-builder" className="cd-link">
                  Open <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          )}

          {/* Card 3: Messages Today */}
          {(canViewBots || canViewUsage) && (
            <div className="cd-stat-card">
              <div className="cd-stat-head">
                <div>
                  <div className="cd-stat-title">Messages Today</div>
                  <div className="cd-stat-value">
                    {loading ? "..." : numberFormat(stats.messages_today || 0)}
                  </div>
                </div>
                <div className="cd-stat-icon-box purple">
                  <MessagesSquare size={22} />
                </div>
              </div>
              <div className="cd-stat-foot">
                <span>Daily Traffic</span>
                <span className="font-semibold text-emerald-600">● Live sync</span>
              </div>
            </div>
          )}

          {/* Card 4: Active Conversations */}
          {canViewBots && (
            <div className="cd-stat-card">
              <div className="cd-stat-head">
                <div>
                  <div className="cd-stat-title">Conversations</div>
                  <div className="cd-stat-value">
                    {loading ? "..." : numberFormat(stats.active_conversations || 0)}
                  </div>
                </div>
                <div className="cd-stat-icon-box amber">
                  <MessageCircle size={22} />
                </div>
              </div>
              <div className="cd-stat-foot">
                <span>Active Sessions</span>
                <span className="text-slate-500">Realtime</span>
              </div>
            </div>
          )}
        </section>

        {/* ================================================================= */}
        {/* 3. GRAPH & MONTHLY USAGE (Side-by-Side, Zero Overlaps)            */}
        {/* ================================================================= */}
        <section className="cd-middle-grid">
          {/* Card 1: Conversation Analytics (The Graph) */}
          <div className="cd-card">
            <div className="cd-card-header">
              <h3 className="cd-card-title">Conversation Analytics</h3>
              <div className="cd-time-tabs">
                {["7D", "30D", "90D"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeframe(t)}
                    className={`cd-time-btn ${timeframe === t ? "active" : ""}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <AnalyticsGraph timeframe={timeframe} />
          </div>

          {/* Card 2: Monthly Message Quota (Real Data from API) */}
          <div className="cd-card">
            <div>
              <div className="cd-card-header">
                <div className="flex items-center gap-2">
                  <BarChart3 size={19} className="text-emerald-600" />
                  <h3 className="cd-card-title">Monthly Quota</h3>
                </div>

                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-extrabold text-emerald-700 border border-emerald-100">
                  {Number(usage.percentage || 0).toFixed(1)}% Used
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {numberFormat(usage.used)}
                  </span>
                  <span className="text-xs text-slate-500">
                    Limit: {numberFormat(usage.limit)} msgs
                  </span>
                </div>

                <div className="cd-progress-track">
                  <div
                    className="cd-progress-bar"
                    style={{
                      width: `${Math.min(100, Math.max(0, usage.percentage || 0))}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  <strong className="text-slate-800">{numberFormat(usage.remaining)}</strong> messages remaining this month.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Automatic monthly reset</span>
              <Link to="/plans" className="cd-link text-xs">
                Manage Plan
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 4. WHATSAPP CONNECTION STATUS HUB                                 */}
        {/* ================================================================= */}
        {!superAdmin && canViewWhatsApp && (
          <div className="w-full">
            <WhatsAppConnectionStatus
              status={whatsAppError ? "" : whatsAppAccount?.status || ""}
              senderNumber={
                whatsAppAccount?.sender_number ||
                whatsAppAccount?.waba_id ||
                null
              }
              loading={whatsAppLoading}
              onRefresh={fetchWhatsAppStatus}
              onConnectWhatsApp={handleConnectWhatsApp}
            />

            {whatsAppError && (
              <div
                role="alert"
                className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-xs text-amber-900">{whatsAppError}</p>
                <button
                  type="button"
                  onClick={() => fetchWhatsAppStatus()}
                  disabled={whatsAppLoading}
                  className="cd-btn cd-btn-secondary cd-btn-sm text-xs"
                >
                  <RefreshCw
                    size={12}
                    className={whatsAppLoading ? "animate-spin" : ""}
                  />
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* 5. MY BOTS SECTION (Real Bots from DB)                            */}
        {/* ================================================================= */}
        {canViewBots && (
          <section className="cd-panel">
            <div className="cd-panel-head">
              <div className="cd-panel-title-row">
                <div className="cd-panel-icon">
                  <Bot size={20} />
                </div>
                <div>
                  <h2 className="cd-panel-title">
                    <span>My AI Bots</span>
                    <span className="cd-count-badge">
                      {loadingBots ? "..." : `${bots.length} Total`}
                    </span>
                  </h2>
                  <p className="cd-panel-desc">
                    Configured chatbot assistants responding on WhatsApp
                  </p>
                </div>
              </div>

              <div className="cd-panel-btns">
                <button
                  type="button"
                  onClick={() => setShowCreateBotPopup(true)}
                  className="cd-btn cd-btn-primary cd-btn-sm"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Create Bot</span>
                </button>

                <button
                  type="button"
                  onClick={fetchBots}
                  disabled={loadingBots}
                  className="cd-btn cd-btn-secondary cd-btn-sm"
                  title="Refresh Bots"
                >
                  <RefreshCw
                    size={13}
                    className={loadingBots ? "animate-spin" : ""}
                  />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="cd-panel-body">
              {loadingBots ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : botsError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">{botsError}</p>
                  <button
                    type="button"
                    onClick={fetchBots}
                    className="mt-2 text-xs font-bold text-red-700 underline"
                  >
                    Try loading again
                  </button>
                </div>
              ) : bots.length > 0 ? (
                <div className="cd-cards-grid">
                  {bots.map((bot) => (
                    <div key={bot.id} className="cd-item-card">
                      <div className="cd-item-top">
                        <div className="cd-item-avatar">
                          <Bot size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="cd-item-name">
                            {bot.name || `Bot #${bot.id}`}
                          </h3>
                          <p className="cd-item-desc">
                            Bot ID: {bot.id}
                          </p>
                        </div>
                      </div>

                      <div className="cd-item-footer">
                        <span
                          className={
                            bot.status === "active" ? "cd-badge-active" : "cd-badge-draft"
                          }
                        >
                          {bot.status ? bot.status.charAt(0).toUpperCase() + bot.status.slice(1) : "Active"}
                        </span>

                        <Link to="/workflow-builder" className="cd-link">
                          <span>Builder</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cd-empty-box">
                  <div className="cd-empty-icon">
                    <Bot size={26} />
                  </div>
                  <h3 className="cd-empty-title">No Bots Created Yet</h3>
                  <p className="cd-empty-text">
                    You haven’t created a bot yet. Create your first bot to start
                    automating WhatsApp conversations and customer replies.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateBotPopup(true)}
                    className="cd-btn cd-btn-primary"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    <span>Create Your First Bot</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* 6. MY WORKFLOWS SECTION (Real Workflows from DB)                  */}
        {/* ================================================================= */}
        {canViewWorkflows && (
          <section className="cd-panel">
            <div className="cd-panel-head">
              <div className="cd-panel-title-row">
                <div className="cd-panel-icon">
                  <Workflow size={20} />
                </div>
                <div>
                  <h2 className="cd-panel-title">
                    <span>My Workflows</span>
                    <span className="cd-count-badge">
                      {loadingWorkflows ? "..." : `${workflows.length} Total`}
                    </span>
                  </h2>
                  <p className="cd-panel-desc">
                    Automated conversation flows and trigger responses
                  </p>
                </div>
              </div>

              <div className="cd-panel-btns">
                <Link
                  to="/workflow-builder"
                  className="cd-btn cd-btn-primary cd-btn-sm"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Build Workflow</span>
                </Link>

                <button
                  type="button"
                  onClick={fetchWorkflows}
                  disabled={loadingWorkflows}
                  className="cd-btn cd-btn-secondary cd-btn-sm"
                  title="Refresh Workflows"
                >
                  <RefreshCw
                    size={13}
                    className={loadingWorkflows ? "animate-spin" : ""}
                  />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="cd-panel-body">
              {loadingWorkflows ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : workflowsError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">{workflowsError}</p>
                  <button
                    type="button"
                    onClick={fetchWorkflows}
                    className="mt-2 text-xs font-bold text-red-700 underline"
                  >
                    Try loading again
                  </button>
                </div>
              ) : workflows.length > 0 ? (
                <div className="cd-cards-grid">
                  {workflows.map((flow) => (
                    <div key={flow.id} className="cd-item-card">
                      <div className="cd-item-top">
                        <div className="cd-item-avatar bg-blue-50 text-blue-600">
                          <Workflow size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="cd-item-name">
                            {flow.name || flow.title || `Workflow #${flow.id}`}
                          </h3>
                          <p className="cd-item-desc">
                            ID: {flow.id} · {flow.channel || "WhatsApp"}
                          </p>
                        </div>
                      </div>

                      <div className="cd-item-footer">
                        <span
                          className={
                            flow.status === "active" ? "cd-badge-active" : "cd-badge-draft"
                          }
                        >
                          {flow.status ? flow.status.charAt(0).toUpperCase() + flow.status.slice(1) : "Draft"}
                        </span>

                        <Link to="/workflow-builder" className="cd-link">
                          <span>Open Builder</span>
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cd-empty-box">
                  <div className="cd-empty-icon">
                    <Workflow size={26} />
                  </div>
                  <h3 className="cd-empty-title">No Workflows Available</h3>
                  <p className="cd-empty-text">
                    You haven’t created any workflows yet. Build your first
                    workflow to automate WhatsApp conversations and customer journeys.
                  </p>
                  <Link
                    to="/workflow-builder"
                    className="cd-btn cd-btn-primary"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    <span>Create Your First Workflow</span>
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* 7. RECENT EXECUTIONS (Real DB Records)                            */}
        {/* ================================================================= */}
        {canViewWorkflows && recentExecutions.length > 0 && (
          <section className="cd-panel">
            <div className="cd-panel-head">
              <div className="cd-panel-title-row">
                <div className="cd-panel-icon">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="cd-panel-title">Recent Executions</h2>
                  <p className="cd-panel-desc">Latest workflow trigger records</p>
                </div>
              </div>
            </div>

            <div className="cd-panel-body p-0">
              <div className="divide-y divide-slate-100">
                {recentExecutions.slice(0, 5).map((exec, idx) => (
                  <div key={exec.id || idx} className="flex items-center justify-between p-4 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Activity size={15} />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {exec.workflow_name || `Execution #${exec.id}`}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(exec.created_at)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={
                        ["success", "completed"].includes(String(exec.status).toLowerCase())
                          ? "cd-badge-active"
                          : "cd-badge-draft"
                      }
                    >
                      {exec.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* 8. FOOTER                                                         */}
        {/* ================================================================= */}
        <footer className="cd-footer">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-700">
              <ShieldCheck size={12} />
            </span>
            <span className="font-semibold text-slate-600">
              WhatsApp Automation Console · Client Workspace
            </span>
          </div>

          <div>
            {dashboard.generated_at ? (
              <span>Last updated: {formatDate(dashboard.generated_at)}</span>
            ) : (
              <span>Live Cloud Synced</span>
            )}
          </div>
        </footer>
      </div>

      {/* CREATE BOT MODAL */}
      {showCreateBotPopup && (
        <CreateBotPopup
          submitting={creatingBot}
          onClose={() => setShowCreateBotPopup(false)}
          onConfirm={handleCreateBotConfirm}
          onContinueWorkflow={() => {
            setShowCreateBotPopup(false);
            navigate("/workflow-builder");
          }}
        />
      )}
    </div>
  );
}
