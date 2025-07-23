import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { Menu, Bell, X, RotateCcw } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { fetchAdminBookings, fetchQuotaByBookingId } from "../../api/adminApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
import { QuotaResponse } from "../../interfaces/quotaInterface";
import BookingTable from "../../components/Reuseable/BookingTable";

const formatTimeTo12Hour = (time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const adjustedHours = hours % 12 || 12;
  return `${adjustedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getStatusStyles = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "accepted":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-green-600 text-white";
    case "rejected":
      return "bg-red-800 text-white";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getPaymentStatusStyles = (status: "pending" | "completed" | "failed") => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-green-600 text-white";
    case "failed":
      return "bg-red-800 text-white";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const AdminBookingManagement: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [selectedQuota, setSelectedQuota] = useState<QuotaResponse | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
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
  }, [user, navigate, currentPage, sortOption]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { bookings, total } = await fetchAdminBookings(currentPage, limit);
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
    if (booking.status === "accepted" || booking.status === "completed") {
      try {
        const quota = await fetchQuotaByBookingId(booking.id);
        setSelectedQuota(quota);
      } catch (err: any) {
        console.error("Fetch quota error:", err);
        setError(err.response?.data?.message || "Failed to load quota");
      }
    }
    setIsViewModalOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleClearFilter = () => {
    setSearchTerm("");
    setSortOption("latest");
  };

  if (!user || user.role !== "admin") return null;

  const filteredBookings = bookings.filter(
    (booking) =>
      !searchTerm ||
      booking.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.location.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedBookings = sortOption && sortOption !== "latest" && sortOption !== "oldest"
    ? filteredBookings.filter((booking) => booking.status === sortOption)
    : filteredBookings.sort((a, b) => {
        if (sortOption === "latest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortOption === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return 0;
      });

  const displayBookings = sortedBookings.length > 0 ? sortedBookings : [];

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
      <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between z-30">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800 ml-4">Fixeify Admin</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="relative p-1 text-gray-700 rounded-md hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-red-500 rounded-full">
              1
            </span>
          </button>
          <div className="flex items-center">
            <span className="text-lg font-medium text-gray-700 mr-2 hidden sm:inline">{user.name}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AdminNavbar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Content */}
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}
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

            {isViewModalOpen && selectedBooking && (
              <div
                className="fixed inset-0 p-5 flex items-center justify-center z-50 bg-gray-800/30 backdrop-blur-sm"
                onClick={() => setIsViewModalOpen(false)}
              >
                <div
                  className="p-6 rounded-lg shadow-lg w-96 relative bg-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
                    aria-label="Close booking details modal"
                  >
                    <X className="h-6 w-6" />
                  </button>
                  <h3 className="text-lg font-semibold mb-4">Booking Details</h3>
                  <div className="space-y-2">
                    <p>
                      <strong>User:</strong> {selectedBooking.user.name}
                    </p>
                    <p>
                      <strong>Category:</strong> {selectedBooking.category.name}
                    </p>
                    <p>
                      <strong>Issue:</strong> {selectedBooking.issueDescription}
                    </p>
                    <p>
                      <strong>Location:</strong> {selectedBooking.location.address}, {selectedBooking.location.city},{" "}
                      {selectedBooking.location.state}
                    </p>
                    <p>
                      <strong>Phone:</strong> {selectedBooking.phoneNumber}
                    </p>
                    <p>
                      <strong>Date:</strong> {formatDate(new Date(selectedBooking.preferredDate))}
                    </p>
                    <p>
                      <strong>Time:</strong>{" "}
                      {selectedBooking.preferredTime
                        .map((slot) => `${formatTimeTo12Hour(slot.startTime)} - ${formatTimeTo12Hour(slot.endTime)}`)
                        .join(", ")}
                    </p>
                    <p>
                      <strong>Booking Status:</strong>
                      <span
                        className={`ml-2 inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyles(
                          selectedBooking.status
                        )}`}
                      >
                        {selectedBooking.status}
                      </span>
                    </p>
                    {selectedBooking.status === "rejected" && selectedBooking.rejectedReason && (
                      <p>
                        <strong>Rejection Reason:</strong> {selectedBooking.rejectedReason}
                      </p>
                    )}
                    {(selectedBooking.status === "accepted" || selectedBooking.status === "completed") && selectedQuota && (
                      <>
                        <p>
                          <strong>Labor Cost:</strong> ₹{selectedQuota.laborCost}
                        </p>
                        <p>
                          <strong>Material Cost:</strong> ₹{selectedQuota.materialCost}
                        </p>
                        <p>
                          <strong>Additional Charges:</strong> ₹{selectedQuota.additionalCharges}
                        </p>
                        <p>
                          <strong>Total Cost:</strong> ₹{selectedQuota.totalCost}
                        </p>
                        <p>
                          <strong>Payment Status:</strong>
                          <span
                            className={`ml-2 inline-block px-2 py-1 rounded-full text-xs font-semibold ${getPaymentStatusStyles(
                              selectedQuota.paymentStatus
                            )}`}
                          >
                            {selectedQuota.paymentStatus}
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminBookingManagement;