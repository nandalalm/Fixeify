import { Navigate, Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store"; // Updated import
import Loading from "../Loader/Loading";
import { logoutUserSync, checkBanStatus } from "../../store/authSlice";
import { useEffect } from "react";

const ProPrivateRoute = () => {
  const { user, accessToken, status } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!accessToken;
  const isPro = user?.role === "pro";
  const dispatch = useDispatch<AppDispatch>(); // Explicitly type dispatch as AppDispatch

  // Polling to check ban status every 30 seconds
  useEffect(() => {
    if (!isAuthenticated || !isPro) return;

    const interval = setInterval(() => {
      dispatch(checkBanStatus()); // Now compatible with AppDispatch
    }, 30000); // Check every 30 seconds

    // Initial check on mount
    dispatch(checkBanStatus());

    return () => clearInterval(interval); // Cleanup on unmount
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