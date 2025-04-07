import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";

const PrivateRoute = () => {
  const token = useSelector((state: RootState) => state.auth.accessToken);
  return token ? <Outlet /> : <Navigate to="/" />;
};

export default PrivateRoute;
