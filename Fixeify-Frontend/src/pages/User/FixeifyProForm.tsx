"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import api from "../../api/axios";
import Navbar from "../../components/User/Navbar";
import Footer from "../../components/User/Footer";
import { fixeifyProFormSchema } from "../../Validation/fixeifyProFormSchema";
import { z } from "zod";
import { LocateFixed, Trash2 } from "lucide-react";
import { Availability, Category, LocationData } from "../../interfaces/fixeifyFormInterface";
import { getPendingProById } from "../../api/proApi";
import { PendingProResponse } from "../../interfaces/fixeifyFormInterface";
import { AxiosError } from 'axios';

const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

const convertTo12Hour = (time: string): { time: string; period: "AM" | "PM" } => {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const adjustedHour = hour % 12 || 12;
  return { time: `${adjustedHour}:${minute.toString().padStart(2, "0")}`, period };
};

const FixeifyProForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    categoryId: "",
    customService: "",
    location: null as LocationData | null,
    profilePhoto: null as File | null,
    profilePhotoUrl: "",
    idProof: [] as File[],
    idProofUrls: [] as string[],
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    availability: {} as Availability,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [isUploadingIdProof, setIsUploadingIdProof] = useState(false);
  const [activeDays, setActiveDays] = useState<{ [key in keyof Availability]: boolean }>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });
  const [newTimeSlot, setNewTimeSlot] = useState<{
    [key: string]: { startTime: string; endTime: string };
  }>({});
  const [isLoadingPendingPro, setIsLoadingPendingPro] = useState(false);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  const validateField = useCallback((name: string, value: unknown) => {
    try {
      const fieldSchema = fixeifyProFormSchema.shape[name as keyof typeof fixeifyProFormSchema.shape];
      if (fieldSchema) {
        if (name === "profilePhoto") {
          // Validate File or URL
          if (value instanceof File) {
            fieldSchema.parse(value);
          } else if (formData.profilePhotoUrl) {
            fieldSchema.parse(formData.profilePhotoUrl);
          } else {
            throw new z.ZodError([{ code: "custom", message: "Profile photo is required", path: [] }]);
          }
        } else if (name === "idProof") {
          // Validate File array or URL array
          if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
            fieldSchema.parse(value);
          } else if (formData.idProofUrls.length > 0) {
            fieldSchema.parse(formData.idProofUrls);
          } else {
            throw new z.ZodError([{ code: "custom", message: "At least one ID proof image is required", path: [] }]);
          }
        } else if (name === "location") {
          // Validate location object
          if (value === null || value === undefined) {
            throw new z.ZodError([{ code: "custom", message: "Please provide your location", path: [] }]);
          } else {
            fieldSchema.parse(value);
          }
        } else {
          fieldSchema.parse(value);
        }
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
  }, [formData.profilePhotoUrl, formData.idProofUrls]);

  // Fetch pending pro data if pendingProId is present
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const pendingProId = queryParams.get("pendingProId");
    if (pendingProId) {
      setIsLoadingPendingPro(true);
      getPendingProById(pendingProId)
        .then((pendingPro: PendingProResponse) => {
          const newFormData = {
            firstName: pendingPro.firstName || "",
            lastName: pendingPro.lastName || "",
            email: pendingPro.email || "",
            phoneNumber: pendingPro.phoneNumber || "",
            categoryId: pendingPro.category?.id || "",
            customService: pendingPro.customService || "",
            location: pendingPro.location || null,
            profilePhoto: null as File | null,
            profilePhotoUrl: pendingPro.profilePhoto || "",
            idProof: [] as File[],
            idProofUrls: pendingPro.idProof || [],
            accountHolderName: pendingPro.accountHolderName || "",
            accountNumber: pendingPro.accountNumber || "",
            bankName: pendingPro.bankName || "",
            availability: pendingPro.availability || {},
          };
          setFormData(newFormData);
          const newActiveDays = {
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false,
            sunday: false,
          };
          Object.keys(pendingPro.availability || {}).forEach((day) => {
            if (pendingPro.availability[day as keyof Availability]?.length) {
              newActiveDays[day as keyof Availability] = true;
            }
          });
          setActiveDays(newActiveDays);
          if (locationInputRef.current && pendingPro.location) {
            locationInputRef.current.value = `${pendingPro.location.address}, ${pendingPro.location.city}, ${pendingPro.location.state}, ${pendingPro.location.country}`;
          }
          // Do not validate immediately to avoid premature error display
        })
        .catch((error) => {
          console.error("Failed to fetch pending pro data:", error);
          setErrors((prev) => ({ ...prev, general: "Failed to load previous application data. The application may have already been processed." }));
        })
        .finally(() => {
          setIsLoadingPendingPro(false);
        });
    }
  }, [location.search]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/pro/fetchCategories");
        setCategories(response.data);
        // Only set default category if no pending pro data is being loaded
        if (response.data.length > 0 && !formData.categoryId && !isLoadingPendingPro) {
          setFormData((prev) => ({ ...prev, categoryId: response.data[0].id }));
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        setErrors((prev) => ({ ...prev, general: "Failed to load service types" }));
      }
    };

    fetchCategories();
  }, [formData.categoryId, isLoadingPendingPro]);

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
              if (component.types.includes("locality")) city = component.long_name;
              if (component.types.includes("administrative_area_level_1")) state = component.long_name;
              if (component.types.includes("country")) country = component.long_name;
            });

            const locationData: LocationData = {
              address,
              city: city || "",
              state: state || "",
              country: country || "",
              coordinates: { type: "Point", coordinates: [lng, lat] },
            };

            if (!city || !state || !country) {
              let errorMessage = "Please provide a location with city, state, and country.";
              if (country && (!city || !state)) errorMessage = "Please include both city and state in your location.";
              else if (!country) errorMessage = "Please include the country in your location.";
              setErrors((prev) => ({ ...prev, location: errorMessage }));
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

    if (currentStep === 3) loadGoogleMapsScript();

    return () => {
      const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      scripts.forEach((script) => script.remove());
    };
  }, [currentStep, validateField]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "location") {
      setFormData((prev) => ({ ...prev, location: null }));
      if (!value.trim()) {
        // Clear existing location errors when field is empty
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.location;
          return newErrors;
        });
      } else {
        // Show error only when user types but doesn't select from suggestions
        setErrors((prev) => ({ ...prev, location: "Please select a location from the suggestions or use current location" }));
      }
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name !== "location") validateField(name, value);
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
                  setErrors((prev) => ({ ...prev, location: "Unable to fetch location coordinates." }));
                  return;
                }

                let city = "";
                let state = "";
                let country = "";
                place.address_components?.forEach((component: google.maps.GeocoderAddressComponent) => {
                  if (component.types.includes("locality")) city = component.long_name;
                  if (component.types.includes("administrative_area_level_1")) state = component.long_name;
                  if (component.types.includes("country")) country = component.long_name;
                });

                const locationData: LocationData = {
                  address,
                  city: city || "",
                  state: state || "",
                  country: country || "",
                  coordinates: { type: "Point", coordinates: [lng, lat] },
                };

                if (!city || !state || !country) {
                  let errorMessage = "Please provide a location with city, state, and country.";
                  if (country && (!city || !state)) errorMessage = "Please include both city and state in your location.";
                  else if (!country) errorMessage = "Please include the country in your location.";
                  setErrors((prev) => ({ ...prev, location: errorMessage }));
                  setFormData((prev) => ({ ...prev, location: null }));
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
          setIsUploadingProfilePhoto(true);
          const url = await uploadToS3(validFiles[0], "profile-photos");
          setFormData((prev) => ({ ...prev, profilePhoto: validFiles[0], profilePhotoUrl: url }));
          validateField("profilePhoto", validFiles[0]);
        } else {
          setIsUploadingIdProof(true);
          const urls = await Promise.all(validFiles.map((file) => uploadToS3(file, "id-proofs")));
          setFormData((prev) => ({
            ...prev,
            idProof: [...prev.idProof, ...validFiles], // Keep Files for preview
            idProofUrls: [...prev.idProofUrls, ...urls], // Keep URLs for API
          }));
          validateField("idProof", [...formData.idProof, ...validFiles]);
        }
      } catch {
        setErrors((prev) => ({ ...prev, [field]: "Failed to upload image(s)" }));
      } finally {
        if (field === "profilePhoto") setIsUploadingProfilePhoto(false);
        else setIsUploadingIdProof(false);
      }
    }
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
          setIsUploadingProfilePhoto(true);
          const url = await uploadToS3(validFiles[0], "profile-photos");
          setFormData((prev) => ({ ...prev, profilePhoto: validFiles[0], profilePhotoUrl: url }));
          validateField("profilePhoto", validFiles[0]);
        } else {
          setIsUploadingIdProof(true);
          const urls = await Promise.all(validFiles.map((file) => uploadToS3(file, "id-proofs")));
          setFormData((prev) => ({
            ...prev,
            idProof: [...prev.idProof, ...validFiles], // Keep Files for preview
            idProofUrls: [...prev.idProofUrls, ...urls], // Keep URLs for API
          }));
          validateField("idProof", [...formData.idProof, ...validFiles]);
        }
      } catch {
        setErrors((prev) => ({ ...prev, [field]: "Failed to upload image(s)" }));
      } finally {
        if (field === "profilePhoto") setIsUploadingProfilePhoto(false);
        else setIsUploadingIdProof(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };


  const handleRemoveFile = (field: "profilePhoto" | "idProof", fileToRemove: File | null, index?: number) => {
    setFormData((prev) => {
      if (field === "profilePhoto") {
        return { ...prev, profilePhoto: null, profilePhotoUrl: "" };
      } else {
        const newIdProof = prev.idProof.filter((file) => file !== fileToRemove);
        const newIdProofUrls = index !== undefined ? prev.idProofUrls.filter((_, i) => i !== index) : prev.idProofUrls;
        return { ...prev, idProof: newIdProof, idProofUrls: newIdProofUrls };
      }
    });
    validateField(field, field === "profilePhoto" ? null : formData.idProof);
  };

  const handleAvailabilityToggle = (day: keyof Availability) => {
    setActiveDays((prev) => {
      const newActiveDays = { ...prev, [day]: !prev[day] };
      if (!newActiveDays[day]) {
        setFormData((prevFormData) => {
          const updatedAvailability = { ...prevFormData.availability };
          delete updatedAvailability[day];
          return { ...prevFormData, availability: updatedAvailability };
        });
      }
      return newActiveDays;
    });

    setNewTimeSlot((prev) => ({
      ...prev,
      [day]: { startTime: "01:00", endTime: "01:00" },
    }));
    validateField("availability", formData.availability);
  };

  const handleTimeSlotChange = (
    day: keyof Availability,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setNewTimeSlot((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const addTimeSlot = (day: keyof Availability) => {
    const slot = newTimeSlot[day];
    if (!slot || !slot.startTime || !slot.endTime) {
      setErrors((prev) => ({ ...prev, [`${day}_timeSlot`]: "Please select both start and end times" }));
      return;
    }

    const startTime24 = slot.startTime;
    const endTime24 = slot.endTime;

    const startMinutes = parseInt(startTime24.split(":")[0]) * 60 + parseInt(startTime24.split(":")[1]);
    const endMinutes = parseInt(endTime24.split(":")[0]) * 60 + parseInt(endTime24.split(":")[1]);
    if (endMinutes <= startMinutes) {
      setErrors((prev) => ({ ...prev, [`${day}_timeSlot`]: "End time must be after start time" }));
      return;
    }

    const existingSlots = formData.availability[day] || [];
    const hasOverlap = existingSlots.some((existing) => {
      const existingStart = parseInt(existing.startTime.split(":")[0]) * 60 + parseInt(existing.startTime.split(":")[1]);
      const existingEnd = parseInt(existing.endTime.split(":")[0]) * 60 + parseInt(existing.endTime.split(":")[1]);
      return (
        (startMinutes >= existingStart && startMinutes < existingEnd) ||
        (endMinutes > existingStart && endMinutes <= existingEnd) ||
        (startMinutes <= existingStart && endMinutes >= existingEnd)
      );
    });

    if (hasOverlap) {
      setErrors((prev) => ({ ...prev, [`${day}_timeSlot`]: "Time slot overlaps with an existing slot" }));
      return;
    }

    setFormData((prev) => {
      const updatedSlots = [...(prev.availability[day] || []), { startTime: startTime24, endTime: endTime24 }].sort(
        (a, b) => {
          const aStart = parseInt(a.startTime.split(":")[0]) * 60 + parseInt(a.startTime.split(":")[1]);
          const bStart = parseInt(b.startTime.split(":")[0]) * 60 + parseInt(b.startTime.split(":")[1]);
          return aStart - bStart;
        }
      );
      const updatedAvailability = {
        ...prev.availability,
        [day]: updatedSlots,
      };
      
      // Validate with the updated availability data
      setTimeout(() => validateField("availability", updatedAvailability), 0);
      
      return {
        ...prev,
        availability: updatedAvailability,
      };
    });

    setNewTimeSlot((prev) => ({
      ...prev,
      [day]: { startTime: "01:00", endTime: "01:00" },
    }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${day}_timeSlot`];
      return newErrors;
    });
  };

  const removeTimeSlot = (day: keyof Availability, index: number) => {
    setFormData((prev) => {
      const updatedSlots = (prev.availability[day] || []).filter((_, i) => i !== index);
      const updatedAvailability = {
        ...prev.availability,
        [day]: updatedSlots.length > 0 ? updatedSlots : undefined,
      };
      if (!updatedAvailability[day]?.length) delete updatedAvailability[day];
      
      // Validate with the updated availability data
      setTimeout(() => validateField("availability", updatedAvailability), 0);
      
      return { ...prev, availability: updatedAvailability };
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormData((prev) => ({ ...prev, categoryId, customService: "" }));
    validateField("categoryId", categoryId);
  };


  const validateStep = (step: number) => {
    const stepFields: Record<number, string[]> = {
      1: ["firstName", "lastName", "email", "phoneNumber", "categoryId"],
      2: ["profilePhoto", "idProof", "accountHolderName", "accountNumber", "bankName"],
      3: ["location", "availability"],
    };
    let isValid = true;

    stepFields[step].forEach((field) => {
      let value = formData[field as keyof typeof formData];
      if (field === "profilePhoto") {
        value = formData.profilePhoto || formData.profilePhotoUrl;
      } else if (field === "idProof") {
        value = formData.idProof.length > 0 ? formData.idProof : formData.idProofUrls;
      }
      try {
        const fieldSchema = fixeifyProFormSchema.shape[field as keyof typeof fixeifyProFormSchema.shape];
        if (fieldSchema) {
          if (field === "location") {
            // Use custom location validation logic
            if (value === null || value === undefined || value === "") {
              throw new z.ZodError([{ code: "custom", message: "Please select a valid location", path: [] }]);
            } else {
              fieldSchema.parse(value);
            }
          } else {
            fieldSchema.parse(value);
          }
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
      await api.post("/pro/apply", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        categoryId: formData.categoryId,
        customService: "",
        location: formData.location,
        profilePhoto: formData.profilePhotoUrl,
        idProof: formData.idProofUrls,
        accountHolderName: formData.accountHolderName,
        accountNumber: formData.accountNumber,
        bankName: formData.bankName,
        availability: formData.availability,
      });
      navigate("/success");
    } catch (error) {
      console.error("Submission error:", error);
      if (error instanceof AxiosError && error.response?.data) {
        const errorMessage = error.response.data.message || "Failed to submit application";
        if (errorMessage === "Application already pending") {
          setErrors({ general: "Application with this email is already pending" });
        } else if (errorMessage === "Pro not found") {
          setErrors({ general: "Pro not found" });
        } else if (errorMessage === "Application already approved") {
          setErrors({ general: "Application with this email was already approved" });
        } else {
          setErrors({ general: "Failed to submit application" });
        }
      } else {
        setErrors({ general: "Failed to submit application" });
      }
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
          {isLoadingPendingPro ? (
            <div className="text-center">
              <svg
                className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-300 mx-auto"
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
              <p className="text-gray-600 dark:text-gray-400 mt-2">Loading previous application data...</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between mb-8">
                {[1, 2, 3].map((step) => (
                  <button
                    key={step}
                    onClick={() => setCurrentStep(step)}
                    className={`flex-1 text-center py-2 ${currentStep === step
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
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => handleCategoryChange(category.id)}
                          className={`px-3 py-1 rounded-md ${formData.categoryId === category.id
                            ? "bg-[#032B44] text-white dark:!text-white"
                            : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                            } hover:bg-[#054869] hover:text-white transition-colors`}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                    {errors.categoryId && <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>}
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
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
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
                      {formData.profilePhotoUrl && !formData.profilePhoto && !isUploadingProfilePhoto && (
                        <div className="relative inline-flex items-center">
                          <img
                            src={formData.profilePhotoUrl}
                            alt="Profile Preview"
                            className="w-24 h-24 object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFile("profilePhoto", null)}
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
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
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
                      {!isUploadingIdProof && (
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
                                onClick={() => handleRemoveFile("idProof", file, index)}
                                className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {location.search.includes("pendingProId") && formData.idProofUrls.length > 0 && formData.idProof.length === 0 && (
                            formData.idProofUrls.map((url, index) => (
                              <div key={index} className="relative inline-flex items-center">
                                <img
                                  src={url}
                                  alt={`Preselected ID Proof ${index + 1} Preview`}
                                  className="w-24 h-24 object-cover rounded-md"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile("idProof", null, index)}
                                  className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          )}
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                    <div className="relative">
                      <input
                        ref={locationInputRef}
                        type="text"
                        name="location"
                        onChange={handleInputChange}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Availability</label>
                    <div className="space-y-4 mt-2">
                      {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map((day) => (
                        <div key={day} className="border p-4 rounded-md bg-white dark:bg-gray-700">
                          <div className="flex items-center justify-between">
                            <label className="text-gray-700 dark:text-gray-300 capitalize">{day}</label>
                            <input
                              type="checkbox"
                              checked={activeDays[day]}
                              onChange={() => handleAvailabilityToggle(day)}
                              className="h-4 w-4 text-blue-600 dark:bg-gray-600 dark:border-gray-500"
                            />
                          </div>
                          {activeDays[day] && (
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center gap-2">
                                <select
                                  value={newTimeSlot[day]?.startTime || "01:00"}
                                  onChange={(e) => handleTimeSlotChange(day, "startTime", e.target.value)}
                                  className="rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                                >
                                  {Array.from({ length: 24 }, (_, i) =>
                                    `${i.toString().padStart(2, "0")}:00`
                                  ).map((time) => {
                                    const { time: displayTime, period } = convertTo12Hour(time);
                                    return (
                                      <option key={time} value={time}>
                                        {displayTime} {period}
                                      </option>
                                    );
                                  })}
                                </select>
                                <span>to</span>
                                <select
                                  value={newTimeSlot[day]?.endTime || "01:00"}
                                  onChange={(e) => handleTimeSlotChange(day, "endTime", e.target.value)}
                                  className="rounded-md border-gray-300 shadow-sm p-2 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                                >
                                  {Array.from({ length: 24 }, (_, i) =>
                                    `${i.toString().padStart(2, "0")}:00`
                                  ).map((time) => {
                                    const { time: displayTime, period } = convertTo12Hour(time);
                                    return (
                                      <option key={time} value={time}>
                                        {displayTime} {period}
                                      </option>
                                    );
                                  })}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => addTimeSlot(day)}
                                  className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 dark:!text-white"
                                >
                                  Add
                                </button>
                              </div>
                              {errors[`${day}_timeSlot`] && (
                                <p className="text-red-500 text-sm">{errors[`${day}_timeSlot`]}</p>
                              )}
                              {formData.availability[day]?.map((slot, index) => {
                                const { time: startDisplay, period: startPeriod } = convertTo12Hour(slot.startTime);
                                const { time: endDisplay, period: endPeriod } = convertTo12Hour(slot.endTime);
                                return (
                                  <div key={index} className="flex items-center justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {startDisplay} {startPeriod} - {endDisplay} {endPeriod}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeTimeSlot(day, index)}
                                      className="text-red-500 hover:text-red-600"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {errors.availability && <p className="text-red-500 text-sm mt-1">{errors.availability}</p>}
                  </div>
                  <div className="mt-6 mb-12">
                    <div className="flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                      >
                        Back
                      </button>
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
              {errors.general && (
                <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md">
                  {errors.general}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </motion.div>
  );
};

export default FixeifyProForm;