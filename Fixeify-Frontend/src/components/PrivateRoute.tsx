import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import Loading from "./Loading";

const PrivateRoute = () => {
  const { accessToken, status } = useSelector((state: RootState) => state.auth);

  if (status === "loading") {
    return <Loading />;
  }

  return accessToken ? <Outlet /> : <Navigate to="/" />;
};

export default PrivateRoute;