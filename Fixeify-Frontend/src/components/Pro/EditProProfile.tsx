import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { LocateFixed } from "lucide-react";
import { getProProfile, updateProProfile } from "../../api/proApi";
import { ProProfile } from "../../interfaces/proInterface";
import { updateUser } from "../../store/authSlice";
import { uploadFileToS3 } from "../../api/uploadApi";
import { z } from "zod";
import { editProProfileSchema } from "../../Validation/editProProfileSchema";
import { LocationData, EditProProfileFormData } from "../../interfaces/proInterface";



interface EditProProfileProps {
  onCancel: () => void;
}

const EditProProfile = ({ onCancel }: EditProProfileProps) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [formData, setFormData] = useState<EditProProfileFormData>({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    location: {
      address: "",
      city: "",
      state: "",
      coordinates: { type: "Point", coordinates: [0, 0] },
    },
    profilePhoto: "",
    about: null,
  });
  const [originalData, setOriginalData] = useState<ProProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchProProfile = async () => {
      if (user?.id) {
        try {
          const fetchedPro = await getProProfile(user.id);
          setFormData({
            id: fetchedPro.id,
            firstName: fetchedPro.firstName,
            lastName: fetchedPro.lastName,
            email: fetchedPro.email,
            phoneNumber: fetchedPro.phoneNumber,
            location: fetchedPro.location,
            profilePhoto: fetchedPro.profilePhoto,
            about: fetchedPro.about,
          });
          setOriginalData(fetchedPro);
        } catch (error) {
          console.error('Failed to fetch pro profile:', error);
          navigate("/login");
        }
      }
    };
    fetchProProfile();
  }, [user?.id, navigate]);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        initAutocomplete();
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = initAutocomplete;
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

            const locationData: LocationData = {
              address,
              city: city || "",
              state: state || "",
              coordinates: { type: "Point", coordinates: [lng, lat] },
            };

            if (!city || !state) {
              setErrors((prev) => ({
                ...prev,
                location: "Please provide a location with city and state.",
              }));
              setFormData((prev) => ({ ...prev, location: prev.location }));
              return;
            }

            setFormData((prev) => ({ ...prev, location: locationData }));
            setErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors.location;
              return newErrors;
            });
            validateField("location", locationData);
          } else {
            setErrors((prev) => ({
              ...prev,
              location: "Please provide a valid location with city and state.",
            }));
            setFormData((prev) => ({ ...prev, location: prev.location }));
          }
        });
      }
    };

    loadGoogleMapsScript();

    return () => {
      const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      scripts.forEach((script) => script.remove());
    };
  }, []);

  const validateField = (name: string, value: unknown) => {
    try {
      const fieldSchema = editProProfileSchema.shape[name as keyof typeof editProProfileSchema.shape];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [name]: error.errors[0].message }));
      }
    }
  };

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
                  setErrors((prev) => ({
                    ...prev,
                    location: "Unable to fetch location coordinates.",
                  }));
                  return;
                }

                let city = "";
                let state = "";
                place.address_components?.forEach((component: google.maps.GeocoderAddressComponent) => {
                  if (component.types.includes("locality")) city = component.long_name;
                  if (component.types.includes("administrative_area_level_1")) state = component.long_name;
                });

                const locationData: LocationData = {
                  address,
                  city: city || "",
                  state: state || "",
                  coordinates: { type: "Point", coordinates: [longitude, latitude] },
                };

                if (!city || !state) {
                  setErrors((prev) => ({
                    ...prev,
                    location: "Please provide a location with city and state.",
                  }));
                  setFormData((prev) => ({ ...prev, location: prev.location }));
                  return;
                }

                setFormData((prev) => ({ ...prev, location: locationData }));
                if (locationInputRef.current) locationInputRef.current.value = address;
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.location;
                  return newErrors;
                });
                validateField("location", locationData);
              } else {
                setErrors((prev) => ({
                  ...prev,
                  location: "Unable to fetch current location details.",
                }));
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
          setErrors((prev) => ({ ...prev, location: errorMessage }));
        }
      );
    } else {
      setIsLoadingLocation(false);
      setErrors((prev) => ({
        ...prev,
        location: "Geolocation is not supported by this browser.",
      }));
    }
  };

  const uploadToS3 = async (file: File): Promise<string> => {
    return await uploadFileToS3(file, "profile-photos");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          profilePhoto: "Only images are allowed",
        }));
        return;
      }

      // Optimistic UI: Show local preview immediately
      const objectUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, profilePhoto: objectUrl }));

      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.profilePhoto;
        return newErrors;
      });

      try {
        setIsUploadingProfilePhoto(true);
        const url = await uploadToS3(file);
        setFormData((prev) => ({ ...prev, profilePhoto: url }));
        validateField("profilePhoto", url);
      } catch (error) {
        console.error('Failed to upload profile photo:', error);
        setErrors((prev) => ({
          ...prev,
          profilePhoto: "Failed to upload image",
        }));
      } finally {
        setIsUploadingProfilePhoto(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          profilePhoto: "Only images are allowed",
        }));
        return;
      }

      // Optimistic UI: Show local preview immediately
      const objectUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, profilePhoto: objectUrl }));

      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.profilePhoto;
        return newErrors;
      });

      try {
        setIsUploadingProfilePhoto(true);
        const url = await uploadToS3(file);
        setFormData((prev) => ({ ...prev, profilePhoto: url }));
        validateField("profilePhoto", url);
      } catch (error) {
        console.error('Failed to upload profile photo:', error);
        setErrors((prev) => ({
          ...prev,
          profilePhoto: "Failed to upload image",
        }));
      } finally {
        setIsUploadingProfilePhoto(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "location") {
      setFormData((prev) => ({ ...prev, location: prev.location }));
      if (!value.trim()) {
        // Clear existing location errors when field is empty
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.location;
          return newErrors;
        });
      } else {
        // Show error only when user types but doesn't select from suggestions
        setErrors((prev) => ({
          ...prev,
          location: "Please select a location from the suggestions or use current location",
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      validateField(name, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.general;
      return newErrors;
    });

    // Check if there are existing validation errors
    const hasErrors = Object.keys(errors).some(key => key !== 'general' && errors[key]);
    if (hasErrors) {
      setErrors((prev) => ({
        ...prev,
        general: "Please fix all validation errors before submitting",
      }));
      return;
    }

    try {
      const validatedData = editProProfileSchema.parse({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        location: formData.location,
        profilePhoto: formData.profilePhoto,
        about: formData.about,
      });

      setIsSubmitting(true);
      const updateData: Partial<ProProfile> = {
        id: user!.id,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: formData.email,
        phoneNumber: validatedData.phoneNumber,
        location: validatedData.location,
        profilePhoto: validatedData.profilePhoto,
        about: validatedData.about,
      };
      const updatedPro = await updateProProfile(user!.id, updateData);
      dispatch(
        updateUser({
          ...user!,
          name: `${updatedPro.firstName} ${updatedPro.lastName}`,
          email: updatedPro.email,
          phoneNo: updatedPro.phoneNumber,
          address: updatedPro.location,
          photo: updatedPro.profilePhoto,
        })
      );
      onCancel();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = { ...errors };
        const locationErrors: string[] = [];

        error.errors.forEach((err) => {
          if (err.path[0] === "location") {
            if (!err.path[1]) {
              newErrors.location = "Please provide a valid location";
            } else if (err.path[1] === "address") {
              locationErrors.push("Please provide a valid address");
            } else if (err.path[1] === "city") {
              locationErrors.push("Please provide the city");
            } else if (err.path[1] === "state") {
              locationErrors.push("Please provide the state");
            } else {
              locationErrors.push(err.message);
            }
          } else {
            const field = err.path[0];
            newErrors[field] = err.message;
          }
        });

        if (locationErrors.length > 0) {
          newErrors.location = locationErrors.join(" and ");
        }

        setErrors(newErrors);
      } else {
        setErrors((prev) => ({
          ...prev,
          general: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update profile. Please try again.",
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto mb-[30px]">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Edit Pro Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">First Name</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-[#032B44] focus:ring-[#032B44]"
            placeholder="First Name"
          />
          {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-[#032B44] focus:ring-[#032B44]"
            placeholder="Last Name"
          />
          {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            disabled
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-gray-100 cursor-not-allowed"
            placeholder="Email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-[#032B44] focus:ring-[#032B44]"
            placeholder="Enter your phone number"
          />
          {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              name="location"
              onChange={handleInputChange}
              ref={locationInputRef}
              defaultValue={formData.location.address}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 h-10 focus:border-[#032B44] focus:ring-[#032B44]"
              placeholder="Enter your location"
            />
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="mt-1 p-2 h-10 w-10 bg-gray-200 rounded-md hover:bg-gray-300 flex items-center justify-center disabled:opacity-50"
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <svg
                  className="animate-spin h-5 w-5 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                </svg>
              ) : (
                <LocateFixed className="text-gray-500" />
              )}
            </button>
          </div>
          {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Profile Photo</label>
          <div
            className="border-2 border-dashed border-gray-300 p-6 text-center rounded-lg bg-white mt-2"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <h3 className="text-lg font-medium text-gray-700">Update Profile Photo</h3>
            {isUploadingProfilePhoto ? (
              <div className="flex justify-center items-center mt-2">
                <svg
                  className="animate-spin h-8 w-8 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                </svg>
              </div>
            ) : (
              <>
                <p className="text-gray-500">Drag an image here</p>
                <p className="text-gray-500">Or if you prefer...</p>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="profilePhotoInput"
                />
                <label
                  htmlFor="profilePhotoInput"
                  className="mt-2 inline-block px-4 py-2 bg-[#032B44] text-white rounded-md cursor-pointer hover:bg-[#054869]"
                >
                  Choose an image to upload
                </label>
              </>
            )}
          </div>
          <div className="mt-4">
            <img
              src={formData.profilePhoto || originalData?.profilePhoto || "/placeholder.svg?height=128&width=128"}
              alt="Profile Preview"
              className="w-24 h-24 object-cover rounded-md mx-auto"
            />
          </div>
          {errors.profilePhoto && <p className="text-red-500 text-sm mt-1 text-center">{errors.profilePhoto}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">About</label>
          <textarea
            name="about"
            value={formData.about || ""}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-[#032B44] focus:ring-[#032B44]"
            placeholder="Tell us about yourself"
            rows={4}
          />
          {errors.about && <p className="text-red-500 text-sm mt-1">{errors.about}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            type="submit"
            className="flex-1 bg-[#032B44] text-white py-3 px-6 rounded-md hover:bg-[#054869] transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                id: originalData?.id || "",
                firstName: originalData?.firstName || "",
                lastName: originalData?.lastName || "",
                email: originalData?.email || "",
                phoneNumber: originalData?.phoneNumber || "",
                location: originalData?.location || {
                  address: "",
                  city: "",
                  state: "",
                  coordinates: { type: "Point", coordinates: [0, 0] },
                },
                profilePhoto: originalData?.profilePhoto || "",
                about: originalData?.about || null,
              });
              onCancel();
            }}
            className="flex-1 bg-white border border-[#032B44] text-[#032B44] hover:bg-[#032B44] hover:text-white py-3 px-6 rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
        {errors.general && <p className="text-red-500 text-sm mt-4 text-center">{errors.general}</p>}
      </form>
    </div>
  );
};

export default EditProProfile;