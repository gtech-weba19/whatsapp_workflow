import { Outlet } from "react-router-dom";
import { hasPermission } from "../utils/permission";
import { ShieldAlert, ArrowLeft } from "lucide-react";

const PermissionRoute = ({ permission }) => {
  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
          Your account does not have permission to access this section ({permission}).
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-xs"
        >
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </a>
      </div>
    );
  }

  return <Outlet />;
};

export default PermissionRoute;