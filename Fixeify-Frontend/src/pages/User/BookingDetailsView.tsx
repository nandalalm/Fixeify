import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, User } from "lucide-react";
import { BookingCompleteResponse } from "../../interfaces/bookingInterface";
import { QuotaResponse } from "../../interfaces/quotaInterface";
import { fetchBookingById, fetchQuotaByBookingId } from "../../api/userApi";

const BookingDetailsView: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingCompleteResponse | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!bookingId) return;
      setLoading(true);
      try {
        const bookingData = await fetchBookingById(bookingId);
        setBooking(bookingData);
        if (bookingData.status === "completed") {
          try {
            const quotaData = await fetchQuotaByBookingId(bookingId);
            setQuota(quotaData);
          } catch (e) {
            setQuota(null);
          }
        }
      } catch (e) {
        setError("Booking not found or failed to load");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [bookingId]);

  const handleDownloadInvoice = () => {
    // TODO: Implement invoice download logic
    alert("Download invoice not implemented yet");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#032b44]"></div></div>;
  }
  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{error || "Booking not found"}</h2>
          <button onClick={() => navigate(-1)} className="bg-[#032b44] text-white px-6 py-2 rounded-lg hover:bg-[#054869] transition-colors">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 dark:text-gray-300 hover:text-[#032b44] dark:hover:text-white transition-colors mr-4">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Booking Details</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* User and Pro Details */}
          <div className="space-y-6">
            {/* User Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <User className="w-5 h-5 text-[#032b44]" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Details</h2>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2">
                  {booking.user?.photo ? (
                    <img src={booking.user.photo} alt={booking.user.name} className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-500" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{booking.user?.name || "N/A"}</h3>
                <p className="text-gray-600 dark:text-gray-300">{booking.user?.email || "N/A"}</p>
              </div>
            </div>
            {/* Pro Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <User className="w-5 h-5 text-[#032b44]" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Professional Details</h2>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2">
                  {booking.pro?.profilePhoto ? (
                    <img src={booking.pro.profilePhoto} alt={booking.pro.firstName + ' ' + booking.pro.lastName} className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-500" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{booking.pro ? `${booking.pro.firstName} ${booking.pro.lastName}` : "N/A"}</h3>
                <p className="text-gray-600 dark:text-gray-300">{booking.pro?.email || "N/A"}</p>
                <p className="text-gray-600 dark:text-gray-300">{booking.pro?.phoneNumber || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Booking & Quota Details */}
          <div className="space-y-6">
            {/* Booking Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Booking Information</h2>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Issue:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{booking.issueDescription}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Category:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{booking.category?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status:</span>
                  <span className="ml-2 text-gray-900 dark:text-white capitalize">{booking.status}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Date:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{new Date(booking.preferredDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Time:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{booking.preferredTime?.map(t => `${t.startTime} - ${t.endTime}`).join(", ") || "N/A"}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Location:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{booking.location?.address || "N/A"}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{booking.phoneNumber}</span>
                </div>
              </div>
            </div>
            {/* Quota Details (if completed) */}
            {booking.status === "completed" && quota && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cost Breakdown</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Labor Cost</span>
                    <span className="font-medium text-gray-900 dark:text-white">₹{quota.laborCost?.toLocaleString()}</span>
                  </div>
                  {quota.materialCost && quota.materialCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Material Cost</span>
                      <span className="font-medium text-gray-900 dark:text-white">₹{quota.materialCost.toLocaleString()}</span>
                    </div>
                  )}
                  {quota.additionalCharges && quota.additionalCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Additional Charges</span>
                      <span className="font-medium text-gray-900 dark:text-white">₹{quota.additionalCharges.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Cost</span>
                      <span className="text-lg font-bold text-[#032b44] dark:text-blue-400">₹{quota.totalCost?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button onClick={handleDownloadInvoice} className="w-full mt-4 bg-[#032b44] text-white py-3 px-4 rounded-lg hover:bg-[#054869] transition-colors flex items-center justify-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Download Invoice</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsView;
