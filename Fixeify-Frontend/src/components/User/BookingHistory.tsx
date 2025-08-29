// components/BookingHistory.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Build server-side query params from UI state
  const serverParams = useMemo(() => {
    const isStatus = ["completed", "rejected", "cancelled"].includes(sortOption);
    const status = isStatus ? (sortOption as "completed" | "rejected" | "cancelled") : undefined;
    const sortBy: "latest" | "oldest" = sortOption === "oldest" ? "oldest" : "latest";
    return { status, sortBy };
  }, [sortOption]);

  const filtersActive = useMemo(() => {
    const hasSearch = searchTerm.trim().length > 0;
    const hasStatus = ["completed", "rejected", "cancelled"].includes(sortOption);
    return hasSearch || hasStatus;
  }, [searchTerm, sortOption]);

  // Debounced fetch on userId, page, search, or sort changes
  useEffect(() => {
    if (!userId) {
      setError("User not authenticated. Please log in.");
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        const response = await fetchBookingHistoryDetails(
          userId,
          currentPage,
          5,
          searchTerm.trim().length ? searchTerm.trim() : undefined,
          serverParams.status,
          serverParams.sortBy
        );
        setBookings(response.bookings || []);
        setTotalPages(Math.ceil((response.total || 0) / 5));

        const quotaPromises = (response.bookings || [])
          .filter((booking) => booking.status.toLowerCase() === "completed")
          .map(async (booking) => {
            const quota = await fetchQuotaByBookingId(booking.id);
            return { bookingId: booking.id, quota };
          });
        const quotaResults = await Promise.all(quotaPromises);
        const quotasMap = quotaResults.reduce((acc, { bookingId, quota }) => ({
          ...acc,
          [bookingId]: quota,
        }), {} as { [key: string]: QuotaResponse | null });
        setQuotas(quotasMap);
      } catch (err) {
        console.error("Error fetching booking history:", err);
        setError("Failed to fetch booking history or quota details.");
      } finally {
        setLoading(false);
      }
    };

    // debounce search
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(run, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [userId, currentPage, searchTerm, serverParams.status, serverParams.sortBy]);

  useEffect(() => {
    if (userId) {
      dispatch(fetchReviewsByUser({ userId }));
    }
  }, [userId, dispatch]);



  

  const handleClearFilter = () => {
    setSearchTerm("");
    setSortOption("latest");
    setCurrentPage(1);
  };

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
        const refreshed = await fetchBookingHistoryDetails(
          userId,
          currentPage,
          5,
          searchTerm.trim().length ? searchTerm.trim() : undefined,
          serverParams.status,
          serverParams.sortBy
        );
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
      <h2 className="text-2xl font-bold mb-8 text-center dark:text-gray-200">Booking History</h2>
      {!selectedBookingId && (bookings.length > 0 || filtersActive) && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
          <input
            type="text"
            placeholder="Search by issue, category, professional, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            ref={searchInputRef}
            className="w-full sm:w-5/6 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-400 dark:border-gray-600 dark:focus:ring-blue-400 transition-colors"
          />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as "latest" | "oldest" | "completed" | "rejected" | "cancelled" | "")}
            className="w-full sm:w-1/6 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:focus:ring-blue-400"
          >
            <option value="latest">Sort by Latest</option>
            <option value="oldest">Sort by Oldest</option>
            <option value="completed">Sort by Completed</option>
            <option value="rejected">Sort by Rejected</option>
            <option value="cancelled">Sort by Cancelled</option>
          </select>
        </div>
      )}

      {loading ? (
        <div>
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
      ) : bookings.length === 0 && filtersActive ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            No results found for the current search or sort criteria.
          </p>
          <div className="flex items-center gap-1">
            <a href="#" onClick={(e) => { e.preventDefault(); handleClearFilter(); }} className="mt-2 inline-flex items-center text-blue-500 hover:text-blue-700">
              <RotateCcw className="w-4 h-4 mr-1" /> Clear Filter
            </a>
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No Booking History currently.</p>
        </div>
      ) : (
        selectedBookingId ? (
          <BookingDetails
            bookingId={selectedBookingId}
            viewerRole="user"
            onBack={async () => {
              setSelectedBookingId(null);
              try {
                const refreshed = await fetchBookingHistoryDetails(
                  userId,
                  currentPage,
                  5,
                  searchTerm.trim().length ? searchTerm.trim() : undefined,
                  serverParams.status,
                  serverParams.sortBy
                );
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
            bookings={bookings}
            onViewDetails={(booking: BookingResponse) => {
              setSelectedBookingId(booking.id);
            }}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={(page) => setCurrentPage(page)}
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
              const refreshed = await fetchBookingHistoryDetails(
                userId,
                currentPage,
                5,
                searchTerm.trim().length ? searchTerm.trim() : undefined,
                serverParams.status,
                serverParams.sortBy
              );
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