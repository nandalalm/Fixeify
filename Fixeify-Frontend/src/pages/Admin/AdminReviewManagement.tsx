import { FC, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { AdminNavbar } from "@/components/Admin/AdminNavbar";
import { RatingReviewResponse, getAllReviews, PaginatedReviews } from "@/api/ratingReviewApi";
import { Star, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import ReviewDetails from "@/components/Reuseable/ReviewDetails";

import { fetchBookingById } from "@/api/proApi";
import { AdminTopNavbar } from "@/components/Admin/AdminTopNavbar";

const AdminReviewManagement: FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  if (!user) return null; // Prevent rendering if user is null
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

  const [reviews, setReviews] = useState<RatingReviewResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [serviceMap, setServiceMap] = useState<Record<string, string>>({});
  const limit = 5;

  // fetch service (category name) for each review bookingId (handle populated object or string)
  const fetchServices = useCallback(async (revList: RatingReviewResponse[]) => {
    const updates: Record<string, string> = {};
    await Promise.all(
      revList.map(async (rev) => {
        const bid = typeof rev.bookingId === "string" ? rev.bookingId : (rev as any)?.bookingId?._id;
        if (!bid) return;
        if (!serviceMap[bid]) {
          try {
            const booking = await fetchBookingById(bid);
            updates[bid] = booking.category?.name || "-";
          } catch (err) {
            updates[bid] = "-";
          }
        }
      })
    );
    if (Object.keys(updates).length) {
      setServiceMap((prev) => ({ ...prev, ...updates }));
    }
  }, [serviceMap]);

  const [selectedReview, setSelectedReview] = useState<RatingReviewResponse | null>(null);

  // Search and sort state (sorting delegated to backend; search is frontend)
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "lowest" | "highest">("latest");

  // Filter reviews by pro name or user name (frontend only)
  const filteredReviews = reviews.filter((review) => {
    const proName = review.pro && review.pro.firstName ? review.pro.firstName.toLowerCase() : "";
    const userName = review.user && review.user.name ? review.user.name.toLowerCase() : "";
    const term = searchTerm.toLowerCase();
    return proName.includes(term) || userName.includes(term);
  });

  // Backend provides sorted order; we only filter client-side
  const orderedAndFiltered = filteredReviews;

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
      return;
    }
  }, [user, navigate]);

  const fetchReviews = useCallback(async (pageNum: number, sortBy: typeof sortOption) => {
    setLoading(true);
    try {
      const data: PaginatedReviews = await getAllReviews(pageNum, limit, sortBy);
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
  }, [fetchServices]);

  useEffect(() => {
    if (user) {
      fetchReviews(1, sortOption);
    }
  }, [user, sortOption, fetchReviews]);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLargeScreen) {
      setSidebarOpen(false);
    }
  }, [isLargeScreen]);

  const handlePrev = () => {
    if (page === 1) return;
    fetchReviews(page - 1, sortOption);
  };

  const handleNext = () => {
    if (page * limit >= total) return;
    fetchReviews(page + 1, sortOption);
  };

  const handleView = (review: RatingReviewResponse) => {
    setSelectedReview(review);
  };

  const handleBackFromDetails = () => {
    setSelectedReview(null);
  };

  // Show skeleton only for the table while keeping the header and filters visible
  if (loading && reviews.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <AdminTopNavbar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          userName={user.name}
          isLargeScreen={isLargeScreen}
        />
        <div className="flex flex-1 overflow-visible">
          <AdminNavbar isOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6 transition-all duration-300">
            <div className="max-w-7xl mx-auto mb-[50px]">
              <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Ratings & Reviews</h1>
              
              {/* Search & Sort Controls - Keep these visible */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative w-full sm:w-5/6">
                  <input
                    type="text"
                    placeholder="Search by pro name or user name..."
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled
                  />
                </div>
                <div className="relative w-full sm:w-1/6">
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    disabled
                  >
                    <option>Sort by Latest</option>
                  </select>
                </div>
              </div>

              {/* Skeleton for reviews table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">S.No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Professional</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Service</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rating</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {[...Array(5)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-4 w-4 text-gray-200 dark:text-gray-700 mr-0.5" fill="currentColor" />
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminTopNavbar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        userName={user.name}
        isLargeScreen={isLargeScreen}
      />
      <div className="flex flex-1 overflow-visible">
        <AdminNavbar isOpen={sidebarOpen} />
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300`}
        >
          <div className="max-w-7xl mx-auto mb-[50px] min-h-[calc(100vh-200px)]">
            {/* If a review is selected, show details view */}
            {selectedReview ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900">Rating Details</h2>
                </div>
                <ReviewDetails review={selectedReview} onBack={handleBackFromDetails} />
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Ratings & Reviews</h1>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-center">{error}</div>
                )}

                {reviews.length === 0 ? (
                  <p className="text-center text-gray-600">No reviews currently.</p>
                ) : orderedAndFiltered.length === 0 ? (
                  <div className="text-center text-gray-600 space-y-2">
                    <p>No results match the provided search criteria.</p>
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setSortOption("latest");
                      }}
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

                    {/* Desktop Table (hidden on mobile) */}
                    <div className="hidden lg:block bg-white dark:bg-gray-800 p-0 rounded-md shadow border border-gray-200 dark:border-gray-700">
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
                          {orderedAndFiltered.map((review, idx) => (
                            <tr key={review.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(page - 1) * limit + idx + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{review.user?.name || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{`${review.pro?.firstName || '-'} ${review.pro?.lastName || ''}`.trim()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{
                                (() => {
                                  const direct = review.category?.name as string | undefined;
                                  if (direct) return direct;
                                  const bid = typeof review.bookingId === 'string' ? review.bookingId : (review as any)?.bookingId?._id;
                                  const fromMap = bid ? serviceMap[bid] : undefined;
                                  const fromBookingIdObj = (review as any)?.bookingId?.category?.name as string | undefined;
                                  const fromBookingObj = (review as any)?.booking?.category?.name as string | undefined;
                                  return fromMap || fromBookingIdObj || fromBookingObj || '-';
                                })()
                              }</td>
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
                      {/* Pagination (Desktop only) */}
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
                            <span className="text-sm text-black">Page {page} of {Math.ceil(total / limit)}</span>
                            <button
                              onClick={handleNext}
                              disabled={page * limit >= total}
                              className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          </nav>
                        </div>
                      )}
                    </div>

                    {/* Mobile Cards (visible on <lg) */}
                    <div className="space-y-4 lg:hidden">
                      {orderedAndFiltered.map((review, idx) => (
                        <div key={review.id} className="bg-white shadow rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{review.user?.name || '-'}</span>
                            <span className="text-sm text-gray-500">#{(page - 1) * limit + idx + 1}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Pro: {review.pro?.firstName || '-'} {review.pro?.lastName || ''}
                          </p>
                          <p className="text-sm text-gray-600">Service: {(() => { const direct = review.category?.name as string | undefined; if (direct) return direct; const bid = typeof review.bookingId === 'string' ? review.bookingId : (review as any)?.bookingId?._id; const fromMap = bid ? serviceMap[bid] : undefined; const fromBookingIdObj = (review as any)?.bookingId?.category?.name as string | undefined; const fromBookingObj = (review as any)?.booking?.category?.name as string | undefined; return fromMap || fromBookingIdObj || fromBookingObj || '-'; })()}</p>
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
                            className="mt-2 bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminReviewManagement;
