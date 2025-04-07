import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";

const AdminPrivateRoute = () => {
  const { user, accessToken } = useSelector((state: RootState) => state.auth);

  const isAuthenticated = !!accessToken;

  const isAdmin = user?.role === "admin";

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/admin-login" replace />;
  }

  return <Outlet />;
};

export default AdminPrivateRoute;