import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { Search, ChevronLeft, ChevronRight, X, RotateCcw, IndianRupee, TrendingUp, TrendingDown, Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { ConfirmationModal } from "../../components/Reuseable/ConfirmationModal";
import { fetchWithdrawalRequests, acceptWithdrawalRequest, rejectWithdrawalRequest, fetchApprovedProById, fetchDashboardMetrics, fetchAdminTransactions, type AdminTransactionDTO } from "../../api/adminApi";
import TransactionDetails from "@/components/Reuseable/TransactionDetails";
import WithdrawalRequestDetails from "@/components/Reuseable/WithdrawalRequestDetails";
import { type ITransaction } from "@/interfaces/walletInterface";
import { IWithdrawalRequest } from "../../interfaces/withdrawalRequestInterface";
import { IApprovedPro } from "../../interfaces/adminInterface";
import { AdminTopNavbar } from "../../components/Admin/AdminTopNavbar";

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
      return "bg-yellow-200 text-yellow-800";
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const AdminRevenueManagement: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [activeTab, setActiveTab] = useState<'revenue' | 'withdrawals'>('revenue');
  const [withdrawals, setWithdrawals] = useState<IWithdrawalRequest[]>([]);
  const [pros, setPros] = useState<{ [key: string]: IApprovedPro }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("oldest");
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
  // Revenue metrics state
  // Loading states
  const [withdrawalsLoading, setWithdrawalsLoading] = useState<boolean>(false);
  const [adminTxnsLoading, setAdminTxnsLoading] = useState<boolean>(false);
  
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [yearlyRevenue, setYearlyRevenue] = useState<number>(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [dailyRevenue, setDailyRevenue] = useState<number>(0);
  // Comparisons (percent delta vs previous periods)
  const [yearlyDelta, setYearlyDelta] = useState<number | null>(null);
  const [monthlyDelta, setMonthlyDelta] = useState<number | null>(null);
  const [dailyDelta, setDailyDelta] = useState<number | null>(null);
  // Admin transactions state (Revenue tab)
  const [adminTxns, setAdminTxns] = useState<AdminTransactionDTO[]>([]);
  const [adminTxnPage, setAdminTxnPage] = useState<number>(1);
  const [adminTxnTotalPages, setAdminTxnTotalPages] = useState<number>(1);
  const [selectedAdminTransaction, setSelectedAdminTransaction] = useState<ITransaction | null>(null);

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  // Helpers to refresh data so we can call on view/back
  const refreshWithdrawals = async () => {
    try {
      setWithdrawalsLoading(true);
      const isStatus = ["pending", "approved", "rejected"].includes(sortBy);
      const backendSortBy = (sortBy === "latest" || sortBy === "oldest") ? (sortBy as "latest" | "oldest") : undefined;
      const statusParam = isStatus ? (sortBy as "pending" | "approved" | "rejected") : undefined;
      const { withdrawals, total, pros } = await fetchWithdrawalRequests(currentPage, limit, backendSortBy, statusParam);
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
      setError(error?.response?.data?.message || "Failed to load withdrawal requests");
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  const refreshAdminTransactions = async () => {
    if (!user) return;
    try {
      setAdminTxnsLoading(true);
      const { transactions, total } = await fetchAdminTransactions(user.id, adminTxnPage, 5);
      setAdminTxns(transactions);
      setAdminTxnTotalPages(Math.max(1, Math.ceil(total / 5)));
    } catch (err) {
      console.error('Failed to fetch admin transactions', err);
    } finally {
      setAdminTxnsLoading(false);
    }
  };

  // Revenue metrics fetch helper to reuse across effects and tab switches
  const refreshRevenueMetrics = async () => {
    if (!user) return;
    try {
      setRevenueLoading(true);
      const metrics = await fetchDashboardMetrics(user.id);
      setTotalRevenue((metrics as any).totalRevenue ?? 0);
      setMonthlyRevenue((metrics as any).monthlyRevenue ?? 0);
      setYearlyRevenue((metrics as any).yearlyRevenue ?? 0);
      setDailyRevenue((metrics as any).dailyRevenue ?? 0);
      setYearlyDelta((metrics as any).yearlyDelta ?? (metrics as any).yearlyDeltaPercent ?? null);
      setMonthlyDelta((metrics as any).monthlyDelta ?? (metrics as any).monthlyDeltaPercent ?? null);
      setDailyDelta((metrics as any).dailyDelta ?? (metrics as any).dailyDeltaPercent ?? null);
    } catch (err) {
      console.error('Failed to fetch revenue metrics', err);
    } finally {
      setRevenueLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
    } else {
      // Always refresh both datasets so we can decide whether to show tabs
      refreshRevenueMetrics();
      refreshAdminTransactions();
      refreshWithdrawals();
    }
  }, [user, navigate, currentPage, adminTxnPage, sortBy]);

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

  // Refetch fresh data when switching tabs, and clear any selected detail views
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    // Clear detail selections on tab switch
    setSelectedWithdrawal(null);
    setSelectedAdminTransaction(null);

    if (activeTab === 'revenue') {
      refreshRevenueMetrics();
      refreshAdminTransactions();
    } else if (activeTab === 'withdrawals') {
      refreshWithdrawals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);


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

  const handleViewWithdrawal = async (withdrawal: IWithdrawalRequest) => {
    await refreshWithdrawals();
    setSelectedWithdrawal(withdrawal);
    setIsViewModalOpen(false);
  };

  const handleViewAdminTransaction = async (t: AdminTransactionDTO) => {
    await refreshAdminTransactions();
    setSelectedAdminTransaction({ _id: t.id, amount: t.amount, type: t.type as any, date: new Date(t.date) as any, description: t.description, bookingId: (t as any).bookingId, transactionId: (t as any).transactionId });
  };

  const handleAcceptWithdrawal = async () => {
    if (!selectedWithdrawal) return;
    setActionLoading(true);
    try {
      await acceptWithdrawalRequest(selectedWithdrawal.id);
      setSuccessMessage("Withdrawal request accepted successfully");
      setIsAcceptModalOpen(false);
      setIsViewModalOpen(false);
      // Refresh list from server, then update inline details to hide buttons
      await refreshWithdrawals();
      setSelectedWithdrawal((prev) =>
        prev && prev.id === selectedWithdrawal.id ? { ...prev, status: "approved" } : prev
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
      // Refresh list from server, then update inline details to hide buttons
      await refreshWithdrawals();
      setSelectedWithdrawal((prev) =>
        prev && prev.id === selectedWithdrawal.id
          ? { ...prev, status: "rejected", rejectionReason }
          : prev
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
    setSortBy("oldest");
    setCurrentPage(1);
  };

  // Backend returns already sorted/filtered; only apply local search by pro name
  const filteredWithdrawals = withdrawals.filter((withdrawal) =>
    pros[withdrawal.proId]?.firstName
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
    pros[withdrawal.proId]?.lastName
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  if (!user || user.role !== "admin") return null;

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

            {/* Early empty state: hide tabs when both empty */}
            {adminTxns.length === 0 && withdrawals.length === 0 && !adminTxnsLoading && !withdrawalsLoading ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">No transactions yet.</div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm mb-6">
                <div className="border-b border-gray-200 flex">
                  <button
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'revenue' ? 'text-[#032B44] border-b-2 border-[#032B44]' : 'text-gray-600 hover:text-gray-800'}`}
                    onClick={() => setActiveTab('revenue')}
                  >
                    Revenue
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'withdrawals' ? 'text-[#032B44] border-b-2 border-[#032B44]' : 'text-gray-600 hover:text-gray-800'}`}
                    onClick={() => setActiveTab('withdrawals')}
                  >
                    Withdrawal Requests
                  </button>
                </div>
              </div>
            )}

            {/* Withdrawals tab empty-state without search/sort when none exist (below tabs) */}
            {activeTab === 'withdrawals' && withdrawals.length === 0 && !(adminTxns.length === 0 && withdrawals.length === 0) && !withdrawalsLoading && (
              (() => {
                const isStatusFilter = ["pending", "approved", "rejected"].includes(sortBy);
                if (isStatusFilter || searchQuery.trim().length > 0) {
                  return (
                    <div className="text-center text-gray-600 space-y-2 bg-white rounded-lg shadow-sm p-8">
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
                  );
                }
                return (
                  <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">No withdrawal requests at the moment.</div>
                );
              })()
            )}

            {/* Withdrawals Tab Content */}
            {activeTab === 'withdrawals' && withdrawals.length > 0 && (
              selectedWithdrawal ? (
                <div className="mt-2">
                  <WithdrawalRequestDetails
                    withdrawal={selectedWithdrawal}
                    onBack={async () => {
                      await refreshWithdrawals();
                      setSelectedWithdrawal(null);
                    }}
                    onApprove={() => setIsAcceptModalOpen(true)}
                    onReject={handleRejectWithdrawal}
                    isProcessing={actionLoading}
                  />
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

                  {withdrawalsLoading ? (
                    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Serial No.</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-3/12">Professional</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Payment Mode</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <tr key={i}>
                                <td className="px-6 py-4"><div className="h-4 w-10 bg-gray-200 rounded animate-pulse" /></td>
                                <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></td>
                                <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
                                <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" /></td>
                                <td className="px-6 py-4"><div className="h-8 w-16 bg-gray-200 rounded-md animate-pulse" /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : filteredWithdrawals.length === 0 ? (
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
                      {/* Withdrawals - Mobile Cards */}
                      <div className="sm:hidden space-y-3">
                        {filteredWithdrawals.map((withdrawal, index) => (
                          <div key={withdrawal.id} className="bg-white shadow rounded-lg p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs text-gray-600 mb-1">
                                  <strong>S.No:</strong> {(currentPage - 1) * limit + index + 1}
                                </p>
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {pros[withdrawal.proId]?.firstName && pros[withdrawal.proId]?.lastName
                                    ? `${pros[withdrawal.proId].firstName} ${pros[withdrawal.proId].lastName}`
                                    : "Unknown"}
                                </p>
                                <p className="text-sm text-gray-700">Payment Mode: {withdrawal.paymentMode === "bank" ? "Bank" : "UPI"}</p>
                                <p className="mt-1">
                                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${getStatusStyles(withdrawal.status)}`}>
                                    {withdrawal.status}
                                  </span>
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                <button
                                  onClick={() => handleViewWithdrawal(withdrawal)}
                                  className="bg-[#032B44] text-white px-3 py-2 rounded-md text-sm hover:bg-[#054869] transition-colors"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* Mobile Pagination */}
                        {!withdrawalsLoading && (
                          <div className="bg-white px-4 py-3 flex items-center justify-center border border-gray-200 rounded-md">
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
                        )}
                      </div>

                      {/* Withdrawals Table (>= sm) */}
                      <div className="hidden sm:block bg-white shadow-lg rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Serial No.</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Professional</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-3/12">Payment Mode</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-3/12">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-1/12">Action</th>
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
                                      className="bg-[#032B44] text-white px-4 py-1 rounded-md text-sm hover:bg-[#054869] transition-colors"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination (>= sm) */}
                        {!withdrawalsLoading && (
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
                        )}
                      </div>
                    </>
                  )}
                </>
              )
            )}

            {activeTab === 'revenue' ? (
              revenueLoading ? (
                <>
                  {/* Revenue metrics skeleton */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                        <div className="p-5">
                          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                          <div className="mt-4 h-8 w-40 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Admin Transactions skeleton while metrics loading */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Admin Transactions</h3>
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                      <div className="p-4 space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="h-4 w-10 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                            <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                            <div className="h-8 w-16 bg-gray-200 rounded-md animate-pulse" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : totalRevenue === 0 ? (
                <div className="text-center text-gray-600">No revenue credited yet</div>
              ) : (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {/* Total Revenue */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 shadow-sm">
                    <div className="p-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-emerald-900">Total Revenue</h3>
                        <p className="mt-2 text-3xl font-extrabold text-emerald-800">₹{totalRevenue.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-200/60 text-emerald-800">
                        <IndianRupee className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  {/* Yearly Revenue */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 shadow-sm">
                    <div className="p-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-indigo-900">Yearly Revenue</h3>
                        <p className="mt-2 text-3xl font-extrabold text-indigo-800">₹{yearlyRevenue.toFixed(2)}</p>
                        {yearlyDelta !== null && (
                          <div className={`mt-2 inline-flex items-center text-xs font-medium rounded-full px-2 py-1 ${yearlyDelta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {yearlyDelta >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                            {Math.abs(yearlyDelta).toFixed(1)}% vs last year
                          </div>
                        )}
                      </div>
                      <div className="p-3 rounded-lg bg-indigo-200/60 text-indigo-800">
                        <CalendarRange className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  {/* Monthly Revenue */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 shadow-sm">
                    <div className="p-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-sky-900">Monthly Revenue</h3>
                        <p className="mt-2 text-3xl font-extrabold text-sky-800">₹{monthlyRevenue.toFixed(2)}</p>
                        {monthlyDelta !== null && (
                          <div className={`mt-2 inline-flex items-center text-xs font-medium rounded-full px-2 py-1 ${monthlyDelta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {monthlyDelta >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                            {Math.abs(monthlyDelta).toFixed(1)}% vs last month
                          </div>
                        )}
                      </div>
                      <div className="p-3 rounded-lg bg-sky-200/60 text-sky-800">
                        <Calendar className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  {/* Daily Revenue */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 shadow-sm">
                    <div className="p-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-amber-900">Daily Revenue</h3>
                        <p className="mt-2 text-3xl font-extrabold text-amber-800">₹{dailyRevenue.toFixed(2)}</p>
                        {dailyDelta !== null && (
                          <div className={`mt-2 inline-flex items-center text-xs font-medium rounded-full px-2 py-1 ${dailyDelta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {dailyDelta >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                            {Math.abs(dailyDelta).toFixed(1)}% vs yesterday
                          </div>
                        )}
                      </div>
                      <div className="p-3 rounded-lg bg-amber-200/60 text-amber-800">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Transactions Table / Details */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Admin Transactions</h3>
                  {selectedAdminTransaction ? (
                    <div className="mt-2">
                      <TransactionDetails
                        transaction={selectedAdminTransaction}
                        onClose={async () => {
                          await refreshAdminTransactions();
                          setSelectedAdminTransaction(null);
                        }}
                        showRevenueSplit
                      />
                    </div>
                  ) : adminTxnsLoading ? (
                    <>
                      {/* Mobile cards skeleton */}
                      {!isLargeScreen ? (
                        <div className="flex flex-col gap-4">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="bg-white p-4 rounded-md shadow border border-gray-200">
                              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-2" />
                              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                              <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-2" />
                              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                              <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-1/12">S.No</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-3/12">Description</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-3/12">Transaction ID</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Type</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Amount</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Date</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Action</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <tr key={i}>
                                    <td className="py-3 px-4"><div className="h-4 w-10 bg-gray-200 rounded animate-pulse" /></td>
                                    <td className="py-3 px-4"><div className="h-4 w-48 bg-gray-200 rounded animate-pulse" /></td>
                                    <td className="py-3 px-4"><div className="h-4 w-56 bg-gray-200 rounded animate-pulse" /></td>
                                    <td className="py-3 px-4"><div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" /></td>
                                    <td className="py-3 px-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                                    <td className="py-3 px-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                                    <td className="py-3 px-4"><div className="h-8 w-16 bg-gray-200 rounded-md animate-pulse" /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  ) : adminTxns.length === 0 ? (
                    <div className="text-center text-gray-500">No admin transactions yet.</div>
                  ) : !isLargeScreen ? (
                    <>
                      <div className="flex flex-col gap-4">
                        {adminTxns.map((t, idx) => (
                          <div key={t.id} className="bg-white p-4 rounded-md shadow border border-gray-200">
                            <p className="text-sm text-gray-700"><strong>S.No:</strong> {idx + 1 + (adminTxnPage - 1) * 5}</p>
                            <p className="text-sm text-gray-700"><strong>Description:</strong> {t.description || '-'}</p>
                            <p className="text-sm text-gray-700"><strong>Transaction ID:</strong> {(t as any).transactionId || t.id}</p>
                            <p className="text-sm text-gray-700">
                              <strong>Type:</strong>{' '}
                              <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${t.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.type}</span>
                            </p>
                            <p className="text-sm text-gray-700"><strong>Amount:</strong> {t.type === 'credit' ? '+' : '-'}₹{t.amount.toFixed(2)}</p>
                            <p className="text-sm text-gray-700"><strong>Date:</strong> {new Date(t.date).toLocaleDateString()}</p>
                            <div className="mt-2">
                              <button onClick={() => handleViewAdminTransaction(t)} className="bg-[#032B44] text-white px-4 py-1 rounded-md text-sm hover:bg-[#054869] transition-colors">View</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {adminTxnTotalPages >= 1 && !adminTxnsLoading && (
                        <div className="bg-white px-4 py-3 mt-2 flex items-center justify-center border border-gray-200 rounded-md">
                          <nav className="flex items-center space-x-2" aria-label="Pagination">
                            <button onClick={() => setAdminTxnPage((p) => Math.max(1, p - 1))} disabled={adminTxnPage === 1} className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50">
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-sm text-gray-700">Page {adminTxnPage} of {adminTxnTotalPages}</span>
                            <button onClick={() => setAdminTxnPage((p) => Math.min(adminTxnTotalPages, p + 1))} disabled={adminTxnPage === adminTxnTotalPages} className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50">
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          </nav>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-1/12">S.No</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-3/12">Description</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-3/12">Transaction ID</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Amount</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {adminTxns.map((t, idx) => (
                              <tr key={t.id} className="hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm text-gray-900 border-b">{idx + 1 + (adminTxnPage - 1) * 5}</td>
                                <td className="py-3 px-4 text-sm text-gray-700 border-b">{t.description || '-'}</td>
                                <td className="py-3 px-4 text-sm text-gray-700 border-b">{(t as any).transactionId || t.id}</td>
                                <td className="py-3 px-4 text-sm text-gray-700 border-b">
                                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${t.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.type}</span>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-700 border-b">{t.type === 'credit' ? '+' : '-'}₹{t.amount.toFixed(2)}</td>
                                <td className="py-3 px-4 text-sm text-gray-700 border-b">{new Date(t.date).toLocaleDateString()}</td>
                                <td className="py-3 px-4 text-sm text-gray-700 border-b">
                                  <button onClick={() => handleViewAdminTransaction(t)} className="bg-[#032B44] text-white px-3 py-1 rounded-md text-sm hover:bg-[#054869] transition-colors">View</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!adminTxnsLoading && (
                        <div className="bg-white px-4 py-3 flex items-center justify-center border-t border-gray-200">
                          <nav className="flex items-center space-x-2" aria-label="Pagination">
                            <button onClick={() => setAdminTxnPage((p) => Math.max(1, p - 1))} disabled={adminTxnPage === 1} className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50">
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-sm text-gray-700">Page {adminTxnPage} of {adminTxnTotalPages}</span>
                            <button onClick={() => setAdminTxnPage((p) => Math.min(adminTxnTotalPages, p + 1))} disabled={adminTxnPage === adminTxnTotalPages} className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50">
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          </nav>
                        </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                </>
              )
            ) : null}
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
                  className="flex-1 border border-[#EF4444] text-[#EF4444] bg-transparent px-4 py-2 rounded-md hover:bg-red-50 transition-colors"
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