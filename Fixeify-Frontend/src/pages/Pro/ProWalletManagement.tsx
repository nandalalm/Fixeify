import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState, AppDispatch } from "../../store/store";
import { logoutUserSync } from "../../store/authSlice";
import { UserRole, User } from "../../store/authSlice";
import { ProNavbar } from "../../components/Pro/ProNavbar";
import ProTopNavbar from "../../components/Pro/ProTopNavbar";
import { Send } from "lucide-react";
import { findWalletByProId, getWalletWithPagination, requestWithdrawal, fetchProWithdrawalRequests } from "../../api/proApi";
import { ConfirmationModal } from "../../components/Reuseable/ConfirmationModal";
import { WithdrawalFormData, IWithdrawalRequest } from "../../interfaces/withdrawalRequestInterface";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { type WalletResponse, type ITransaction } from "../../interfaces/walletInterface";
import TransactionDetails from "@/components/Reuseable/TransactionDetails";
import WithdrawalRequestDetails from "@/components/Reuseable/WithdrawalRequestDetails";

const ProWalletManagement = () => {
  const user = useSelector((state: RootState) => state.auth.user) as User | null;
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [withdrawalForm, setWithdrawalForm] = useState<WithdrawalFormData>({
    amount: "",
    paymentMode: "upi", // Default to UPI as requested
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
    upiCode: "",
  });
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(5);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals'>('transactions');
  const [withdrawals, setWithdrawals] = useState<IWithdrawalRequest[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<IWithdrawalRequest | null>(null);
  // inline details for withdrawals; no modal
  const [selectedTransaction, setSelectedTransaction] = useState<ITransaction | null>(null);
  const [withdrawalsPage, setWithdrawalsPage] = useState<number>(1);
  const [withdrawalsTotalPages, setWithdrawalsTotalPages] = useState<number>(1);
  const [withdrawalsSearch, setWithdrawalsSearch] = useState<string>("");
  const [withdrawalsSortBy, setWithdrawalsSortBy] = useState<string>("latest"); // latest, oldest, pending, approved, rejected

  // Helpers to refresh wallet transactions and withdrawals, returning fresh data
  const refreshWallet = async (): Promise<WalletResponse | null> => {
    if (!user || !accessToken || user.role !== UserRole.PRO) return null;
    setLoading(true);
    try {
      const { wallet: walletData, total } = await getWalletWithPagination(user.id, currentPage, itemsPerPage);
      setWallet(walletData || { id: "", proId: user.id, balance: 0, transactions: [], createdAt: new Date(), updatedAt: new Date() });
      setTotalPages(Math.ceil(total / itemsPerPage));
      return walletData || null;
    } catch (err: any) {
      console.error("Fetch wallet error:", err.response?.data);
      if (err.response?.status === 404) {
        setWallet(null);
      } else if (err.response?.status === 401) {
        dispatch(logoutUserSync());
        navigate("/login");
      } else {
        setError(err.response?.data?.message || "Failed to load wallet");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const refreshProWithdrawals = async (): Promise<IWithdrawalRequest[]> => {
    if (!user || user.role !== UserRole.PRO) return [];
    try {
      const { withdrawals, total } = await fetchProWithdrawalRequests(user.id, withdrawalsPage, itemsPerPage);
      setWithdrawals(withdrawals);
      setWithdrawalsTotalPages(Math.ceil(total / itemsPerPage));
      return withdrawals;
    } catch (e) {
      console.error("Failed to fetch withdrawal requests", e);
      return [];
    }
  };

  useEffect(() => {
    refreshWallet();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
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

  useEffect(() => {
    refreshWallet();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize); // Cleanup
  }, [user, accessToken, dispatch, navigate, currentPage, itemsPerPage]);

  // Load pro withdrawal requests when the withdrawals tab becomes active or pagination changes
  useEffect(() => {
    if (activeTab === 'withdrawals') {
      refreshProWithdrawals();
    }
  }, [activeTab, user, withdrawalsPage, itemsPerPage]);

  // Refetch latest data when switching tabs and clear any selected details
  useEffect(() => {
    // Clear selected inline details on tab change
    setSelectedTransaction(null);
    setSelectedWithdrawal(null);
    if (activeTab === 'transactions') {
      refreshWallet();
    } else if (activeTab === 'withdrawals') {
      refreshProWithdrawals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Derived filtered/sorted withdrawals for current page data
  const visibleWithdrawals = (() => {
    let list = [...withdrawals];
    const q = withdrawalsSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(wr =>
        (wr.paymentMode || '').toLowerCase().includes(q) ||
        (wr.status || '').toLowerCase().includes(q) ||
        String(wr.amount).includes(q) ||
        new Date(wr.createdAt).toLocaleDateString().toLowerCase().includes(q)
      );
    }
    switch (withdrawalsSortBy) {
      case 'oldest':
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'pending': {
        list = list.filter(w => (w.status || '').toLowerCase() === 'pending');
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      }
      case 'approved': {
        list = list.filter(w => (w.status || '').toLowerCase() === 'approved');
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      }
      case 'rejected': {
        list = list.filter(w => (w.status || '').toLowerCase() === 'rejected');
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      }
      default:
        // latest
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  })();

  const clearWithdrawalsFilters = () => {
    setWithdrawalsSearch("");
    setWithdrawalsSortBy("latest");
  };

  const renderStatusBadge = (status: string) => {
    const v = (status || '').toLowerCase();
    const cls = v === 'approved'
      ? 'bg-green-100 text-green-800'
      : v === 'rejected'
      ? 'bg-red-100 text-red-800'
      : 'bg-amber-100 text-amber-800';
    return <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${cls}`}>{status}</span>;
  };


  const validateWithdrawal = (): string | null => {
    const amountNum = typeof withdrawalForm.amount === "string" ? parseFloat(withdrawalForm.amount) : withdrawalForm.amount;
    if (!withdrawalForm.amount || isNaN(amountNum) || amountNum < 200) {
      return "Please enter a valid amount of at least ₹200.";
    }
    if (wallet && amountNum > wallet.balance) {
      return "Withdrawal amount cannot exceed wallet balance.";
    }
    if (withdrawalForm.paymentMode === "bank") {
      if (!withdrawalForm.bankName || withdrawalForm.bankName.length < 3) {
        return "Not a valid bank name, *Min 3 Characters.";
      }
      if (!withdrawalForm.accountNumber || withdrawalForm.accountNumber.length !== 16) {
        return "Not a valid account number.";
      }
      if (!withdrawalForm.ifscCode || withdrawalForm.ifscCode.length < 5) {
        return "Not a valid IFSC code *Min 5 Characters.";
      }
      if (!withdrawalForm.branchName || withdrawalForm.branchName.length < 4) {
        return "Not a valid branch name *Min 4 Characters.";
      }
    } else if (withdrawalForm.paymentMode === "upi") {
      const vpa = (withdrawalForm.upiCode || "").trim();
      // Robust UPI VPA validation:
      // username: 2-256 chars, letters/digits/dot/underscore/hyphen, cannot start/end with dot/underscore/hyphen, no consecutive special chars
      // provider: 2-64 chars, starts with a letter, then letters/digits (common PSP formats)
      const upiPattern = /^(?![._-])(?!.*[._-]{2})[A-Za-z0-9._-]{2,256}(?<![._-])@[A-Za-z][A-Za-z0-9]{1,63}$/;
      if (!vpa || vpa.length < 7 || !upiPattern.test(vpa)) {
        return "UPI ID must be at least 7 chars (e.g., name@bank).";
      }
    }
    return null;
  };

  const handleWithdrawalSubmit = () => {
    const validationError = validateWithdrawal();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsWithdrawalModalOpen(false);
    setIsConfirmationModalOpen(true);
  };

  const handleWithdrawalRequest = async () => {
    if (!user) return;
    setActionLoading(true);
    console.log("Requesting withdrawal for proId:", user.id); // Log proId for debugging
    try {
      const amountNum = typeof withdrawalForm.amount === "string" ? parseFloat(withdrawalForm.amount) : withdrawalForm.amount;
      if (isNaN(amountNum)) {
        throw new Error("Invalid amount entered.");
      }
      const withdrawalData = {
        amount: amountNum,
        paymentMode: withdrawalForm.paymentMode,
        ...(withdrawalForm.paymentMode === "bank" && {
          bankName: withdrawalForm.bankName,
          accountNumber: withdrawalForm.accountNumber,
          ifscCode: withdrawalForm.ifscCode,
          branchName: withdrawalForm.branchName,
        }),
        ...(withdrawalForm.paymentMode === "upi" && { upiCode: withdrawalForm.upiCode }),
      };
      console.log("Withdrawal data sent:", withdrawalData); // Log sent data
      await requestWithdrawal(user.id, withdrawalData);
      setSuccessMessage("Withdrawal request sent successfully");
      setIsConfirmationModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 1000);
      const walletData = await findWalletByProId(user.id);
      setWallet(walletData);
      console.log("Withdrawal successful, updated wallet:", walletData);
      // Reset to first page after update
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Withdrawal request error:", err.response?.data);
      setError(err.response?.data?.message || "Failed to send withdrawal request");
      setIsConfirmationModalOpen(false);
      setIsWithdrawalModalOpen(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelWithdrawal = () => {
    setIsWithdrawalModalOpen(false);
    setError(null);
    setWithdrawalForm({ amount: "", paymentMode: "upi", bankName: "", accountNumber: "", ifscCode: "", branchName: "", upiCode: "" });
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleWithdrawalsPageChange = (page: number) => {
    if (page >= 1 && page <= withdrawalsTotalPages) {
      setWithdrawalsPage(page);
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner border-t-4 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
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
            <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Wallet Management</h1>
            {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md text-center">{successMessage}</div>}
            {wallet ? (
              <div className="flex flex-col items-center">
                <div className="w-full">
                  <div className="bg-white p-6 rounded-lg shadow-md mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Wallet Balance: ₹{wallet.balance.toFixed(2)}</h2>
                    <button
                      onClick={() => setIsWithdrawalModalOpen(true)}
                      className={`mt-4 bg-[#032B44] text-white py-3 px-6 rounded-md hover:bg-[#054869] transition-colors flex items-center justify-center gap-2 ${
                        wallet.balance <= 0 || actionLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={wallet.balance <= 0 || actionLoading}
                    >
                      <Send className="w-4 h-4" />
                      Request Withdrawal
                    </button>
                  </div>
                  {/* Tabs under wallet card */}
                  <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="border-b border-gray-200 flex">
                      <button
                        className={`px-4 py-2 text-sm font-medium ${activeTab === 'transactions' ? 'text-[#032B44] border-b-2 border-[#032B44]' : 'text-gray-600 hover:text-gray-800'}`}
                        onClick={() => setActiveTab('transactions')}
                      >
                        Transactions
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium ${activeTab === 'withdrawals' ? 'text-[#032B44] border-b-2 border-[#032B44]' : 'text-gray-600 hover:text-gray-800'}`}
                        onClick={() => setActiveTab('withdrawals')}
                      >
                        Withdrawal Requests
                      </button>
                    </div>
                  </div>
                  {activeTab === 'transactions' && wallet.transactions.length > 0 ? (
                    <>
                      {/* If a transaction is selected, show inline details instead of list/table */}
                      {selectedTransaction ? (
                        <div className="mt-2">
                          <TransactionDetails
                            transaction={selectedTransaction}
                            onClose={async () => {
                              await refreshWallet();
                              setSelectedTransaction(null);
                            }}
                          />
                        </div>
                      ) : isMobile ? (
                        <>
                          <div className="flex flex-col gap-4">
                            {wallet.transactions.map((transaction, index) => (
                              <div key={transaction._id} className="bg-white p-4 rounded-md shadow border border-gray-200">
                                <p className="text-sm text-gray-700"><strong>S.No:</strong> {index + 1 + (currentPage - 1) * itemsPerPage}</p>
                                <p className="text-sm text-gray-700"><strong>Description:</strong> {transaction.description || "-"}</p>
                                <p className="text-sm text-gray-700">
                                  <strong>Type:</strong>{" "}
                                  <span
                                    className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                                      transaction.type === "credit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {transaction.type}
                                  </span>
                                </p>
                                <p className="text-sm text-gray-700">
                                  <strong>Amount:</strong> {transaction.type === "credit" ? "+" : "-"}₹{transaction.amount.toFixed(2)}
                                </p>
                                <p className="text-sm text-gray-700"><strong>Date:</strong> {new Date(transaction.date).toLocaleDateString()}</p>
                                <div className="mt-2">
                                  <button
                                    onClick={async () => {
                                      const fresh = await refreshWallet();
                                      const latest = fresh?.transactions?.find(t => t._id === transaction._id) || transaction;
                                      setSelectedTransaction(latest);
                                    }}
                                    className="bg-[#032B44] text-white px-4 py-1 rounded-md text-sm hover:bg-[#054869] transition-colors"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          {totalPages >= 1 && (
                            <div className="bg-white px-4 py-3 mt-2 flex items-center justify-center border border-gray-200 rounded-md">
                              <nav className="flex items-center space-x-2" aria-label="Pagination">
                                <button
                                  onClick={() => handlePageChange(currentPage - 1)}
                                  disabled={currentPage === 1}
                                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                                >
                                  <ChevronLeft className="h-5 w-5" />
                                </button>
                                <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                                <button
                                  onClick={() => handlePageChange(currentPage + 1)}
                                  disabled={currentPage === totalPages}
                                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                                >
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
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-1/12">S.No</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-3/12">Description</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Type</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Amount</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Date</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Action</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {wallet.transactions.map((transaction, index) => (
                                  <tr key={transaction._id} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 text-sm text-gray-900 border-b">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                    <td className="py-3 px-4 text-sm text-gray-700 border-b">{transaction.description || "-"}</td>
                                    <td className="py-3 px-4 text-sm text-gray-700 border-b">
                                      <span
                                        className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                                          transaction.type === "credit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                        }`}
                                      >
                                        {transaction.type}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700 border-b">
                                      {transaction.type === "credit" ? "+" : "-"}₹{transaction.amount.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700 border-b">
                                      {new Date(transaction.date).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700 border-b">
                                      <button
                                        onClick={async () => {
                                          const fresh = await refreshWallet();
                                          const latest = fresh?.transactions?.find(t => t._id === transaction._id) || transaction;
                                          setSelectedTransaction(latest);
                                        }}
                                        className="bg-[#032B44] text-white px-3 py-1 rounded-md text-sm hover:bg-[#054869] transition-colors"
                                      >
                                        View
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {totalPages >= 1 && (
                              <div className="bg-white px-4 py-3 flex items-center justify-center border-t border-gray-200">
                                <nav className="flex items-center space-x-2" aria-label="Pagination">
                                  <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                                  >
                                    <ChevronLeft className="h-5 w-5" />
                                  </button>
                                  <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                                  <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                                  >
                                    <ChevronRight className="h-5 w-5" />
                                  </button>
                                </nav>
                              </div>
                            )}

                          </div>
                        </div>
                      )}
                    </>
                  ) : activeTab === 'transactions' ? (
                    <p className="text-gray-500 text-center">No transactions yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        {selectedWithdrawal ? (
                          <div className="p-4">
                            <WithdrawalRequestDetails
                              withdrawal={selectedWithdrawal}
                              onBack={async () => {
                                await refreshProWithdrawals();
                                setSelectedWithdrawal(null);
                              }}
                              showProDetails={false}
                            />
                          </div>
                        ) : withdrawals.length === 0 ? (
                          <div className="px-6 py-6 text-gray-500">No withdrawal requests yet.</div>
                        ) : (
                          <>
                            {/* Search and Sort */}
                            <div className="mb-4 px-4 pt-4 flex flex-col sm:flex-row gap-4 justify-between">
                              <div className="relative w-full sm:w-5/6">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  {/* simple magnifier icon via svg to avoid extra import */}
                                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Search by mode/status/date/amount..."
                                  value={withdrawalsSearch}
                                  onChange={(e) => setWithdrawalsSearch(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
                                />
                              </div>
                              <div className="relative w-full sm:w-1/6">
                                <select
                                  value={withdrawalsSortBy}
                                  onChange={(e) => setWithdrawalsSortBy(e.target.value)}
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
                            {/* Empty state for filtered-out results */}
                            {visibleWithdrawals.length === 0 ? (
                              <div className="px-6 py-10 text-center text-gray-600">
                                <div className="mb-2 font-medium">No results found for the current search/sort criteria.</div>
                                <button
                                  onClick={clearWithdrawalsFilters}
                                  className="inline-flex items-center gap-2 text-[#032B44] hover:text-[#054869] font-medium"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  Clear filters
                                </button>
                              </div>
                            ) : isMobile ? (
                              <div className="flex flex-col gap-4 p-4">
                                {visibleWithdrawals.map((wr, index) => (
                                  <div key={wr.id} className="bg-white p-4 rounded-md shadow border border-gray-200">
                                    <p className="text-sm text-gray-700"><strong>S.No:</strong> {index + 1 + (withdrawalsPage - 1) * itemsPerPage}</p>
                                    <p className="text-sm text-gray-700"><strong>Payment Mode:</strong> {wr.paymentMode === 'bank' ? 'Bank' : 'UPI'}</p>
                                    <p className="text-sm text-gray-700"><strong>Amount:</strong> ₹{wr.amount.toFixed(2)}</p>
                                    <p className="text-sm text-gray-700"><strong>Date:</strong> {new Date(wr.createdAt).toLocaleDateString()}</p>
                                    <p className="text-sm text-gray-700"><strong>Status:</strong> {renderStatusBadge(wr.status)}</p>
                                    <div className="mt-2">
                                      <button onClick={() => { setSelectedWithdrawal(wr); }} className="bg-[#032B44] text-white px-4 py-1 rounded-md text-sm hover:bg-[#054869] transition-colors">View</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-1/12">S.No</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Payment Mode</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Amount</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Date</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Status</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-1/12">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {visibleWithdrawals.map((wr, index) => (
                                    <tr key={wr.id} className="hover:bg-gray-50">
                                      <td className="py-3 px-4 text-sm text-gray-900 border-b">{index + 1 + (withdrawalsPage - 1) * itemsPerPage}</td>
                                      <td className="py-3 px-4 text-sm text-gray-700 border-b">{wr.paymentMode === 'bank' ? 'Bank' : 'UPI'}</td>
                                      <td className="py-3 px-4 text-sm text-gray-700 border-b">₹{wr.amount.toFixed(2)}</td>
                                      <td className="py-3 px-4 text-sm text-gray-700 border-b">{new Date(wr.createdAt).toLocaleDateString()}</td>
                                      <td className="py-3 px-4 text-sm text-gray-700 border-b">{renderStatusBadge(wr.status)}</td>
                                      <td className="py-3 px-4 text-sm text-gray-700 border-b">
                                        <button onClick={async () => {
                                          const list = await refreshProWithdrawals();
                                          const latest = list.find(x => x.id === wr.id) || wr;
                                          setSelectedWithdrawal(latest);
                                        }} className="bg-[#032B44] text-white px-4 py-1 rounded-md text-sm hover:bg-[#054869] transition-colors">View</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            {visibleWithdrawals.length > 0 && withdrawalsTotalPages >= 1 && (
                              <div className="bg-white px-4 py-3 flex items-center justify-center border-t border-gray-200">
                                <nav className="flex items-center space-x-2" aria-label="Pagination">
                                  <button onClick={() => handleWithdrawalsPageChange(withdrawalsPage - 1)} disabled={withdrawalsPage === 1} className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50">
                                    <ChevronLeft className="h-5 w-5" />
                                  </button>
                                  <span className="text-sm text-gray-700">Page {withdrawalsPage} of {withdrawalsTotalPages}</span>
                                  <button onClick={() => handleWithdrawalsPageChange(withdrawalsPage + 1)} disabled={withdrawalsPage === withdrawalsTotalPages} className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50">
                                    <ChevronRight className="h-5 w-5" />
                                  </button>
                                </nav>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
                No transactions yet.
              </div>
            )}
          </div>
        </main>
      </div>
      {isWithdrawalModalOpen && (
        <div className="fixed inset-0 p-5 flex items-center justify-center z-50 bg-gray-800/30 backdrop-blur-sm">
          <div className="p-6 rounded-lg shadow-lg w-96 bg-white relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCancelWithdrawal}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <span className="text-xl">×</span>
            </button>
            <h3 className="text-lg font-semibold mb-4">Request Withdrawal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                <input
                  type="number"
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  min="500"
                  max={wallet?.balance || 0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                <select
                  value={withdrawalForm.paymentMode}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, paymentMode: e.target.value as "bank" | "upi" })}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="upi">UPI</option> {/* Default to UPI */}
                  <option value="bank">Bank</option>
                </select>
              </div>
              {withdrawalForm.paymentMode === "bank" && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                    <input
                      type="text"
                      value={withdrawalForm.bankName}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, bankName: e.target.value })}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Number</label>
                    <input
                      type="text"
                      value={withdrawalForm.accountNumber}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, accountNumber: e.target.value })}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                    <input
                      type="text"
                      value={withdrawalForm.ifscCode}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, ifscCode: e.target.value })}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Branch Name</label>
                    <input
                      type="text"
                      value={withdrawalForm.branchName}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, branchName: e.target.value })}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}
              {withdrawalForm.paymentMode === "upi" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">UPI ID</label>
                  <input
                    type="text"
                    value={withdrawalForm.upiCode}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, upiCode: e.target.value })}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    minLength={7}
                  />
                </div>
              )}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex justify-end gap-4 mt-4">
                <button onClick={handleCancelWithdrawal} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawalSubmit}
                  className="px-4 py-2 rounded-md text-white disabled:opacity-50 hover:opacity-95"
                  style={{ backgroundColor: "#032b44" }}
                  disabled={actionLoading}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onConfirm={handleWithdrawalRequest}
        onCancel={() => {
          setIsConfirmationModalOpen(false);
          setError(null);
        }}
        action="requestWithdrawal"
        entityType="wallet"
        customTitle="Confirm Withdrawal Request"
        customReason={`Are you sure you want to request a withdrawal of ₹${typeof withdrawalForm.amount === "string" ? parseFloat(withdrawalForm.amount) : withdrawalForm.amount}?`}
        isProcessing={actionLoading}
        error={error}
      />
    </div>
  );
};

export default ProWalletManagement;