import { Route } from "react-router-dom";
import ProDashboard from "../pages/Pro/ProDashboard";
import ProProfile from "../pages/Pro/ProProfile";
import ProPrivateRoute from "../components/ProtectedRoutes/ProPrivateRoute";

// Placeholder components for other routes (replace with actual components when implemented)
const ProJobs = () => <div>Pro Jobs Page (To be implemented)</div>;
const ProEarnings = () => <div>Pro Earnings Page (To be implemented)</div>;
const ProMessages = () => <div>Pro Messages Page (To be implemented)</div>;
const ProRatings = () => <div>Pro Ratings Page (To be implemented)</div>;

const proRoutes = (
  <>
    <Route element={<ProPrivateRoute />}>
      <Route path="/pro-dashboard" element={<ProDashboard />} />
      <Route path="/pro/profile" element={<ProProfile />} />
      <Route path="/pro/jobs" element={<ProJobs />} />
      <Route path="/pro/earnings" element={<ProEarnings />} />
      <Route path="/pro/messages" element={<ProMessages />} />
      <Route path="/pro/ratings" element={<ProRatings />} />
    </Route>
  </>
);

export default proRoutes;