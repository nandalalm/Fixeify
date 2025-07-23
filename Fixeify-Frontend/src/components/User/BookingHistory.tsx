// components/BookingHistory.tsx
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { fetchBookingHistoryDetails } from "../../api/userApi";
import { fetchQuotaByBookingId } from "../../api/proApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
import { QuotaResponse } from "../../interfaces/quotaInterface";
import BookingTable from "../../components/Reuseable/BookingTable";
import { RotateCcw } from "lucide-react";
import jsPDF from "jspdf";

const formatTimeTo12Hour = (time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const adjustedHours = hours % 12 || 12;
  return `${adjustedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

interface BookingHistoryModalProps {
  booking: BookingResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadInvoice: (booking: BookingResponse) => void;
  quota: QuotaResponse | null;
}

const BookingHistoryModal: React.FC<BookingHistoryModalProps> = ({ booking, isOpen, onClose, onDownloadInvoice, quota }) => {
  if (!booking || !isOpen) return null;

  const preferredTimeSlots = booking.preferredTime
    .map((slot) => `${formatTimeTo12Hour(slot.startTime)} - ${formatTimeTo12Hour(slot.endTime)}`)
    .join(", ");

  return (
    <div className="fixed inset-0 bg-gray-800/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Booking Details</h2>
        <div className="grid gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Issue:</strong> {booking.issueDescription}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Category:</strong> {booking.category.name}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Professional:</strong> {booking.pro.firstName} {booking.pro.lastName}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Date:</strong> {formatDate(new Date(booking.preferredDate))}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Time:</strong> {preferredTimeSlots}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Status:</strong>{" "}
            <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
              booking.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100" :
              booking.status === "rejected" ? "bg-yellow-800 text-yellow-100 dark:bg-yellow-700 dark:text-yellow-200" :
              booking.status === "cancelled" ? "bg-red-100 text-red-800 dark:bg-red-600 dark:text-red-100" :
              "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100"
            }`}>
              {booking.status}
            </span>
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Location:</strong> {booking.location.address}, {booking.location.city}, {booking.location.state}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Phone:</strong> {booking.phoneNumber}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300"><strong>User:</strong> {booking.user.name} ({booking.user.email})</p>
          {booking.status === "rejected" && booking.rejectedReason && (
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Rejection Reason:</strong> <span className="text-red-500 dark:text-red-400">{booking.rejectedReason}</span></p>
          )}
          {booking.status === "cancelled" && booking.cancelReason && (
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Cancellation Reason:</strong> <span className="text-red-500 dark:text-red-400">{booking.cancelReason}</span></p>
          )}
          {booking.status === "completed" && quota && (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p><strong>Quota Details:</strong></p>
              <p>Labor Cost: ₹{quota.laborCost.toFixed(2)}</p>
              <p>Material Cost: ₹{quota.materialCost.toFixed(2)}</p>
              <p>Additional Charges: ₹{quota.additionalCharges.toFixed(2)}</p>
              <p>Total Cost: ₹{quota.totalCost.toFixed(2)}</p>
              <p>
                <strong>Payment Status:</strong>{" "}
                <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                  quota.paymentStatus === "completed" ? "bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100" :
                  quota.paymentStatus === "failed" ? "bg-red-100 text-red-800 dark:bg-red-600 dark:text-red-100" :
                  "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100"
                }`}>
                  {quota.paymentStatus}
                </span>
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          {booking.status === "completed" && (
            <button
              onClick={() => onDownloadInvoice(booking)}
              className="bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
            >
              Download Invoice
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 rounded-md text-sm font-medium px-4 py-1.5 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const BookingHistory: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const userId = user?.id || "";
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [quotas, setQuotas] = useState<{ [key: string]: QuotaResponse | null }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "completed" | "rejected" | "cancelled" | "">("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const loadBookings = async () => {
      if (!userId) {
        setError("User not authenticated. Please log in.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetchBookingHistoryDetails(userId, currentPage, 5); // Fetch 5 bookings per page
        console.log("Booking history from API:", response); // Debug log
        setBookings(response.bookings || []);
        setTotalPages(Math.ceil(response.total / 5)); // Assuming backend returns total count

        const quotaPromises = response.bookings
          .filter((booking) => booking.status.toLowerCase() === "completed")
          .map(async (booking) => {
            const quota = await fetchQuotaByBookingId(booking.id);
            return { bookingId: booking.id, quota };
          });
        const quotaResults = await Promise.all(quotaPromises);
        const quotasMap = quotaResults.reduce((acc, { bookingId, quota }) => ({
          ...acc,
          [bookingId]: quota,
        }), {});
        setQuotas(quotasMap);
      } catch (err) {
        console.error("Error fetching booking history:", err);
        setError("Failed to fetch booking history or quota details.");
      } finally {
        setLoading(false);
      }
    };
    loadBookings();
  }, [userId, currentPage]);

  const handleViewDetails = (booking: BookingResponse) => {
    setSelectedBooking(booking);
  };

  const handleDownloadInvoice = (booking: BookingResponse) => {
    const quota = quotas[booking.id];
    if (!quota) return;

    const doc = new jsPDF();
    doc.setFont("times");
    doc.setFontSize(20);
    doc.text("Fixeify", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("123 Service Lane, Tech City, India", 105, 30, { align: "center" });
    doc.text("Email: contact@fixeify.com  Phone: +91 123 456 7890", 105, 36, { align: "center" });
    doc.text("Invoice", 105, 46, { align: "center" });
    doc.text(`Invoice Number: INV-${booking.id}`, 190, 60, { align: "center" });
    doc.text(`Date: ${formatDate(new Date(booking.preferredDate))}`, 190, 66, { align: "center" });
    doc.text("Billed To:", 20, 80);
    doc.text(booking.user.name, 20, 86);
    doc.text(`${booking.location.address}, ${booking.location.city}, ${booking.location.state}`, 20, 92);
    doc.text(`Phone: ${booking.phoneNumber}`, 20, 98);
    doc.text(`Email: ${booking.user.email}`, 20, 104);
    doc.text(`Booking ID: ${booking.id}`, 20, 120);
    doc.text(`Issue Description: ${booking.issueDescription}`, 20, 126);
    doc.text(`Category: ${booking.category.name}`, 20, 132);
    doc.text(`Professional: ${booking.pro.firstName} ${booking.pro.lastName}`, 20, 138);
    doc.text(`Service Date: ${formatDate(new Date(booking.preferredDate))}`, 20, 144);
    doc.text(`Time: ${booking.preferredTime.map(slot => `${formatTimeTo12Hour(slot.startTime)} - ${formatTimeTo12Hour(slot.endTime)}`).join(", ")}`, 20, 150);
    doc.text(`Status: ${booking.status}`, 20, 156);
    doc.text(`Location: ${booking.location.address}, ${booking.location.city}, ${booking.location.state}`, 20, 162);
    doc.text("Quota Details:", 20, 178);
    doc.text(`Labor Cost: ₹${quota.laborCost.toFixed(2)}`, 20, 184);
    doc.text(`Material Cost: ₹${quota.materialCost.toFixed(2)}`, 20, 190);
    doc.text(`Additional Charges: ₹${quota.additionalCharges.toFixed(2)}`, 20, 196);
    doc.text(`Total Cost: ₹${quota.totalCost.toFixed(2)}`, 20, 202);
    doc.text(`Payment Status: ${quota.paymentStatus}`, 20, 208);
    if (quota.user) {
      doc.text(`Billed User: ${quota.user.name} (${quota.user.email})`, 20, 214);
    }
    if (quota.pro) {
      doc.text(`Professional: ${quota.pro.firstName} ${quota.pro.lastName}`, 20, 220);
    }
    if (quota.category) {
      doc.text(`Category: ${quota.category.name}`, 20, 226);
    }
    doc.text("Thank you for choosing Fixeify!", 105, 242, { align: "center" });
    doc.text("For inquiries, contact us at contact@fixeify.com or +91 123 456 7890.", 105, 248, { align: "center" });
    doc.save(`invoice_${booking.id}.pdf`);
  };

  const handleClearFilter = () => {
    setSearchTerm("");
    setSortOption("latest");
  };

  const filteredAndSortedBookings = bookings
    .filter((booking) => {
      const matchesSearch =
        booking.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.pro.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.pro.lastName.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (["completed", "rejected", "cancelled"].includes(sortOption)) {
        return booking.status.toLowerCase() === sortOption && matchesSearch;
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortOption === "latest" || sortOption === "") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOption === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });

  const hasMatchingBookings = filteredAndSortedBookings.length > 0;

  if (loading) {
    return (
      <div className="text-center py-8">
        <svg className="animate-spin h-8 w-8 text-[#032B44] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-center py-8">{error}</p>;
  }

  return (
    <div className="p-6 mb-[350px] mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Booking History</h2>
      {bookings.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
          <input
            type="text"
            placeholder="Search by issue, category, professional, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-5/6 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as "latest" | "oldest" | "completed" | "rejected" | "cancelled" | "")}
            className="w-full sm:w-1/6 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="latest">Sort by Latest</option>
            <option value="oldest">Sort by Oldest</option>
            <option value="completed">Sort by Completed</option>
            <option value="rejected">Sort by Rejected</option>
            <option value="cancelled">Sort by Cancelled</option>
          </select>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No booking history available.</p>
        </div>
      ) : !hasMatchingBookings ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            No bookings match the search or sort criteria.
          </p>
          <div className="flex items-center gap-1">
            <a href="#" onClick={(e) => { e.preventDefault(); handleClearFilter(); }} className="mt-2 inline-flex items-center text-blue-500 hover:text-blue-700">
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
          onPageChange={setCurrentPage}
        />
      )}

      <BookingHistoryModal
        booking={selectedBooking}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onDownloadInvoice={handleDownloadInvoice}
        quota={selectedBooking ? quotas[selectedBooking.id] : null}
      />
    </div>
  );
};

export default BookingHistory;