import { BrowserRouter, Routes, Route } from "react-router-dom";

import WhatsAppSimulator from "./admin/WhatsAppSimulator";
import WorkflowBuilder from "./admin/WorkflowBuilder";
import Login from "./admin/Login";
import Register from "./admin/Register";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import PermissionRoute from "./components/PermissionRoute";

import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./admin/Dashboard";
import Bots from "./admin/Bots";
import Users from "./admin/AllUsers";
import WhatsAppAccounts from "./admin/WhatsAppAccounts";
import Usage from "./admin/Usage";
import SystemLog from "./admin/SystemLog";
import FailedWorkflows from "./admin/FailedWorkflows";
import PlatformSettings from "./admin/PlatformSettings";
import RolesPermissions from "./admin/RolesPermissions";
import Profile from "./components/admin/Profile";
import Plans from "./admin/Plans";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES: login/register only */}
        <Route element={<PublicRoute />}>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* PROTECTED ROUTES */}
        <Route element={<ProtectedRoute />}>
          {/* ADMIN LAYOUT */}
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
             <Route path="/plans" element={<Plans />} />

            {/* ROLES & PERMISSIONS */}
            <Route element={<PermissionRoute permission="roles.view" />}>
              <Route path="/roles-permissions" element={<RolesPermissions />} />
            </Route>

            {/* BOTS */}
            <Route element={<PermissionRoute permission="bots.view" />}>
              <Route path="/bots" element={<Bots />} />
            </Route>

            {/* CLIENTS */}
            <Route element={<PermissionRoute permission="clients.view" />}>
              <Route path="/users" element={<Users />} />
            </Route>



            {/* WHATSAPP ACCOUNTS */}
            <Route element={<PermissionRoute permission="whatsapp_accounts.view" />}>
              <Route
                path="/whatsapp-accounts"
                element={<WhatsAppAccounts />}
              />
            </Route>

            {/* USAGE */}
            <Route element={<PermissionRoute permission="usage.view" />}>
              <Route path="/usage" element={<Usage />} />
            </Route>

            {/* SYSTEM LOGS */}
            <Route element={<PermissionRoute permission="system_logs.view" />}>
              <Route path="/system-logs" element={<SystemLog />} />
            </Route>

            {/* FAILED WORKFLOWS */}
            <Route element={<PermissionRoute permission="failed_workflows.view" />}>
              <Route
                path="/failed-workflows"
                element={<FailedWorkflows />}
              />
            </Route>

            {/* PLATFORM SETTINGS */}
            <Route element={<PermissionRoute permission="platform_settings.view" />}>
              <Route
                path="/platform-settings"
                element={<PlatformSettings />}
              />
            </Route>
          </Route>

          {/* WORKFLOW BUILDER */}
          <Route element={<PermissionRoute permission="workflows.view" />}>
            <Route
              path="/workflow-builder"
              element={<WorkflowBuilder />}
            />
          </Route>

          {/* WHATSAPP SIMULATOR */}
          <Route element={<PermissionRoute permission="whatsapp_simulator.view" />}>
            <Route
              path="/whatsapp-simulator"
              element={<WhatsAppSimulator />}
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;