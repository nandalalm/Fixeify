import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LocateFixed, X } from "lucide-react";
import { ILocation } from "../../interfaces/adminInterface";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { updateUser } from "../../store/authSlice";
import { updateUserProfile } from "../../api/userApi";

interface ChangeLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangeLocationModal: React.FC<ChangeLocationModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const userId = user?.id || "";

  const [selectedLocation, setSelectedLocation] = useState<ILocation | null>(null);
  const [errors, setErrors] = useState<{ location?: string; general?: string }>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initAutocomplete();
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initAutocomplete();
      script.onerror = () => setErrors({ location: "Failed to load Google Maps. Please try again." });
      document.head.appendChild(script);
    };

    const initAutocomplete = () => {
      if (!locationInputRef.current) return;
      autocompleteRef.current = new google.maps.places.Autocomplete(locationInputRef.current, {
        types: ["geocode"],
        fields: ["formatted_address", "geometry", "address_components"],
      });

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
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
    };

    loadGoogleMapsScript();

    return () => {
      const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      scripts.forEach((s) => s.remove());
    };
  }, [isOpen]);

  const handleGetCurrentLocation = () => {
    if (!isOpen) return;
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
        (error) => {
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

  const handleSave = async () => {
    if (!selectedLocation) {
      setErrors({ location: "Please select a valid location." });
      return;
    }
    if (!userId) {
      setErrors({ general: "You must be logged in to update your location." });
      return;
    }
    try {
      setIsSaving(true);
      await updateUserProfile(userId, { address: selectedLocation });
      // Optimistically update auth user state to reflect new address
      if (user) {
        dispatch(updateUser({ ...user, address: selectedLocation }));
      }
      onClose();
    } catch (err: unknown) {
      setErrors({ general: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to save location. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold dark:text-white">Change Location</h3>
              <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5 dark:text-gray-300" />
              </button>
            </div>
            <div className="space-y-4">
              {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                <div className="relative">
                  <input
                    ref={locationInputRef}
                    type="text"
                    onChange={(e) => {
                      setSelectedLocation(null);
                      if (!e.target.value.trim()) setErrors({});
                      else setErrors({ location: "Please select a location from the suggestions or use current location" });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 pr-10"
                    placeholder="Enter a location"
                  />
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLoadingLocation}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                  >
                    {isLoadingLocation ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                      </svg>
                    ) : (
                      <LocateFixed className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChangeLocationModal;
