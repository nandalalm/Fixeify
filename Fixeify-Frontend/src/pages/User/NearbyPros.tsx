import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { getNearbyPros } from "../../api/userApi";
import { IApprovedPro, ILocation } from "../../interfaces/adminInterface";
import { ArrowLeft } from "lucide-react";
import Navbar from "../../components/User/Navbar";
import Footer from "../../components/User/Footer";

const ProCard = ({ pro }: { pro: IApprovedPro }) => {
  const aboutText = pro.about 
    ? `${pro.about.slice(0, 32)}...` 
    : `Hi, I’m ${pro.firstName}, a skilled handyman spe...`;

  return (
    <div className="flex flex-col">
      <div className="rounded-lg overflow-hidden mb-1">
        <img
          src={pro.profilePhoto || "/placeholder.svg"}
          alt={`${pro.firstName} ${pro.lastName}`}
          className="w-full h-48 object-cover"
        />
      </div>
      <h3 className="font-medium text-lg text-gray-900 dark:text-white">
        {pro.firstName} {pro.lastName}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm">{pro.category.name}</p>
      <p className="text-sm mb-2 line-clamp-2 text-gray-600 dark:text-gray-300">{aboutText}</p>
      <div className="flex gap-2 mt-auto">
        <Link
          to={`/pro-details/${pro._id}`}
          state={{ pro, categoryId: pro.category.id, location: pro.location }}
          className="flex-1 bg-[#032B44] text-white py-2 px-6 rounded-md hover:bg-[#054869] transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white flex items-center justify-center gap-2 text-sm"
        >
          View
        </Link>
        <Link
          to={`/chat/${pro._id}`}
          className="flex-1 bg-white dark:bg-gray-800 border border-[#032B44] text-[#032B44] hover:bg-[#032B44] hover:text-white hover:border-white dark:text-gray-200 dark:border-gray-600 py-2 px-6 rounded-md dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          Chat
        </Link>
      </div>
    </div>
  );
};

const NearbyPros = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const categoryId = queryParams.get("categoryId") || "";
  const selectedLocation = location.state?.location as ILocation | undefined;
  const [pros, setPros] = useState<IApprovedPro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>("Professional");

  useEffect(() => {
    const fetchNearbyPros = async () => {
      if (!selectedLocation || !selectedLocation.coordinates?.coordinates) {
        setError("Invalid location data. Please select a location again.");
        setLoading(false);
        navigate(`/location?categoryId=${categoryId}`);
        return;
      }
      try {
        setLoading(true);
        const response = await getNearbyPros(
          categoryId,
          selectedLocation.coordinates.coordinates[0], 
          selectedLocation.coordinates.coordinates[1] 
        );
        setPros(response);
        if (response.length > 0) {
          setCategoryName(response[0].category.name || "Professional");
        }
        setError(null);
      } catch (err: any) {
        const errorMessage = err.response
          ? `Failed to load professionals: ${err.response.status} - ${JSON.stringify(err.response.data)}`
          : `Failed to load professionals: ${err.message}`;
        setError(errorMessage);
        console.error("Error fetching nearby pros:", err);
      } finally {
        setLoading(false);
      }
    };

    if (selectedLocation) {
      fetchNearbyPros();
    } else {
      setError("No location provided. Please select a location.");
      setLoading(false);
      navigate(`/location?categoryId=${categoryId}`);
    }
  }, [categoryId, selectedLocation, navigate]);

  return (
    <div className="flex flex-col min-h-screen dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 mb-[120px]">
        <section className="container mx-auto px-2 py-8 max-w-6xl">
          <button
            onClick={() => navigate(-1)}
            className="inline-block mb-3 p-1 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {pros.length > 0 && !loading && (
            <>
              <h1 className="text-3xl font-bold text-center mb-2 dark:text-white">
                Book Your {categoryName} Pro
              </h1>
              <p className="text-center text-gray-400 mb-8">
                Find Experienced {categoryName} Professionals for your Home needs.
              </p>
            </>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex flex-col">
                  <div className="rounded-lg h-48 mb-2 bg-gray-200 animate-pulse" />
                  <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse mt-1" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-red-500 dark:text-red-400 text-center">{error}</p>
          ) : pros.length === 0 ? (
            <div className="flex mb-[50px] flex-col items-center justify-center py-12">
              <svg
                width="120"
                height="120"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-500 dark:text-gray-400 mb-4"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 10a1 1 0 0 0-1 1 1 1 0 0 0 1 1" />
                <path d="M16 10a1 1 0 0 0-1 1 1 1 0 0 0 1 1" />
                <path d="M8 15c2-2 4 0 8 0" />
              </svg>
              <p className="text-lg text-gray-500 dark:text-gray-400 text-center">
                Sorry, we couldn’t find any Fixeify Pros in this area. Please try another location.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {pros.map((pro) => (
                <ProCard key={pro._id} pro={pro} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default NearbyPros;