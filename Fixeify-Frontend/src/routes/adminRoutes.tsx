import { Route } from "react-router-dom";
import AdminRegister from "../pages/Admin/AdminRegister";
import AdminLogin from "../pages/Admin/AdminLogin";
import AdminDashboard from "../pages/Admin/AdminDashboard";
import UserManagement from "../pages/Admin/AdminUserManagement";
import AdminProManagement from "../pages/Admin/AdminProManagement";
import AdminCategoryManagement from "../pages/Admin/AdminCategoryManagement";
import ProProfileView from "../components/Admin/ProProfileView";
import PublicRoute from "../components/ProtectedRoutes/PublicRoute";
import AdminPrivateRoute from "../components/ProtectedRoutes/AdminPrivateRoute";
import AdminBookingManagement from "@/pages/Admin/AdminBookingManagement";
import AdminRevenueManagement from "@/pages/Admin/AdminRevenueManagement";
import AdminReviewManagement from "@/pages/Admin/AdminReviewManagement";

const adminRoutes = (
  <>
    <Route element={<PublicRoute />}>
      <Route path="/admin-register" element={<AdminRegister />} />
      <Route path="/admin-login" element={<AdminLogin />} />
    </Route>
    <Route element={<AdminPrivateRoute />}>
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<UserManagement />} />
      <Route path="/admin/pro-management" element={<AdminProManagement />} />
      <Route path="/admin/categories" element={<AdminCategoryManagement />} />
      <Route path="/pro-profile/:id" element={<ProProfileView />} />
      <Route path="/admin/bookings" element={<AdminBookingManagement/>} />
      <Route path="/admin/revenue" element={<AdminRevenueManagement/>} />
      <Route path="/admin/reviews" element={<AdminReviewManagement />} />
    </Route>
  </>
);

export default adminRoutes;