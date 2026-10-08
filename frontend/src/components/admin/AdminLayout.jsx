import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* SIDEBAR */}
      <AdminSidebar />

      {/* MAIN AREA */}
      <div className="ml-64 min-h-screen">

        {/* HEADER */}
        <AdminHeader />

        {/* PAGE CONTENT */}
        <main className="p-6">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default AdminLayout;