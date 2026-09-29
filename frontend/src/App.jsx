
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WhatsAppSimulator from "./WhatsAppSimulator";
import Home from "./Home";

const App = () => {

  return (
    <>
  
       <BrowserRouter>
            <Routes>
               <Route
                    path="/"
                    element={<Home />}
                />
                <Route
                    path="/whatsapp-simulator"
                    element={<WhatsAppSimulator />}
                />

            </Routes>
        </BrowserRouter>

    </>
  );
};

export default App;