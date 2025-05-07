import { Navigate, Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import Loading from "../Loader/Loading";
import { logoutUserSync, checkBanStatus } from "../../store/authSlice";
import { useEffect } from "react";

const UserPrivateRoute = () => {
  const { user, accessToken, status } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!accessToken;
  const isUser = user?.role === "user";
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!isAuthenticated || !isUser) return;
    dispatch(checkBanStatus());
  }, [dispatch, isAuthenticated, isUser]);

  if (status === "loading") {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isUser) {
    return <Navigate to="/home" replace />;
  }

  if (user?.isBanned) {
    dispatch(logoutUserSync());
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default UserPrivateRoute;