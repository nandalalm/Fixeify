import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { z } from "zod";
import { motion } from "framer-motion";
import { LocateFixed, ArrowLeft } from "lucide-react";
import { bookingSchema } from "../../Validation/validationSchemas";
import { createBooking, getUserProfile } from "../../api/userApi";
import { RootState } from "../../store/store";
import Navbar from "../../components/User/Navbar";
import Footer from "../../components/User/Footer";
import { IApprovedPro, ILocation, ITimeSlot } from "../../interfaces/adminInterface";
import { BookingResponse } from "../../interfaces/bookingInterface";
import BookingFormSecond from "./BookingFormSecond";
import BookingFormSuccess from "./BookingFormSuccess";

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
    preferredTime: [] as ITimeSlot[],
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

  useEffect(() => {
    if (bookingDetails) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [bookingDetails]);

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
    const updatedValue = name === "issueDescription" ? value : value.trim();
    setFormData((prev) => ({ ...prev, [name]: updatedValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setServerError("");
    setSuccessMessage("");
  };

  const handleTimeSlotToggle = (slot: ITimeSlot) => {
    if (slot.booked) return;
    setFormData((prev) => {
      const isSelected = prev.preferredTime.some(
        (s) => s.startTime === slot.startTime && s.endTime === slot.endTime
      );
      const updatedTimeSlots = isSelected
        ? prev.preferredTime.filter((s) => !(s.startTime === slot.startTime && s.endTime === slot.endTime))
        : [...prev.preferredTime, { ...slot, booked: false }];
      return { ...prev, preferredTime: updatedTimeSlots };
    });
    setErrors((prev) => ({ ...prev, preferredTime: "" }));
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

      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(validatedData.preferredDate);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate.getTime() === today.getTime()) {
        const earliestAllowedTime = new Date(now.getTime() + 1 * 60 * 60 * 1000);
        const selectedTimes = validatedData.preferredTime.map((slot) => {
          const [hours, minutes] = slot.startTime.split(":").map(Number);
          const slotDate = new Date(validatedData.preferredDate);
          slotDate.setHours(hours, minutes, 0, 0);
          return slotDate;
        });

        if (selectedTimes.some((time) => time < earliestAllowedTime)) {
          setErrors({ preferredTime: "Booking must be scheduled at least 1 hour in advance" });
          return;
        }
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
      setSuccessMessage("Booking created successfully!");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
          if (field === "phoneNumber" && formData.phoneNumber.length > 0 && formData.phoneNumber.length !== 10) {
            fieldErrors[field] = "Enter a valid 10-digit phone number";
          } else if (field === "preferredTime" && formData.preferredTime.length === 0) {
            fieldErrors[field] = "Please select at least one time slot";
          }
        });
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        const err = error as { response?: { status?: number; data?: { message?: string } }; status?: number; message?: string };
        if (err.response?.status || err.status) {
          const status = err.response?.status || err.status;
          const message = err.response?.data?.message || err.message || "Booking failed";
          switch (status) {
            case 400:
              if (message.includes("Preferred date")) {
                setErrors({ preferredDate: message });
              } else if (message.includes("Time slot is already booked")) {
                setErrors({ preferredTime: "One or more selected time slots are already booked. Please choose different slots." });
              } else if (message.includes("You already have a booking")) {
                setServerError(message); // Handle the new overlapping booking error
              } else if (message.includes("Time slot") || message.includes("Preferred time")) {
                setErrors({ preferredTime: message });
              } else if (message.includes("Professional is currently unavailable")) {
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
            case 409:
              setErrors({ general: "This pro is currently conflicted" });
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

  const formatTimeTo12Hour = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
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
            <BookingFormSuccess bookingDetails={bookingDetails} navigate={navigate} proId={proId} pro={pro} categoryId={categoryId} location={selectedLocation} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-block mb-3 p-1 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
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
                {savedLocation?.address&&
                <p className="text-gray-400 text-sm pl-3">Saved Location: {savedLocation?.address}</p>}
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
                {savedPhoneNumber&&
                <p className="text-gray-400 text-sm pl-3">Saved Phone No: {savedPhoneNumber}</p>}
              </div>

              <BookingFormSecond
                formData={formData}
                setFormData={setFormData}
                proId={proId}
                setErrors={setErrors}
                handleTimeSlotToggle={handleTimeSlotToggle}
                errors={errors}
                formatTimeTo12Hour={formatTimeTo12Hour}
              />

              {serverError && <p className="text-red-500 text-sm mb-4">{serverError}</p>}
              {successMessage && <p className="text-green-500 text-sm mb-4">{successMessage}</p>}
              {errors.general && <p className="text-red-500 text-sm mb-4">{errors.general}</p>}

              <button
                type="submit"
                className="w-full px-4 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500"
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