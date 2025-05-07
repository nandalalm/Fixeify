import { Navigate, Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import Loading from "../Loader/Loading";
import { logoutUserSync, checkBanStatus } from "../../store/authSlice";
import { useEffect } from "react";

const ProPrivateRoute = () => {
  const { user, accessToken, status } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!accessToken;
  const isPro = user?.role === "pro";
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!isAuthenticated || !isPro) return;
    dispatch(checkBanStatus());
  }, [dispatch, isAuthenticated, isPro]);

  if (status === "loading") {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isPro) {
    return <Navigate to="/home" replace />;
  }

  if (user?.isBanned) {
    dispatch(logoutUserSync());
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProPrivateRoute;