import { Navigate, Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store"; // Updated import
import Loading from "../Loader/Loading";
import { logoutUserSync, checkBanStatus } from "../../store/authSlice";
import { useEffect } from "react";

const UserPrivateRoute = () => {
  const { user, accessToken, status } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!accessToken;
  const isUser = user?.role === "user";
  const dispatch = useDispatch<AppDispatch>(); // Explicitly type dispatch as AppDispatch

  // Polling to check ban status every 30 seconds
  useEffect(() => {
    if (!isAuthenticated || !isUser) return;

    const interval = setInterval(() => {
      dispatch(checkBanStatus()); // Now compatible with AppDispatch
    }, 30000); // Check every 30 seconds

    // Initial check on mount
    dispatch(checkBanStatus());

    return () => clearInterval(interval); // Cleanup on unmount
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