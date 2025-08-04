import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState, AppDispatch } from "../../store/store";
import { logoutUserSync } from "../../store/authSlice";
import { UserRole, User } from "../../store/authSlice";
import { ProNavbar } from "../../components/Pro/ProNavbar";
import ProTopNavbar from "../../components/Pro/ProTopNavbar";
import { Send } from "lucide-react";
import { findWalletByProId, getWalletWithPagination, requestWithdrawal } from "../../api/proApi";
import { ConfirmationModal } from "../../components/Reuseable/ConfirmationModal";
import { WithdrawalFormData } from "../../interfaces/withdrawalRequestInterface";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  useEffect(() => {
    const fetchWallet = async () => {
      if (!user || !accessToken || user.role !== UserRole.PRO) return;
      setLoading(true);
      console.log("Fetching wallet for proId:", user.id, "Page:", currentPage); // Log for debugging
      try {
        const { wallet: walletData, total } = await getWalletWithPagination(user.id, currentPage, itemsPerPage);
        console.log("Wallet data fetched:", walletData, "Total:", total);
        setWallet(walletData || { id: "", proId: user.id, balance: 0, transactions: [], createdAt: new Date(), updatedAt: new Date() });
        setTotalPages(Math.ceil(total / itemsPerPage));
      } catch (err: any) {
        console.error("Fetch wallet error:", err.response?.data);
        if (err.response?.status === 404) {
          setWallet(null);
          console.log("Wallet not found for proId:", user.id);
        } else if (err.response?.status === 401) {
          dispatch(logoutUserSync());
          navigate("/login");
        } else {
          setError(err.response?.data?.message || "Failed to load wallet");
          console.log("Error fetching wallet:", err.response?.data?.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize); // Cleanup
  }, [user, accessToken, dispatch, navigate, currentPage, itemsPerPage]);

  const toggleSidebar = () => {
    setSidebarOpen((prev: boolean) => !prev);
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
      if (!withdrawalForm.upiCode || withdrawalForm.upiCode.length < 10) {
        return "Not a valid UPI ID.";
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
      <ProTopNavbar toggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        <ProNavbar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <main className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <div className="max-w-7xl mx-auto mb-[50px]">
            <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Wallet Management</h1>
            {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md text-center">{successMessage}</div>}
            {wallet ? (
              <div className="flex flex-col items-center">
                <div className="w-full">
                  <div className="bg-white p-6 rounded-lg shadow-md mb-6">
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
                  {wallet.transactions.length > 0 ? (
                    <>
                      {isMobile ? (
                        <div className="flex flex-col gap-4">
                          {wallet.transactions.map((transaction, index) => (
                            <div key={transaction._id} className="bg-white p-4 rounded-md shadow border border-gray-200">
                              <p className="text-sm text-gray-700"><strong>S.No:</strong> {index + 1 + (currentPage - 1) * itemsPerPage}</p>
                              <p className="text-sm text-gray-700"><strong>Transaction ID:</strong> {transaction._id}</p>
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
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-3/6">Transaction ID</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Type</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Amount</th>
                                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900 border-b w-2/12">Date</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {wallet.transactions.map((transaction, index) => (
                                  <tr key={transaction._id} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 text-sm text-gray-900 border-b">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                    <td className="py-3 px-4 text-sm text-gray-700 border-b">{transaction._id}</td>
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
                  ) : (
                    <p className="text-gray-500 text-center">No transactions found.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-full">
                  <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <p className="text-gray-500 text-center">Currently, no transactions or wallet data available.</p>
                  </div>
                </div>
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
                  />
                </div>
              )}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex justify-end gap-4 mt-4">
                <button onClick={handleCancelWithdrawal} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawalSubmit}
                  className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
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

// Local interface definitions
export interface ITransaction {
  _id: string;
  amount: number;
  type: "credit" | "debit";
  date: Date;
}

export interface WalletResponse {
  id: string;
  proId: string;
  balance: number;
  transactions: ITransaction[];
  createdAt: Date;
  updatedAt: Date;
}