import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import Loading from "./Loading";

const PublicRoute = () => {
  const { accessToken, user, status } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!accessToken;

  if (status === "loading") {
    return <Loading />;
  }

  if (isAuthenticated) {
    // Redirect based on role
    if (user?.role === "admin") {
      return <Navigate to="/admin-dashboard" replace />;
    }
    return <Navigate to="/home" replace />; // Default to home for users or pros
  }

  return <Outlet />;
};

export default PublicRoute;