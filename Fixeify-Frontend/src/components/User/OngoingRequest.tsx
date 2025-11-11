import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import { fetchBookingDetails, createPaymentIntent, cancelBooking } from "../../api/userApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
import { QuotaResponse } from "../../interfaces/quotaInterface";
import { IApprovedPro } from "../../interfaces/adminInterface";
import { RotateCcw } from "lucide-react";
import BookingTable from "../../components/Reuseable/BookingTable";
import BookingDetails from "../../components/Reuseable/BookingDetails";
import { ConfirmationModal } from "../../components/Reuseable/ConfirmationModal";
import { fetchQuotaByBookingId } from "../../api/proApi";
import { loadStripe, type Stripe, type StripeError, type PaymentIntent } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { setPaymentSuccessData, UserRole } from "../../store/authSlice";
import { useNavigate } from "react-router-dom";

const OngoingRequest = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const userId = user?.id || "";
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [localPaymentStatus, setLocalPaymentStatus] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showCancelButton, setShowCancelButton] = useState(false);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "pending" | "accepted">("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5;
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    if (selectedBooking && bookings.length > 0) {
      const updatedBooking = bookings.find(booking => booking.id === selectedBooking.id);
      if (updatedBooking) {
        const arrayUpdatedAt = new Date(updatedBooking.updatedAt || 0).getTime();
        const selectedUpdatedAt = new Date(selectedBooking.updatedAt || 0).getTime();
        
        if (arrayUpdatedAt > selectedUpdatedAt) {
          setSelectedBooking(updatedBooking);
        }
      }
    }
  }, [bookings, selectedBooking]);

  useEffect(() => {
    if (!selectedBooking || detailsLoading) {
      setShowCancelButton(false);
      return;
    }
    
    const currentBookingInArray = bookings.find(b => b.id === selectedBooking.id);
    
    let currentStatus = selectedBooking.status;
    
    if (currentBookingInArray) {
      const arrayUpdatedAt = new Date(currentBookingInArray.updatedAt || 0).getTime();
      const selectedUpdatedAt = new Date(selectedBooking.updatedAt || 0).getTime();
      
    
      if (arrayUpdatedAt > selectedUpdatedAt) {
        currentStatus = currentBookingInArray.status;
      }
    }
    
    setShowCancelButton(currentStatus === "pending");
  }, [selectedBooking, detailsLoading, bookings]);



  useEffect(() => {
    const loadBookings = async () => {
      if (!userId) {
        setError("User not authenticated. Please log in.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const isStatusMode = sortOption === "pending" || sortOption === "accepted";
        const statusParam = isStatusMode ? sortOption : "pending,accepted";
        const sortByParam = isStatusMode ? "latest" : (sortOption as "latest" | "oldest");
        const response = await fetchBookingDetails(
          userId,
          currentPage,
          limit,
          debouncedSearch || undefined,
          statusParam,
          sortByParam,
          undefined
        );
        setBookings(response.bookings);
        setTotalPages(Math.ceil(response.total / limit));
      } catch {
        setError("Failed to fetch booking details.");
      } finally {
        setLoading(false);
      }
    };
    loadBookings();
  }, [userId, currentPage, debouncedSearch, sortOption]);

  const handleViewDetails = (booking: BookingResponse) => {
    setSelectedBooking(booking);
    setClientSecret(null);
    setQuota(null);
    setDetailsLoading(true);
  };

  const handleBack = () => {
    setSelectedBooking(null);
    setCurrentPage(1);
    const isStatusMode = sortOption === "pending" || sortOption === "accepted";
    const statusParam = isStatusMode ? sortOption : "pending,accepted";
    const sortByParam = isStatusMode ? "latest" : (sortOption as "latest" | "oldest");
    fetchBookingDetails(userId, 1, limit, debouncedSearch || undefined, statusParam, sortByParam).then((response) => {
      setBookings(response.bookings);
      setTotalPages(Math.ceil(response.total / limit));
    });
  };

  const requestCancelBooking = () => {
    setIsReasonModalOpen(true);
  };

  const handleReasonConfirm = async () => {
    if (cancelReason || customCancelReason) {
      setIsReasonModalOpen(false);
      setShowCancelModal(true);
    } else {
      alert("Please select a cancellation reason.");
    }
  };

  const confirmCancelBooking = async () => {
    if (!selectedBooking) return;
    try {
      setIsCancelling(true);
      await cancelBooking(userId, selectedBooking.id, cancelReason || customCancelReason);
      setShowCancelModal(false);
      setIsCancelling(false);
      setCancelReason("");
      setCustomCancelReason("");
      handleBack();
    } catch {
      setIsCancelling(false);
      alert("Failed to cancel booking. Please try again.");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const filteredAndSortedBookings = bookings;

  const isFiltered = (debouncedSearch && debouncedSearch.length > 0) || sortOption !== "latest";

  const handleClearFilter = () => {
    setSearchTerm("");
    setSortOption("latest");
    setCurrentPage(1);
  };

  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedBooking) return;
      try {
        const q = await fetchQuotaByBookingId(selectedBooking.id);
        if (q) setQuota(q);
      } catch {
        // Ignore quota fetch errors
      }
    };
    loadDetails();

    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (stripeKey) setStripePromise(loadStripe(stripeKey));
  }, [selectedBooking]);

  useEffect(() => {
    if (!quota) return;
    const s = String(quota.paymentStatus);
    setLocalPaymentStatus((prev) => {
      if (prev === null) return s; 
      if (s === "completed") return "completed"; 
      if (s === "failed") return "failed"; 
      if (prev === "failed" && s === "pending") return prev;
      return prev;
    });
  }, [quota]);

  const handleStartPayment = async () => {
    if (!selectedBooking || !quota) return;
    const resp = await createPaymentIntent(selectedBooking.id, quota.totalCost * 100);
    setClientSecret(resp.clientSecret);
    setLocalPaymentStatus("pending");
  };

  const handleRetryPayment = async () => {
    if (!selectedBooking || !quota) return;
    const resp = await createPaymentIntent(selectedBooking.id, quota.totalCost * 100);
    setClientSecret(resp.clientSecret);
    setLocalPaymentStatus("pending");
  };


  const onPaymentSuccess = () => {
    if (!selectedBooking || !quota) return;
    setQuota({ ...quota, paymentStatus: "completed" });
    setLocalPaymentStatus("completed");
    setClientSecret(null);
    dispatch(
      setPaymentSuccessData({
        bookingDetails: {
          ...selectedBooking,
          // @ts-expect-error augment for success page needs
          paymentIntent: {},
          user: { ...selectedBooking.user, role: UserRole.USER },
        },
        proId: selectedBooking.pro.id,
        pro: selectedBooking.pro as unknown as IApprovedPro,
        categoryId: selectedBooking.category.id,
        location: selectedBooking.location,
        totalCost: quota.totalCost,
      })
    );
    navigate("/payment-success", {
      state: {
        bookingDetails: {
          ...selectedBooking,
          user: { ...selectedBooking.user, role: UserRole.USER },
        },
        proId: selectedBooking.pro.id,
        pro: selectedBooking.pro,
        categoryId: selectedBooking.category.id,
        location: selectedBooking.location,
        totalCost: quota.totalCost,
      },
    });
    const isStatusMode = sortOption === "pending" || sortOption === "accepted";
    const statusParam2 = isStatusMode ? sortOption : "pending,accepted";
    const sortByParam2 = isStatusMode ? "latest" : (sortOption as "latest" | "oldest");
    fetchBookingDetails(userId, currentPage, limit, debouncedSearch || undefined, statusParam2, sortByParam2).then((response) => {
      setBookings(response.bookings);
      setTotalPages(Math.ceil(response.total / limit));
    });
  };

  const onPaymentFailure = async () => {
    setClientSecret(null);
    setQuota((prev) => (prev ? { ...prev, paymentStatus: "failed" } : prev));
    setLocalPaymentStatus("failed");
  };

  const CheckoutForm = ({ totalCost }: { totalCost: number }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [elementsReady, setElementsReady] = useState(false);

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements || !clientSecret) return;
      
      const { error: validationError } = await elements.submit();
      if (validationError) {
        if (validationError.code === 'card_incomplete' && validationError.type === 'validation_error') {
          setMessage("Please enter your card details to proceed with the payment.");
        } else {
          setMessage(validationError.message || "Please check your card details and try again.");
        }
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setMessage(null); 
      
      try {
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setMessage(submitError.message || "Failed to validate payment details. Please check your information and try again.");
          setIsLoading(false);
          return;
        }
        const result = await stripe.confirmPayment({ elements, clientSecret, confirmParams: {}, redirect: "if_required" });
        const r = result as { error?: StripeError; paymentIntent?: PaymentIntent };
        if (r.error) {
          setMessage(r.error.message || "An error occurred");
          setIsLoading(false);
          await onPaymentFailure();
        } else if (r.paymentIntent) {
          switch (r.paymentIntent.status) {
            case "succeeded":
              setMessage("Payment succeeded!");
              onPaymentSuccess();
              break;
            case "processing":
              setMessage("Your payment is processing.");
              break;
            case "requires_payment_method":
            case "canceled":
              setMessage("Your payment was not successful, please try again.");
              setIsLoading(false);
              await onPaymentFailure();
              break;
            default:
              setMessage("Something went wrong.");
              setIsLoading(false);
              await onPaymentFailure();
          }
        }
      } catch (err) {
        console.error('Payment error:', err);
        setMessage("An unexpected error occurred. Please try again or contact support if the problem persists.");
        setIsLoading(false);
        await onPaymentFailure();
      }
    };
    return (
      <form onSubmit={submit} className="mt-4">
        <PaymentElement 
          onChange={(e) => { 
            if (e.complete && message) setMessage(null); 
            setElementsReady(e.complete);
          }} 
          onReady={() => setElementsReady(true)}
        />
        {elementsReady && (
          <div className="flex gap-3 mt-4">
            <button 
              disabled={isLoading || !stripe || !elements} 
              className="bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
            >
              {isLoading ? "Processing..." : `Pay ₹${totalCost}`}
            </button>
          </div>
        )}
        {message && <div className="mt-2 text-sm text-red-500 dark:text-red-400">{message}</div>}
      </form>
    );
  };


  if (error) {
    return <p className="text-red-500 text-center py-8">{error}</p>;
  }

  if (selectedBooking) {
    return (
      <div className="p-6 mb-[350px] mt-8 space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">Ongoing Requests</h2>
        <BookingDetails
          bookingId={selectedBooking.id}
          viewerRole="user"
          showQuotaSection={false}
          onBack={handleBack}
          onReady={() => setDetailsLoading(false)}
          onBookingUpdate={(updatedBooking) => {
            if (updatedBooking.status !== selectedBooking.status) {
              setSelectedBooking(updatedBooking);
            }
          }}
        />
        {/* Cancel pending booking - controlled by showCancelButton state */}
        {showCancelButton && (
          <div className="w-full">
            <button
              onClick={requestCancelBooking}
              className="w-full border border-[#032B44] text-[#032B44] rounded-md text-sm font-medium px-4 py-2 transition-colors hover:bg-[#032B44] hover:text-white dark:border-gray-400 dark:text-gray-200 dark:hover:bg-gray-500 dark:hover:!text-white"
            >
              Cancel Booking
            </button>
          </div>
        )}
        {/* Reason Selection Modal in details view */}
        {!detailsLoading && (
          <ConfirmationModal
            isOpen={isReasonModalOpen}
            onConfirm={handleReasonConfirm}
            onCancel={() => setIsReasonModalOpen(false)}
            action="cancel"
            entityType="booking"
            reason={cancelReason}
            setReason={setCancelReason}
            customReason={customCancelReason}
            setCustomReason={setCustomCancelReason}
            customTitle="Select Cancellation Reason"
            isProcessing={isCancelling}
          />
        )}
        {/* Final Confirmation Modal in details view */}
        {!detailsLoading && (
          <ConfirmationModal
            isOpen={showCancelModal}
            onConfirm={confirmCancelBooking}
            onCancel={() => setShowCancelModal(false)}
            action="cancel"
            entityType="booking"
            customTitle="Confirm Cancellation"
            isProcessing={isCancelling}
          />
        )}
        {/* Quota / Payment Panel (bill-like) */}
        {!detailsLoading && quota && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Bill Summary</h3>
              {(() => {
                const paymentStatus = localPaymentStatus ?? String(quota.paymentStatus);
                const cls = paymentStatus === "pending"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-600/30 dark:text-yellow-200"
                  : paymentStatus === "completed"
                  ? "bg-green-100 text-green-800 dark:bg-green-600/30 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-600/30 dark:text-red-200";
                return (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{paymentStatus}</span>
                );
              })()}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800" />

            <div className="px-6 py-4">
              {(localPaymentStatus ?? String(quota.paymentStatus)) === "completed" && (
                <div className="mb-4 rounded-md border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-800 dark:text-green-200">
                  Payment successful. Thank you!
                </div>
              )}
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                <li className="py-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Labor Cost</span>
                  <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">₹{quota.laborCost}</span>
                </li>
                {!!quota.materialCost && quota.materialCost > 0 && (
                  <li className="py-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Material Cost</span>
                    <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">₹{quota.materialCost}</span>
                  </li>
                )}
                {!!quota.additionalCharges && quota.additionalCharges > 0 && (
                  <li className="py-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Additional Charges</span>
                    <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">₹{quota.additionalCharges}</span>
                  </li>
                )}
              </ul>

              <div className="mt-3 border-t border-gray-200 dark:border-gray-800 pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Total</span>
                <span className="text-base font-semibold tabular-nums text-gray-900 dark:text-gray-50">₹{quota.totalCost}</span>
              </div>

              {(() => {
                const status = localPaymentStatus ?? String(quota.paymentStatus);
                if ((status === "pending" || status === "failed") && stripePromise && clientSecret) {
                  return (
                    <div className="mt-4">
                      <Elements stripe={stripePromise} options={{ clientSecret, locale: "auto" }}>
                        <CheckoutForm totalCost={quota.totalCost} />
                      </Elements>
                    </div>
                  );
                }
                if (status === "pending" && !clientSecret) {
                  return (
                    <button onClick={handleStartPayment} className="mt-4 bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white">
                      Go to Payment
                    </button>
                  );
                }
                if (status === "failed") {
                  return (
                    <div className="mt-3">
                      <p className="text-sm text-red-500 dark:text-red-400">Your payment was not successful, please try again.</p>
                      <button onClick={handleRetryPayment} className="mt-2 bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white">
                        Retry Payment
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 mb-[350px] mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">Ongoing Requests</h2>
      {(bookings.length > 0 || isFiltered) && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
          <input
            type="text"
            placeholder="Search by booking ID, issue, or location..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            ref={inputRef}
            className="w-full sm:w-5/6 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-400 dark:border-gray-600 dark:focus:ring-blue-400 transition-colors"
          />
          <select
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value as "latest" | "oldest" | "pending" | "accepted");
              setCurrentPage(1);
            }}
            className="w-full sm:w-1/6 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:focus:ring-blue-400"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
          </select>
        </div>
      )}

      {loading ? (
        <div>
          {/* Mobile skeleton */}
          <div className="md:hidden flex flex-col gap-4 animate-pulse">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-md shadow border border-gray-200 dark:border-gray-700">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-6 w-24 bg-gray-300 dark:bg-gray-600 rounded-full mt-2" />
              </div>
            ))}
          </div>

          {/* Desktop table skeleton */}
          <div className="hidden md:block overflow-x-auto animate-pulse">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-1/12">S.No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-3/12">Booking ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/6">Issue</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Booking Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="py-3 px-4 border-b"><div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded" /></td>
                      <td className="py-3 px-4 border-b"><div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" /></td>
                      <td className="py-3 px-4 border-b"><div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" /></td>
                      <td className="py-3 px-4 border-b"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" /></td>
                      <td className="py-3 px-4 border-b"><div className="h-6 w-24 bg-gray-300 dark:bg-gray-600 rounded-full" /></td>
                      <td className="py-3 px-4 border-b"><div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination skeleton */}
              <div className="bg-white px-4 py-3 flex items-center justify-center border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        </div>
      ) : (() => {
        if (bookings.length === 0) {
          if (isFiltered) {
            return (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-2">No results found with the given search or sort criteria.</p>
                <div className="flex items-center gap-1">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleClearFilter();
                    }}
                    className="mt-2 inline-flex items-center text-blue-500 hover:text-blue-700"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" /> Clear Filter
                  </a>
                </div>
              </div>
            );
          }
          return (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No ongoing requests currently.</p>
            </div>
          );
        }
        return (
          <BookingTable
            bookings={filteredAndSortedBookings}
            onViewDetails={handleViewDetails}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        );
      })()}

    </div>
  );
}

export default OngoingRequest;