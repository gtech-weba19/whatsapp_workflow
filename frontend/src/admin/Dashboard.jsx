import React from "react";
import {
  Users,
  MessageCircle,
  MessagesSquare,
  GitBranch,
  CheckCircle2,
  XCircle,
  Bot,
  Smartphone,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";

const Dashboard = () => {
  // =====================================================
  // STATIC DASHBOARD DATA
  // =====================================================

  const stats = [
    {
      title: "Total Contacts",
      value: "12,458",
      change: "+12.5%",
      trend: "up",
      icon: Users,
      description: "vs last month",
    },
    {
      title: "Active Conversations",
      value: "1,284",
      change: "+8.2%",
      trend: "up",
      icon: MessageCircle,
      description: "vs last month",
    },
    {
      title: "Messages Today",
      value: "8,642",
      change: "+15.8%",
      trend: "up",
      icon: MessagesSquare,
      description: "vs yesterday",
    },
    {
      title: "Workflow Executions",
      value: "24,856",
      change: "+18.4%",
      trend: "up",
      icon: GitBranch,
      description: "this month",
    },
    {
      title: "Successful Executions",
      value: "23,421",
      change: "+16.7%",
      trend: "up",
      icon: CheckCircle2,
      description: "this month",
    },
    {
      title: "Failed Executions",
      value: "1,435",
      change: "-5.4%",
      trend: "down",
      icon: XCircle,
      description: "this month",
    },
    {
      title: "Active Bots",
      value: "18",
      change: "+3",
      trend: "up",
      icon: Bot,
      description: "currently active",
    },
    {
      title: "WhatsApp Status",
      value: "Connected",
      change: "Online",
      trend: "up",
      icon: Smartphone,
      description: "WhatsApp Business API",
    },
  ];

  // =====================================================
  // MONTHLY USAGE
  // =====================================================

  const monthlyUsage = {
    used: 68420,
    limit: 100000,
  };

  const usagePercentage = Math.round(
    (monthlyUsage.used / monthlyUsage.limit) * 100
  );

  // =====================================================
  // RECENT WORKFLOW EXECUTIONS
  // =====================================================

  const recentExecutions = [
    {
      id: "#WF-10245",
      workflow: "Welcome Message",
      contact: "+91 98765 43210",
      status: "Success",
      time: "2 mins ago",
    },
    {
      id: "#WF-10244",
      workflow: "Order Confirmation",
      contact: "+91 87654 32109",
      status: "Success",
      time: "5 mins ago",
    },
    {
      id: "#WF-10243",
      workflow: "OTP Verification",
      contact: "+91 99887 76655",
      status: "Failed",
      time: "8 mins ago",
    },
    {
      id: "#WF-10242",
      workflow: "Product Enquiry",
      contact: "+91 91234 56789",
      status: "Success",
      time: "12 mins ago",
    },
    {
      id: "#WF-10241",
      workflow: "Support Request",
      contact: "+91 90123 45678",
      status: "Success",
      time: "18 mins ago",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Overview of your WhatsApp automation platform
        </p>
      </div>

      {/* =====================================================
          STATS GRID
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              {/* TOP */}

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    {stat.value}
                  </h2>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>

              </div>

              {/* BOTTOM */}

              <div className="mt-4 flex items-center gap-2">

                {stat.trend === "up" ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                )}

                <span className="text-xs font-semibold text-emerald-600">
                  {stat.change}
                </span>

                <span className="text-xs text-slate-400">
                  {stat.description}
                </span>

              </div>
            </div>
          );
        })}

      </div>

      {/* =====================================================
          BOTTOM SECTION
      ====================================================== */}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ===================================================
            MONTHLY USAGE
        ==================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Monthly Usage
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Messages used this month
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <BarChart3 className="h-5 w-5 text-slate-700" />
            </div>

          </div>

          <div className="mt-6">

            <div className="flex items-end justify-between">

              <div>
                <span className="text-3xl font-bold text-slate-900">
                  {monthlyUsage.used.toLocaleString()}
                </span>

                <span className="ml-1 text-sm text-slate-400">
                  / {monthlyUsage.limit.toLocaleString()}
                </span>
              </div>

              <span className="text-sm font-semibold text-slate-700">
                {usagePercentage}%
              </span>

            </div>

            {/* PROGRESS */}

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-slate-800 transition-all"
                style={{
                  width: `${usagePercentage}%`,
                }}
              />

            </div>

            <div className="mt-3 flex justify-between text-xs text-slate-400">

              <span>
                {monthlyUsage.used.toLocaleString()} used
              </span>

              <span>
                {(monthlyUsage.limit - monthlyUsage.used).toLocaleString()} remaining
              </span>

            </div>

          </div>

        </div>

        {/* ===================================================
            WHATSAPP STATUS
        ==================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <h3 className="text-base font-semibold text-slate-900">
                WhatsApp Status
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Business API connection
              </p>
            </div>

            <Activity className="h-5 w-5 text-slate-600" />

          </div>

          <div className="mt-6 flex items-center gap-4">

            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">

              <div className="h-4 w-4 rounded-full bg-emerald-500" />

              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-20" />

            </div>

            <div>
              <p className="text-lg font-bold text-slate-900">
                Connected
              </p>

              <p className="text-xs text-emerald-600">
                WhatsApp API is online
              </p>
            </div>

          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">

            <div className="flex items-center justify-between">

              <span className="text-xs text-slate-500">
                Sender Number
              </span>

              <span className="text-sm font-semibold text-slate-800">
                +91 98101 20907
              </span>

            </div>

            <div className="mt-3 flex items-center justify-between">

              <span className="text-xs text-slate-500">
                API Status
              </span>

              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">

                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                Online

              </span>

            </div>

          </div>

        </div>

        {/* ===================================================
            QUICK SUMMARY
        ==================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Execution Summary
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Workflow performance
              </p>
            </div>

            <GitBranch className="h-5 w-5 text-slate-600" />

          </div>

          <div className="mt-6 space-y-5">

            <div>

              <div className="mb-2 flex justify-between">

                <span className="text-sm text-slate-500">
                  Successful
                </span>

                <span className="text-sm font-semibold text-slate-900">
                  94.2%
                </span>

              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: "94.2%" }}
                />

              </div>

            </div>

            <div>

              <div className="mb-2 flex justify-between">

                <span className="text-sm text-slate-500">
                  Failed
                </span>

                <span className="text-sm font-semibold text-slate-900">
                  5.8%
                </span>

              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                <div
                  className="h-full rounded-full bg-red-400"
                  style={{ width: "5.8%" }}
                />

              </div>

            </div>

            <div className="rounded-xl bg-slate-50 p-4">

              <div className="flex items-center justify-between">

                <span className="text-xs text-slate-500">
                  Total Executions
                </span>

                <span className="text-sm font-bold text-slate-900">
                  24,856
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          RECENT EXECUTIONS
      ====================================================== */}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Recent Workflow Executions
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Latest automation activity
            </p>
          </div>

          <button
            type="button"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            View All
          </button>

        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">

          <table className="w-full min-w-[700px]">

            <thead>

              <tr className="border-b border-slate-100 bg-slate-50">

                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">
                  Execution ID
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">
                  Workflow
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">
                  Contact
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">
                  Status
                </th>

                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500">
                  Time
                </th>

              </tr>

            </thead>

            <tbody>

              {recentExecutions.map((item) => (

                <tr
                  key={item.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >

                  <td className="px-6 py-4 text-sm font-medium text-slate-700">
                    {item.id}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-700">
                    {item.workflow}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-500">
                    {item.contact}
                  </td>

                  <td className="px-6 py-4">

                    {item.status === "Success" ? (

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">

                        <CheckCircle2 className="h-3.5 w-3.5" />

                        Success

                      </span>

                    ) : (

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">

                        <XCircle className="h-3.5 w-3.5" />

                        Failed

                      </span>

                    )}

                  </td>

                  <td className="px-6 py-4 text-right text-xs text-slate-400">
                    {item.time}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;