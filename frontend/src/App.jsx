import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import WhatsAppSimulator from "./admin/WhatsAppSimulator";
import WorkflowBuilder from "./admin/WorkflowBuilder";
import Login from "./Login";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./admin/Dashboard";
import Bots from "./admin/Bots";
import Clients from "./admin/Clients";


const App = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* =====================================================
            PUBLIC ROUTES
        ====================================================== */}
        <Route element={<PublicRoute />}>

          <Route
            path="/"
            element={<Login />}
          />

        </Route>


        {/* =====================================================
            PROTECTED ADMIN ROUTES
        ====================================================== */}
        <Route element={<ProtectedRoute />}>

          <Route element={<AdminLayout />}>

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

          <Route
            path="/bots"
            element={<Bots />}
          />

          <Route
            path="/clients"
            element={<Clients />}
          />
          </Route>


          {/* Workflow Builder */}
          <Route
            path="/workflow-builder"
            element={<WorkflowBuilder />}
          />


          {/* WhatsApp Simulator */}
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