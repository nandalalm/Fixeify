import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { Trash2, ArrowLeft } from "lucide-react";
import { updateProAvailability  } from "../../api/proApi";
import { TimeSlot, Availability } from "../../interfaces/proInterface";
import { ConfirmationModal } from "../../components/Admin/ConfirmationModal";

interface EditProSlotProps {
  onCancel: () => void;
  onSave: (availability: Availability, isUnavailable: boolean) => void;
  initialAvailability: Availability;
  initialIsUnavailable: boolean;
}

const EditProSlot = ({ onCancel, onSave, initialAvailability, initialIsUnavailable }: EditProSlotProps) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [availability, setAvailability] = useState<Availability>(initialAvailability);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(initialIsUnavailable);
  const [activeDays, setActiveDays] = useState<{ [key in keyof Availability]: boolean }>({
    monday: !!initialAvailability.monday?.length,
    tuesday: !!initialAvailability.tuesday?.length,
    wednesday: !!initialAvailability.wednesday?.length,
    thursday: !!initialAvailability.thursday?.length,
    friday: !!initialAvailability.friday?.length,
    saturday: !!initialAvailability.saturday?.length,
    sunday: !!initialAvailability.sunday?.length,
  });
  const [newTimeSlot, setNewTimeSlot] = useState<{
    [key: string]: { startTime: string; endTime: string };
  }>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    const initialSlots: { [key: string]: { startTime: string; endTime: string } } = {};
    Object.keys(activeDays).forEach((day) => {
      initialSlots[day] = { startTime: "01:00", endTime: "01:00" };
    });
    setNewTimeSlot(initialSlots);
  }, []);

  const handleAvailabilityToggle = (day: keyof Availability) => {
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
  };

  const handleToggleAvailability = () => {
    setIsUnavailable(!isUnavailable);
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

    const existingSlots = availability[day] || [];
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

    setAvailability((prev) => {
      const updatedSlots = [...(prev[day] || []), { startTime: startTime24, endTime: endTime24 }].sort(
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
      [day]: { startTime: "01:00", endTime: "01:00" },
    }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`${day}_timeSlot`];
      return newErrors;
    });
  };

  const removeTimeSlot = (day: keyof Availability, index: number) => {
    setAvailability((prev) => {
      const updatedSlots = (prev[day] || []).filter((_, i) => i !== index);
      const updatedAvailability = {
        ...prev,
        [day]: updatedSlots.length > 0 ? updatedSlots : undefined,
      };
      if (!updatedAvailability[day]?.length) delete updatedAvailability[day];
      return updatedAvailability;
    });
  };

  const convertTo12Hour = (time: string): { time: string; period: "AM" | "PM" } => {
    const [hour, minute] = time.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    const adjustedHour = hour % 12 || 12;
    return { time: `${adjustedHour}:${minute.toString().padStart(2, "0")}`, period };
  };

  const validateForm = (): boolean => {
    // Check if at least one day is selected
    const isAnyDayActive = Object.values(activeDays).some((isActive) => isActive);
    if (!isAnyDayActive) {
      setErrors((prev) => ({ ...prev, general: "Please select at least 1 day" }));
      return false;
    }
    // Clear the general error if validation passes
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.general;
      return newErrors;
    });
    return true;
  };

  const handleSave = async () => {
    if (!user) return;

    // Check if at least one day is selected
    const isAnyDayActive = Object.values(activeDays).some((isActive) => isActive);
    if (!isAnyDayActive) {
      setErrors((prev) => ({ ...prev, general: "Please select at least 1 day" }));
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedData = await updateProAvailability(user.id, { 
        availability,
        isUnavailable
      });
      setAvailability(updatedData.availability);
      setIsUnavailable(updatedData.isUnavailable);
      onSave(updatedData.availability, updatedData.isUnavailable);
    } catch (err: any) {
      console.error("Update availability error:", err.response?.data);
      setErrors((prev) => ({ ...prev, general: err.response?.data?.message || "Failed to update availability" }));
    } finally {
      setIsSubmitting(false);
      setIsConfirmModalOpen(false); // Close the modal after processing
    }
  };

  const handleSaveWithConfirmation = () => {
    // Perform validation before opening the confirmation modal
    if (validateForm()) {
      setIsConfirmModalOpen(true);
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
      <div className="flex flex-col items-center">
        <div className="w-full max-w-md lg:max-w-2xl">
          <div className="space-y-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={handleToggleAvailability}
                className={`py-2 px-4 rounded-md text-white transition-colors ${
                  isUnavailable ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isUnavailable ? 'Mark as Available' : 'Mark as Unavailable'}
              </button>
            </div>
            {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
              <div key={day} className={`space-y-2 ${isUnavailable ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name={day}
                    checked={activeDays[day as keyof Availability]}
                    onChange={() => handleAvailabilityToggle(day as keyof Availability)}
                    className="h-4 w-4 text-[#032B44] focus:ring-[#032B44]"
                    disabled={isUnavailable}
                  />
                  <label className={`ml-2 text-sm ${isUnavailable ? 'text-gray-500' : 'text-gray-700'} capitalize`}>
                    {day}
                  </label>
                </div>
                {((availability[day as keyof Availability] ?? []).length > 0) && (
                  <div className="ml-6 space-y-2">
                    {(availability[day as keyof Availability] || []).map((slot: TimeSlot, index: number) => {
                      const start = convertTo12Hour(slot.startTime);
                      const end = convertTo12Hour(slot.endTime);
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <span className={`${isUnavailable ? 'text-gray-500' : 'text-gray-700'}`}>
                            {start.time} {start.period} - {end.time} {end.period}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(day as keyof Availability, index)}
                            className={`${isUnavailable ? 'text-gray-400' : 'text-gray-500 hover:text-red-500'}`}
                            disabled={isUnavailable}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {activeDays[day as keyof Availability] && !isUnavailable && (
                  <div className="flex gap-4 items-center">
                    <div className="flex-1 max-w-[8rem]">
                      <div className="relative">
                        <input
                          type="time"
                          value={newTimeSlot[day]?.startTime || "01:00"}
                          onChange={(e) => handleTimeSlotChange(day as keyof Availability, "startTime", e.target.value)}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full h-10"
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
                          value={newTimeSlot[day]?.endTime || "01:00"}
                          onChange={(e) => handleTimeSlotChange(day as keyof Availability, "endTime", e.target.value)}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full h-10"
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
                      onClick={() => addTimeSlot(day as keyof Availability)}
                      className="w-10 h-10 bg-[#032B44] text-white rounded-md hover:bg-[#054869] text-sm flex items-center justify-center"
                    >
                      Add
                    </button>
                  </div>
                )}
                {errors[`${day}_timeSlot`] && (
                  <p className="text-red-500 text-sm">{errors[`${day}_timeSlot`]}</p>
                )}
              </div>
            ))}
          </div>
          {errors.general && <p className="text-red-500 text-sm mt-4">{errors.general}</p>}
          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={onCancel}
              className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveWithConfirmation}
              disabled={isSubmitting}
              className={`bg-[#032B44] text-white py-2 px-4 rounded-md hover:bg-[#054869] transition-colors ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
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
            isProcessing={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default EditProSlot;