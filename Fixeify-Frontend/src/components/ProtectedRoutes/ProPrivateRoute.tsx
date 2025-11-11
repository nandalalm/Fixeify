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
        if (result && (result as { isBanned?: boolean }).isBanned) {
         
          if (!location.pathname.startsWith(NotifBase)) {
            dispatch(logoutUserSync());
            navigate("/login", { replace: true });
          }
        }
      } catch (error) {
      
        console.error('Pro route validation error:', error);
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