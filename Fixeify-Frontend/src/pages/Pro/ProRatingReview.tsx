import { FC, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchReviewsByPro } from "@/store/ratingReviewSlice";
import { RatingReviewResponse } from "@/api/ratingReviewApi";
import { Star, X, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import ProTopNavbar from "@/components/Pro/ProTopNavbar";
import { ProNavbar } from "@/components/Pro/ProNavbar";
import { User } from "@/store/authSlice";


import { QuotaResponse } from "@/interfaces/quotaInterface";
import { BookingResponse } from "@/interfaces/bookingInterface";
import { fetchQuotaByBookingId, fetchBookingById } from "@/api/proApi";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: RatingReviewResponse | null;
}

const ReviewModal: FC<ReviewModalProps> = ({ isOpen, onClose, review }) => {
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  

    
    useEffect(() => {
    const fetchData = async () => {
      if (!review?.bookingId) return;
      try {
        setLoadingData(true);
        // Ensure bookingId is always a string
        let bookingId: string = '';
        if (typeof review.bookingId === 'string') {
          bookingId = review.bookingId;
        } else if (
          review.bookingId &&
          typeof review.bookingId === 'object' &&
          '_id' in review.bookingId &&
          typeof (review.bookingId as any)._id === 'string'
        ) {
          bookingId = (review.bookingId as any)._id;
        }

        const [quotaRes, bookingRes] = await Promise.all([
          fetchQuotaByBookingId(bookingId),
          fetchBookingById(bookingId),
        ]);
        setQuota(quotaRes);
        setBooking(bookingRes);
        setErrorMsg(null);
      } catch (err) {
        setErrorMsg("Failed to load booking/quota details");
      } finally {
        setLoadingData(false);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen, review]);

  if (!isOpen || !review) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-gray-800/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Review Details
        </h2>
        <div className="space-y-3 text-gray-700 dark:text-gray-200">
          <p>
            <span className="font-medium">User:</span> {review.user.name} 
          </p>
          <p>
            <span className="font-medium">Rating:</span> {Array.from({ length: 5 }).map((_, idx) => (
              <Star
                key={idx}
                className={`inline w-4 h-4 ${idx < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
              />
            ))}
          </p>
          <p>
             <span className="font-medium">Issue:</span>{booking?.issueDescription} 
          </p>
          {loadingData && <p>Loading booking / quota details...</p>}
          {errorMsg && <p className="text-red-500">{errorMsg}</p>}

          {review.review && (
            <p>
              <span className="font-medium">Review:</span> {review.review}
            </p>
          )}
          
          {quota && (
  <>
    <p>
      <span className="font-medium">Labor Cost:</span> ₹{quota.laborCost}
    </p>
    {quota.materialCost !== 0 && (
      <p>
        <span className="font-medium">Material Cost:</span> ₹{quota.materialCost}
      </p>
    )}
    {quota.additionalCharges !== 0 && (
      <p>
        <span className="font-medium">Additional Charges:</span> ₹{quota.additionalCharges}
      </p>
    )}
    <p>
      <span className="font-medium">Total Cost:</span> ₹{quota.totalCost}
    </p>
    {quota.paymentStatus && (
      <p>
        <span className="font-medium">Payment Status:</span> {quota.paymentStatus}
      </p>
    )}
  </>
)}
          {booking && (
  <>
    <p>
      <span className="font-medium">Booking Date:</span> {new Date(booking.preferredDate).toLocaleDateString()}
    </p>
    <p>
      <span className="font-medium">Booking Status:</span> {booking.status}
    </p>
    <p>
      <span className="font-medium">Location:</span> {booking.location?.address}, {booking.location?.city}, {booking.location?.state}
    </p>
    <p>
      <span className="font-medium">Preferred Time:</span> {booking.preferredTime && booking.preferredTime.map(slot => `${slot.startTime} - ${slot.endTime}`).join(", ")}
    </p>
    {booking.category && (
      <p>
        <span className="font-medium">Category:</span> {booking.category.name}
      </p>
    )}
    {booking.pro && (
      <p>
        <span className="font-medium">Professional:</span> {booking.pro.firstName} {booking.pro.lastName}
      </p>
    )}
  </>
)}
          {review.quotaId && (
            <p>
              <span className="font-medium">Quota ID:</span> {review.quotaId}
            </p>
          )}
          
        </div>
      </div>
    </div>
  );
};

const ProRatingReview: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth) as { user: User | null };
  const { items: reviews, loading, page } = useSelector((state: RootState) => state.ratingReview);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const [selectedReview, setSelectedReview] = useState<RatingReviewResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingMap, setBookingMap] = useState<{ [bookingId: string]: BookingResponse }>({});

  // Search and sort state for frontend-only filtering/sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "lowest" | "highest">("latest");

  // Filter reviews by username or issue description (frontend only)
  const filteredReviews = reviews.filter((review) => {
    const userName = review.user && review.user.name ? review.user.name.toLowerCase() : "";
    const issueDesc = review.bookingId && bookingMap[review.bookingId]?.issueDescription ? bookingMap[review.bookingId]?.issueDescription.toLowerCase() : "";
    const term = searchTerm.toLowerCase();
    return userName.includes(term) || issueDesc.includes(term);
  });

  // Sort reviews according to sortOption (frontend only)
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortOption === "latest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortOption === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortOption === "lowest") {
      return a.rating - b.rating;
    } else if (sortOption === "highest") {
      return b.rating - a.rating;
    }
    return 0;
  });

  useEffect(() => {
    const fetchBookings = async () => {
      const idsToFetch = reviews
        .map(r => r.bookingId)
        .filter((id): id is string => !!id && !(id in bookingMap));
      if (idsToFetch.length === 0) return;
      const results = await Promise.all(idsToFetch.map(id => id ? fetchBookingById(id).catch(() => null) : null));
      const newMap: { [bookingId: string]: BookingResponse } = {};
      results.forEach((booking, idx) => {
        const id = idsToFetch[idx];
        if (booking && id) newMap[id] = booking;
      });
      setBookingMap(prev => ({ ...prev, ...newMap }));
    };
    fetchBookings();
  }, [reviews]);

  useEffect(() => {
    if (user && user.id) {
      dispatch(fetchReviewsByPro({ proId: user.id, page: 1 }));
    }
  }, [dispatch, user]);

  const handleView = (review: RatingReviewResponse) => {
    setSelectedReview(review);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReview(null);
  };

  useEffect(() => {
    if (user && user.id) {
      dispatch(fetchReviewsByPro({ proId: user.id, page: 1 }));
    }
  }, [dispatch, user]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ProTopNavbar toggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        <ProNavbar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <main className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <div className="max-w-7xl mx-auto mb-[50px]">
            <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
              Ratings & Reviews
            </h1>

            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="spinner border-t-4 border-blue-500 rounded-full w-10 h-10 animate-spin" />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-300">No ratings/reviews yet.</p>
            ) : sortedReviews.length === 0 ? (
              <div className="text-center text-gray-600 space-y-2">
                <p>No results match the provided search criteria.</p>
                <button
                  onClick={() => { setSearchTerm(""); setSortOption("latest"); }}
                  className="text-blue-600 flex items-center justify-center mx-auto"
                  aria-label="Clear search and sort filters"
                >
                  Clear filter
                  <RotateCcw className="ml-2 h-5 w-5 text-blue-600" />
                </button>
              </div>
            ) : (
              <>
                {/* Search & Sort Bar */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="relative w-full sm:w-5/6">
                    <input
                      type="text"
                      placeholder="Search by username or issue description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="relative w-full sm:w-1/6">
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      <option value="latest">Sort by Latest</option>
                      <option value="oldest">Sort by Oldest</option>
                      <option value="lowest">Lowest Ratings</option>
                      <option value="highest">Highest Ratings</option>
                    </select>
                  </div>
                </div>

                {/* Responsive Table/Card Layout */}
                <div>
                  {/* Mobile Cards */}
                  <div className="md:hidden flex flex-col gap-4">
                    {sortedReviews.map((review, idx) => (
                      <div key={review.id} className="bg-white dark:bg-gray-800 p-4 rounded-md shadow border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-700 dark:text-gray-300"><strong>S.No:</strong> {idx + 1}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Username:</strong> {review.user && review.user.name ? review.user.name : '-'}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Issue:</strong> {review.bookingId && bookingMap[review.bookingId]?.issueDescription ? bookingMap[review.bookingId]?.issueDescription : "-"}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Rating:</strong> {Array.from({ length: 5 }).map((_, starIdx) => (
                            <Star key={starIdx} className={`inline w-4 h-4 ${starIdx < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                          ))}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleView(review)}
                            className="bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
                          >
                             View
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Pagination (Mobile) */}
                    {page && (
                      <div className="bg-white px-4 py-3 flex items-center justify-center border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                        <nav className="flex items-center space-x-2" aria-label="Pagination">
                          <button
                            onClick={() => { if (user && user.id) { dispatch(fetchReviewsByPro({ proId: user.id, page: page - 1 })); } }}
                            disabled={page === 1 || !user || !user.id}
                            className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 dark:disabled:opacity-50"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <span className="text-sm text-black dark:text-white">
                            Page {page}
                          </span>
                          <button
                            onClick={() => { if (user && user.id) { dispatch(fetchReviewsByPro({ proId: user.id, page: page + 1 })); } }}
                            disabled={reviews.length < 5 || !user || !user.id}
                            className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 dark:disabled:opacity-50"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    )}
                  </div>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 shadow rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-1/12">S.No</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Username</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-3/12">Issue</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Rating</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {reviews.map((review, idx) => (
                          <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 border-b">{(page - 1) * 5 + idx + 1}</td>
                            <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">{review.user && review.user.name ? review.user.name : '-'}</td>
                            <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">{review.bookingId && bookingMap[review.bookingId]?.issueDescription ? bookingMap[review.bookingId]?.issueDescription : "-"}</td>
                            <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">
                              {Array.from({ length: 5 }).map((_, starIdx) => (
                                <Star key={starIdx} className={`inline w-4 h-4 ${starIdx < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                              ))}
                            </td>
                            <td className="py-3 px-4 text-sm border-b">
                              <button
                                onClick={() => handleView(review)}
                                className="bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Pagination (Desktop) */}
                    {page && (
                      <div className="bg-white px-4 py-3 flex items-center justify-center border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                        <nav className="flex items-center space-x-2" aria-label="Pagination">
                          <button
                            onClick={() => { if (user && user.id) { dispatch(fetchReviewsByPro({ proId: user.id, page: page - 1 })); } }}
                            disabled={page === 1 || !user || !user.id}
                            className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 dark:disabled:opacity-50"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <span className="text-sm text-black dark:text-white">
                            Page {page}
                          </span>
                          <button
                            onClick={() => { if (user && user.id) { dispatch(fetchReviewsByPro({ proId: user.id, page: page + 1 })); } }}
                            disabled={reviews.length < 5 || !user || !user.id}
                            className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 dark:disabled:opacity-50"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
      <ReviewModal isOpen={isModalOpen} onClose={handleCloseModal} review={selectedReview} />
    </div>
  );
};

export default ProRatingReview;
