"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { fixeifyProFormSchema } from "../fixeifyProFormSchema";
import { z } from "zod";
import { LocateFixed } from "lucide-react";

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
  country: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
}

const FixeifyProForm = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    serviceType: "Plumbing",
    customService: "",
    skills: [] as string[],
    customSkill: "",
    location: null as LocationData | null,
    profilePhoto: null as File | null,
    profilePhotoUrl: "",
    idProof: [] as File[],
    idProofUrls: [] as string[],
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    availability: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    },
    workingHours: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false); // New state for profile photo upload
  const [isUploadingIdProof, setIsUploadingIdProof] = useState(false); // New state for ID proof upload
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
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
            let country = "";
            place.address_components?.forEach((component: google.maps.GeocoderAddressComponent) => {
              if (component.types.includes("locality")) {
                city = component.long_name;
              }
              if (component.types.includes("administrative_area_level_1")) {
                state = component.long_name;
              }
              if (component.types.includes("country")) {
                country = component.long_name;
              }
            });

            const locationData: LocationData = {
              address,
              city: city || "",
              state: state || "",
              country: country || "",
              coordinates: {
                type: "Point",
                coordinates: [lng, lat],
              },
            };

            if (!city || !state || !country) {
              let errorMessage = "Please provide a location with city, state, and country.";
              if (country && (!city || !state)) {
                errorMessage = "Please include both city and state in your location.";
              } else if (!country) {
                errorMessage = "Please include the country in your location.";
              }
              setErrors((prev) => ({
                ...prev,
                location: errorMessage,
              }));
              setFormData((prev) => ({ ...prev, location: null }));
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
              location: "Please provide a valid location with city, state, and country.",
            }));
            setFormData((prev) => ({ ...prev, location: null }));
          }
        });
      }
    };

    if (currentStep === 3) {
      loadGoogleMapsScript();
    }

    return () => {
      const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      scripts.forEach((script) => script.remove());
    };
  }, [currentStep]);

  const getSkillsForService = () => {
    const skillMaps: Record<string, string[]> = {
      Plumbing: ["Faucet Installation", "Toilet Repair", "Sink Installation", "Shower Head Installation", "Water Heater Installation"],
      Electrical: ["Wiring Installation", "Circuit Repair", "Lighting Setup", "Panel Upgrade"],
      "Appliance Repair": ["Refrigerator Fix", "Washing Machine Repair", "Oven Servicing", "Dryer Maintenance"],
      Handyman: ["Furniture Assembly", "Wall Repair", "Painting", "General Maintenance"],
    };
    return skillMaps[formData.serviceType] || [];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "location") {
      setFormData((prev) => ({ ...prev, location: null }));
      if (!value.trim()) {
        setErrors((prev) => ({
          ...prev,
          location: "Please provide your location.",
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.location;
          return newErrors;
        });
      }
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name !== "location") {
      validateField(name, value);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      if (locationInputRef.current) {
        locationInputRef.current.value = "";
      }
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
                  setErrors((prev) => ({ ...prev, location: "Unable to fetch location coordinates." }));
                  return;
                }

                let city = "";
                let state = "";
                let country = "";
                place.address_components?.forEach((component: google.maps.GeocoderAddressComponent) => {
                  if (component.types.includes("locality")) {
                    city = component.long_name;
                  }
                  if (component.types.includes("administrative_area_level_1")) {
                    state = component.long_name;
                  }
                  if (component.types.includes("country")) {
                    country = component.long_name;
                  }
                });

                const locationData: LocationData = {
                  address,
                  city: city || "",
                  state: state || "",
                  country: country || "",
                  coordinates: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                  },
                };

                if (!city || !state || !country) {
                  let errorMessage = "Please provide a location with city, state, and country.";
                  if (country && (!city || !state)) {
                    errorMessage = "Please include both city and state in your location.";
                  } else if (!country) {
                    errorMessage = "Please include the country in your location.";
                  }
                  setErrors((prev) => ({
                    ...prev,
                    location: errorMessage,
                  }));
                  setFormData((prev) => ({ ...prev, location: null }));
                  return;
                }

                setFormData((prev) => ({ ...prev, location: locationData }));
                if (locationInputRef.current) {
                  locationInputRef.current.value = address;
                }
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.location;
                  return newErrors;
                });
                validateField("location", locationData);
              } else {
                setErrors((prev) => ({ ...prev, location: "Unable to fetch current location details." }));
              }
            }
          );
        },
        (error: GeolocationPositionError) => {
          setIsLoadingLocation(false);
          let errorMessage = "An unknown error occurred while fetching your location.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Geolocation permission denied. Please allow location access to use this feature.";
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
      setErrors((prev) => ({ ...prev, location: "Geolocation is not supported by this browser." }));
    }
  };

  const handleSkillToggle = (skill: string) => {
    const isPredefined = getSkillsForService().includes(skill);
    if (isPredefined) {
      setFormData((prev) => {
        const skills = prev.skills.includes(skill)
          ? prev.skills.filter((s) => s !== skill)
          : [...prev.skills, skill];
        return { ...prev, skills };
      });
    }
    validateField("skills", formData.skills);
  };

  const handleCustomSkillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, customSkill: value }));
    validateField("customSkill", value);
  };

  const handleAddCustomSkill = () => {
    if (formData.customSkill && !formData.skills.includes(formData.customSkill) && formData.customSkill.length >= 4) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, formData.customSkill],
        customSkill: "",
      }));
    }
    validateField("skills", formData.skills);
  };

  const handleRemoveCustomSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
    validateField("skills", formData.skills);
  };

  const uploadToS3 = async (file: File, folder: string): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const params = {
      Bucket: import.meta.env.VITE_S3_BUCKET_NAME as string,
      Key: `${folder}/${Date.now()}-${file.name}`,
      Body: uint8Array,
      ContentType: file.type,
    };
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return `https://${params.Bucket}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${params.Key}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: "profilePhoto" | "idProof") => {
    const files = e.target.files;
    if (files) {
      if (field === "profilePhoto" && files.length > 1) {
        setErrors((prev) => ({ ...prev, profilePhoto: "Only 1 profile photo is allowed" }));
        return;
      }
      const validFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (validFiles.length !== files.length) {
        setErrors((prev) => ({ ...prev, [field]: "Only images are allowed" }));
        return;
      }
      try {
        if (field === "profilePhoto") {
          setIsUploadingProfilePhoto(true); // Set loading state
          const url = await uploadToS3(validFiles[0], "profile-photos");
          setFormData((prev) => ({ ...prev, profilePhoto: validFiles[0], profilePhotoUrl: url }));
        } else {
          setIsUploadingIdProof(true); // Set loading state
          const urls = await Promise.all(validFiles.map((file) => uploadToS3(file, "id-proofs")));
          setFormData((prev) => ({
            ...prev,
            idProof: [...prev.idProof, ...validFiles],
            idProofUrls: [...prev.idProofUrls, ...urls],
          }));
        }
        validateField(field, field === "profilePhoto" ? validFiles[0] : validFiles);
      } catch (error) {
        setErrors((prev) => ({ ...prev, [field]: "Failed to upload image(s)" }));
      } finally {
        if (field === "profilePhoto") {
          setIsUploadingProfilePhoto(false); // Reset loading state
        } else {
          setIsUploadingIdProof(false); // Reset loading state
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, field: "profilePhoto" | "idProof") => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files) {
      if (field === "profilePhoto" && files.length > 1) {
        setErrors((prev) => ({ ...prev, profilePhoto: "Only 1 profile photo is allowed" }));
        return;
      }
      const validFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (validFiles.length !== files.length) {
        setErrors((prev) => ({ ...prev, [field]: "Only images are allowed" }));
        return;
      }
      try {
        if (field === "profilePhoto") {
          setIsUploadingProfilePhoto(true); // Set loading state
          const url = await uploadToS3(validFiles[0], "profile-photos");
          setFormData((prev) => ({ ...prev, profilePhoto: validFiles[0], profilePhotoUrl: url }));
        } else {
          setIsUploadingIdProof(true); // Set loading state
          const urls = await Promise.all(validFiles.map((file) => uploadToS3(file, "id-proofs")));
          setFormData((prev) => ({
            ...prev,
            idProof: [...prev.idProof, ...validFiles],
            idProofUrls: [...prev.idProofUrls, ...urls],
          }));
        }
        validateField(field, field === "profilePhoto" ? validFiles[0] : validFiles);
      } catch (error) {
        setErrors((prev) => ({ ...prev, [field]: "Failed to upload image(s)" }));
      } finally {
        if (field === "profilePhoto") {
          setIsUploadingProfilePhoto(false); // Reset loading state
        } else {
          setIsUploadingIdProof(false); // Reset loading state
        }
      }
    }
  };

  const handleRemoveFile = (field: "profilePhoto" | "idProof", fileToRemove: File | null) => {
    setFormData((prev) => {
      const newValue = field === "profilePhoto"
        ? { profilePhoto: null, profilePhotoUrl: "" }
        : { idProof: prev.idProof.filter((file) => file !== fileToRemove), idProofUrls: prev.idProofUrls.slice(0, -1) };
      validateField(field, field === "profilePhoto" ? null : newValue.idProof);
      return { ...prev, ...newValue };
    });
  };

  const handleAvailabilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      availability: { ...prev.availability, [name]: checked },
    }));
    validateField("availability", formData.availability);
  };

  const handleServiceChange = (service: string) => {
    setFormData((prev) => ({ ...prev, serviceType: service, customService: "", skills: [] }));
    validateField("serviceType", service);
  };

  const validateField = (name: string, value: any) => {
    try {
      const fieldSchema = fixeifyProFormSchema.shape[name as keyof typeof fixeifyProFormSchema.shape];
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

  const validateStep = (step: number) => {
    const stepFields: Record<number, string[]> = {
      1: ["firstName", "lastName", "email", "phoneNumber", "serviceType", "skills"],
      2: ["profilePhoto", "idProof", "accountHolderName", "accountNumber", "bankName"],
      3: ["location", "workingHours", "availability"],
    };
    let isValid = true;

    stepFields[step].forEach((field) => {
      const value = formData[field as keyof typeof formData];
      try {
        const fieldSchema = fixeifyProFormSchema.shape[field as keyof typeof fixeifyProFormSchema.shape];
        if (fieldSchema) {
          fieldSchema.parse(value);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          setErrors((prev) => ({ ...prev, [field]: error.errors[0].message }));
          isValid = false;
        }
      }
    });

    return isValid;
  };

  const handleSaveAndContinue = () => {
    for (let i = 1; i <= currentStep; i++) {
      if (!validateStep(i)) {
        setErrors((prev) => ({
          ...prev,
          general: i === currentStep ? `Please fill all required fields in Step ${i}` : `Please complete Step ${i} before proceeding`,
        }));
        return;
      }
    }
    setErrors({});
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleSaveAndSubmit = async () => {
    for (let i = 1; i <= 3; i++) {
      if (!validateStep(i)) {
        setErrors((prev) => ({ ...prev, general: `Please complete Step ${i} before submitting` }));
        return;
      }
    }
    setErrors({});
    try {
      const response = await api.post("/pro/apply", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        serviceType: formData.serviceType,
        customService: formData.customService,
        skills: formData.skills,
        location: formData.location,
        profilePhoto: formData.profilePhotoUrl,
        idProof: formData.idProofUrls,
        accountHolderName: formData.accountHolderName,
        accountNumber: formData.accountNumber,
        bankName: formData.bankName,
        availability: formData.availability,
        workingHours: formData.workingHours,
      });
      console.log("Application submitted:", response.data);
      navigate("/success");
    } catch (error) {
      console.error("Submission error:", error);
      setErrors({ general: "Failed to submit application" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900"
    >
      <Navbar />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between mb-8">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`flex-1 text-center py-2 ${
                  currentStep === step
                    ? "bg-[#032B44] text-white dark:!text-white"
                    : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                } rounded-md mx-1 hover:bg-[#054869] hover:text-white transition-colors`}
              >
                Step {step}
              </button>
            ))}
          </div>

          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Apply to become a provider</h1>

          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="First Name"
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Last Name"
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Email"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Phone Number"
                />
                {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  What type of service do you provide?
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["Plumbing", "Electrical", "Appliance Repair", "Handyman", "Other"].map((service) => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => handleServiceChange(service)}
                      className={`px-3 py-1 rounded-md ${
                        formData.serviceType === service
                          ? "bg-[#032B44] text-white dark:!text-white"
                          : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                      } hover:bg-[#054869] hover:text-white transition-colors`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
                {formData.serviceType === "Other" && (
                  <input
                    type="text"
                    name="customService"
                    value={formData.customService}
                    onChange={handleInputChange}
                    className="mt-2 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="Enter custom service"
                  />
                )}
                {errors.serviceType && <p className="text-red-500 text-sm mt-1">{errors.serviceType}</p>}
                {errors.customService && <p className="text-red-500 text-sm mt-1">{errors.customService}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select the skills you offer
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {getSkillsForService().map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleSkillToggle(skill)}
                      className={`px-3 py-1 rounded-md ${
                        formData.skills.includes(skill)
                          ? "bg-[#032B44] text-white dark:!text-white"
                          : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                      } hover:bg-[#054869] hover:text-white transition-colors`}
                    >
                      {skill}
                    </button>
                  ))}
                  {formData.skills
                    .filter((skill) => !getSkillsForService().includes(skill))
                    .map((skill) => (
                      <div key={skill} className="relative inline-flex items-center">
                        <button
                          type="button"
                          className="px-3 py-1 rounded-md bg-[#032B44] text-white dark:!text-white hover:bg-[#054869]"
                          disabled
                        >
                          {skill}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomSkill(skill)}
                          className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    name="customSkill"
                    value={formData.customSkill}
                    onChange={handleCustomSkillChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="Add custom skill"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSkill}
                    className="px-4 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500"
                  >
                    Add
                  </button>
                </div>
                {errors.skills && <p className="text-red-500 text-sm mt-1">{errors.skills}</p>}
                {errors.customSkill && <p className="text-red-500 text-sm mt-1">{errors.customSkill}</p>}
              </div>
              <div className="mt-6 mb-12">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAndContinue}
                    className="px-6 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500"
                  >
                    Save and Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Holder Name</label>
                <input
                  type="text"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Account Holder Name"
                />
                {errors.accountHolderName && <p className="text-red-500 text-sm mt-1">{errors.accountHolderName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Number</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Account Number"
                />
                {errors.accountNumber && <p className="text-red-500 text-sm mt-1">{errors.accountNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Bank Name"
                />
                {errors.bankName && <p className="text-red-500 text-sm mt-1">{errors.bankName}</p>}
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Upload a photo of yourself and your ID. Your profile photo should be a clear headshot and your ID should
                  be a government-issued ID.
                </p>
                <div className="space-y-4">
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 text-center rounded-lg bg-white dark:bg-gray-700"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, "profilePhoto")}
                  >
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Profile Photo</h3>
                    {isUploadingProfilePhoto ? (
                      <div className="flex justify-center items-center mt-2">
                        <svg
                          className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-300"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
                          />
                        </svg>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-500 dark:text-gray-400">Drag an image here</p>
                        <p className="text-gray-500 dark:text-gray-400">Or if you prefer...</p>
                        <input
                          type="file"
                          onChange={(e) => handleFileChange(e, "profilePhoto")}
                          className="hidden"
                          id="profilePhotoInput"
                        />
                        <label
                          htmlFor="profilePhotoInput"
                          className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600 dark:!text-white"
                        >
                          Choose an image to upload
                        </label>
                      </>
                    )}
                  </div>
                  {formData.profilePhoto && !isUploadingProfilePhoto && (
                    <div className="relative inline-flex items-center">
                      <img
                        src={URL.createObjectURL(formData.profilePhoto)}
                        alt="Profile Preview"
                        className="w-24 h-24 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile("profilePhoto", formData.profilePhoto)}
                        className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {errors.profilePhoto && <p className="text-red-500 text-sm mt-1">{errors.profilePhoto}</p>}

                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 text-center rounded-lg bg-white dark:bg-gray-700"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, "idProof")}
                  >
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">ID Proof</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      (e.g., Aadhaar, PAN Card Front, PAN Card Back)
                    </p>
                    {isUploadingIdProof ? (
                      <div className="flex justify-center items-center mt-2">
                        <svg
                          className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-300"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
                          />
                        </svg>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-500 dark:text-gray-400">Drag an image here</p>
                        <p className="text-gray-500 dark:text-gray-400">Or if you prefer...</p>
                        <input
                          type="file"
                          onChange={(e) => handleFileChange(e, "idProof")}
                          className="hidden"
                          id="idProofInput"
                          multiple
                        />
                        <label
                          htmlFor="idProofInput"
                          className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600 dark:!text-white"
                        >
                          Choose an image to upload
                        </label>
                      </>
                    )}
                  </div>
                  {formData.idProof.length > 0 && !isUploadingIdProof && (
                    <div className="flex flex-wrap gap-2">
                      {formData.idProof.map((file, index) => (
                        <div key={index} className="relative inline-flex items-center">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`ID Proof ${index + 1} Preview`}
                            className="w-24 h-24 object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFile("idProof", file)}
                            className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.idProof && <p className="text-red-500 text-sm mt-1">{errors.idProof}</p>}
                </div>
              </div>
              <div className="mt-6 mb-12">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAndContinue}
                    className="px-6 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500"
                  >
                    Save and Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-2xl font-bold text-gray-900 dark:text-gray-100">Your Location</label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Set your location to help us find people near you
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    name="location"
                    onChange={handleInputChange}
                    ref={locationInputRef}
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
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
                        />
                      </svg>
                    ) : (
                      <LocateFixed className="text-gray-500 dark:text-gray-300" />
                    )}
                  </button>
                </div>
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  When are you available?
                </label>
                <div className="mt-2 space-y-2">
                  {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                    <div key={day} className="flex items-center">
                      <input
                        type="checkbox"
                        name={day}
                        checked={formData.availability[day as keyof typeof formData.availability]}
                        onChange={handleAvailabilityChange}
                        className="h-4 w-4 text-[#032B44] focus:ring-[#032B44] dark:bg-gray-700 dark:border-gray-600"
                      />
                      <label className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">{day}</label>
                    </div>
                  ))}
                </div>
                {errors.availability && <p className="text-red-500 text-sm mt-1">{errors.availability}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Working Hours</label>
                <input
                  type="text"
                  name="workingHours"
                  value={formData.workingHours}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="e.g., 9 AM - 5 PM"
                />
                {errors.workingHours && <p className="text-red-500 text-sm mt-1">{errors.workingHours}</p>}
              </div>
              <div className="mt-6 mb-12">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAndSubmit}
                    className="px-6 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500"
                  >
                    Save and Submit
                  </button>
                </div>
              </div>
            </div>
          )}
          {errors.general && <p className="text-red-500 text-sm mt-1">{errors.general}</p>}
        </div>
      </div>
      <Footer />
    </motion.div>
  );
};

export default FixeifyProForm;