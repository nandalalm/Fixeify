import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, X, RotateCcw } from "lucide-react";
import {
  fetchProBookings,
  acceptBooking,
  rejectBooking,
  generateQuota,
  fetchQuotaByBookingId,
} from "../../api/proApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
import { logoutUserSync } from "../../store/authSlice";
import { UserRole } from "../../store/authSlice";
import { ProNavbar } from "../../components/Pro/ProNavbar";
import { ConfirmationModal } from "../../components/Admin/ConfirmationModal";
import { QuotaResponse } from "../../interfaces/quotaInterface";

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

const JobManagementPage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"requests" | "scheduled" | "history">("requests");
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [customRejectionReason, setCustomRejectionReason] = useState<string>("");
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState<boolean>(false);
  const [quotaData, setQuotaData] = useState({
    laborCost: "",
    materialCost: "",
    additionalCharges: "",
  });
  const [selectedQuota, setSelectedQuota] = useState<QuotaResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "completed" | "rejected" | "cancelled" | "">("");

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user || !accessToken || user.role !== UserRole.PRO) return;

      setLoading(true);
      try {
        const bookingData = await fetchProBookings(user.id);
        setBookings(bookingData);
      } catch (err: any) {
        console.error("Fetch pro bookings error:", err.response?.data);
        setError(err.response?.data?.message || "Failed to load bookings");
        if (err.response?.status === 401) {
          dispatch(logoutUserSync());
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user, accessToken, dispatch, navigate]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const handleTabChange = (tab: "requests" | "scheduled" | "history") => {
    setActiveTab(tab);
    setSearchTerm("");
    setSortOption("");
  };

  const handleViewBooking = async (booking: BookingResponse) => {
    setSelectedBooking(booking);
    if (booking.status === "accepted" || booking.status === "completed") {
      const quota = await fetchQuotaByBookingId(booking.id);
      setSelectedQuota(quota);
    }
    setIsViewModalOpen(true);
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      await acceptBooking(bookingId);
      setBookings(bookings.map((b) => (b.id === bookingId ? { ...b, status: "accepted" } : b)));
      setIsViewModalOpen(false);
    } catch (err: any) {
      console.error("Accept booking error:", err);
      setError(err.response?.data?.message || "Failed to accept booking");
    }
  };

  const handleRejectBooking = () => {
    setIsViewModalOpen(false);
    setIsRejectModalOpen(true);
  };

  const confirmRejectBooking = async () => {
    if (!selectedBooking || !rejectionReason) return;
    try {
      await rejectBooking(selectedBooking.id, rejectionReason);
      setBookings(
        bookings.map((b) =>
          b.id === selectedBooking.id ? { ...b, status: "rejected", rejectedReason: rejectionReason } : b
        )
      );
      setIsRejectModalOpen(false);
      setRejectionReason("");
      setCustomRejectionReason("");
    } catch (err: any) {
      console.error("Reject booking error:", err);
      setError(err.response?.data?.message || "Failed to reject booking");
    }
  };

  const handleGenerateQuota = () => {
    setIsViewModalOpen(false);
    setIsQuotaModalOpen(true);
  };

  const confirmGenerateQuota = async () => {
    if (!selectedBooking) return;
    try {
      const laborCost = quotaData.laborCost === "" ? 0 : Number(quotaData.laborCost);
      const materialCost = quotaData.materialCost === "" ? 0 : Number(quotaData.materialCost);
      const additionalCharges = quotaData.additionalCharges === "" ? 0 : Number(quotaData.additionalCharges);

      const quota = await generateQuota(selectedBooking.id, {
        laborCost,
        materialCost,
        additionalCharges,
      });
      setSelectedQuota(quota);
      setIsQuotaModalOpen(false);
      setQuotaData({ laborCost: "", materialCost: "", additionalCharges: "" });
    } catch (err: any) {
      console.error("Generate quota error:", err);
      setError(err.response?.data?.message || "Failed to generate quota");
    }
  };

  // Filter and sort bookings
  const filteredAndSortedBookings = bookings
    .filter((booking) => {
      if (activeTab === "requests") return booking.status === "pending";
      if (activeTab === "scheduled") return booking.status === "accepted";
      if (activeTab === "history") {
        if (sortOption && ["completed", "rejected", "cancelled"].includes(sortOption)) {
          return booking.status === sortOption;
        }
        return ["rejected", "completed", "cancelled"].includes(booking.status);
      }
      return true;
    })
    .filter((booking) =>
      booking.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.location.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "latest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOption === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOption === "completed" && activeTab === "history") return a.status === "completed" ? -1 : 1;
      if (sortOption === "rejected" && activeTab === "history") return a.status === "rejected" ? -1 : 1;
      if (sortOption === "cancelled" && activeTab === "history") return a.status === "cancelled" ? -1 : 1;
      return 0;
    });

  const clearFilters = () => {
    setSearchTerm("");
    setSortOption("");
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  if (user.role !== UserRole.PRO) {
    navigate("/pro-dashboard");
    return null;
  }

  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  if (error)
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">Error: {error}</div>
    );

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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between z-30">
        <div className="flex items-center">
          <button onClick={toggleSidebar} className="p-2 rounded-md text-gray-600 hover:bg-gray-100">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800 ml-4">Fixeify Pro</h1>
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

      <div className="flex flex-1 overflow-hidden">
        <ProNavbar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}
        >
          <div className="max-w-7xl mx-auto mb-[50px]">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Job Management</h1>

            {/* Search and Sort Controls */}
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
                onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                className="w-full sm:w-1/6 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">Sort by...</option>
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                {activeTab === "history" && (
                  <>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </>
                )}
              </select>
            </div>

            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => handleTabChange("requests")}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeTab === "requests" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Job Requests
                  </button>
                  <button
                    onClick={() => handleTabChange("scheduled")}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeTab === "scheduled" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Scheduled Jobs
                  </button>
                  <button
                    onClick={() => handleTabChange("history")}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeTab === "history" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Job History
                  </button>
                </nav>
              </div>
            </div>

            {filteredAndSortedBookings.length === 0 ? (
              <div className="text-center text-gray-600">
                <p>No results found for your search or sort criteria.</p>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    clearFilters();
                  }}
                  className="mt-2 inline-flex items-center text-blue-500 hover:text-blue-700"
                >
                  <RotateCcw className="h-4 w-4 mr-1" /> Clear Filters
                </a>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">S.No</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Issue</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Date</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Booking Status</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedBookings.map((booking, index) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900 border-b">{index + 1}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 border-b">{booking.issueDescription}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 border-b">
                          {formatDate(new Date(booking.preferredDate))}
                        </td>
                        <td className="py-3 px-4 text-sm border-b">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyles(booking.status)}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm border-b">
                          <button
                            onClick={() => handleViewBooking(booking)}
                            className="bg-blue-900 text-white px-4 py-1 rounded-md text-sm hover:bg-blue-800 transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* View Booking Modal */}
      {isViewModalOpen && selectedBooking && (
        <div
          className={`fixed inset-0 p-5 flex items-center justify-center z-50 ${
            activeTab === "history" && (selectedBooking.status === "rejected" || selectedBooking.status === "cancelled")
              ? "bg-gray-800/50 backdrop-blur-sm"
              : "bg-gray-800/30 backdrop-blur-sm"
          }`}
          onClick={() => setIsViewModalOpen(false)}
        >
          <div
            className={`p-6 rounded-lg shadow-lg w-96 relative bg-white ${
              activeTab === "history" && (selectedBooking.status === "rejected" || selectedBooking.status === "cancelled")
                ? "bg-gray-100"
                : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Booking Details</h3>
            <div className="space-y-2">
              <p><strong>User:</strong> {selectedBooking.user.name}</p>
              <p><strong>Category:</strong> {selectedBooking.category.name}</p>
              <p><strong>Issue:</strong> {selectedBooking.issueDescription}</p>
              <p><strong>Location:</strong> {selectedBooking.location.address}, {selectedBooking.location.city}, {selectedBooking.location.state}</p>
              <p><strong>Phone:</strong> {selectedBooking.phoneNumber}</p>
              <p><strong>Date:</strong> {formatDate(new Date(selectedBooking.preferredDate))}</p>
              <p><strong>Time:</strong> {selectedBooking.preferredTime.map(slot => `${formatTimeTo12Hour(slot.startTime)} - ${formatTimeTo12Hour(slot.endTime)}`).join(", ")}</p>
              <p>
                <strong>Booking Status:</strong> 
                <span className={`ml-2 inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyles(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </p>
              {selectedBooking.status === "rejected" && selectedBooking.rejectedReason && (
                <p><strong>Rejection Reason:</strong> {selectedBooking.rejectedReason}</p>
              )}
              {(selectedBooking.status === "accepted" || selectedBooking.status === "completed") && selectedQuota && (
                <>
                  <p><strong>Labor Cost:</strong> ₹{selectedQuota.laborCost}</p>
                  <p><strong>Material Cost:</strong> ₹{selectedQuota.materialCost}</p>
                  <p><strong>Additional Charges:</strong> ₹{selectedQuota.additionalCharges}</p>
                  <p><strong>Total Cost:</strong> ₹{selectedQuota.totalCost}</p>
                  <p>
                    <strong>Payment Status:</strong> 
                    <span
                      className={`ml-2 inline-block px-2 py-1 rounded-full text-xs font-semibold ${getPaymentStatusStyles(selectedQuota.paymentStatus)}`}
                    >
                      {selectedQuota.paymentStatus}
                    </span>
                  </p>
                </>
              )}
            </div>
            {activeTab === "requests" && (
              <div className="flex justify-between gap-4 mt-6">
                <button
                  onClick={() => handleAcceptBooking(selectedBooking.id)}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Accept Job
                </button>
                <button
                  onClick={handleRejectBooking}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Reject Job
                </button>
              </div>
            )}
            {activeTab === "scheduled" && !selectedQuota && (
              <button
                onClick={handleGenerateQuota}
                className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Generate Quota
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quota Generation Modal */}
      {isQuotaModalOpen && selectedBooking && (
        <div
          className="fixed inset-0 p-5 flex items-center justify-center z-50 bg-gray-800/50 backdrop-blur-sm"
          onClick={() => {}}
        >
          <div
            className="p-6 rounded-lg shadow-lg w-96 bg-white relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsQuotaModalOpen(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Generate Quota</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Labor Cost (₹)</label>
                <input
                  type="number"
                  value={quotaData.laborCost}
                  onChange={(e) => setQuotaData({ ...quotaData, laborCost: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Material Cost (₹)</label>
                <input
                  type="number"
                  value={quotaData.materialCost}
                  onChange={(e) => setQuotaData({ ...quotaData, materialCost: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Additional Charges (₹)</label>
                <input
                  type="number"
                  value={quotaData.additionalCharges}
                  onChange={(e) => setQuotaData({ ...quotaData, additionalCharges: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  min="0"
                />
              </div>
              <button
                onClick={confirmGenerateQuota}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      <ConfirmationModal
        isOpen={isRejectModalOpen}
        onConfirm={confirmRejectBooking}
        onCancel={() => {
          setIsRejectModalOpen(false);
          setRejectionReason("");
          setCustomRejectionReason("");
        }}
        action="rejectBooking"
        entityType="booking"
        reason={rejectionReason}
        setReason={setRejectionReason}
        customReason={customRejectionReason}
        setCustomReason={setCustomRejectionReason}
      />
    </div>
  );
};

export default JobManagementPage;