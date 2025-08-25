import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { refreshToken, logoutUserSync } from "./store/authSlice";
import { AppDispatch } from "./store/store";
import { BrowserRouter as Router, Routes } from "react-router-dom";
import Loading from "./components/Loader/Loading";
import allRoutes from "./routes";
import { initializeSocket } from "./services/socket";

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const manuallySet = localStorage.getItem("isAuthenticatedManuallySet");

    if (!manuallySet) {
      dispatch(logoutUserSync());
      setIsLoading(false);
    } else {
      dispatch(refreshToken())
        .unwrap()
        .then((result) => {
          if (result.accessToken) {
            initializeSocket(result.accessToken);
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Refresh failed, logging out...", error);
          dispatch(logoutUserSync());
          setIsLoading(false);
        });
    }
  }, [dispatch]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Router>
      <Routes>{allRoutes}</Routes>
    </Router>
  );
}

export default App;