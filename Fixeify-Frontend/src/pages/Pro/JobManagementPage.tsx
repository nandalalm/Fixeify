import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { RotateCcw, X } from "lucide-react";
import {
  fetchProBookings,
  acceptBooking,
  rejectBooking,
  generateQuota,
} from "../../api/proApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
import { logoutUserSync } from "../../store/authSlice";
import { UserRole } from "../../store/authSlice";
import { ProNavbar } from "../../components/Pro/ProNavbar";
import ProTopNavbar from "../../components/Pro/ProTopNavbar";
import { ConfirmationModal } from "../../components/Reuseable/ConfirmationModal";
// import { QuotaResponse } from "../../interfaces/quotaInterface";
import BookingTable from "../../components/Reuseable/BookingTable";
import BookingDetails from "../../components/Reuseable/BookingDetails";
import RaiseComplaintModal from "../../components/Modals/RaiseComplaintModal";
import { createTicket } from "../../store/ticketSlice";
import { TicketPriority } from "../../interfaces/ticketInterface";
import { SkeletonLine, SkeletonBlock } from "../../components/Reuseable/Skeleton";

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// removed unused status helpers; BookingDetails handles status rendering

const JobManagementPage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tabSwitching, setTabSwitching] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [activeTab, setActiveTab] = useState<"requests" | "scheduled" | "history">("requests");
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [complaintBooking, setComplaintBooking] = useState<BookingResponse | null>(null);
  const [complaintOpen, setComplaintOpen] = useState(false);
  // view is now inline using BookingDetails
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
  // const [selectedQuota, setSelectedQuota] = useState<QuotaResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "completed" | "rejected" | "cancelled" | "">("latest");
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
        case "history": {
          const historyStatuses = ["completed", "rejected", "cancelled"] as const;
          if (historyStatuses.includes(sortOption as any)) {
            status = sortOption as string; // narrow to specific history status
          } else {
            status = historyStatuses.join(",");
          }
          break;
        }
      }
      const sortByParam = sortOption === "oldest" ? "oldest" : "latest";
      const { bookings, total } = await fetchProBookings(user.id, currentPage[tab], limit, status, sortByParam);
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

  // Silent fetch to use during tab switching (no full-page loader)
  const fetchBookingsSilent = async (tab: "requests" | "scheduled" | "history", pageOverride?: number) => {
    if (!user || !accessToken || user.role !== UserRole.PRO) return;
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
        case "history": {
          const historyStatuses = ["completed", "rejected", "cancelled"] as const;
          if (historyStatuses.includes(sortOption as any)) {
            status = sortOption as string;
          } else {
            status = historyStatuses.join(",");
          }
          break;
        }
      }
      const page = typeof pageOverride === 'number' ? pageOverride : currentPage[tab];
      const sortByParam = sortOption === "oldest" ? "oldest" : "latest";
      const { bookings, total } = await fetchProBookings(user.id, page, limit, status, sortByParam);
      setBookings(bookings);
      setTotalPages((prev) => ({ ...prev, [tab]: Math.ceil(total / limit) }));
    } catch (err: any) {
      console.error(`Silent fetch pro bookings error for ${tab}:`, err);
      setError(err.response?.data?.message || "Failed to load bookings");
      if (err.response?.status === 401) {
        dispatch(logoutUserSync());
        navigate("/login");
      }
    }
  };

  useEffect(() => {
    if (tabSwitching) return; // avoid page loader during tab switch; handled by silent fetch
    fetchBookings(activeTab);
  }, [user, accessToken, dispatch, navigate, activeTab, currentPage[activeTab], sortOption]);

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


  const handleTabChange = async (tab: "requests" | "scheduled" | "history") => {
    setTabSwitching(true);
    setSelectedBooking(null);
    setActiveTab(tab);
    setSearchTerm("");
    setSortOption("latest");
    setCurrentPage((prev) => ({ ...prev, [tab]: 1 }));
    await fetchBookingsSilent(tab, 1);
    setTabSwitching(false);
  };

  const handleViewBooking = async (booking: BookingResponse) => {
    setSelectedBooking(booking);
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
      await fetchBookings(activeTab);
    } catch (err: any) {
      console.error("Accept booking error:", err);
      const errorMessage = err.response?.data?.message || "An error occurred while accepting the booking";
      showErrorMessage(errorMessage);
      setIsAcceptModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  // inline reject handler via setIsRejectModalOpen(true)

  const confirmRejectBooking = async () => {
    if (!selectedBooking || !rejectionReason) return;
    setActionLoading(true);
    try {
      await rejectBooking(selectedBooking.id, rejectionReason);
      showSuccessMessage("Booking rejected successfully");
      setIsRejectModalOpen(false);
      setRejectionReason("");
      setCustomRejectionReason("");
      await fetchBookings(activeTab);
    } catch (err: any) {
      console.error("Reject booking error:", err);
      showErrorMessage(err.response?.data?.message || "Failed to reject booking");
      setIsRejectModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  // inline quota handler via setIsQuotaModalOpen(true)

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

      await generateQuota(selectedBooking.id, {
        laborCost,
        materialCost,
        additionalCharges,
      });
      showSuccessMessage("Quota generated successfully");
      setIsConfirmQuotaModalOpen(false);
      setQuotaData({ laborCost: "", materialCost: "", additionalCharges: "" });
      await fetchBookings(activeTab);
    } catch (err: any) {
      console.error("Generate quota error:", err);
      showErrorMessage(err.response?.data?.message || "Failed to generate quota");
      setIsConfirmQuotaModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAndSortedBookings = useMemo(() => {
    // Backend now handles status filtering and createdAt sorting. Only apply search filter here.
    return bookings.filter(
      (booking) =>
        booking.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.location.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bookings, searchTerm]);

  const clearFilters = () => {
    setSearchTerm("");
    setSortOption("latest");
    setCurrentPage((prev) => ({ ...prev, [activeTab]: 1 }));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage((prev) => ({ ...prev, [activeTab]: page }));
  };

  const handleOpenComplaint = (booking: BookingResponse) => {
    setComplaintBooking(booking);
    setComplaintOpen(true);
  };

  const handleSubmitComplaint = async (data: { subject: string; description: string; priority?: TicketPriority }) => {
    if (!user || !complaintBooking) return;
    try {
      await dispatch(
        createTicket({
          complainantType: "pro",
          complainantId: user.id,
          againstType: "user",
          againstId: complaintBooking.user.id,
          bookingId: complaintBooking.id,
          subject: data.subject,
          description: data.description,
          priority: data.priority,
        })
      ).unwrap();
      setComplaintOpen(false);
      setComplaintBooking(null);
      // Refetch bookings so the complaint button hides based on updated flags
      await fetchBookings(activeTab);
      showSuccessMessage("Complaint submitted successfully");
    } catch (err: any) {
      showErrorMessage(err?.response?.data?.message || "Failed to submit complaint");
    }
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
      <div className="flex flex-col h-screen bg-gray-50">
        <ProTopNavbar 
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          isLargeScreen={isLargeScreen}
          sidebarOpen={sidebarOpen}
        />
        <div className="flex flex-1">
          <ProNavbar isOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto mb-[50px]">
              <SkeletonLine width="w-1/3" height="h-8" className="mb-6" />
              <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
                <SkeletonLine width="w-full sm:w-5/6" height="h-10" />
                <SkeletonLine width="w-full sm:w-1/6" height="h-10" />
              </div>
              <div className="space-y-3">
                <SkeletonBlock height="h-20" />
                <SkeletonBlock height="h-20" />
                <SkeletonBlock height="h-20" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ProTopNavbar 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex flex-1 overflow-visible">
        <ProNavbar isOpen={sidebarOpen} />
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300`}
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

            {!selectedBooking && (
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
            )}

            {!selectedBooking && (
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
            )}

            {selectedBooking ? (
              <div className="mt-4">
                <BookingDetails
                  bookingId={selectedBooking.id}
                  viewerRole="pro"
                  onBack={async () => {
                    setSelectedBooking(null);
                    await fetchBookings(activeTab);
                  }}
                  onRaiseComplaint={(booking) => handleOpenComplaint({ ...selectedBooking!, id: booking.id } as BookingResponse)}
                  onAccept={() => setIsAcceptModalOpen(true)}
                  onReject={() => setIsRejectModalOpen(true)}
                  onGenerateQuota={() => setIsQuotaModalOpen(true)}
                />
              </div>
            ) : tabSwitching ? (
              // Table-only skeletons during tab switching (always take precedence over empty state)
              <>
                <div>
                  {/* Mobile cards skeleton */}
                  <div className="md:hidden flex flex-col gap-4 animate-pulse">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={`job-card-skel-${i}`} className="bg-white p-4 rounded-md shadow border border-gray-200">
                        <SkeletonLine width="w-20" height="h-4" />
                        <div className="mt-2 space-y-2">
                          <SkeletonLine width="w-40" height="h-4" />
                          <SkeletonLine width="w-24" height="h-4" />
                          <SkeletonLine width="w-28" height="h-4" />
                        </div>
                        <div className="mt-3">
                          <SkeletonLine width="w-16" height="h-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Desktop rows skeleton (no headers/pagination) */}
                  <div className="hidden md:block overflow-x-auto animate-pulse">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                      <div className="divide-y divide-gray-200">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={`job-row-skel-${i}`} className="grid grid-cols-12 gap-4 px-4 py-3">
                            <SkeletonLine width="w-10" height="h-4" />
                            <div className="col-span-6 flex items-center gap-2">
                              <SkeletonLine width="w-48" height="h-4" />
                            </div>
                            <div className="col-span-2">
                              <SkeletonLine width="w-24" height="h-4" />
                            </div>
                            <div className="col-span-2">
                              <SkeletonLine width="w-24" height="h-4" />
                            </div>
                            <div className="col-span-1">
                              <SkeletonLine width="w-16" height="h-8" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : filteredAndSortedBookings.length === 0 ? (
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
              <>
                  <BookingTable
                    bookings={filteredAndSortedBookings}
                    onViewDetails={handleViewBooking}
                    totalPages={totalPages[activeTab]}
                    currentPage={currentPage[activeTab]}
                    onPageChange={handlePageChange}
                  />
              </>
            )}
          </div>
        </main>
      </div>

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
                  className="flex-1 border border-[#032b44] text-[#032b44] px-4 py-2 rounded-md hover:bg-[#054869]/10 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmGenerateQuota}
                  className="flex-1 bg-[#032b44] text-white px-4 py-2 rounded-md hover:bg-[#054869] transition-colors"
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

      <RaiseComplaintModal
        open={complaintOpen}
        onClose={() => { setComplaintOpen(false); setComplaintBooking(null); }}
        onSubmit={handleSubmitComplaint}
        bookingSummary={complaintBooking ? `${complaintBooking.category.name} with ${complaintBooking.user.name} on ${formatDate(new Date(complaintBooking.preferredDate))}` : undefined}
      />
    </div>
  );
};

export default JobManagementPage;