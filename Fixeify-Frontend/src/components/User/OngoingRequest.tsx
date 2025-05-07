import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { fetchBookingDetails } from "../../api/userApi";
import { BookingResponse } from "../../interfaces/bookingInterface";

const OngoingRequest = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const userId = user?.id || "";
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBookings = async () => {
      if (!userId) {
        setError("User not authenticated. Please log in.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetchBookingDetails(userId);
        setBookings(response);
      } catch (err) {
        setError("Failed to fetch booking details.");
      } finally {
        setLoading(false);
      }
    };
    loadBookings();
  }, [userId]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <svg
          className="animate-spin h-8 w-8 text-[#032B44] mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-center py-8">{error}</p>;
  }

  return (
    <div className="p-6 mb-[200px]">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Ongoing Requests</h2>
      {bookings.length === 0 ? (
        <p className="text-gray-700 dark:text-gray-300 text-center">No ongoing requests found.</p>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Booking Details</h3>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>User:</strong> {booking.user.name}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Professional:</strong> {booking.pro.firstName} {booking.pro.lastName}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Category:</strong> {booking.category.name}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Issue:</strong> {booking.issueDescription}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Location:</strong> {booking.location.address}, {booking.location.city}, {booking.location.state}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Phone:</strong> {booking.phoneNumber}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Date:</strong> {new Date(booking.preferredDate).toLocaleDateString()}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Time:</strong> {booking.preferredTime}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Status:</strong>{" "}
                <span
                  className={
                    booking.status === "pending"
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-green-600 dark:text-green-400"
                  }
                >
                  {booking.status}
                </span>
              </p>
              {booking.rejectedReason && (
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Rejected Reason:</strong> {booking.rejectedReason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OngoingRequest;