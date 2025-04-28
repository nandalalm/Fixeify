import { Route } from "react-router-dom";

import ProDashboard from "../pages/Pro/ProDashboard";
import ProPrivateRoute from "../components/ProtectedRoutes/ProPrivateRoute"; // Import new route

const proRoutes = (
  <>
    <Route element={<ProPrivateRoute />}>
      <Route path="/pro-dashboard" element={<ProDashboard />} />
    </Route>
  </>
);

export default proRoutes;