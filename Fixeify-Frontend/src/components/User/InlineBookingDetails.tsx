import React, { useEffect, useState } from "react";
import { ArrowLeft, Download, User, MapPin } from "lucide-react";
import { BookingCompleteResponse } from "../../interfaces/bookingInterface";
import { QuotaResponse } from "../../interfaces/quotaInterface";
import { fetchBookingById, fetchQuotaByBookingId } from "../../api/userApi";
import LocationMap from "./LocationMap";
import { generateInvoice } from "../../utils/invoiceGenerator";

// Helper function to format currency properly (always without decimals)
const formatCurrency = (amount: number | undefined): string => {
  if (!amount) return '0';
  // Convert to number and round to remove any decimal places
  const num = Math.round(Number(amount));
  return num.toLocaleString('en-IN');
};

interface InlineBookingDetailsProps {
  bookingId: string;
  onBack: () => void;
}

const InlineBookingDetails: React.FC<InlineBookingDetailsProps> = ({ bookingId, onBack }) => {
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
    if (!booking || !quota) {
      alert("Invoice data not available");
      return;
    }

    try {
      generateInvoice({ booking, quota });
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert("Failed to generate invoice. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#032b44]"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{error || "Booking not found"}</h2>
        <button onClick={onBack} className="bg-[#032b44] text-white px-6 py-2 rounded-lg hover:bg-[#054869] transition-colors">Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Modern Header */}
      <div className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={onBack} 
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-[#032b44] dark:hover:text-white transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-lg mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" /> 
                <span className="font-medium">Back to Bookings</span>
              </button>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 mr-4"></div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Booking Details</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                booking.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                booking.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                booking.status === "pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                booking.status === "accepted" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                booking.status === "cancelled" ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" :
                "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
              }`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - People & Location */}
          <div className="lg:col-span-1 space-y-6">
            {/* Customer & Professional Cards */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-[#032b44] px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  People Involved
                </h2>
              </div>
              
              {/* Customer */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    {booking.user?.photo ? (
                      <img src={booking.user.photo} alt={booking.user.name} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{booking.user?.name || "N/A"}</h3>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">Customer</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{booking.user?.email || "N/A"}</p>
                  </div>
                </div>
              </div>
              
              {/* Professional */}
              <div className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    {booking.pro?.profilePhoto ? (
                      <img src={booking.pro.profilePhoto} alt={booking.pro.firstName + ' ' + booking.pro.lastName} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{booking.pro ? `${booking.pro.firstName} ${booking.pro.lastName}` : "N/A"}</h3>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">Professional</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{booking.pro?.email || "N/A"}</p>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{booking.pro?.phoneNumber || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-[#032b44] px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Service Location
                </h2>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-gray-900 dark:text-white font-medium">{booking.location?.address || "N/A"}</p>
                </div>
                {booking.location && (
                  <div className="rounded-lg overflow-hidden">
                    <LocationMap 
                      location={booking.location} 
                      height="200px"
                      className="border border-gray-200 dark:border-gray-600"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Booking Details & Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Information Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-[#032b44] px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Booking Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Issue Description</h4>
                      <p className="text-gray-900 dark:text-white font-medium">{booking.issueDescription}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Service Category</h4>
                      <p className="text-gray-900 dark:text-white font-medium">{booking.category?.name || "N/A"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Preferred Date</h4>
                      <p className="text-gray-900 dark:text-white font-medium">{new Date(booking.preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Time Slots</h4>
                      <p className="text-gray-900 dark:text-white font-medium">{booking.preferredTime?.map(t => `${t.startTime} - ${t.endTime}`).join(", ") || "N/A"}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Contact Number</h4>
                    <p className="text-gray-900 dark:text-white font-medium">{booking.phoneNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Cost Details */}
            {booking.status === "completed" && quota && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-[#032b44] px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Payment Details</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      quota.paymentStatus === "completed" ? "bg-white text-[#032b44]" :
                      quota.paymentStatus === "failed" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {quota.paymentStatus?.charAt(0).toUpperCase() + quota.paymentStatus?.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600 dark:text-gray-300 font-medium">Labor Cost</span>
                        <span className="text-gray-900 dark:text-white font-semibold text-lg">₹{formatCurrency(quota.laborCost)}</span>
                      </div>
                      {quota.materialCost && quota.materialCost > 0 && (
                        <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-600">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">Material Cost</span>
                          <span className="text-gray-900 dark:text-white font-semibold text-lg">₹{formatCurrency(quota.materialCost)}</span>
                        </div>
                      )}
                      {quota.additionalCharges && quota.additionalCharges > 0 && (
                        <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-600">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">Additional Charges</span>
                          <span className="text-gray-900 dark:text-white font-semibold text-lg">₹{formatCurrency(quota.additionalCharges)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-4 border-t-2 border-[#032b44] dark:border-blue-400">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Total Amount</span>
                        <span className="text-2xl font-bold text-[#032b44] dark:text-blue-400">₹{formatCurrency(quota.totalCost)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        {booking.status === "completed" && quota && (
          <div className="mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleDownloadInvoice} 
                  className="flex-1 bg-[#032b44] text-white py-4 px-6 rounded-lg hover:bg-[#054869] transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Download className="w-5 h-5" />
                  <span className="font-semibold">Download Invoice</span>
                </button>
                <button 
                  onClick={onBack}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-4 px-6 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 flex items-center justify-center space-x-3"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-semibold">Back to Bookings</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InlineBookingDetails;
