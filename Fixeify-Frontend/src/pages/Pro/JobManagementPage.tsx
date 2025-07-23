import { useState, useEffect, useMemo } from "react";
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
import { ConfirmationModal } from "../../components/Reuseable/ConfirmationModal";
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

const JobManagementPage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"requests" | "scheduled" | "history">("requests");
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState<boolean>(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState<boolean>(false);
  const [isConfirmQuotaModalOpen, setIsConfirmQuotaModalOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [customRejectionReason, setCustomRejectionReason] = useState<string>("");
  const [quotaData, setQuotaData] = useState({
    laborCost: "",
    materialCost: "",
    additionalCharges: "",
  });
  const [quotaErrors, setQuotaErrors] = useState({
    laborCost: "",
    materialCost: "",
    additionalCharges: "",
  });
  const [selectedQuota, setSelectedQuota] = useState<QuotaResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "completed" | "rejected" | "cancelled" | "">("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<{ requests: number; scheduled: number; history: number }>({
    requests: 1,
    scheduled: 1,
    history: 1,
  });
  const [totalPages, setTotalPages] = useState<{ requests: number; scheduled: number; history: number }>({
    requests: 1,
    scheduled: 1,
    history: 1,
  });
  const limit = 5;

  const fetchBookings = async (tab: "requests" | "scheduled" | "history") => {
    if (!user || !accessToken || user.role !== UserRole.PRO) return;

    setLoading(true);
    setError(null);
    try {
      let status: string | undefined;
      switch (tab) {
        case "requests":
          status = "pending";
          break;
        case "scheduled":
          status = "accepted";
          break;
        case "history":
          status = ["completed", "rejected", "cancelled"].join(",");
          break;
      }
      const { bookings, total } = await fetchProBookings(user.id, currentPage[tab], limit, status);
      setBookings(bookings);
      setTotalPages((prev) => ({ ...prev, [tab]: Math.ceil(total / limit) }));
    } catch (err: any) {
      console.error(`Fetch pro bookings error for ${tab}:`, err);
      setError(err.response?.data?.message || "Failed to load bookings");
      if (err.response?.status === 401) {
        dispatch(logoutUserSync());
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(activeTab);
  }, [user, accessToken, dispatch, navigate, activeTab, currentPage[activeTab]]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const handleTabChange = (tab: "requests" | "scheduled" | "history") => {
    setActiveTab(tab);
    setSearchTerm("");
    setSortOption("");
    setCurrentPage((prev) => ({ ...prev, [tab]: 1 }));
    fetchBookings(tab);
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

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setError(null);
    setTimeout(() => setSuccessMessage(null), 1000);
  };

  const showErrorMessage = (message: string) => {
    setError(message);
    setSuccessMessage(null);
    setTimeout(() => setError(null), 1000);
  };

  const handleAcceptBooking = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
    try {
      await acceptBooking(selectedBooking.id);
      showSuccessMessage("Booking accepted successfully");
      setIsAcceptModalOpen(false);
      setIsViewModalOpen(false);
      await fetchBookings(activeTab);
    } catch (err: any) {
      console.error("Accept booking error:", err);
      const errorMessage = err.response?.data?.message || "An error occurred while accepting the booking";
      showErrorMessage(errorMessage);
      setIsAcceptModalOpen(false);
      setIsViewModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBooking = () => {
    setIsViewModalOpen(false);
    setIsRejectModalOpen(true);
  };

  const confirmRejectBooking = async () => {
    if (!selectedBooking || !rejectionReason) return;
    setActionLoading(true);
    try {
      await rejectBooking(selectedBooking.id, rejectionReason);
      showSuccessMessage("Booking rejected successfully");
      setIsRejectModalOpen(false);
      setIsViewModalOpen(false);
      setRejectionReason("");
      setCustomRejectionReason("");
      await fetchBookings(activeTab);
    } catch (err: any) {
      console.error("Reject booking error:", err);
      showErrorMessage(err.response?.data?.message || "Failed to reject booking");
      setIsRejectModalOpen(false);
      setIsViewModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateQuota = () => {
    setIsViewModalOpen(false);
    setIsQuotaModalOpen(true);
    setQuotaErrors({ laborCost: "", materialCost: "", additionalCharges: "" });
  };

  const validateQuota = () => {
    const errors = {
      laborCost: "",
      materialCost: "",
      additionalCharges: "",
    };
    let isValid = true;

    // Validate labor cost
    if (!quotaData.laborCost) {
      errors.laborCost = "Labor cost is required";
      isValid = false;
    } else if (Number(quotaData.laborCost) < 100) {
      errors.laborCost = "Labor cost must be at least 100 rupees";
      isValid = false;
    }

    // Validate material cost (optional, but must be non-negative if provided)
    if (quotaData.materialCost && Number(quotaData.materialCost) < 0) {
      errors.materialCost = "Material cost cannot be negative";
      isValid = false;
    }

    // Validate additional charges (optional, but must be non-negative if provided)
    if (quotaData.additionalCharges && Number(quotaData.additionalCharges) < 0) {
      errors.additionalCharges = "Additional charges cannot be negative";
      isValid = false;
    }

    setQuotaErrors(errors);
    return isValid;
  };

  const confirmGenerateQuota = () => {
    if (validateQuota()) {
      setIsQuotaModalOpen(false);
      setIsConfirmQuotaModalOpen(true);
    }
  };

  const handleCancelQuota = () => {
    setIsQuotaModalOpen(false);
    setQuotaErrors({ laborCost: "", materialCost: "", additionalCharges: "" });
  };

  const submitQuota = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
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
      showSuccessMessage("Quota generated successfully");
      setIsConfirmQuotaModalOpen(false);
      setIsViewModalOpen(false);
      setQuotaData({ laborCost: "", materialCost: "", additionalCharges: "" });
      await fetchBookings(activeTab);
    } catch (err: any) {
      console.error("Generate quota error:", err);
      showErrorMessage(err.response?.data?.message || "Failed to generate quota");
      setIsConfirmQuotaModalOpen(false);
      setIsViewModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAndSortedBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        if (activeTab === "requests") return booking.status === "pending";
        if (activeTab === "scheduled") return booking.status === "accepted";
        if (activeTab === "history") {
          if (sortOption === "completed") return booking.status === "completed";
          if (sortOption === "rejected") return booking.status === "rejected";
          if (sortOption === "cancelled") return booking.status === "cancelled";
          return ["completed", "rejected", "cancelled"].includes(booking.status);
        }
        return true;
      })
      .filter(
        (booking) =>
          booking.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.location.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortOption === "latest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortOption === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return 0;
      });
  }, [bookings, activeTab, searchTerm, sortOption]);

  const clearFilters = () => {
    setSearchTerm("");
    setSortOption("");
    setCurrentPage((prev) => ({ ...prev, [activeTab]: 1 }));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage((prev) => ({ ...prev, [activeTab]: page }));
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  if (user.role !== UserRole.PRO) {
    navigate("/pro-dashboard");
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner border-t-4 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

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

            {successMessage && (
              <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md text-center">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-center">
                {error}
              </div>
            )}

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
                <nav
                  className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-8"
                  aria-label="Tabs"
                >
                  <button
                    onClick={() => handleTabChange("requests")}
                    className={`py-2 px-4 text-sm font-medium ${activeTab === "requests"
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    Job Requests
                  </button>
                  <button
                    onClick={() => handleTabChange("scheduled")}
                    className={`py-2 px-4 text-sm font-medium ${activeTab === "scheduled"
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    Scheduled Jobs
                  </button>
                  <button
                    onClick={() => handleTabChange("history")}
                    className={`py-2 px-4 text-sm font-medium ${activeTab === "history"
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
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
              <BookingTable
                bookings={filteredAndSortedBookings}
                onViewDetails={handleViewBooking}
                totalPages={totalPages[activeTab]}
                currentPage={currentPage[activeTab]}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </main>
      </div>

      {isViewModalOpen && selectedBooking && (
        <div
          className={`fixed inset-0 p-5 flex items-center justify-center z-50 ${activeTab === "history" && (selectedBooking.status === "rejected" || selectedBooking.status === "cancelled")
            ? "bg-gray-800/50 backdrop-blur-sm"
            : "bg-gray-800/30 backdrop-blur-sm"
            }`}
          onClick={() => setIsViewModalOpen(false)}
        >
          <div
            className={`p-6 rounded-lg shadow-lg w-96 relative bg-white ${activeTab === "history" && (selectedBooking.status === "rejected" || selectedBooking.status === "cancelled")
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
                  <strong>Rejection Reason:</strong> <span className="text-red-500 dark:text-red-400">{selectedBooking.rejectedReason}</span>
                </p>
              )}
              {selectedBooking.status === "cancelled" && selectedBooking.cancelReason && (
                <p>
                  <strong>Cancellation Reason:</strong> <span className="text-red-500 dark:text-red-400">{selectedBooking.cancelReason}</span>
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
            {activeTab === "requests" && (
              <div className="flex justify-between gap-4 mt-6">
                <button
                  onClick={() => setIsAcceptModalOpen(true)}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  disabled={actionLoading}
                >
                  Accept Job
                </button>
                <button
                  onClick={handleRejectBooking}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  disabled={actionLoading}
                >
                  Reject Job
                </button>
              </div>
            )}
            {activeTab === "scheduled" && !selectedQuota && (
              <button
                onClick={handleGenerateQuota}
                className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                disabled={actionLoading}
              >
                Generate Quota
              </button>
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isAcceptModalOpen}
        onConfirm={handleAcceptBooking}
        onCancel={() => setIsAcceptModalOpen(false)}
        action="acceptBooking"
        entityType="booking"
        isProcessing={actionLoading}
        error={error}
      />

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
        isProcessing={actionLoading}
        error={error}
      />

      {isQuotaModalOpen && selectedBooking && (
        <div
          className="fixed inset-0 p-5 flex items-center justify-center z-50 bg-gray-800/50 backdrop-blur-sm"
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
                <label className="block text-sm font-medium text-gray-700">Labor Cost (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={quotaData.laborCost}
                  onChange={(e) => {
                    setQuotaData({ ...quotaData, laborCost: e.target.value });
                    setQuotaErrors({ ...quotaErrors, laborCost: "" });
                  }}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 ${quotaErrors.laborCost ? "border-red-500" : ""}`}
                  min="0"
                  disabled={actionLoading}
                />
                {quotaErrors.laborCost && (
                  <p className="mt-1 text-sm text-red-500">{quotaErrors.laborCost}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Material Cost (₹)</label>
                <input
                  type="number"
                  value={quotaData.materialCost}
                  onChange={(e) => {
                    setQuotaData({ ...quotaData, materialCost: e.target.value });
                    setQuotaErrors({ ...quotaErrors, materialCost: "" });
                  }}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 ${quotaErrors.materialCost ? "border-red-500" : ""}`}
                  min="0"
                  disabled={actionLoading}
                />
                {quotaErrors.materialCost && (
                  <p className="mt-1 text-sm text-red-500">{quotaErrors.materialCost}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Additional Charges (₹)</label>
                <input
                  type="number"
                  value={quotaData.additionalCharges}
                  onChange={(e) => {
                    setQuotaData({ ...quotaData, additionalCharges: e.target.value });
                    setQuotaErrors({ ...quotaErrors, additionalCharges: "" });
                  }}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 ${quotaErrors.additionalCharges ? "border-red-500" : ""}`}
                  min="0"
                  disabled={actionLoading}
                />
                {quotaErrors.additionalCharges && (
                  <p className="mt-1 text-sm text-red-500">{quotaErrors.additionalCharges}</p>
                )}
              </div>
              <div className="flex justify-between gap-4">
                <button
                  onClick={handleCancelQuota}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmGenerateQuota}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  disabled={actionLoading}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isConfirmQuotaModalOpen}
        onConfirm={submitQuota}
        onCancel={() => setIsConfirmQuotaModalOpen(false)}
        action="addQuota"
        entityType="booking"
        customTitle="Confirm Quota Generation"
        isProcessing={actionLoading}
        error={error}
      />
    </div>
  );
};

export default JobManagementPage;