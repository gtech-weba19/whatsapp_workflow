import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

const AdminLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Route change hone par mobile sidebar close karein
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Sidebar open hone par background scrolling rok dein
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          h-screen w-64 bg-white
          transform transition-transform duration-300 ease-in-out
          ${
            mobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
          lg:translate-x-0
        `}
      >
        {/* MOBILE CLOSE BUTTON */}
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 lg:hidden"
        >
          <X size={20} />
        </button>

        <AdminSidebar />
      </aside>

      {/* MAIN AREA */}
      <div className="min-h-screen min-w-0 lg:ml-64">

        {/* STICKY HEADER */}
        <div className="sticky top-0 z-30">

          {/* MOBILE HEADER: MENU LEFT + PROFILE RIGHT */}
          <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-3 lg:hidden">
            {/* MENU BUTTON */}
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100"
            >
              <Menu size={23} />
            </button>

            {/* PROFILE */}
            <div className="min-w-0">
              <AdminHeader />
            </div>
          </div>

          {/* DESKTOP HEADER */}
          <div className="hidden lg:block">
            <AdminHeader />
          </div>

        </div>

        {/* PAGE CONTENT */}
        <main className="min-w-0 p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default AdminLayout;