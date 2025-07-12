import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { fetchBookingDetails } from "../../api/userApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
import UserBookingDetails from "./UserBookingDetails";

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const OngoingRequest = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const userId = user?.id || "";
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "">("");

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

  const handleViewDetails = (booking: BookingResponse) => {
    setSelectedBooking(booking);
  };

  const handleBack = () => {
    setSelectedBooking(null);
  };

  const filteredAndSortedBookings = bookings
    .filter((booking) =>
      booking.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.location.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "latest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOption === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });

  if (loading) {
    return (
      <div className="text-center py-8">
        <svg className="animate-spin h-8 w-8 text-[#032B44] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-center py-8">{error}</p>;
  }

  if (selectedBooking) {
    return <UserBookingDetails booking={selectedBooking} onBack={handleBack} />;
  }

  return (
    <div className="p-6 mb-[350px] mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Ongoing Requests</h2>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <input
          type="text"
          placeholder="Search by issue or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-5/6 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as "latest" | "oldest" | "")}
          className="w-full sm:w-1/6 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
        >
          <option value="">Sort by...</option>
          <option value="latest">Latest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 border-b">S.No</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 border-b">Issue</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 border-b">Date</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 border-b">Booking Status</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 border-b">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedBookings.map((booking, index) => (
              <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 border-b">{index + 1}</td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">{booking.issueDescription}</td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">{formatDate(new Date(booking.preferredDate))}</td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${booking.status === "pending" ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100" :"bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100"}`}>
                {booking.status}
              </span>
                </td>
                <td className="py-3 px-4 text-sm border-b">
                  <button
                    onClick={() => handleViewDetails(booking)}
                    className=" bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-4">
        {filteredAndSortedBookings.map((booking, index) => (
          <div key={booking.id} className="bg-white dark:bg-gray-800 p-4 rounded-md shadow border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>S.No:</strong> {index + 1}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Issue:</strong> {booking.issueDescription}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Date:</strong> {formatDate(new Date(booking.preferredDate))}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Status:</strong>{" "}
              <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${booking.status === "pending" ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100" :"bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100"}`}>
                {booking.status}
              </span>
            </p>
            <button
              onClick={() => handleViewDetails(booking)}
              className="mt-2 bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
            >
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OngoingRequest;
