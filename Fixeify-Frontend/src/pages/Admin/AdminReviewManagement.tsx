import { FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { AdminNavbar } from "@/components/Admin/AdminNavbar";
import { RatingReviewResponse, getAllReviews, PaginatedReviews } from "@/api/ratingReviewApi";
import { Star,Menu,RotateCcw, X, ChevronLeft, ChevronRight } from "lucide-react";
import { BookingResponse } from "@/interfaces/bookingInterface";
import { QuotaResponse } from "@/interfaces/quotaInterface";
import { fetchBookingById, fetchQuotaByBookingId } from "@/api/proApi";

const AdminReviewManagement: FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    if (!user) return null; // Prevent rendering if user is null
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const [reviews, setReviews] = useState<RatingReviewResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [serviceMap, setServiceMap] = useState<Record<string, string>>( {} );
  const limit = 5;

  // fetch service (category name) for each review bookingId
  const fetchServices = async (revList: RatingReviewResponse[]) => {
    const updates: Record<string, string> = {};
    await Promise.all(
      revList.map(async (rev) => {
        if (rev.bookingId && !serviceMap[rev.bookingId]) {
          try {
            const booking = await fetchBookingById(rev.bookingId);
            updates[rev.bookingId] = booking.category?.name || "-";
          } catch (err) {
            updates[rev.bookingId] = "-";
          }
        }
      })
    );
    if (Object.keys(updates).length) {
      setServiceMap((prev) => ({ ...prev, ...updates }));
    }
  };

  const [selectedReview, setSelectedReview] = useState<RatingReviewResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search and sort state for frontend-only filtering/sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "lowest" | "highest">("latest");

  // Filter reviews by pro name or user name (frontend only)
  const filteredReviews = reviews.filter((review) => {
    const proName = review.pro && review.pro.firstName ? review.pro.firstName.toLowerCase() : "";
    const userName = review.user && review.user.name ? review.user.name.toLowerCase() : "";
    const term = searchTerm.toLowerCase();
    return proName.includes(term) || userName.includes(term);
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
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
      return;
    }
  }, [user, navigate]);

  const fetchReviews = async (pageNum: number) => {
    setLoading(true);
    try {
      const data: PaginatedReviews = await getAllReviews(pageNum, limit);
      setReviews(data.items);
      setTotal(data.total);
      setPage(data.page);
      setError(null);
      // fetch service names for new reviews
      fetchServices(data.items);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrev = () => {
    if (page === 1) return;
    fetchReviews(page - 1);
  };

  const handleNext = () => {
    if (page * limit >= total) return;
    fetchReviews(page + 1);
  };

  const handleView = (review: RatingReviewResponse) => {
    setSelectedReview(review);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner border-t-4 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between z-30">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800 ml-4">Fixeify Admin</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="text-lg font-medium text-gray-700 mr-2 hidden sm:inline">{user.name}</span>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <AdminNavbar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}
        >
          <div className="max-w-7xl mx-auto mb-[50px]">
            <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Ratings & Reviews</h1>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-center">{error}</div>
            )}

            {reviews.length === 0 ? (
              <p className="text-center text-gray-600">No reviews currently.</p>
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
                      placeholder="Search by pro name or user name..."
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

                {/* Desktop Table */}
                <div className="bg-white dark:bg-gray-800 p-0 rounded-md shadow border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professional</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reviews.map((review, idx) => (
                        <tr key={review.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(page - 1) * limit + idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{review.user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{`${review.pro.firstName} ${review.pro.lastName}`}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{review.category.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`inline w-4 h-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                              />
                            ))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <button
                              onClick={() => handleView(review)}
                              className="bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors"
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
                            onClick={handlePrev}
                            disabled={page === 1}
                            className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <span className="text-sm text-black">Page {page}</span>
                          <button
                            onClick={handleNext}
                            disabled={reviews.length < limit}
                            className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    )}
                </div>

                {/* Mobile Cards */}
                <div className="space-y-4 lg:hidden">
                  {reviews.map((review, idx) => (
                    <div key={review.id} className="bg-white shadow rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{review.user.name}</span>
                        <span className="text-sm text-gray-500">#{(page - 1) * limit + idx + 1}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Pro: {review.pro.firstName} {review.pro.lastName}
                      </p>
                      <p className="text-sm text-gray-600">Service: {review.category.name}</p>
                      <p>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`inline w-4 h-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                          />
                        ))}
                      </p>
                      <button
                        onClick={() => handleView(review)}
                        className="mt-2 border border-gray-500 text-gray-600 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-1.5 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  ))}
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

// -------------------- Review Modal -------------------- //
// Helper to format time in 12-hour format with am/pm
function formatTime(time24: string): string {
  if (!time24) return "";
  const [hourStr, minStr] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const min = minStr || "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${min} ${ampm}`;
}

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
    const fetchDetails = async () => {
      if (!review || !review.bookingId) return;
      try {
        setLoadingData(true);
        // Ensure bookingId is always a string (like in ProRatingReview)
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

    if (isOpen) fetchDetails();
  }, [isOpen, review]);

  if (!isOpen || !review) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-gray-800/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Review Details</h2>
        <div className="space-y-3 text-gray-700 dark:text-gray-200">
          <p>
            <span className="font-medium">User:</span> {review.user.name}
          </p>
          <p>
            <span className="font-medium">Professional:</span> {review.pro.firstName} {review.pro.lastName}
          </p>
          <p>
            <span className="font-medium">Rating:</span>{" "}
            {Array.from({ length: 5 }).map((_, idx) => (
              <Star
                key={idx}
                className={`inline w-4 h-4 ${idx < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
              />
            ))}
          </p>
          <p>
            <span className="font-medium">Service:</span> {review.category.name}
          </p>
          {booking && (
            <p>
              <span className="font-medium">Issue:</span> {booking.issueDescription}
            </p>
          )}
          {review.review && (
            <p>
              <span className="font-medium">Review:</span> {review.review}
            </p>
          )}
          {loadingData && <p>Loading booking / quota details...</p>}
          {errorMsg && <p className="text-red-500">{errorMsg}</p>}

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
                <span className="font-medium">Preferred Time:</span> {booking.preferredTime && booking.preferredTime.map(slot => `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`).join(", ")}
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
          <div className="border-t pt-3 mt-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Quota Details</h3>
            {quota ? (
              <>
                <p><span className="font-medium">Labor Cost:</span> ₹{quota.laborCost}</p>
                {quota.materialCost !== 0 && <p><span className="font-medium">Material Cost:</span> ₹{quota.materialCost}</p>}
                {quota.additionalCharges !== 0 && <p><span className="font-medium">Additional Charges:</span> ₹{quota.additionalCharges}</p>}
                <p><span className="font-medium">Total Cost:</span> ₹{quota.totalCost}</p>
                {quota.paymentStatus && <p><span className="font-medium">Payment Status:</span> {quota.paymentStatus}</p>}
                {review.quotaId && <p><span className="font-medium">Quota ID:</span> {review.quotaId}</p>}
              </>
            ) : (
              <p className="text-gray-500">No quota details available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReviewManagement;
