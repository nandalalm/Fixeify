import { useState, useEffect } from "react";
import { fetchQuotaByBookingId } from "../../api/proApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
import { QuotaResponse } from "../../interfaces/quotaInterface";
import { ArrowLeft } from "lucide-react";

interface UserBookingDetailsProps {
  booking: BookingResponse;
  onBack: () => void;
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const formattedHour = ((hours + 11) % 12 + 1).toString().padStart(2, "0");
  return `${formattedHour}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const formatTimeRange = (
  timeSlots: { startTime: string; endTime: string }[]
): string => {
  return timeSlots
    .map((slot) => `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`)
    .join(", ");
};

const UserBookingDetails = ({ booking, onBack }: UserBookingDetailsProps) => {
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuota = async () => {
      try {
        setLoading(true);
        const quotaResponse = await fetchQuotaByBookingId(booking.id);
        if (quotaResponse) setQuota(quotaResponse);
      } catch (err) {
        setError("Failed to load quota details.");
      } finally {
        setLoading(false);
      }
    };
    loadQuota();
  }, [booking.id]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <svg
          className="animate-spin h-8 w-8 text-[#032B44] mx-auto"
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
    );
  }

  if (error) {
    return <p className="text-red-500 text-center py-8">{error}</p>;
  }

  return (
    <div className="p-6 mb-[200px] mt-8">
      <button
        onClick={onBack}
        className="inline-block mb-3 p-1 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Booking Details
        </h2>
        <div className="grid grid-cols-1 gap-6">
          {/* Booking Details Card */}
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>User:</strong> {booking.user.name}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Professional:</strong> {booking.pro.firstName}{" "}
                  {booking.pro.lastName}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Category:</strong> {booking.category.name}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Issue:</strong> {booking.issueDescription}
                </p>
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Location:</strong> {booking.location.address},{" "}
                  {booking.location.city}, {booking.location.state}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Phone:</strong> {booking.phoneNumber}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Date:</strong>{" "}
                  {formatDate(new Date(booking.preferredDate))}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Time:</strong> {formatTimeRange(booking.preferredTime)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-gray-700 dark:text-gray-300">
              <strong>Booking Status:</strong>{" "}
              <span
                className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                  booking.status === "pending"
                    ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100"
                    : booking.status === "accepted"
                    ? "bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100"
                    : "bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-100"
                }`}
              >
                {booking.status}
              </span>
            </p>
            {booking.rejectedReason && (
              <p className="mt-2 text-gray-700 dark:text-gray-300">
                <strong>Rejected Reason:</strong> {booking.rejectedReason}
              </p>
            )}
          </div>
          {/* Quota Breakdown Card (if available) */}
          {quota && (
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Quota Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Labor Cost:</strong> ₹{quota.laborCost}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Material Cost:</strong> ₹{quota.materialCost}
                  </p>
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Additional Charges:</strong> ₹
                    {quota.additionalCharges}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Total Cost:</strong> ₹{quota.totalCost}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-gray-700 dark:text-gray-300">
                <strong>Payment Status:</strong>{" "}
                <span
                  className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                    quota.paymentStatus === "pending"
                      ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100"
                      : quota.paymentStatus === "completed"
                      ? "bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100"
                      : "bg-red-200 text-red-800 dark:bg-red-600 dark:text-red-100"
                  }`}
                >
                  {quota.paymentStatus}
                </span>
              </p>
              <button className="mt-4 bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white">
                Go to Payment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserBookingDetails;
