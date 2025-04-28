import { Route } from "react-router-dom";
import Login from "../pages/User/Login";
import Register from "../pages/User/Register";
import Home from "../pages/User/Home";
import PublicRoute from "../components/ProtectedRoutes/PublicRoute";
import UserPrivateRoute from "../components/ProtectedRoutes/UserPrivateRoute";
import HomeRoute from "../components/ProtectedRoutes/HomeRoute"; // Import new route
import Profile from "../pages/User/Profile";
import FixeifyProForm from "../pages/User/FixeifyProForm";
import SuccessPage from "../components/User/SuccessPage";

const userRoutes = (
  <>
    <Route element={<PublicRoute />}>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Route>
    <Route element={<HomeRoute />}>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
    </Route>
    <Route path="/become-pro" element={<FixeifyProForm />} />
    <Route path="/success" element={<SuccessPage />} />
    <Route element={<UserPrivateRoute />}>
      <Route path="/profile" element={<Profile />} />
    </Route>
  </>
);

export default userRoutes;