import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, LocateFixed } from "lucide-react";
import { bookingSchema } from "../../Validation/validationSchemas";
import { createBooking, getUserProfile } from "../../api/userApi";
import { RootState } from "../../store/store";
import Navbar from "../../components/User/Navbar";
import Footer from "../../components/User/Footer";
import { IApprovedPro, ILocation } from "../../interfaces/adminInterface";
import { BookingResponse } from "../../interfaces/bookingInterface";

const BookingForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { proId } = useParams<{ proId: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const userId = user?.id || "";
  const pro = location.state?.pro as IApprovedPro | undefined;
  const categoryId = location.state?.categoryId as string | undefined;
  const selectedLocation = location.state?.location as ILocation | undefined;

  const [formData, setFormData] = useState({
    issueDescription: "",
    location: selectedLocation || null as ILocation | null,
    phoneNumber: "",
    preferredDate: "",
    preferredTime: "",
  });
  const [savedLocation, setSavedLocation] = useState<ILocation | null>(null);
  const [savedPhoneNumber, setSavedPhoneNumber] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [bookingDetails, setBookingDetails] = useState<BookingResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        setErrors({ general: "User not authenticated. Please log in." });
        setIsLoadingProfile(false);
        return;
      }
      try {
        setIsLoadingProfile(true);
        const response = await getUserProfile(userId);
        if (response.address) setSavedLocation(response.address);
        if (response.phoneNo) setSavedPhoneNumber(response.phoneNo);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setErrors({ general: "Failed to fetch user profile." });
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    if (isLoadingProfile) return;

    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initAutocomplete();
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initAutocomplete;
      script.onerror = () => setErrors({ location: "Failed to load Google Maps." });
      document.head.appendChild(script);
    };

    const initAutocomplete = () => {
      if (locationInputRef.current) {
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
              setFormData((prev) => ({ ...prev, location: null }));
              return;
            }

            setFormData((prev) => ({ ...prev, location: locationData }));
            setErrors((prev) => ({ ...prev, location: "" }));
          } else {
            setErrors({ location: "Please provide a valid location." });
            setFormData((prev) => ({ ...prev, location: null }));
          }
        });
      }
    };

    loadGoogleMapsScript();
    return () => {
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
                  setFormData((prev) => ({ ...prev, location: null }));
                  return;
                }

                setFormData((prev) => ({ ...prev, location: locationData }));
                if (locationInputRef.current) locationInputRef.current.value = address;
                setErrors((prev) => ({ ...prev, location: "" }));
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
              errorMessage = "Geolocation permission denied.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "The request to get your location timed out.";
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
      setFormData((prev) => ({ ...prev, location: savedLocation }));
      if (locationInputRef.current) locationInputRef.current.value = savedLocation.address;
      setErrors((prev) => ({ ...prev, location: "" }));
    }
  };

  const handleUseSavedPhoneNumber = () => {
    if (savedPhoneNumber) {
      setFormData((prev) => ({ ...prev, phoneNumber: savedPhoneNumber }));
      setErrors((prev) => ({ ...prev, phoneNumber: "" }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Allow spaces in issueDescription during typing; trimming is handled by the schema on submit
    const updatedValue = name === "issueDescription" ? value : value.trim();
    setFormData((prev) => ({ ...prev, [name]: updatedValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setServerError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError("");
    setSuccessMessage("");

    if (!userId) {
      setServerError("Please log in to create a booking.");
      return;
    }
    if (!pro || !proId || !categoryId) {
      setServerError("Professional or category data not found.");
      return;
    }

    try {
      const dataToValidate = {
        issueDescription: formData.issueDescription,
        location: formData.location,
        phoneNumber: formData.phoneNumber,
        preferredDate: formData.preferredDate,
        preferredTime: formData.preferredTime,
      };

      const validatedData = bookingSchema.parse(dataToValidate);

      // Construct full preferred date-time
      const [prefHour, prefMinute] = formData.preferredTime.split(":").map(Number);
      const preferredDateTime = new Date(formData.preferredDate);
      preferredDateTime.setHours(prefHour, prefMinute, 0, 0);

      const now = new Date();

      // Check if the selected date-time is in the past
      if (preferredDateTime < now) {
        setErrors({ preferredTime: "Past time not allowed" });
        return;
      }

      // Check if the selected date is today and enforce the 2-hour advance booking rule
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(formData.preferredDate);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate.getTime() === today.getTime()) {
        const minTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
        if (preferredDateTime < minTime) {
          setErrors({ preferredTime: "Booking must be scheduled at least 2 hours in advance" });
          return;
        }
      }

      // Validate against professional's availability
      const dayOfWeek = preferredDateTime.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
      const availableSlots = pro.availability[dayOfWeek as keyof IApprovedPro["availability"]] || [];
      if (availableSlots.length === 0) {
        setErrors({ preferredDate: `Professional is not available on ${dayOfWeek}` });
        return;
      }

      const preferredTimeInMinutes = prefHour * 60 + prefMinute;
      const isTimeValid = availableSlots.some((slot) => {
        const [startHour, startMinute] = slot.startTime.split(":").map(Number);
        const [endHour, endMinute] = slot.endTime.split(":").map(Number);
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;
        return preferredTimeInMinutes >= startTimeInMinutes && preferredTimeInMinutes <= endTimeInMinutes;
      });

      if (!isTimeValid) {
        setErrors({ preferredTime: "Selected time is not within the professional's availability" });
        return;
      }

      const response = await createBooking(userId, proId, {
        categoryId,
        issueDescription: validatedData.issueDescription,
        location: validatedData.location,
        phoneNumber: validatedData.phoneNumber,
        preferredDate: validatedData.preferredDate,
        preferredTime: validatedData.preferredTime,
      });

      setBookingDetails(response);
      setSuccessMessage("Booking created successfully! Displaying booking details...");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          fieldErrors[err.path[0]] = err.message;
        });
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        const err = error as any;
        if (err.response?.status || err.status) {
          const status = err.response?.status || err.status;
          const message = err.response?.data?.message || err.message || "Booking failed";
          switch (status) {
            case 400:
              // Map specific server errors to form fields
              if (message === "Preferred date cannot be in the past") {
                setErrors({ preferredDate: message });
              } else if (message === "Preferred time is not within the professional's availability") {
                setErrors({ preferredTime: message });
              } else if (message === "Preferred time must be at least 2 hours from now") {
                setErrors({ preferredTime: message });
              } else if (message === "Professional is currently unavailable") {
                setErrors({ general: message });
              } else {
                setServerError(message);
              }
              break;
            case 403:
              setErrors({ general: "Your account or the professional's account is banned." });
              break;
            case 404:
              setErrors({ general: "User or professional not found." });
              break;
            default:
              setServerError("Booking failed. Please try again.");
          }
        } else {
          setServerError("Unable to connect to the server. Please try again later.");
        }
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    }
  };

  if (!pro || !proId || !categoryId) {
    return (
      <div className="flex flex-col min-h-screen dark:bg-gray-900">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-8">
          <p className="text-red-500 dark:text-red-400">Professional or category data not found.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 mt-[5px] mb-[130px] flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <button
            onClick={() => navigate(`/pro-details/${proId}`, { state: { pro, categoryId, location: selectedLocation } })}
            className="inline-block mb-3 p-1 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100 text-center">
            Book {pro.firstName} {pro.lastName}
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
          ) : bookingDetails ? (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">Booking Successful</h2>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Booking Details</h3>
              <p className="text-gray-700 dark:text-gray-300"><strong>User:</strong> {bookingDetails.user.name}</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Professional:</strong> {bookingDetails.pro.firstName} {bookingDetails.pro.lastName}</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Category:</strong> {bookingDetails.category.name}</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Issue:</strong> {bookingDetails.issueDescription}</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Location:</strong> {bookingDetails.location.address}, {bookingDetails.location.city}, {bookingDetails.location.state}</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Phone:</strong> {bookingDetails.phoneNumber}</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Date:</strong> {new Date(bookingDetails.preferredDate).toLocaleDateString()}</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Time:</strong> {bookingDetails.preferredTime}</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Status:</strong> {bookingDetails.status}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {serverError && <p className="text-red-500 text-sm mb-4">{serverError}</p>}
              {successMessage && <p className="text-green-500 text-sm mb-4">{successMessage}</p>}
              {errors.general && <p className="text-red-500 text-sm mb-4">{errors.general}</p>}

              <div>
                <label htmlFor="issueDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Issue Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="issueDescription"
                  name="issueDescription"
                  value={formData.issueDescription}
                  onChange={handleChange}
                  placeholder="Describe the issue (10–500 characters)"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  required
                  rows={4}
                />
                {errors.issueDescription && <p className="text-red-500 text-sm mt-1">{errors.issueDescription}</p>}
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={locationInputRef}
                    type="text"
                    id="location"
                    name="location"
                    defaultValue={formData.location?.address || ""}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 pr-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="Enter your location"
                    required
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
                {savedLocation && (
                  <button
                    type="button"
                    onClick={handleUseSavedLocation}
                    className="mt-2 w-full px-4 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500"
                  >
                    Use Saved Location
                  </button>
                )}
                <p className="text-gray-400 text-sm pl-3">Saved Location: {savedLocation?.address}</p>
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="Enter 10-digit phone number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  required
                />
                {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
                {savedPhoneNumber && (
                  <button
                    type="button"
                    onClick={handleUseSavedPhoneNumber}
                    className="mt-2 w-full px-4 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500"
                  >
                    Use Saved Phone Number
                  </button>
                )}
                <p className="text-gray-400 text-sm pl-3">Saved Phone No: {savedPhoneNumber}</p>
              </div>

              <div>
                <label htmlFor="preferredDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preferred Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="preferredDate"
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    required
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                {errors.preferredDate && <p className="text-red-500 text-sm mt-1">{errors.preferredDate}</p>}
              </div>

              <div>
                <label htmlFor="preferredTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preferred Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    id="preferredTime"
                    name="preferredTime"
                    value={formData.preferredTime}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    required
                  />
                </div>
                {errors.preferredTime && <p className="text-red-500 text-sm mt-1">{errors.preferredTime}</p>}
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 disabled:opacity-50"
                disabled={
                  !formData.issueDescription ||
                  !formData.location ||
                  !formData.phoneNumber ||
                  !formData.preferredDate ||
                  !formData.preferredTime
                }
              >
                Submit Booking
              </button>
            </form>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default BookingForm;