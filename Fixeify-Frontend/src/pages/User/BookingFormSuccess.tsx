
import { useNavigate } from "react-router-dom";
import { Check, Home, MoveRight, Calendar, MapPin, User, Phone } from "lucide-react";
import { IApprovedPro, ILocation } from "../../interfaces/adminInterface";
import { BookingResponse } from "../../interfaces/bookingInterface";

interface BookingFormSuccessProps {
  bookingDetails: BookingResponse;
  navigate: ReturnType<typeof useNavigate>;
  proId: string;
  pro: IApprovedPro | undefined;
  categoryId: string | undefined;
  location: ILocation | undefined;
}

const BookingFormSuccess = ({ bookingDetails, navigate, proId, pro, categoryId, location }: BookingFormSuccessProps) => {
  const formatTimeTo12Hour = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <Check className="w-10 h-10 text-white stroke-[3]" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-green-400 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Booking Completed!</h1>
        </div>

        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border-0 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Booking Details</h2>
            <span className="bg-amber-100 text-amber-800 dark:bg-amber-700 dark:text-amber-100 border border-amber-200 dark:border-amber-400 text-sm font-medium px-2.5 py-0.5 rounded">
              {bookingDetails.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Booking ID: {bookingDetails.id}</p>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{bookingDetails.category.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Professional service</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(bookingDetails.preferredDate).toLocaleDateString('en-GB')}</p>
              <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <span>Selected Time Slots:</span>
                </div>
                {bookingDetails.preferredTime.map((slot, index) => (
                  <div key={index} className="">
                    {formatTimeTo12Hour(slot.startTime)} - {formatTimeTo12Hour(slot.endTime)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-300" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Service Location</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{bookingDetails.location.address}, {bookingDetails.location.city}, {bookingDetails.location.state}</p>
            </div>
          </div>

          <hr className="my-4 border-gray-200 dark:border-gray-600" />

          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Your Professional</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-700 dark:to-purple-800 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {bookingDetails.pro.firstName[0]}{bookingDetails.pro.lastName[0]}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">{bookingDetails.pro.firstName} {bookingDetails.pro.lastName}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Phone className="w-4 h-4" />
                <span className="truncate">{bookingDetails.phoneNumber}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            className="flex-1 h-12 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-transparent dark:bg-transparent text-gray-700 dark:text-gray-200 rounded-md flex items-center justify-center"
            onClick={() => navigate("/")}
          >
            <Home className="w-4 h-4 mr-2" />
            Back Home
          </button>
          <button
            className="flex-1 h-12 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded-md flex items-center justify-center"
            onClick={() => navigate(`/pro-details/${proId}`, { state: { pro, categoryId, location } })}
          >
            <MoveRight className="w-4 h-4 mr-2" />
            Continue
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">You'll receive the Fixeify Pros Response Shortly.</p>
        </div>
      </div>
    </div>
  );
};

export default BookingFormSuccess;