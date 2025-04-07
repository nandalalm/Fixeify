import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import ServiceCategories from "../components/ServiceCategories";
import HowItWorks from "../components/HowItWorks";
import HomeServices from "../components/HomeServices";
import Footer from "../components/Footer";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

function Home() {
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user && location.pathname === "/") {
      navigate("/home");
    }
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    if (user && user.role === "pro" && location.pathname === "/home") {
      navigate("/pro-dashboard");
    }
  }, [user, location.pathname, navigate]);

  return (
    <div className="flex flex-col min-h-screen dark:bg-gray-900">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ServiceCategories />
        <HomeServices />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}

export default Home;