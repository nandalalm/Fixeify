import { Route } from "react-router-dom";
import ProDashboard from "../pages/Pro/ProDashboard";
import ProProfile from "../pages/Pro/ProProfile";
import ProSlotManagement from "../pages/Pro/ProSlotManagement";
import ProPrivateRoute from "../components/ProtectedRoutes/ProPrivateRoute";
import JobManagementPage from "@/pages/Pro/JobManagementPage";
import ProWalletManagement from "@/pages/Pro/ProWalletManagement";
import ProMessages from "@/pages/Pro/ProMessages";
import ProRatingReview from "@/pages/Pro/ProRatingReview";
import ProConflicts from "@/pages/Pro/ProConflicts";
import ProEarnings from "@/pages/Pro/ProEarnings";

const proRoutes = (
  <>
    <Route element={<ProPrivateRoute />}>
      <Route path="/pro-dashboard" element={<ProDashboard />} />
      <Route path="/pro/profile" element={<ProProfile />} />
      <Route path="/pro/jobs" element={<JobManagementPage/>} />
      <Route path="/pro/earnings" element={<ProEarnings />} />
      <Route path="/pro/messages" element={<ProMessages/>} />
      <Route path="/pro/ratings" element={<ProRatingReview />} />
      <Route path="/pro/slot-management" element={<ProSlotManagement />} />
      <Route path="/pro/wallet/:proId" element={<ProWalletManagement/>} />
      <Route path="/pro/conflicts" element={<ProConflicts />} />
    </Route>
  </>
);

export default proRoutes;