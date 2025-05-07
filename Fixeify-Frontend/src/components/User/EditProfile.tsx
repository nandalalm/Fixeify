"use client";

import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState, AppDispatch } from "../../store/store";
import { updateUserProfile, getUserProfile } from "../../api/userApi";
import { UserProfile } from "../../interfaces/userInterface";
import { updateUser } from "../../store/authSlice";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { LocateFixed } from "lucide-react";
import { z } from "zod";
import { editProfileSchema } from "../../Validation/editProfileSchema";

const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

interface LocationData {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number]; 
  };
}

interface EditProfileFormData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNo: string | null;
  address: LocationData | null;
  photo: string | null;
}

interface EditProfileProps {
  onCancel: () => void;
}

const EditProfile = ({ onCancel }: EditProfileProps) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [formData, setFormData] = useState<EditProfileFormData>({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneNo: "",
    address: null,
    photo: null,
  });
  const [originalData, setOriginalData] = useState<UserProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        try {
          const fetchedUser = await getUserProfile(user.id);
          const nameParts = fetchedUser.name.trim().split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          const address: LocationData | null = fetchedUser.address
            ? {
                address: fetchedUser.address.address,
                city: fetchedUser.address.city,
                state: fetchedUser.address.state,
                coordinates: fetchedUser.address.coordinates,
              }
            : null;
          setFormData({
            id: user.id,
            firstName,
            lastName,
            email: fetchedUser.email, 
            phoneNo: fetchedUser.phoneNo || "",
            address,
            photo: fetchedUser.photo || null,
          });
          setOriginalData({ ...fetchedUser, id: user.id });
        } catch (error) {
          navigate("/login");
        }
      }
    };
    fetchUserProfile();
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
              city,
              state,
              coordinates: { type: "Point", coordinates: [lng, lat] },
            };

            if (!city || !state) {
              const errorMessage = "Please include both city and state in your location.";
              setErrors((prev) => ({
                ...prev,
                address: errorMessage,
              }));
              setFormData((prev) => ({ ...prev, address: null }));
              validateField("address", null);
              return;
            }

            setFormData((prev) => ({ ...prev, address: locationData }));
            setErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors.address;
              return newErrors;
            });
            validateField("address", locationData);
          } else {
            setErrors((prev) => ({
              ...prev,
              address: "Please provide a valid location with city and state.",
            }));
            setFormData((prev) => ({ ...prev, address: null }));
            validateField("address", null);
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

  const validateField = (name: string, value: any) => {
    try {
      const fieldSchema = editProfileSchema.shape[name as keyof typeof editProfileSchema.shape];
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
                  setErrors((prev) => ({ ...prev, address: "Unable to fetch location coordinates." }));
                  validateField("address", null);
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
                  city,
                  state,
                  coordinates: { type: "Point", coordinates: [longitude, latitude] },
                };

                if (!city || !state) {
                  const errorMessage = "Please include both city and state in your location.";
                  setErrors((prev) => ({
                    ...prev,
                    address: errorMessage,
                  }));
                  setFormData((prev) => ({ ...prev, address: null }));
                  validateField("address", null);
                  return;
                }

                setFormData((prev) => ({ ...prev, address: locationData }));
                if (locationInputRef.current) locationInputRef.current.value = address;
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.address;
                  return newErrors;
                });
                validateField("address", locationData);
              } else {
                setErrors((prev) => ({ ...prev, address: "Unable to fetch current location details." }));
                validateField("address", null);
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
          setErrors((prev) => ({ ...prev, address: errorMessage }));
          validateField("address", null);
        }
      );
    } else {
      setIsLoadingLocation(false);
      setErrors((prev) => ({ ...prev, address: "Geolocation is not supported by this browser." }));
      validateField("address", null);
    }
  };

  const uploadToS3 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const params = {
      Bucket: import.meta.env.VITE_S3_BUCKET_NAME as string,
      Key: `profile-photos/${Date.now()}-${file.name}`,
      Body: uint8Array,
      ContentType: file.type,
    };
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return `https://${params.Bucket}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${params.Key}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, photo: "Only images are allowed" }));
        validateField("photo", null);
        return;
      }
      try {
        setIsUploadingProfilePhoto(true);
        const url = await uploadToS3(file);
        setFormData((prev) => ({ ...prev, photo: url }));
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.photo;
          return newErrors;
        });
        validateField("photo", url);
      } catch (error) {
        setErrors((prev) => ({ ...prev, photo: "Failed to upload image" }));
        validateField("photo", null);
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
        setErrors((prev) => ({ ...prev, photo: "Only images are allowed" }));
        validateField("photo", null);
        return;
      }
      try {
        setIsUploadingProfilePhoto(true);
        const url = await uploadToS3(file);
        setFormData((prev) => ({ ...prev, photo: url }));
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.photo;
          return newErrors;
        });
        validateField("photo", url);
      } catch (error) {
        setErrors((prev) => ({ ...prev, photo: "Failed to upload image" }));
        validateField("photo", null);
      } finally {
        setIsUploadingProfilePhoto(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "location") {
      setFormData((prev) => ({ ...prev, address: null }));
      if (!value.trim()) {
        setErrors((prev) => ({
          ...prev,
          address: "Please provide your location.",
        }));
        validateField("address", null);
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.address;
          return newErrors;
        });
      }
      setFormData((prev) => ({ ...prev, address: null }));
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

    try {
      const validatedData = editProfileSchema.parse({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNo: formData.phoneNo,
        address: formData.address,
        photo: formData.photo,
      });

      setIsSubmitting(true);
      const lastName = validatedData.lastName || "";
      const newName = `${validatedData.firstName.trim()} ${lastName.trim()}`.trim() || originalData?.name || "";
      const updatedData: Partial<UserProfile> = {
        id: user!.id,
        name: newName,
        email: formData.email, // Include email but it won't be changed in backend
        phoneNo: validatedData.phoneNo,
        address: validatedData.address,
        photo: validatedData.photo,
      };
      const updatedUser = await updateUserProfile(user!.id, updatedData);
      dispatch(
        updateUser({
          ...user!,
          name: updatedUser.name,
          email: updatedUser.email,
          phoneNo: updatedUser.phoneNo,
          address: updatedUser.address,
          photo: updatedUser.photo,
        })
      );
      onCancel();
      sessionStorage.setItem("isEditing", "false");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = { ...errors };
        const addressErrors: string[] = [];

        error.errors.forEach((err) => {
          if (err.path[0] === "address") {
            if (!err.path[1]) {
              newErrors.address = "Please provide a valid location";
            } else if (err.path[1] === "address") {
              addressErrors.push("Please provide a valid address");
            } else if (err.path[1] === "city") {
              addressErrors.push("Please provide the city");
            } else if (err.path[1] === "state") {
              addressErrors.push("Please provide the state");
            } else {
              addressErrors.push(err.message);
            }
          } else {
            const field = err.path[0];
            newErrors[field] = err.message;
          }
        });

        if (addressErrors.length > 0) {
          newErrors.address = addressErrors.join(" and ");
        }

        setErrors(newErrors);
      } else {
        setErrors((prev) => ({
          ...prev,
          general: error.response?.data?.message || "Failed to update profile. Please try again.",
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col mb-[50px] bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 p-6 md:p-10">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center dark:text-gray-200">Edit Profile</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="First Name"
              />
              {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="Last Name"
              />
              {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
              <input
                type="tel"
                name="phoneNo"
                value={formData.phoneNo || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="Update your phone number"
              />
              {errors.phoneNo && <p className="text-red-500 text-sm mt-1">{errors.phoneNo}</p>}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  name="location"
                  onChange={handleInputChange}
                  ref={locationInputRef}
                  defaultValue={formData.address?.address || ""}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 h-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Enter your location"
                />
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="mt-1 p-2 h-10 w-10 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 flex items-center justify-center"
                  disabled={isLoadingLocation}
                >
                  {isLoadingLocation ? (
                    <svg
                      className="animate-spin h-5 w-5 text-gray-500 dark:text-gray-300"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                    </svg>
                  ) : (
                    <LocateFixed className="text-gray-500 dark:text-gray-300" />
                  )}
                </button>
              </div>
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
            </div>

            {/* Profile Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Photo</label>
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 text-center rounded-lg bg-white dark:bg-gray-700 mt-2"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Update Profile Photo</h3>
                {isUploadingProfilePhoto ? (
                  <div className="flex justify-center items-center mt-2">
                    <svg
                      className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-300"
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
                    <p className="text-gray-500 dark:text-gray-400">Drag an image here</p>
                    <p className="text-gray-500 dark:text-gray-400">Or if you prefer...</p>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      id="profilePhotoInput"
                    />
                    <label
                      htmlFor="profilePhotoInput"
                      className="mt-2 inline-block px-4 py-2 bg-[#032B44] text-white rounded-md cursor-pointer hover:bg-[#054869] dark:!text-white"
                    >
                      Choose an image to upload
                    </label>
                  </>
                )}
              </div>
              <div className="mt-4">
                <img
                  src={formData.photo || originalData?.photo || "/placeholder.svg?height=128&width=128"}
                  alt="Profile Preview"
                  className="w-24 h-24 object-cover rounded-md"
                />
              </div>
              {errors.photo && <p className="text-red-500 text-sm mt-1">{errors.photo}</p>}
            </div>

            {/* Submit and Cancel Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button
                type="submit"
                className="flex-1 bg-[#032B44] text-white py-3 px-6 rounded-md hover:bg-[#054869] transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onCancel();
                  setFormData({
                    id: originalData?.id || "",
                    firstName: originalData?.name.split(" ")[0] || "",
                    lastName: originalData?.name.split(" ").slice(1).join(" ") || "",
                    email: originalData?.email || "",
                    phoneNo: originalData?.phoneNo || "",
                    address: originalData?.address
                      ? {
                          address: originalData.address.address,
                          city: originalData.address.city,
                          state: originalData.address.state,
                          coordinates: originalData.address.coordinates,
                        }
                      : null,
                    photo: originalData?.photo || null,
                  });
                  sessionStorage.setItem("isEditing", "false");
                }}
                className="flex-1 bg-white dark:bg-gray-800 border border-[#032B44] text-[#032B44] hover:bg-[#032B44] hover:text-white py-3 px-6 rounded-md dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
            {errors.general && <p className="text-red-500 text-sm mt-4">{errors.general}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;