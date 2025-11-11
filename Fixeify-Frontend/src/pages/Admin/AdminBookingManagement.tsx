import { type FC, useState, useEffect, useCallback } from "react";
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

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Determine server-side params
      const statusFilter = ["pending", "accepted", "completed", "rejected", "cancelled"].includes(sortOption)
        ? (sortOption as "pending" | "accepted" | "completed" | "rejected" | "cancelled")
        : undefined;
      const sortByParam = sortOption === "latest" || sortOption === "oldest" ? sortOption : "latest";
      // Heuristic: if search input looks like a Booking ID (no spaces, length >= 6), also pass as bookingId
      const trimmedSearch = (searchTerm || "").trim();
      const isPotentialBookingId = trimmedSearch.length >= 6 && !/\s/.test(trimmedSearch);
      const bookingIdParam = isPotentialBookingId ? trimmedSearch : undefined;

      const { bookings, total } = await fetchAdminBookings(
        currentPage,
        limit,
        searchTerm || undefined,
        statusFilter,
        sortByParam,
        bookingIdParam
      );
      setBookings(bookings);
      setTotalPages(Math.ceil(total / limit));
    } catch (err: unknown) {
      console.error("Fetch admin bookings error:", err);
      const errorResponse = err as { response?: { data?: { message?: string }; status?: number } };
      setError(errorResponse.response?.data?.message || "Failed to load bookings");
      if (errorResponse.response?.status === 401) {
        navigate("/admin-login");
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortOption, searchTerm, navigate]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
    } else {
      fetchBookings();
    }
  }, [user, navigate, currentPage, sortOption, searchTerm, fetchBookings]);

  useEffect(() => {
    fetchBookings();
  }, [currentPage, sortOption, searchTerm, fetchBookings]);

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

  // Check if there are no bookings at all (initial load without filters)
  const hasNoBookingsAtAll = !loading && bookings.length === 0 && !searchTerm && sortOption === "latest" && currentPage === 1;

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

  // while loading, we will keep heading/search/sort visible and only skeletonize the table below

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

            {/* Filters (only visible when there are bookings and not in details view) */}
            {!selectedBooking && !hasNoBookingsAtAll && (
              <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative w-full sm:w-5/6">
                  <input
                    type="text"
                    placeholder="Search by issue, location, or booking ID..."
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

            {/* Content area */}
            {selectedBooking ? (
              <div className="mt-4">
                <BookingDetails
                  bookingId={selectedBooking.bookingId}
                  viewerRole="admin"
                  onBack={async () => { setSelectedBooking(null); await fetchBookings(); }}
                />
              </div>
            ) : loading ? (
              // Responsive skeleton that mirrors BookingTable layout
              <div className="w-full">
                {/* Mobile skeleton cards */}
                <div className="md:hidden flex flex-col gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white p-4 rounded-md shadow border border-gray-200 animate-pulse">
                      <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                      <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                      <div className="h-4 w-1/2 bg-gray-200 rounded mb-2" />
                      <div className="h-6 w-24 bg-gray-200 rounded mb-3" />
                      <div className="h-8 w-20 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>

                {/* Desktop skeleton table */}
                <div className="hidden md:block overflow-x-auto">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-1/12">S.No</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-3/6">Issue</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Booking Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="py-3 px-4">
                              <div className="h-4 w-10 bg-gray-200 rounded" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 w-5/6 bg-gray-200 rounded" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 w-28 bg-gray-200 rounded" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-6 w-28 bg-gray-200 rounded-full" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-8 w-20 bg-gray-200 rounded" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : hasNoBookingsAtAll ? (
              <div className="text-center text-gray-600 space-y-2">
                <p>No bookings currently</p>
              </div>
            ) : displayBookings.length === 0 ? (
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
            ) : (
              <BookingTable
                bookings={displayBookings}
                onViewDetails={handleViewBooking}
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminBookingManagement;