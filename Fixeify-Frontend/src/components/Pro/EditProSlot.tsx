import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { User } from "../../store/authSlice";
import { Trash2, ArrowLeft } from "lucide-react";
import { updateProAvailability } from "../../api/proApi";
import { TimeSlot, Availability } from "../../interfaces/proInterface";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal";

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type DayOfWeek = typeof daysOfWeek[number];

interface EditProSlotProps {
  onCancel: () => void;
  onSave: (availability: Availability, isUnavailable: boolean) => void;
  initialAvailability: Availability;
  initialIsUnavailable: boolean;
}

const EditProSlot = ({ onCancel, onSave, initialAvailability, initialIsUnavailable }: EditProSlotProps) => {
  const user = useSelector((state: RootState) => state.auth.user) as User | null;
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const [availability, setAvailability] = useState<Availability>(initialAvailability);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(initialIsUnavailable);
  const [activeDays, setActiveDays] = useState<{ [key in DayOfWeek]: boolean }>({
    monday: !!initialAvailability.monday?.length,
    tuesday: !!initialAvailability.tuesday?.length,
    wednesday: !!initialAvailability.wednesday?.length,
    thursday: !!initialAvailability.thursday?.length,
    friday: !!initialAvailability.friday?.length,
    saturday: !!initialAvailability.saturday?.length,
    sunday: !!initialAvailability.sunday?.length,
  });
  const [newTimeSlot, setNewTimeSlot] = useState<{
    [key in DayOfWeek]: { startTime: string; endTime: string };
  }>({
    monday: { startTime: "09:00", endTime: "10:00" },
    tuesday: { startTime: "09:00", endTime: "10:00" },
    wednesday: { startTime: "09:00", endTime: "10:00" },
    thursday: { startTime: "09:00", endTime: "10:00" },
    friday: { startTime: "09:00", endTime: "10:00" },
    saturday: { startTime: "09:00", endTime: "10:00" },
    sunday: { startTime: "09:00", endTime: "10:00" },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const initialSlots: { [key in DayOfWeek]: { startTime: string; endTime: string } } = {
      monday: { startTime: "09:00", endTime: "10:00" },
      tuesday: { startTime: "09:00", endTime: "10:00" },
      wednesday: { startTime: "09:00", endTime: "10:00" },
      thursday: { startTime: "09:00", endTime: "10:00" },
      friday: { startTime: "09:00", endTime: "10:00" },
      saturday: { startTime: "09:00", endTime: "10:00" },
      sunday: { startTime: "09:00", endTime: "10:00" },
    };
    setNewTimeSlot(initialSlots);
  }, []);

  const hasBookedSlots = () => {
    return Object.values(availability).some((slots: TimeSlot[] | undefined) =>
      slots?.some((slot: TimeSlot) => slot.booked)
    );
  };

  const hasBookedSlotsForDay = (day: DayOfWeek) => {
    return (availability[day] || []).some((slot: TimeSlot) => slot.booked);
  };

  const handleAvailabilityToggle = (day: DayOfWeek) => {
    if (!activeDays[day] && hasBookedSlotsForDay(day)) {
      setErrors((prev) => ({
        ...prev,
        [day]: "Cannot uncheck this day because it contains booked slots.",
      }));
      return;
    }

    setActiveDays((prev) => {
      const newActiveDays = { ...prev, [day]: !prev[day] };
      if (!newActiveDays[day]) {
        setAvailability((prevAvailability) => {
          const updatedAvailability = { ...prevAvailability };
          delete updatedAvailability[day];
          return updatedAvailability;
        });
      }
      return newActiveDays;
    });
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[day];
      return newErrors;
    });
  };

  const handleToggleAvailability = () => {
    if (!isUnavailable && hasBookedSlots()) {
      setErrors((prev) => ({
        ...prev,
        general: "Cannot mark as unavailable while there are booked slots.",
      }));
      return;
    }
    setIsUnavailable(!isUnavailable);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.general;
      return newErrors;
    });
  };

  const handleTimeSlotChange = (
    day: DayOfWeek,
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

  const addTimeSlot = (day: DayOfWeek) => {
    const slot = newTimeSlot[day];
    if (!slot || !slot.startTime || !slot.endTime) {
      setErrors((prev) => ({ ...prev, [`${day}_timeSlot`]: "Please select both start and end times." }));
      return;
    }

    const startMinutes = parseInt(slot.startTime.split(":")[0]) * 60 + parseInt(slot.startTime.split(":")[1]);
    const endMinutes = parseInt(slot.endTime.split(":")[0]) * 60 + parseInt(slot.endTime.split(":")[1]);
    if (endMinutes <= startMinutes) {
      setErrors((prev) => ({ ...prev, [`${day}_timeSlot`]: "End time must be after start time." }));
      return;
    }

    const existingSlots = availability[day] || [];
    const hasOverlap = existingSlots.some((existing: TimeSlot) => {
      const existingStart = parseInt(existing.startTime.split(":")[0]) * 60 + parseInt(existing.startTime.split(":")[1]);
      const existingEnd = parseInt(existing.endTime.split(":")[0]) * 60 + parseInt(existing.endTime.split(":")[1]);
      return (
        (startMinutes >= existingStart && startMinutes < existingEnd) ||
        (endMinutes > existingStart && endMinutes <= existingEnd) ||
        (startMinutes <= existingStart && endMinutes >= existingEnd)
      );
    });

    if (hasOverlap) {
      setErrors((prev) => ({ ...prev, [`${day}_timeSlot`]: "Time slot overlaps with an existing slot." }));
      return;
    }

    setAvailability((prev) => {
      const updatedSlots = [...(prev[day] || []), { startTime: slot.startTime, endTime: slot.endTime, booked: false }].sort(
        (a, b) => {
          const aStart = parseInt(a.startTime.split(":")[0]) * 60 + parseInt(a.startTime.split(":")[1]);
          const bStart = parseInt(b.startTime.split(":")[0]) * 60 + parseInt(b.startTime.split(":")[1]);
          return aStart - bStart;
        }
      );
      return {
        ...prev,
        [day]: updatedSlots,
      };
    });

    setNewTimeSlot((prev) => ({
      ...prev,
      [day]: { startTime: "09:00", endTime: "10:00" },
    }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${day}_timeSlot`];
      return newErrors;
    });
  };

  const removeTimeSlot = (day: DayOfWeek, index: number) => {
    if (availability[day]?.[index]?.booked) {
      setErrors((prev) => ({
        ...prev,
        [`${day}_timeSlot`]: "Cannot remove a booked slot.",
      }));
      return;
    }

    setAvailability((prev) => {
      const updatedSlots = (prev[day] || []).filter((_, i) => i !== index);
      const updatedAvailability = {
        ...prev,
        [day]: updatedSlots.length > 0 ? updatedSlots : undefined,
      };
      if (!updatedAvailability[day]?.length) delete updatedAvailability[day];
      return updatedAvailability;
    });
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${day}_timeSlot`];
      return newErrors;
    });
  };

  const convertTo12Hour = (time: string): { time: string; period: "AM" | "PM" } => {
    const [hour, minute] = time.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    const adjustedHour = hour % 12 || 12;
    return { time: `${adjustedHour}:${minute.toString().padStart(2, "0")}`, period };
  };

  const validateForm = (): boolean => {
    const isAnyDayActive = Object.values(activeDays).some((isActive) => isActive);
    if (!isAnyDayActive && !isUnavailable) {
      setErrors((prev) => ({ ...prev, general: "Please select at least one day or mark as unavailable." }));
      return false;
    }
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.general;
      return newErrors;
    });
    return true;
  };

  const handleSaveWithConfirmation = () => {
    if (!validateForm()) return;

    for (const day of daysOfWeek) {
      if (!activeDays[day] && hasBookedSlotsForDay(day)) {
        setErrors((prev) => ({
          ...prev,
          [day]: "Cannot uncheck this day because it contains booked slots.",
        }));
        return;
      }
    }

    if (isUnavailable && hasBookedSlots()) {
      setErrors((prev) => ({
        ...prev,
        general: "Cannot mark as unavailable while there are booked slots.",
      }));
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !accessToken) return;

    setIsSubmitting(true);
    try {
      const updatedData = await updateProAvailability(user.id, {
        availability,
        isUnavailable,
      });
      onSave(updatedData.availability, updatedData.isUnavailable);
    } catch (err: any) {
      console.error("Update availability error:", err);
      setErrors((prev) => ({
        ...prev,
        general: err.response?.data?.message || "Failed to update availability",
      }));
    } finally {
      setIsSubmitting(false);
      setIsConfirmModalOpen(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto mb-[50px] relative">
      <button
        onClick={onCancel}
        className="absolute top-0 left-0 border border-gray-300 text-gray-800 p-2 rounded-md hover:bg-gray-100 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Edit Slots</h1>
      {errors.general && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-center">
          {errors.general}
        </div>
      )}
      <div className="flex flex-col items-center">
        <div className="w-full max-w-md lg:max-w-2xl">
          <div className="space-y-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={handleToggleAvailability}
                className={`py-2 px-4 rounded-md text-white transition-colors ${
                  isUnavailable ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                } ${hasBookedSlots() && !isUnavailable ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={hasBookedSlots() && !isUnavailable}
              >
                {isUnavailable ? "Mark as Available" : "Mark as Unavailable"}
              </button>
            </div>
            {daysOfWeek.map((day: DayOfWeek) => (
              <div key={day} className={`space-y-2 ${isUnavailable ? "opacity-50 pointer-events-none" : ""}`}>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name={day}
                    checked={activeDays[day]}
                    onChange={() => handleAvailabilityToggle(day)}
                    className="h-4 w-4 text-[#032B44] focus:ring-[#032B44]"
                    disabled={isUnavailable || isSubmitting || hasBookedSlotsForDay(day)}
                  />
                  <label className={`ml-2 text-sm capitalize ${isUnavailable ? "text-gray-500" : "text-gray-700"}`}>
                    {day}
                  </label>
                </div>
                {errors[day] && (
                  <p className="text-red-500 text-sm ml-6">{errors[day]}</p>
                )}
                {activeDays[day] && !isUnavailable && (
                  <div className="ml-6 space-y-2">
                    {(availability[day] || []).map((slot: TimeSlot, index: number) => {
                      const start = convertTo12Hour(slot.startTime);
                      const end = convertTo12Hour(slot.endTime);
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <span className={`${slot.booked ? "text-blue-600" : "text-gray-700"}`}>
                            {start.time} {start.period} - {end.time} {end.period}
                            {slot.booked && " (Booked)"}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(day, index)}
                            className={`${
                              slot.booked || isSubmitting
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-gray-500 hover:text-red-500"
                            }`}
                            disabled={slot.booked || isSubmitting}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      );
                    })}
                    <div className="flex gap-4 items-center">
                      <div className="flex-1 max-w-[8rem]">
                        <div className="relative">
                          <input
                            type="time"
                            value={newTimeSlot[day]?.startTime || "09:00"}
                            onChange={(e) => handleTimeSlotChange(day, "startTime", e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full h-10"
                            disabled={isSubmitting}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg
                              className="w-4 h-4 text-gray-500"
                              aria-hidden="true"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                fillRule="evenodd"
                                d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 max-w-[8rem]">
                        <div className="relative">
                          <input
                            type="time"
                            value={newTimeSlot[day]?.endTime || "10:00"}
                            onChange={(e) => handleTimeSlotChange(day, "endTime", e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full h-10"
                            disabled={isSubmitting}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg
                              className="w-4 h-4 text-gray-500"
                              aria-hidden="true"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                fillRule="evenodd"
                                d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addTimeSlot(day)}
                        className="w-10 h-10 bg-[#032B44] text-white rounded-md hover:bg-[#054869] text-sm flex items-center justify-center"
                        disabled={isSubmitting}
                      >
                        Add
                      </button>
                    </div>
                    {errors[`${day}_timeSlot`] && (
                      <p className="text-red-500 text-sm">{errors[`${day}_timeSlot`]}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={onCancel}
              className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveWithConfirmation}
              disabled={isSubmitting || (isUnavailable && hasBookedSlots())}
              className={`bg-[#032B44] text-white py-2 px-4 rounded-md hover:bg-[#054869] transition-colors ${
                isSubmitting || (isUnavailable && hasBookedSlots()) ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
          <ConfirmationModal
            isOpen={isConfirmModalOpen}
            onConfirm={handleSave}
            onCancel={() => setIsConfirmModalOpen(false)}
            action="saveSlot"
            entityType="pro"
            customTitle="Confirm Slot Changes"
            customReason="Are you sure you want to save your slot changes?"
            isProcessing={isSubmitting}
            error={errors.general}
          />
        </div>
      </div>
    </div>
  );
};

export default EditProSlot;