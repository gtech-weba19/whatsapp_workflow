import {
  LayoutDashboard,
  Users,
  UserRound,
  MessageCircle,
  Bot,
  BarChart3,
  FileText,
  AlertTriangle,
  Settings,
  ChevronRight,
  Workflow,
} from "lucide-react";

import { NavLink } from "react-router-dom";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
  },
  {
    title: "Clients",
    icon: Users,
    path: "/clients",
    color: "text-green-700",
    bg: "bg-green-100",
  },
  {
    title: "Client Users",
    icon: UserRound,
    path: "/client-users",
    color: "text-teal-700",
    bg: "bg-teal-100",
  },
  {
    title: "WhatsApp Accounts",
    icon: MessageCircle,
    path: "/whatsapp-accounts",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
  },
  {
    title: "Bots",
    icon: Bot,
    path: "/bots",
    color: "text-lime-800",
    bg: "bg-lime-100",
  },
  {
    title: "Usage",
    icon: BarChart3,
    path: "/usage",
    color: "text-green-700",
    bg: "bg-green-100",
  },
  {
    title: "System Logs",
    icon: FileText,
    path: "/system-logs",
    color: "text-slate-700",
    bg: "bg-slate-100",
  },
  {
    title: "Workflow Builder",
    icon: Workflow,
    path: "/workflow-builder",
    color: "text-teal-700",
    bg: "bg-teal-100",
  },
  {
    title: "Failed Workflows",
    icon: AlertTriangle,
    path: "/failed-workflows",
    color: "text-rose-700",
    bg: "bg-rose-100",
  },
  {
    title: "Platform Settings",
    icon: Settings,
    path: "/platform-settings",
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
];

const AdminSidebar = () => {
  return (
 <aside
  className="
    relative flex h-full min-h-0 w-full
    flex-col overflow-hidden border-r border-emerald-100
    bg-gradient-to-b from-emerald-50 via-white to-green-50
  "
>
      {/* Decorative background */}
      <div
        className="
          pointer-events-none absolute -right-16 top-24
          h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl
        "
      />

      <div
        className="
          pointer-events-none absolute -left-16 bottom-24
          h-48 w-48 rounded-full bg-green-200/30 blur-3xl
        "
      />

      {/* Logo section */}
      <div
        className="
          relative z-10 flex h-20 shrink-0 items-center
          border-b border-emerald-100
          bg-white/80 px-5
        "
      >
        <NavLink
          to="/dashboard"
          aria-label="GTech Dashboard"
          className="
            inline-flex min-w-0 items-center rounded-lg
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-emerald-500
          "
        >
          <img
            src="/WABA Tech Chatbot Logo.png"
            alt="Logo"
            className="h-18 w-[150px] object-contain"
          />
        </NavLink>
      </div>

      {/* Navigation area */}
      <div
        className="
          left-sidebar-scroll
          relative z-10 min-h-0 flex-1
          overflow-x-hidden overflow-y-auto overscroll-contain
          px-3 py-5 sm:px-4
        "
      >
   
        {/* Menu items */}
        <nav className="space-y-1.5" aria-label="Admin navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/dashboard"}
                className={({ isActive }) =>
                  [
                    "group relative flex min-h-[46px] items-center",
                    "justify-between gap-2 rounded-xl px-2.5 py-2",
                    "text-[13px] font-semibold",
                    "transition-all duration-200 ease-out",
                    "focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                    isActive
                      ? [
                          "bg-gradient-to-r from-emerald-700 via-emerald-600 to-green-600",
                          "text-white shadow-md shadow-emerald-200/80",
                        ].join(" ")
                      : [
                          "border border-transparent text-slate-700",
                          "hover:translate-x-0.5 hover:border-emerald-100",
                          "hover:bg-white/90 hover:text-emerald-800",
                          "hover:shadow-sm",
                        ].join(" "),
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator */}
                    {isActive && (
                      <span
                        className="
                          absolute bottom-2 left-0 top-2
                          w-[3px] rounded-r-full bg-white
                        "
                      />
                    )}

                    {/* Icon and title */}
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={[
                          "flex h-9 w-9 shrink-0 items-center justify-center",
                          "rounded-xl transition-all duration-200",
                          isActive
                            ? "bg-white/15 text-white ring-1 ring-white/20"
                            : [
                                item.bg,
                                item.color,
                                "group-hover:scale-105 group-hover:shadow-sm",
                              ].join(" "),
                        ].join(" ")}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </span>

                      <span className="min-w-0 break-words leading-5">
                        {item.title}
                      </span>
                    </span>

                    {/* Right arrow */}
                    <ChevronRight
                      size={15}
                      className={[
                        "shrink-0 transition-all duration-200",
                        isActive
                          ? "translate-x-0 text-white"
                          : [
                              "translate-x-1 text-emerald-500 opacity-0",
                              "group-hover:translate-x-0 group-hover:opacity-100",
                            ].join(" "),
                      ].join(" ")}
                    />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

      </div>
    </aside>
  );
};

export default AdminSidebar;