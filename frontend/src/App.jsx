import { BrowserRouter, Routes, Route } from "react-router-dom";

import WhatsAppSimulator from "./admin/WhatsAppSimulator";
import WorkflowBuilder from "./admin/WorkflowBuilder";
import Login from "./admin/Login";
import Register from "./admin/Register";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./admin/Dashboard";
import Bots from "./admin/Bots";
import Clients from "./admin/Clients";
import ClientUsers from "./admin/ClientUsers";
import WhatsAppAccounts from "./admin/WhatsAppAccounts";
import Usage from "./admin/Usage";
import SystemLog from "./admin/SystemLog";
import FailedWorkflows from "./admin/FailedWorkflows";
import PlatformSettings from "./admin/PlatformSettings";
import Profile from "./components/admin/Profile";


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
            <Route path="/bots" element={<Bots />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/client-users" element={<ClientUsers />} />
            <Route
              path="/whatsapp-accounts"
              element={<WhatsAppAccounts />}
            />
            <Route path="/Usage" element={<Usage />} />
            <Route path="/system-logs" element={<SystemLog />} />
            <Route
              path="/failed-workflows"
              element={<FailedWorkflows />}
            />
            <Route
              path="/platform-settings"
              element={<PlatformSettings />}
            />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* WORKFLOW BUILDER */}
          <Route
            path="/workflow-builder"
            element={<WorkflowBuilder />}
          />

          {/* WHATSAPP SIMULATOR */}
          <Route
            path="/whatsapp-simulator"
            element={<WhatsAppSimulator />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;