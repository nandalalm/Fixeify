import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cancelBooking } from "../../api/userApi";
import { fetchQuotaByBookingId } from "../../api/proApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
import { QuotaResponse } from "../../interfaces/quotaInterface";
import { IApprovedPro, ILocation } from "../../interfaces/adminInterface";
import { ArrowLeft } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe, StripeError, PaymentIntent } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { createPaymentIntent, fetchBookingDetails } from "../../api/userApi";
import { useDispatch } from "react-redux";
import { setPaymentSuccessData } from "../../store/authSlice";
import { UserRole } from "../../store/authSlice";
import { ConfirmationModal } from "../../components/Reuseable/ConfirmationModal";

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const formattedHour = ((hours + 11) % 12 + 1).toString().padStart(2, "0");
  return `${formattedHour}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const formatTimeRange = (timeSlots: { startTime: string; endTime: string }[]): string => {
  return timeSlots
    .map((slot) => `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`)
    .join(", ");
};

// Inside CheckoutForm component
const CheckoutForm = ({
  totalCost,
  onPaymentSuccess,
  navigate,
  proId,
  pro,
  categoryId,
  location,
  clientSecret,
  booking,
  onPaymentFailure,
  dispatch,
}: {
  bookingId: string;
  totalCost: number;
  onPaymentSuccess: () => void;
  navigate: ReturnType<typeof useNavigate>;
  proId: string;
  pro: { id: string; firstName: string; lastName: string };
  categoryId: string | undefined;
  location: { address: string; city: string; state: string; coordinates: { type: "Point"; coordinates: [number, number] } };
  clientSecret: string | null;
  booking: BookingResponse;
  onPaymentFailure: () => Promise<void>;
  dispatch: ReturnType<typeof useDispatch>;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {},
        redirect: "if_required",
      });

      const paymentResult = result as { error?: StripeError; paymentIntent?: PaymentIntent };

      if (paymentResult.error) {
        setMessage(paymentResult.error.message || "An error occurred");
        setIsLoading(false);
        await onPaymentFailure();
      } else if (paymentResult.paymentIntent) {
        switch (paymentResult.paymentIntent.status) {
          case "succeeded":
            setMessage("Payment succeeded!");
            dispatch(
              setPaymentSuccessData({
                bookingDetails: {
                  ...booking,
                  paymentIntent: paymentResult.paymentIntent,
                  user: { ...booking.user, role: UserRole.USER },
                },
                proId,
                pro: pro as unknown as IApprovedPro,
                categoryId: categoryId || null,
                location: location as unknown as ILocation,
                totalCost,
              })
            );
            navigate("/payment-success", {
              state: {
                bookingDetails: {
                  ...booking,
                  paymentIntent: paymentResult.paymentIntent,
                  user: { ...booking.user, role: UserRole.USER },
                },
                proId,
                pro: pro as unknown as IApprovedPro,
                categoryId: categoryId || null,
                location: location as unknown as ILocation,
                totalCost,
              },
            });
            onPaymentSuccess();
            break;
          case "processing":
            setMessage("Your payment is processing.");
            break;
          case "requires_payment_method":
            setMessage("Your payment was not successful, please try again.");
            setIsLoading(false);
            await onPaymentFailure();
            break;
          case "canceled":
            setMessage("Your payment was not successful, please try again.");
            setIsLoading(false);
            await onPaymentFailure();
            break;
          default:
            setMessage("Something went wrong.");
            setIsLoading(false);
            await onPaymentFailure();
            break;
        }
      }
    } catch (error) {
      setMessage("Something went wrong.");
      setIsLoading(false);
      console.error(error);
      await onPaymentFailure();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <PaymentElement
        onChange={(event) => {
          if (event.complete && message) {
            setMessage(null);
          }
        }}
      />
      <div className="flex gap-3 mt-4">
        <button
          disabled={isLoading || !stripe || !elements}
          className="bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
        >
          {isLoading ? "Processing..." : `Pay ₹${totalCost}`}
        </button>
      </div>
      {message && <div className="mt-2 text-sm text-red-500 dark:text-red-400">{message}</div>}
    </form>
  );
};

const UserBookingDetails = ({ booking, onBack }: { booking: BookingResponse; onBack: () => void }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [currentBooking, setCurrentBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetchBookingDetails(booking.user.id, 1, 1);
        const updatedBooking = response.bookings.find((b) => b.id === booking.id);
        if (updatedBooking) {
          setCurrentBooking(updatedBooking);
        } else {
          setCurrentBooking(booking);
        }
        const quotaResponse = await fetchQuotaByBookingId(booking.id);
        if (quotaResponse) setQuota(quotaResponse);
      } catch {
        setError("Failed to load booking or quota details.");
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (stripeKey) {
      setStripePromise(loadStripe(stripeKey));
    }
  }, [booking]);

  const handlePayment = async () => {
    if (!quota || !currentBooking) return;
    const response = await createPaymentIntent(currentBooking.id, quota.totalCost * 100);
    setClientSecret(response.clientSecret);
  };

  const handleRetryPayment = async () => {
    if (!quota || !currentBooking) return;
    const response = await createPaymentIntent(currentBooking.id, quota.totalCost * 100);
    setClientSecret(response.clientSecret);
  };

  const onPaymentSuccess = () => {
    setQuota((prev) => prev ? { ...prev, paymentStatus: "completed" } : prev);
    setClientSecret(null);
    fetchBookingDetails(booking.user.id, 1, 1).then((response) => {
      const updatedBooking = response.bookings.find((b) => b.id === booking.id);
      if (updatedBooking) onBack();
    });
  };

  const onPaymentFailure = async () => {
    try {
      const quotaResponse = await fetchQuotaByBookingId(booking.id);
      if (quotaResponse) setQuota(quotaResponse);
    } catch (err) {
      console.error("Failed to refetch quota after payment failure:", err);
    }
  };

  const handleCancelClick = () => {
    if (currentBooking?.status === "pending") {
      setIsReasonModalOpen(true);
    } else {
      setError("Cancellation is only allowed for pending bookings.");
      setTimeout(() => setError(null), 2000); // Display error for 2 seconds
    }
  };

  const handleReasonConfirm = async () => {
    if (cancelReason || customCancelReason) {
      setIsReasonModalOpen(false);
      setIsConfirmModalOpen(true);
    } else {
      setError("Please select or enter a cancellation reason.");
      setTimeout(() => setError(null), 2000); 
    }
  };

  const handleConfirmCancel = async () => {
    setLoading(true);
    try {
      await cancelBooking(currentBooking!.user.id, currentBooking!.id, cancelReason || customCancelReason);
      setIsConfirmModalOpen(false); 
      onBack();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to cancel booking.");
      setIsConfirmModalOpen(false); 
      setTimeout(() => {
        setError(null); 
        onBack(); 
      }, 2000); // Display error for 2 seconds
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <svg
          className="animate-spin h-8 w-8 text-[#032B44] mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
        </svg>
      </div>
    );
  }

  const displayBooking = currentBooking || booking;

  return (
    <div className="p-6 mb-[200px] mt-8">
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      <button
        onClick={onBack}
        className="inline-block mb-3 p-1 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Booking Details
        </h2>
        <div className="grid grid-cols-1 gap-6">
          {/* Booking Details Card */}
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>User:</strong> {displayBooking.user.name}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Professional:</strong> {displayBooking.pro.firstName}{" "}
                  {displayBooking.pro.lastName}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Category:</strong> {displayBooking.category.name}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Issue:</strong> {displayBooking.issueDescription}
                </p>
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Location:</strong> {displayBooking.location.address},{" "}
                  {displayBooking.location.city}, {displayBooking.location.state}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Phone:</strong> {displayBooking.phoneNumber}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Date:</strong>{" "}
                  {formatDate(new Date(displayBooking.preferredDate))}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Time:</strong> {formatTimeRange(displayBooking.preferredTime)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-gray-700 dark:text-gray-300">
              <strong>Booking Status:</strong>{" "}
              <span
                className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${displayBooking.status === "pending"
                    ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100"
                    : displayBooking.status === "accepted"
                      ? "bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100"
                      : displayBooking.status === "completed"
                        ? "bg-green-700 text-white dark:bg-green-600 dark:text-green-100"
                        : displayBooking.status === "rejected" || displayBooking.status === "cancelled"
                          ? "bg-red-100 text-red-800 dark:bg-red-600 dark:text-red-100"
                          : "bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-100"
                  }`}
              >
                {displayBooking.status}
              </span>
            </p>
            {displayBooking.rejectedReason && (
              <p className="mt-2 text-gray-700 dark:text-gray-300">
                <strong>Rejected Reason:</strong> {displayBooking.rejectedReason}
              </p>
            )}
            {displayBooking.status === "pending" && (
              <button
                onClick={handleCancelClick}
                className="mt-4 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              >
                Cancel Booking
              </button>
            )}
          </div>
          {/* Quota Breakdown Card (if available) */}
          {quota && (
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Quota Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Labor Cost:</strong> ₹{quota.laborCost}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Material Cost:</strong> ₹{quota.materialCost}
                  </p>
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Additional Charges:</strong> ₹{quota.additionalCharges}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Total Cost:</strong> ₹{quota.totalCost}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-gray-700 dark:text-gray-300">
                <strong>Payment Status:</strong>{" "}
                <span
                  className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${quota.paymentStatus === "pending"
                      ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100"
                      : quota.paymentStatus === "completed"
                        ? "bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100"
                        : "bg-red-200 text-red-800 dark:bg-red-600 dark:text-red-100"
                    }`}
                >
                  {quota.paymentStatus}
                </span>
              </p>
              {(quota.paymentStatus === "pending" || quota.paymentStatus === "failed") && stripePromise && clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret, locale: "auto" }}>
                  <CheckoutForm
                    bookingId={displayBooking.id}
                    totalCost={quota.totalCost}
                    onPaymentSuccess={onPaymentSuccess}
                    navigate={navigate}
                    proId={displayBooking.pro.id}
                    pro={displayBooking.pro}
                    categoryId={displayBooking.category.id}
                    location={displayBooking.location}
                    clientSecret={clientSecret}
                    booking={displayBooking}
                    onPaymentFailure={onPaymentFailure}
                    dispatch={dispatch}
                  />
                </Elements>
              ) : quota.paymentStatus === "pending" && !clientSecret ? (
                <button
                  onClick={handlePayment}
                  className="mt-4 bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
                >
                  Go to Payment
                </button>
              ) : quota.paymentStatus === "failed" ? (
                <>
                  <p className="mt-4 text-sm text-red-500 dark:text-red-400">
                    Your payment was not successful, please try again.
                  </p>
                  <button
                    onClick={handleRetryPayment}
                    className="mt-2 bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
                  >
                    Retry Payment
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
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
        error={error}
        isProcessing={loading}
      />
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onConfirm={handleConfirmCancel}
        onCancel={() => setIsConfirmModalOpen(false)}
        action="cancel"
        entityType="booking"
        customTitle="Confirm Cancellation"
        error={error}
        isProcessing={loading}
      />
    </div>
  );
};

export default UserBookingDetails;