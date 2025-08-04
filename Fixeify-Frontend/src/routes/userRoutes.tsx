import { Route } from "react-router-dom";
import Login from "../pages/User/Login";
import Register from "../pages/User/Register";
import Home from "../pages/User/Home";
import PublicRoute from "../components/ProtectedRoutes/PublicRoute";
import UserPrivateRoute from "../components/ProtectedRoutes/UserPrivateRoute";
import HomeRoute from "../components/ProtectedRoutes/HomeRoute";
import Profile from "../pages/User/Profile";
import FixeifyProForm from "../pages/User/FixeifyProForm";
import SuccessPage from "../components/User/SuccessPage";
import UserLocation from "../pages/User/UserLocation";
import NearbyPros from "../pages/User/NearbyPros";
import ProDetails from "../pages/User/ProDetails";
import ResetPassword from "../pages/User/ResetPassword";
import BookingForm from "../pages/User/BookingForm";
import PaymentSuccess from "../components/User/PaymentSuccess";
import ChatPage from "@/pages/User/ChatPage";

const userRoutes = (
  <>
    <Route element={<PublicRoute />}>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Route>
    <Route element={<HomeRoute />}>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
    </Route>
    <Route path="/become-pro" element={<FixeifyProForm />} />
    <Route path="/success" element={<SuccessPage />} />
    <Route element={<UserPrivateRoute />}>
      <Route path="/profile" element={<Profile />} />
      <Route path="/location" element={<UserLocation />} />
      <Route path="/nearby-pros" element={<NearbyPros />} />
      <Route path="/pro-details/:proId" element={<ProDetails />} />
      <Route path="/book/:proId" element={<BookingForm />} />
      <Route path="/payment-success" element={<PaymentSuccess/>} />
      <Route path="/chat/:proId" element={<ChatPage/>} />
    </Route>
  </>
);

export default userRoutes;