import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import { fetchBookingDetails, createPaymentIntent, cancelBooking } from "../../api/userApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
import { QuotaResponse } from "../../interfaces/quotaInterface";
import { RotateCcw } from "lucide-react";
import BookingTable from "../../components/Reuseable/BookingTable";
import BookingDetails from "../../components/Reuseable/BookingDetails";
import { ConfirmationModal } from "../../components/Reuseable/ConfirmationModal";
import { fetchQuotaByBookingId } from "../../api/proApi";
import { loadStripe, type Stripe, type StripeError, type PaymentIntent } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { setPaymentSuccessData, UserRole } from "../../store/authSlice";
import { SkeletonLine, SkeletonBlock } from "../../components/Reuseable/Skeleton";
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
  const [isCancelling, setIsCancelling] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "">("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5;

  useEffect(() => {
    const loadBookings = async () => {
      if (!userId) {
        setError("User not authenticated. Please log in.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetchBookingDetails(userId, currentPage, limit);
        setBookings(response.bookings);
        setTotalPages(Math.ceil(response.total / limit));
      } catch (err) {
        setError("Failed to fetch booking details.");
      } finally {
        setLoading(false);
      }
    };
    loadBookings();
  }, [userId, currentPage]);

  const handleViewDetails = (booking: BookingResponse) => {
    setSelectedBooking(booking);
    setClientSecret(null);
    setQuota(null);
    setDetailsLoading(true);
  };

  const handleBack = () => {
    setSelectedBooking(null);
    setCurrentPage(1);
    fetchBookingDetails(userId, 1, limit).then((response) => {
      setBookings(response.bookings);
      setTotalPages(Math.ceil(response.total / limit));
    });
  };

  const requestCancelBooking = () => {
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!selectedBooking) return;
    try {
      setIsCancelling(true);
      await cancelBooking(userId, selectedBooking.id, "User cancelled");
      setShowCancelModal(false);
      setIsCancelling(false);
      handleBack();
    } catch (e) {
      setIsCancelling(false);
      alert("Failed to cancel booking. Please try again.");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const filteredAndSortedBookings = bookings
    .filter((booking) =>
      booking.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.location.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "latest" || sortOption === "") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOption === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });

  const handleClearFilter = () => {
    setSearchTerm("");
    setSortOption("latest");
  };

  // Load quota and Stripe key when a booking is selected
  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedBooking) return;
      try {
        const q = await fetchQuotaByBookingId(selectedBooking.id);
        if (q) setQuota(q);
      } catch (e) {
        // ignore if no quota yet
      }
    };
    loadDetails();

    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (stripeKey) setStripePromise(loadStripe(stripeKey));
  }, [selectedBooking]);

  // Sync local payment status with latest quota when it changes, without overriding immediate failure state
  useEffect(() => {
    if (!quota) return;
    const s = String(quota.paymentStatus);
    setLocalPaymentStatus((prev) => {
      if (prev === null) return s; // initialize once
      if (s === "completed") return "completed"; // always accept completion
      if (s === "failed") return "failed"; // accept backend failed
      // Don't downgrade from immediate failed to pending
      if (prev === "failed" && s === "pending") return prev;
      return prev; // keep local state
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
    // Cast to any to accommodate broader status values like 'completed'
    setQuota({ ...quota, paymentStatus: "completed" as any });
    setLocalPaymentStatus("completed");
    setClientSecret(null);
    // store success data and navigate like BookingHistory payment flow
    dispatch(
      setPaymentSuccessData({
        bookingDetails: {
          ...selectedBooking,
          // @ts-ignore augment for success page needs
          paymentIntent: {},
          user: { ...selectedBooking.user, role: UserRole.USER },
        },
        proId: selectedBooking.pro.id,
        pro: selectedBooking.pro as any,
        categoryId: selectedBooking.category.id,
        location: selectedBooking.location,
        totalCost: quota.totalCost,
      })
    );
    // Also navigate to Payment Success with state so the component always has data immediately
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
    // Refresh list silently on success
    fetchBookingDetails(userId, currentPage, limit).then((response) => {
      setBookings(response.bookings);
      setTotalPages(Math.ceil(response.total / limit));
    });
  };

  const onPaymentFailure = async () => {
    // reflect failure immediately in UI
    setClientSecret(null);
    setQuota((prev) => (prev ? { ...prev, paymentStatus: "failed" as any } : prev));
    setLocalPaymentStatus("failed");
    // Do not immediately fetch from backend on failure; backend might still show 'pending'.
    // We rely on local state to show Retry UI instantly. A later manual action will refresh.
  };

  // Local checkout form mirroring behavior from UserBookingDetails
  const CheckoutForm = ({ totalCost }: { totalCost: number }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements || !clientSecret) return;
      setIsLoading(true);
      try {
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setMessage(submitError.message || "Failed to validate payment details.");
          setIsLoading(false);
          await onPaymentFailure();
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
        setMessage("Something went wrong.");
        setIsLoading(false);
        await onPaymentFailure();
      }
    };
    return (
      <form onSubmit={submit} className="mt-4">
        <PaymentElement onChange={(e) => { if (e.complete && message) setMessage(null); }} />
        <div className="flex gap-3 mt-4">
          <button disabled={isLoading || !stripe || !elements} className="bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white">
            {isLoading ? "Processing..." : `Pay ₹${totalCost}`}
          </button>
        </div>
        {message && <div className="mt-2 text-sm text-red-500 dark:text-red-400">{message}</div>}
      </form>
    );
  };

  if (loading) {
    return (
      <div className="p-6 mb-[350px] mt-8">
        <div className="mb-6">
          <SkeletonLine width="w-1/3" height="h-8" className="mb-4" />
          <div className="flex flex-col sm:flex-row gap-4">
            <SkeletonLine width="w-full sm:w-5/6" height="h-10" />
            <SkeletonLine width="w-full sm:w-1/6" height="h-10" />
          </div>
        </div>
        <div className="space-y-3">
          <SkeletonBlock height="h-20" />
          <SkeletonBlock height="h-20" />
          <SkeletonBlock height="h-20" />
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-center py-8">{error}</p>;
  }

  if (selectedBooking) {
    return (
      <div className="p-6 mb-[350px] mt-8 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ongoing Requests</h2>
        <BookingDetails
          bookingId={selectedBooking.id}
          viewerRole="user"
          showQuotaSection={false}
          onBack={handleBack}
          onReady={() => setDetailsLoading(false)}
        />
        {/* Cancel pending booking - shown only after details side-effects finish */}
        {!detailsLoading && selectedBooking.status === "pending" && (
          <div className="w-full">
            <button
              onClick={requestCancelBooking}
              className="w-full border border-[#032B44] text-[#032B44] rounded-md text-sm font-medium px-4 py-2 transition-colors hover:bg-[#032B44] hover:text-white dark:border-gray-400 dark:text-gray-200 dark:hover:bg-gray-500 dark:hover:!text-white"
            >
              Cancel Booking
            </button>
          </div>
        )}
        {/* Confirmation Modal mounted in details view too */}
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
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Ongoing Requests</h2>
      {bookings.length > 0 && (
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
            onChange={(e) => setSortOption(e.target.value as "latest" | "oldest" | "")}
            className="w-full sm:w-1/6 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="latest">Sort by Latest</option>
            <option value="oldest">Sort by Oldest</option>
          </select>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No ongoing requests currently.</p>
        </div>
      ) : filteredAndSortedBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No ongoing requests that matched the search or sort criteria found.</p>
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
      ) : (
        <BookingTable
          bookings={filteredAndSortedBookings}
          onViewDetails={handleViewDetails}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      )}

      {/* Confirmation Modal for cancelling booking */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onConfirm={confirmCancelBooking}
        onCancel={() => setShowCancelModal(false)}
        action="cancel"
        entityType="booking"
        customTitle="Confirm Cancellation"
        isProcessing={isCancelling}
      />
    </div>
  );
}

export default OngoingRequest;