
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { fetchBookingDetails } from "../../api/userApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
import UserBookingDetails from "../../components/User/UserBookingDetails";
import { RotateCcw } from "lucide-react";
import BookingTable from "../../components/Reuseable/BookingTable";

const OngoingRequest = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const userId = user?.id || "";
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "">("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5;

  useEffect(() => {
    const loadBookings = async () => {
      if (!userId) {
        setError("User not authenticated. Please log in.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetchBookingDetails(userId, currentPage, limit);
        setBookings(response.bookings);
        setTotalPages(Math.ceil(response.total / limit));
      } catch (err) {
        setError("Failed to fetch booking details.");
      } finally {
        setLoading(false);
      }
    };
    loadBookings();
  }, [userId, currentPage]);

  const handleViewDetails = (booking: BookingResponse) => {
    setSelectedBooking(booking);
  };

  const handleBack = () => {
    setSelectedBooking(null);
    setCurrentPage(1);
    fetchBookingDetails(userId, 1, limit).then((response) => {
      setBookings(response.bookings);
      setTotalPages(Math.ceil(response.total / limit));
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const filteredAndSortedBookings = bookings
    .filter((booking) =>
      booking.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.location.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "latest" || sortOption === "") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOption === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });

  const handleClearFilter = () => {
    setSearchTerm("");
    setSortOption("latest");
  };

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
      {bookings.length > 0 && (
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
            <option value="latest">Sort by Latest</option>
            <option value="oldest">Sort by Oldest</option>
          </select>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No ongoing requests currently.</p>
        </div>
      ) : filteredAndSortedBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No ongoing requests that matched the search or sort criteria found.</p>
          <div className="flex items-center gap-1">
            <a href="#" onClick={(e) => { e.preventDefault(); handleClearFilter(); }} className="mt-2 inline-flex items-center text-blue-500 hover:text-blue-700">
              <RotateCcw className="w-4 h-4 mr-1" /> Clear Filter
            </a>
          </div>
        </div>
      ) : (
        <BookingTable
          bookings={filteredAndSortedBookings}
          onViewDetails={handleViewDetails}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default OngoingRequest;