import Navbar from "../../components/User/Navbar";
import Hero from "../../components/User/Hero";
import ServiceCategories from "../../components/User/ServiceCategories";
import HowItWorks from "../../components/User/HowItWorks";
import HomeServices from "../../components/User/HomeServices";
import Footer from "../../components/User/Footer";

function Home() {
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