import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import Loading from "../Loader/Loading";

const AdminPrivateRoute = () => {
  const { user, accessToken, status } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!accessToken;
  const isAdmin = user?.role === "admin";

  if (status === "loading") {
    return <Loading />;
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/admin-login" replace />;
  }

  return <Outlet />;
};

export default AdminPrivateRoute;