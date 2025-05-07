import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { LocateFixed, ArrowLeft } from "lucide-react";
import { getUserProfile } from "../../api/userApi";
import { RootState } from "../../store/store";
import Navbar from "../../components/User/Navbar";
import Footer from "../../components/User/Footer";
import { ILocation } from "../../interfaces/adminInterface";

const UserLocation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const categoryId = queryParams.get("categoryId") || "";
  const { user } = useSelector((state: RootState) => state.auth);
  const userId = user?.id || "";
  const [selectedLocation, setSelectedLocation] = useState<ILocation | null>(null);
  const [savedLocation, setSavedLocation] = useState<ILocation | null>(null);
  const [errors, setErrors] = useState<{ location?: string }>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Fetch user's saved location
    const fetchUserProfile = async () => {
      if (!userId) {
        setErrors({ location: "User not authenticated. Please log in." });
        setIsLoadingProfile(false);
        return;
      }
      try {
        setIsLoadingProfile(true);
        const response = await getUserProfile(userId);
        if (response.address) {
          setSavedLocation(response.address);
        }
      } catch (error: any) {
        console.error("Failed to fetch user profile:", error);
        setErrors({ location: "Failed to fetch saved location. Please select a location manually." });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    if (isLoadingProfile) return; // Wait until profile is loaded and input is rendered

    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        console.log("Google Maps already loaded, initializing autocomplete");
        initAutocomplete();
        return;
      }
      console.log("Loading Google Maps script");
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log("Google Maps script loaded successfully");
        initAutocomplete();
      };
      script.onerror = () => {
        console.error("Failed to load Google Maps script");
        setErrors({ location: "Failed to load Google Maps. Please check your API key or internet connection." });
      };
      document.head.appendChild(script);
    };

    const initAutocomplete = () => {
      if (locationInputRef.current) {
        console.log("Initializing autocomplete on input");
        autocompleteRef.current = new google.maps.places.Autocomplete(locationInputRef.current, {
          types: ["geocode"],
          fields: ["formatted_address", "geometry", "address_components"],
        });

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();
          console.log("Place selected:", place);
          if (place && place.formatted_address && place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const address = place.formatted_address;

            let city = "";
            let state = "";
            place.address_components?.forEach((component: google.maps.GeocoderAddressComponent) => {
              if (component.types.includes("locality")) city = component.long_name;
              if (component.types.includes("administrative_area_level_1")) state = component.long_name;
            });

            const locationData: ILocation = {
              address,
              city: city || "",
              state: state || "",
              coordinates: { type: "Point", coordinates: [lng, lat] },
            };

            if (!city || !state) {
              setErrors({ location: "Please provide a location with city and state." });
              setSelectedLocation(null);
              return;
            }

            setSelectedLocation(locationData);
            setErrors({});
          } else {
            setErrors({ location: "Please provide a valid location with city and state." });
            setSelectedLocation(null);
          }
        });
      } else {
        console.error("locationInputRef.current is null, cannot initialize autocomplete");
      }
    };

    loadGoogleMapsScript();

    return () => {
      console.log("Cleaning up Google Maps scripts");
      const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      scripts.forEach((script) => script.remove());
    };
  }, [isLoadingProfile]);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      if (locationInputRef.current) locationInputRef.current.value = "";
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
              setIsLoadingLocation(false);
              if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                const place = results[0];
                const address = place.formatted_address;
                const lat = place.geometry?.location?.lat();
                const lng = place.geometry?.location?.lng();

                if (!lat || !lng) {
                  setErrors({ location: "Unable to fetch location coordinates." });
                  return;
                }

                let city = "";
                let state = "";
                place.address_components?.forEach((component: google.maps.GeocoderAddressComponent) => {
                  if (component.types.includes("locality")) city = component.long_name;
                  if (component.types.includes("administrative_area_level_1")) state = component.long_name;
                });

                const locationData: ILocation = {
                  address,
                  city: city || "",
                  state: state || "",
                  coordinates: { type: "Point", coordinates: [longitude, latitude] },
                };

                if (!city || !state) {
                  setErrors({ location: "Please provide a location with city and state." });
                  setSelectedLocation(null);
                  return;
                }

                setSelectedLocation(locationData);
                if (locationInputRef.current) locationInputRef.current.value = address;
                setErrors({});
              } else {
                setErrors({ location: "Unable to fetch current location details." });
              }
            }
          );
        },
        (error: GeolocationPositionError) => {
          setIsLoadingLocation(false);
          let errorMessage = "An unknown error occurred while fetching your location.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Geolocation permission denied. Please allow location access.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable. Please try again later.";
              break;
            case error.TIMEOUT:
              errorMessage = "The request to get your location timed out. Please try again.";
              break;
          }
          setErrors({ location: errorMessage });
        }
      );
    } else {
      setErrors({ location: "Geolocation is not supported by this browser." });
    }
  };

  const handleUseSavedLocation = () => {
    if (savedLocation) {
      setSelectedLocation(savedLocation);
      if (locationInputRef.current) locationInputRef.current.value = savedLocation.address;
      setErrors({});
    }
  };

  const handleContinue = () => {
    if (!selectedLocation) {
      setErrors({ location: "Please select a location." });
      return;
    }
    navigate(`/nearby-pros?categoryId=${categoryId}`, { state: { location: selectedLocation } });
  };

  return (
    <div className="flex flex-col min-h-screen dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 mt-[60px] mb-[130px] flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Link
            to="/"
            className="inline-block mb-3 p-1 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </Link>
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100 text-center">
            Select Your Location
          </h1>
          {isLoadingProfile ? (
            <div className="text-center">
              <svg
                className="animate-spin h-8 w-8 text-[#032B44] mx-auto"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
                />
              </svg>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                <div className="relative">
                  <input
                    ref={locationInputRef}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 pr-10"
                    placeholder="Enter your location"
                  />
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLoadingLocation}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                  >
                    {isLoadingLocation ? (
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
                        />
                      </svg>
                    ) : (
                      <LocateFixed className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
              </div>
              {savedLocation && (
                <div>
                  <button
                    type="button"
                    onClick={handleUseSavedLocation}
                    className="w-full px-4 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500"
                  >
                    Use Saved Location
                  </button>
                  <p className="text-sm text-gray-500 pl-2 pr-1 pt-2">Saved location: {savedLocation.address}</p>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleContinue}
                  className="px-6 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default UserLocation;