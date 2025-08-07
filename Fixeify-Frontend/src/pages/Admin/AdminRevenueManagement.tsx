import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { Menu, Search, ChevronLeft, ChevronRight, X, RotateCcw } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { ConfirmationModal } from "../../components/Reuseable/ConfirmationModal";
import { fetchWithdrawalRequests, acceptWithdrawalRequest, rejectWithdrawalRequest, fetchApprovedProById } from "../../api/adminApi";
import { IWithdrawalRequest } from "../../interfaces/withdrawalRequestInterface";
import { IApprovedPro } from "../../interfaces/adminInterface";

const formatDateIST = (date: Date): string => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const getStatusStyles = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "approved":
      return "bg-green-600 text-white";
    case "rejected":
      return "bg-red-600 text-white";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const AdminRevenueManagement: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [withdrawals, setWithdrawals] = useState<IWithdrawalRequest[]>([]);
  const [pros, setPros] = useState<{ [key: string]: IApprovedPro }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<IWithdrawalRequest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [customRejectionReason, setCustomRejectionReason] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const limit = 5;

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
    } else {
      const getWithdrawals = async () => {
        try {
          const { withdrawals, total, pros } = await fetchWithdrawalRequests(currentPage, limit);
          setWithdrawals(withdrawals);
          const proMap: { [key: string]: IApprovedPro } = {};
          for (const pro of pros) {
            const proDetails = await fetchApprovedProById(pro._id);
            proMap[pro._id] = proDetails;
          }
          setPros(proMap);
          setTotalPages(Math.ceil(total / limit));
        } catch (error: any) {
          console.error("Failed to fetch withdrawals:", error);
          setError(error.response?.data?.message || "Failed to load withdrawal requests");
        }
      };
      getWithdrawals();
    }
  }, [user, navigate, currentPage]);

  // Auto-disappear for success and error messages after 2 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const handleViewWithdrawal = (withdrawal: IWithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setIsViewModalOpen(true);
  };

  const handleAcceptWithdrawal = async () => {
    if (!selectedWithdrawal) return;
    setActionLoading(true);
    try {
      await acceptWithdrawalRequest(selectedWithdrawal.id);
      setSuccessMessage("Withdrawal request accepted successfully");
      setIsAcceptModalOpen(false);
      setIsViewModalOpen(false);
      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === selectedWithdrawal.id ? { ...w, status: "approved" } : w
        )
      );
    } catch (err: any) {
      console.error("Accept withdrawal error:", err);
      setError(err.response?.data?.message || "Failed to accept withdrawal request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectWithdrawal = () => {
    setIsViewModalOpen(false);
    setIsRejectModalOpen(true);
  };

  const confirmRejectWithdrawal = async () => {
    if (!selectedWithdrawal || !rejectionReason) return;
    setActionLoading(true);
    try {
      await rejectWithdrawalRequest(selectedWithdrawal.id, { reason: rejectionReason });
      setSuccessMessage("Withdrawal request rejected successfully");
      setIsRejectModalOpen(false);
      setRejectionReason("");
      setCustomRejectionReason("");
      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === selectedWithdrawal.id
            ? { ...w, status: "rejected", rejectionReason }
            : w
        )
      );
    } catch (err: any) {
      console.error("Reject withdrawal error:", err);
      setError(err.response?.data?.message || "Failed to reject withdrawal request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSortBy("latest");
    setCurrentPage(1);
  };

  const sortWithdrawals = (withdrawals: IWithdrawalRequest[]): IWithdrawalRequest[] => {
    const sorted = [...withdrawals];
    switch (sortBy) {
      case "latest":
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "oldest":
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case "pending":
        return sorted.filter((w) => w.status === "pending");
      case "approved":
        return sorted.filter((w) => w.status === "approved");
      case "rejected":
        return sorted.filter((w) => w.status === "rejected");
      default:
        return sorted;
    }
  };

  const filteredWithdrawals = sortWithdrawals(
    withdrawals.filter((withdrawal) =>
      pros[withdrawal.proId]?.firstName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      pros[withdrawal.proId]?.lastName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
  );

  if (!user || user.role !== "admin") return null;

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
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Revenue Management</h2>

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

            {withdrawals.length === 0 ? (
              <div className="text-center text-gray-600">
                No withdrawal requests currently
              </div>
            ) : (
              <>
                <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="relative w-full sm:w-5/6">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by pro name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
                    />
                  </div>
                  <div className="relative w-full sm:w-1/6">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      <option value="latest">Sort by Latest</option>
                      <option value="oldest">Sort by Oldest</option>
                      <option value="pending">Sort by Pending</option>
                      <option value="approved">Sort by Approved</option>
                      <option value="rejected">Sort by Rejected</option>
                    </select>
                  </div>
                </div>

                {filteredWithdrawals.length === 0 ? (
                  <div className="text-center text-gray-600 space-y-2">
                    <p>No results found for your search or sort criteria.</p>
                    <button
                      onClick={handleResetFilters}
                      className="text-blue-600 flex items-center justify-center mx-auto"
                      aria-label="Clear search and sort filters"
                    >
                      Clear filter
                      <RotateCcw className="ml-2 h-5 w-5 text-blue-600" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Withdrawals Table */}
                    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Serial No.</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-3/12">Pro Name</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Payment Mode</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredWithdrawals.map((withdrawal, index) => (
                              <tr key={withdrawal.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {(currentPage - 1) * limit + index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  {pros[withdrawal.proId]?.firstName && pros[withdrawal.proId]?.lastName
                                    ? `${pros[withdrawal.proId].firstName} ${pros[withdrawal.proId].lastName}`
                                    : "Unknown"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  {withdrawal.paymentMode === "bank" ? "Bank" : "UPI"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span
                                    className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyles(
                                      withdrawal.status
                                    )}`}
                                  >
                                    {withdrawal.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => handleViewWithdrawal(withdrawal)}
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

                      {/* Pagination */}
                      <div className="bg-white px-4 py-3 flex items-center justify-center border-t border-gray-200 sm:px-6">
                        <nav className="flex items-center space-x-2" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <span>{`Page ${currentPage} of ${totalPages}`}</span>
                          <button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* View Modal */}
      {isViewModalOpen && selectedWithdrawal && (
        <div className="fixed inset-0 p-5 flex items-center justify-center z-50 bg-gray-800/50 backdrop-blur-sm">
          <div className="p-6 rounded-lg shadow-lg w-96 bg-white relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Withdrawal Details</h3>
            <div className="space-y-2">
              <p>
                <strong>Name:</strong>{" "}
                {pros[selectedWithdrawal.proId]?.firstName && pros[selectedWithdrawal.proId]?.lastName
                  ? `${pros[selectedWithdrawal.proId].firstName} ${pros[selectedWithdrawal.proId].lastName}`
                  : "Unknown"}
              </p>
              <p>
                <strong>Service:</strong> {pros[selectedWithdrawal.proId]?.category?.name || "N/A"}
              </p>
              <p>
                <strong>Email:</strong> {pros[selectedWithdrawal.proId]?.email || "N/A"}
              </p>
              <p>
                <strong>Phone Number:</strong> {pros[selectedWithdrawal.proId]?.phoneNumber || "N/A"}
              </p>
              <p>
                <strong>Amount:</strong> ₹{selectedWithdrawal.amount}
              </p>
              <p>
                <strong>Payment Mode:</strong> {selectedWithdrawal.paymentMode === "bank" ? "Bank" : "UPI"}
              </p>
              {selectedWithdrawal.paymentMode === "bank" && (
                <>
                  <p>
                    <strong>Bank Name:</strong> {selectedWithdrawal.bankName || "N/A"}
                  </p>
                  <p>
                    <strong>Account Number:</strong> {selectedWithdrawal.accountNumber || "N/A"}
                  </p>
                  <p>
                    <strong>IFSC Code:</strong> {selectedWithdrawal.ifscCode || "N/A"}
                  </p>
                  <p>
                    <strong>Branch Name:</strong> {selectedWithdrawal.branchName || "N/A"}
                  </p>
                </>
              )}
              {selectedWithdrawal.paymentMode === "upi" && (
                <p>
                  <strong>UPI ID:</strong> {selectedWithdrawal.upiCode || "N/A"}
                </p>
              )}
              <p>
                <strong>Status:</strong>
                <span
                  className={`ml-2 inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyles(
                    selectedWithdrawal.status
                  )}`}
                >
                  {selectedWithdrawal.status}
                </span>
              </p>
              {selectedWithdrawal.rejectionReason && (
                <p>
                  <strong>Rejection Reason:</strong>{" "}
                  <span className="text-red-500">{selectedWithdrawal.rejectionReason}</span>
                </p>
              )}
              <p>
                <strong>Date:</strong> {formatDateIST(selectedWithdrawal.createdAt)}
              </p>
            </div>
            {selectedWithdrawal.status === "pending" && (
              <div className="flex justify-between gap-4 mt-6">
                <button
                  onClick={() => setIsAcceptModalOpen(true)}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  disabled={actionLoading}
                >
                  Accept
                </button>
                <button
                  onClick={handleRejectWithdrawal}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  disabled={actionLoading}
                >
                  Reject
                </button>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accept Confirmation Modal */}
      <ConfirmationModal
        isOpen={isAcceptModalOpen}
        onConfirm={handleAcceptWithdrawal}
        onCancel={() => setIsAcceptModalOpen(false)}
        action="acceptWithdrawal"
        entityType="wallet"
        isProcessing={actionLoading}
        error={error}
      />

      {/* Reject Confirmation Modal */}
      <ConfirmationModal
        isOpen={isRejectModalOpen}
        onConfirm={confirmRejectWithdrawal}
        onCancel={() => {
          setIsRejectModalOpen(false);
          setRejectionReason("");
          setCustomRejectionReason("");
        }}
        action="rejectWithdrawal"
        entityType="wallet"
        reason={rejectionReason}
        setReason={setRejectionReason}
        customReason={customRejectionReason}
        setCustomReason={setCustomRejectionReason}
        isProcessing={actionLoading}
        error={error}
      />
    </div>
  );
};

export default AdminRevenueManagement;