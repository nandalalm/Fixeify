import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import Loading from "../Loader/Loading";
import { logoutUserSync, checkBanStatus } from "../../store/authSlice";
import { useEffect } from "react";
import { NotifBase } from "@/Constants/BaseRoutes";

const ProPrivateRoute = () => {
  const { user, accessToken, status } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!accessToken;
  const isPro = user?.role === "pro";
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !isPro) return;
    (async () => {
      try {
        const result = await dispatch(checkBanStatus()).unwrap();
        if (result && (result as any).isBanned) {
          // Allow notifications page to be viewed
          if (!location.pathname.startsWith(NotifBase)) {
            dispatch(logoutUserSync());
            navigate("/login", { replace: true });
          }
        }
      } catch (err) {
        // Silent fail; do not logout on transient errors
      }
    })();
  }, [dispatch, isAuthenticated, isPro, location.pathname, navigate]);

  if (status === "loading") {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isPro) {
    return <Navigate to="/home" replace />;
  }

  if (user?.isBanned && !location.pathname.startsWith(NotifBase)) {
    dispatch(logoutUserSync());
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProPrivateRoute;