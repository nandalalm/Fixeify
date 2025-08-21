// components/BookingHistory.tsx
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch } from "../../store/store";
import { RootState } from "../../store/store";

import { fetchBookingHistoryDetails, fetchQuotaByBookingId } from "../../api/userApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
import { QuotaResponse } from "../../interfaces/quotaInterface";
import BookingTable from "../../components/Reuseable/BookingTable";
import RaiseComplaintModal from "../Modals/RaiseComplaintModal";
import RatingModal from "../Modals/RatingModal";
import BookingDetails from "../../components/Reuseable/BookingDetails";

import { RotateCcw } from "lucide-react";
import { fetchReviewsByUser } from "../../store/ratingReviewSlice";
import { createTicket } from "../../store/ticketSlice";
import { TicketPriority } from "../../interfaces/ticketInterface";




export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};


const BookingHistory: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const userId = user?.id || "";
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [, setQuotas] = useState<{ [key: string]: QuotaResponse | null }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [detailsRefreshKey, setDetailsRefreshKey] = useState<number>(0);
  const [complaintBookingId, setComplaintBookingId] = useState<string | null>(null);
  const [complaintOpen, setComplaintOpen] = useState(false);
  // rating modal state
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingContext, setRatingContext] = useState<{
    proId: string;
    categoryId: string;
    bookingId?: string;
    quotaId?: string;
  } | null>(null);
  
  // rating modal state will be handled inside the details view flow if needed

  const dispatch = useDispatch<AppDispatch>();
  // User's submitted reviews to determine if a booking is already rated
  useSelector((state: RootState) => state.ratingReview);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "completed" | "rejected" | "cancelled" | "">("latest");
  const [currentPage] = useState<number>(1);
  const [, setTotalPages] = useState<number>(1);

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

  useEffect(() => {
    if (userId) {
      dispatch(fetchReviewsByUser({ userId }));
    }
  }, [userId, dispatch]);



  

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
    // Keep inline error for full-page failures
    return <p className="text-red-500 text-center py-8">{error}</p>;
  }

  const selectedComplaintBooking = complaintBookingId ? bookings.find(b => b.id === complaintBookingId) || null : null;

  // complaint open is now triggered from InlineBookingDetails

  const handleSubmitComplaint = async (data: { subject: string; description: string; priority?: TicketPriority }) => {
    if (!userId || !selectedComplaintBooking) return;
    try {
      await dispatch(createTicket({
        complainantType: "user",
        complainantId: userId,
        againstType: "pro",
        againstId: selectedComplaintBooking.pro.id,
        bookingId: selectedComplaintBooking.id,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
      })).unwrap();
      // Close modal and reset state after success
      setComplaintOpen(false);
      setComplaintBookingId(null);
      // Refetch bookings to reflect complaint flags so button hides
      try {
        const refreshed = await fetchBookingHistoryDetails(userId, currentPage, 5);
        setBookings(refreshed.bookings || []);
        setTotalPages(Math.ceil((refreshed.total || 0) / 5));
      } catch (e) {
        console.error("Failed to refresh bookings after complaint:", e);
      }
      // Force details view to re-fetch its data if open
      setDetailsRefreshKey((k) => k + 1);
      setSuccessMessage("Complaint submitted successfully");
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to submit complaint";
      setSuccessMessage(null);
      setError(msg);
      setTimeout(() => setError(null), 2000);
    }
  };

  return (
    <div className="p-6 mb-[350px] mt-8">
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md text-center">{successMessage}</div>
      )}
      {/* lightweight error toast scoped to action failures */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-center">{error}</div>
      )}
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Booking History</h2>
      {bookings.length > 0 && !selectedBookingId && (
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
        selectedBookingId ? (
          <BookingDetails
            bookingId={selectedBookingId}
            viewerRole="user"
            onBack={async () => {
              setSelectedBookingId(null);
              try {
                const refreshed = await fetchBookingHistoryDetails(userId, currentPage, 5);
                setBookings(refreshed.bookings || []);
                setTotalPages(Math.ceil((refreshed.total || 0) / 5));
              } catch (e) {
                console.error("Failed to refresh bookings on back:", e);
              }
            }}
            onRate={(booking) => {
              // open rating modal with current booking context
              setRatingContext({
                proId: booking.pro.id,
                categoryId: booking.category.id,
                bookingId: booking.id,
                // quotaId can be provided if you have it; BookingDetails fetches quota internally, so optional
              });
              setRatingOpen(true);
            }}
            onRaiseComplaint={(booking) => {
              setComplaintBookingId(booking.id);
              setComplaintOpen(true);
            }}
            refreshKey={detailsRefreshKey}
          />
        ) : (
          <BookingTable
            bookings={filteredAndSortedBookings}
            onViewDetails={(booking: BookingResponse) => {
              setSelectedBookingId(booking.id);
            }}
            totalPages={1}
            currentPage={1}
            onPageChange={() => {}}
          />
        )
      )}

      <RaiseComplaintModal
        open={complaintOpen}
        onClose={() => { setComplaintOpen(false); setDetailsRefreshKey((k) => k + 1); }}
        onSubmit={handleSubmitComplaint}
        bookingSummary={selectedComplaintBooking ? `${selectedComplaintBooking.category.name} with ${selectedComplaintBooking.pro.firstName} ${selectedComplaintBooking.pro.lastName} on ${formatDate(new Date(selectedComplaintBooking.preferredDate))}` : undefined}
      />

      {/* Rating Modal */}
      {ratingOpen && ratingContext && userId && (
        <RatingModal
          isOpen={ratingOpen}
          onClose={() => setRatingOpen(false)}
          userId={userId}
          proId={ratingContext.proId}
          categoryId={ratingContext.categoryId}
          bookingId={ratingContext.bookingId}
          quotaId={ratingContext.quotaId}
          onSuccess={async () => {
            // Refresh list so isRated is updated and button hides after closing modal
            try {
              const refreshed = await fetchBookingHistoryDetails(userId, currentPage, 5);
              setBookings(refreshed.bookings || []);
              setTotalPages(Math.ceil((refreshed.total || 0) / 5));
            } catch (e) {
              console.error("Failed to refresh bookings after rating:", e);
            }
            // Force details view to re-fetch by bumping refreshKey so canRate recomputes
            setDetailsRefreshKey((k) => k + 1);
            setRatingOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default BookingHistory;