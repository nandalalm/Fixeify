import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { refreshToken, logoutUserSync } from "./store/authSlice";
import { AppDispatch } from "./store/store";
import { BrowserRouter as Router, Routes } from "react-router-dom";
import Loading from "./components/Loader/Loading";
import allRoutes from "./routes";

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const manuallySet = localStorage.getItem("isAuthenticatedManuallySet");
    console.log("App mounted, manuallySet:", manuallySet, "Local storage:", localStorage);

    if (!manuallySet) {
      console.log("No manual auth, clearing state...");
      dispatch(logoutUserSync());
      setIsLoading(false);
    } else {
      console.log("Attempting refresh due to manual set...");
      dispatch(refreshToken())
        .unwrap()
        .then(() => {
          console.log("Refresh succeeded, setting isLoading to false");
          setIsLoading(false);
        })
        .catch((error) => {
          console.log("Refresh failed, logging out...", error);
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