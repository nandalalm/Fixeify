import React, { useState, useEffect } from "react";
import { ITimeSlot } from "../../interfaces/adminInterface";
import { getProAvailability } from "../../api/proApi";

interface BookingFormSecondProps {
  formData: {
    preferredDate: string;
    preferredTime: ITimeSlot[];
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      issueDescription: string;
      location: any;
      phoneNumber: string;
      preferredDate: string;
      preferredTime: ITimeSlot[];
    }>
  >;
  proId: string | undefined;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleTimeSlotToggle: (slot: ITimeSlot) => void;
  errors: Record<string, string>;
  formatTimeTo12Hour: (time: string) => string;
}

const BookingFormSecond = ({ formData, setFormData, proId, setErrors, handleTimeSlotToggle, errors, formatTimeTo12Hour }: BookingFormSecondProps) => {
  const [availableTimeSlots, setAvailableTimeSlots] = useState<ITimeSlot[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  const today = new Date();
  
  const oneWeekMinusOneDay = new Date(today);
  oneWeekMinusOneDay.setDate(today.getDate() + 6); 

  const todayFormatted = today.toISOString().split("T")[0];
  const oneWeekMinusOneDayFormatted = oneWeekMinusOneDay.toISOString().split("T")[0];

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!proId) {
        setErrors({ general: "Professional ID not found." });
        setIsLoadingAvailability(false);
        return;
      }
      try {
        setIsLoadingAvailability(true);
        const response = await getProAvailability(proId);
        const selectedDate = formData.preferredDate ? new Date(formData.preferredDate) : today;
        const dayOfWeek = selectedDate.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
        const slots = response.availability[dayOfWeek as keyof typeof response.availability] || [];
        setAvailableTimeSlots(slots);
      } catch (error) {
        console.error("Failed to fetch availability:", error);
        setErrors({ general: "Failed to fetch availability." });
      } finally {
        setIsLoadingAvailability(false);
      }
    };
    fetchAvailability();
  }, [proId, formData.preferredDate, setErrors]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "preferredDate") {
      setFormData((prev) => ({ ...prev, preferredTime: [] })); 
    }
  };

  return (
    <>
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
            min={todayFormatted}
            max={oneWeekMinusOneDayFormatted}
          />
        </div>
        {errors.preferredDate && <p className="text-red-500 text-sm mt-1">{errors.preferredDate}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Preferred Time Slots <span className="text-red-500">*</span>
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {isLoadingAvailability ? (
            <div className="text-center col-span-2">
              <svg
                className="animate-spin h-5 w-5 text-[#032B44] mx-auto"
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
          ) : availableTimeSlots.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 col-span-2">
              No time slots available for the selected date
            </p>
          ) : (
            availableTimeSlots.map((slot, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleTimeSlotToggle(slot)}
                disabled={slot.booked}
                className={`relative p-3 rounded-md text-sm transition-colors ${
                  slot.booked
                    ? "text-gray-400 dark:text-gray-500 opacity-50 cursor-not-allowed"
                    : formData.preferredTime.some(
                        (s) => s.startTime === slot.startTime && s.endTime === slot.endTime
                      )
                    ? "bg-blue-500 text-white dark:bg-blue-600"
                    : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
                }`}
              >
                {`${formatTimeTo12Hour(slot.startTime)} - ${formatTimeTo12Hour(slot.endTime)}`}
                {slot.booked && <span className="block text-red-500 text-xs mt-1">Booked</span>}
              </button>
            ))
          )}
        </div>
        {errors.preferredTime && <p className="text-red-500 text-sm mt-1">{errors.preferredTime}</p>}
      </div>
    </>
  );
};

export default BookingFormSecond;