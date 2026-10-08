import {
  LayoutDashboard,
  Users,
  UserRound,
  MessageCircle,
  Bot,
  BarChart3,
  IndianRupee,
  FileText,
  AlertTriangle,
  Headphones,
  Files,
  Settings,
  ChevronRight 
} from "lucide-react";

import { NavLink} from "react-router-dom";

const AdminSidebar = () => {


  const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    title: "Clients",
    icon: Users,
    path: "/clients",
  },
  {
    title: "Client Users",
    icon: UserRound,
    path: "/client-users",
  },
  {
    title: "WhatsApp Accounts",
    icon: MessageCircle,
    path: "/whatsapp-accounts",
  },
  {
    title: "Bots",
    icon: Bot,
    path: "/bots",
  },
  {
    title: "Usage",
    icon: BarChart3,
    path: "/usage",
  },
  {
    title: "Revenue",
    icon: IndianRupee,
    path: "/revenue",
  },
  {
    title: "System Logs",
    icon: FileText,
    path: "/system-logs",
  },
  {
    title: "Failed Workflows",
    icon: AlertTriangle,
    path: "/failed-workflows",
  },
  {
    title: "Support",
    icon: Headphones,
    path: "/support",
  },
  {
    title: "Templates",
    icon: Files,
    path: "/templates",
  },
  {
    title: "Platform Settings",
    icon: Settings,
    path: "/platform-settings",
  },
];


  return (
  <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">

  {/* =====================================================
      LOGO
  ====================================================== */}

  <div className="flex h-20 items-center border-b border-slate-200 px-6">
    <img
      src="/gtech-logo.png"
      alt="Logo"
      className="h-18 w-18 rounded-xl"
    />
  </div>


  {/* =====================================================
      NAVIGATION
  ====================================================== */}

  <div className="left-sidebar-scroll flex-1 overflow-y-auto px-4 py-5">

    <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
      Main Menu
    </p>

    <nav className="space-y-1">

      {menuItems.map((item) => {

        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `
              group flex items-center justify-between rounded-xl
              px-3 py-3 text-sm font-medium transition
              ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }
              `
            }
          >

            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">

                  <Icon
                    size={18}
                    className={
                      isActive
                        ? "text-indigo-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    }
                  />

                  <span>{item.title}</span>

                </div>

                {isActive && (
                  <ChevronRight
                    size={15}
                    className="text-indigo-500"
                  />
                )}

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