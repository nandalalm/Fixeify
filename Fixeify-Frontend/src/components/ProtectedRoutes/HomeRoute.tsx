import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import Loading from "../Loader/Loading";

const HomeRoute = () => {
  const { user, accessToken, status } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!accessToken;

  if (status === "loading") {
    return <Loading />;
  }

  if (isAuthenticated) {
    if (user?.role === "admin") {
      return <Navigate to="/admin-dashboard" replace />;
    }
    if (user?.role === "pro") {
      return <Navigate to="/pro-dashboard" replace />;
    }
    return <Outlet />;
  }

  return <Outlet />;
};

export default HomeRoute;