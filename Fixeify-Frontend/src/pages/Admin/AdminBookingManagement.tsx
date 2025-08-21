import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { RotateCcw } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { fetchAdminBookings } from "../../api/adminApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
// import { QuotaResponse } from "../../interfaces/quotaInterface";
import BookingTable from "../../components/Reuseable/BookingTable";
import BookingDetails from "../../components/Reuseable/BookingDetails";
import { AdminTopNavbar } from "../../components/Admin/AdminTopNavbar";

// removed unused formatting helpers

const AdminBookingManagement: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  // const [selectedQuota, setSelectedQuota] = useState<QuotaResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "pending" | "accepted" | "completed" | "rejected" | "cancelled" | "">("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5;

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
    } else {
      fetchBookings();
    }
  }, [user, navigate, currentPage, sortOption, searchTerm]);

  useEffect(() => {
    fetchBookings();
  }, [user, navigate, currentPage, sortOption, searchTerm]);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLargeScreen) {
      setSidebarOpen(false);
    }
  }, [isLargeScreen]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Determine server-side params
      const statusFilter = ["pending", "accepted", "completed", "rejected", "cancelled"].includes(sortOption)
        ? (sortOption as "pending" | "accepted" | "completed" | "rejected" | "cancelled")
        : undefined;
      const sortByParam = sortOption === "latest" || sortOption === "oldest" ? sortOption : "latest";

      const { bookings, total } = await fetchAdminBookings(
        currentPage,
        limit,
        searchTerm || undefined,
        statusFilter,
        sortByParam
      );
      setBookings(bookings);
      setTotalPages(Math.ceil(total / limit));
    } catch (err: any) {
      console.error("Fetch admin bookings error:", err);
      setError(err.response?.data?.message || "Failed to load bookings");
      if (err.response?.status === 401) {
        navigate("/admin-login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewBooking = async (booking: BookingResponse) => {
    setSelectedBooking(booking);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleClearFilter = () => {
    setSearchTerm("");
    setSortOption("latest");
    setCurrentPage(1);
    fetchBookings();
  };

  if (!user || user.role !== "admin") return null;

  // Server-side returns already filtered/sorted page of results
  const displayBookings = bookings;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner border-t-4 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navbar */}
      <AdminTopNavbar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        userName={user.name}
        isLargeScreen={isLargeScreen}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-visible">
        {/* Sidebar */}
        <AdminNavbar isOpen={sidebarOpen} />

        {/* Content */}
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300`}
        >
          <div className="max-w-7xl mx-auto mb-[50px]">
            <h1 className="text-2xl font-semibold text-gray-800 mb-6">Booking Management</h1>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-center">
                {error}
              </div>
            )}

            {bookings.length === 0 ? (
              <div className="text-center text-gray-600">
                <p>No booking history available.</p>
              </div>
            ) : (
              <>
                {!selectedBooking && (
                  <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative w-full sm:w-5/6">
                      <input
                        type="text"
                        placeholder="Search by issue or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="relative w-full sm:w-1/6">
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      >
                        <option value="latest">Sort by Latest</option>
                        <option value="oldest">Sort by Oldest</option>
                        <option value="pending">Sort by Pending</option>
                        <option value="accepted">Sort by Accepted</option>
                        <option value="completed">Sort by Completed</option>
                        <option value="rejected">Sort by Rejected</option>
                        <option value="cancelled">Sort by Cancelled</option>
                      </select>
                    </div>
                  </div>
                )}

                {displayBookings.length === 0 ? (
                  <div className="text-center text-gray-600 space-y-2">
                    <p>No results found for your search or sort criteria.</p>
                    <button
                      onClick={handleClearFilter}
                      className="text-blue-600 flex items-center justify-center mx-auto"
                      aria-label="Clear search and sort filters"
                    >
                      Clear filter
                      <RotateCcw className="ml-2 h-5 w-5 text-blue-600" />
                    </button>
                  </div>
                ) : selectedBooking ? (
                  <div className="mt-4">
                    <BookingDetails
                      bookingId={selectedBooking.id}
                      viewerRole="admin"
                      onBack={async () => { setSelectedBooking(null); await fetchBookings(); }}
                    />
                  </div>
                ) : (
                  <BookingTable
                    bookings={displayBookings}
                    onViewDetails={handleViewBooking}
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminBookingManagement;