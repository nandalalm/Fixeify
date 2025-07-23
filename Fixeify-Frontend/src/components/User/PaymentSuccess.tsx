import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { clearPaymentSuccessData } from "../../store/authSlice";
import { Check, Home, MoveRight, Calendar, MapPin, User, Phone, IndianRupee } from "lucide-react";
import { RootState } from "../../store/store";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { paymentSuccessData } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const state = location.state || {};

  const dataFromStore = paymentSuccessData || {};
  const dataFromState = state || {};
  const { bookingDetails, proId, pro, categoryId, location: loc, totalCost } = {
    ...dataFromStore,
    ...dataFromState,
  };

  if (!bookingDetails || !proId || !pro || !categoryId || !loc || totalCost === undefined) {
    console.error("Missing payment success data:", { bookingDetails, proId, pro, categoryId, loc, totalCost });
    return (
      <div className="bg-gradient-to-br from-red-50 via-red-100 to-red-200 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-900 dark:text-red-100">Error</h1>
          <p className="text-sm text-red-500 dark:text-red-400 mt-2">Invalid payment success data. Please return to home.</p>
          <button
            className="mt-4 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-md px-4 py-2"
            onClick={() => {
              dispatch(clearPaymentSuccessData());
              navigate("/");
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const formatTimeTo12Hour = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    return () => {
      dispatch(clearPaymentSuccessData()); 
    };
  }, [dispatch]);

  return (
    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <Check className="w-10 h-10 text-white stroke-[3]" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-green-400 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payment Successful!</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Thank you for your payment.</p>
        </div>

        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border-0 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment & Booking Details</h2>
            <span className="bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100 border border-green-200 dark:border-green-400 text-sm font-medium px-2.5 py-0.5 rounded">
              Completed
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Booking ID: {bookingDetails.id}</p>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{bookingDetails.category.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Professional service</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(bookingDetails.preferredDate).toLocaleDateString("en-GB")}</p>
              <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <span>Selected Time Slots:</span>
                </div>
                {bookingDetails.preferredTime.map((slot: { startTime: string; endTime: string }, index: number) => (
                  <div key={index} className="">
                    {formatTimeTo12Hour(slot.startTime)} - {formatTimeTo12Hour(slot.endTime)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-300" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Service Location</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{loc.address}, {loc.city}, {loc.state}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-teal-600 dark:text-teal-300" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Payment Amount</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">₹{totalCost}</p>
            </div>
          </div>

          <hr className="my-4 border-gray-200 dark:border-gray-600" />

          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Your Professional</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-700 dark:to-purple-800 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {pro?.firstName[0]}{pro?.lastName[0]}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">{pro?.firstName} {pro?.lastName}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Phone className="w-4 h-4" />
                <span className="truncate">{bookingDetails.phoneNumber}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            className="flex-1 h-12 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-transparent dark:bg-transparent text-gray-700 dark:text-gray-200 rounded-md flex items-center justify-center"
            onClick={() => {
              dispatch(clearPaymentSuccessData());
              navigate("/");
            }}
          >
            <Home className="w-4 h-4 mr-2" />
            Back Home
          </button>
          <button
            className="flex-1 h-12 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded-md flex items-center justify-center"
            onClick={() => {
              dispatch(clearPaymentSuccessData());
              navigate("/profile");
            }}
          >
            <MoveRight className="w-4 h-4 mr-2" />
            Continue
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">You'll receive a confirmation from Fixeify Pros soon.</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;