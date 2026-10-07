
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WhatsAppSimulator from "./WhatsAppSimulator";
import WorkflowBuilder from "./WorkflowBuilder";
import Login from "./Login";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

const App = () => {

  return (
    <>
  
       <BrowserRouter>
            <Routes>
               
                <Route element={<ProtectedRoute />}>
               <Route
                    path="/workflow-builder"
                    element={<WorkflowBuilder />}
                />
                </Route>
                    <Route element={<PublicRoute />}>
                <Route
                    path="/"
                    element={<Login />}
                />
                </Route>


                 <Route element={<ProtectedRoute />}>
                <Route
                    path="/whatsapp-simulator"
                    element={<WhatsAppSimulator />}
                />
                </Route>

            </Routes>
        </BrowserRouter>

    </>
  );
};

export default App;