import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { refreshToken, logoutUserSync } from "./store/authSlice";
import { AppDispatch } from "./store/store";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import PrivateRoute from "./components/PrivateRoute";
import AdminPrivateRoute from "./components/AdminPrivateRoute";
import ProDashboard from "./pages/ProDashboard";
import AdminRegister from "./pages/AdminRegister";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/AdminUserManagement";
import Loading from "./components/Loading";
import FixeifyProForm from "./pages/FixeifyProForm";
import SuccessPage from "./components/SuccessPage";
import AdminProManagement from "./pages/AdminProManagement";
import ProProfileView from "./components/ProProfileView";
import PublicRoute from "./components/PublicRoute"; 

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
      <Routes>
        {/* Public routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin-register" element={<AdminRegister />} />
          <Route path="/admin-login" element={<AdminLogin />} />
        </Route>

        <Route path="/become-pro" element={<FixeifyProForm />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/" element={<Home />} />

        {/* Private routes  */}
        <Route element={<PrivateRoute />}>
          <Route path="/home" element={<Home />} />
          <Route path="/pro-dashboard" element={<ProDashboard />} />
        </Route>
        {/* Admin private routes */}
        <Route element={<AdminPrivateRoute />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/pro-management" element={<AdminProManagement />} />
          <Route path="/pro-profile/:id" element={<ProProfileView />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;