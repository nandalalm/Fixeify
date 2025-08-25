import { FC, useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchReviewsByPro } from "@/store/ratingReviewSlice";
import { RatingReviewResponse } from "@/api/ratingReviewApi";
import { Star, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import ProTopNavbar from "@/components/Pro/ProTopNavbar";
import { ProNavbar } from "@/components/Pro/ProNavbar";
import { User } from "@/store/authSlice";
import ReviewDetails from "@/components/Reuseable/ReviewDetails";

import { BookingResponse } from "@/interfaces/bookingInterface";
import { fetchBookingById } from "@/api/proApi";

const ProRatingReview: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth) as { user: User | null };
  const { items: reviews, loading, page, total, limit } = useSelector((state: RootState) => state.ratingReview);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [selectedReview, setSelectedReview] = useState<RatingReviewResponse | null>(null);
  const [bookingMap, setBookingMap] = useState<{ [bookingId: string]: BookingResponse }>({});

  // Search and sort state (server-driven)
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "lowest" | "highest">("latest");

  const [bootLoading, setBootLoading] = useState(false);

  // Server-side pagination helpers
  const pageSize = limit || 5;
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

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

  // Track first load to avoid flicker
  const didInitialLoad = useRef(false);

  // Immediate fetch on mount (no debounce) with local boot-loading to avoid first-paint flicker
  useEffect(() => {
    if (!user || !user.id) return;
    if (!didInitialLoad.current) {
      setBootLoading(true);
      (dispatch(fetchReviewsByPro({ proId: user.id, page: 1, sortBy: sortOption, search: searchTerm })) as unknown as Promise<any>)
        .finally(() => setBootLoading(false));
      didInitialLoad.current = true;
    }
  }, [user, dispatch]);

  const handleView = (review: RatingReviewResponse) => {
    setSelectedReview(review);
  };
  const handleBackFromDetails = () => {
    setSelectedReview(null);
    if (user && user.id) {
      dispatch(fetchReviewsByPro({ proId: user.id, page: 1, sortBy: sortOption, search: searchTerm }));
    }
  };

  // Debounced search/sort for subsequent changes
  const skippedInitialDebounce = useRef(false);
  useEffect(() => {
    if (!user || !user.id) return;
    // Always skip the very first run of this effect to avoid double call after immediate mount fetch
    if (!skippedInitialDebounce.current) {
      skippedInitialDebounce.current = true;
      return;
    }
    const t = setTimeout(() => {
      dispatch(fetchReviewsByPro({ proId: user.id, page: 1, sortBy: sortOption, search: searchTerm }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, sortOption, user, dispatch]);

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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ProTopNavbar 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-visible">
        <ProNavbar isOpen={sidebarOpen} />
        <main className={`flex-1 overflow-y-auto p-6 transition-all duration-300`}>
          <div className="max-w-7xl mx-auto mb-[50px]">
            <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
              Ratings & Reviews
            </h1>

            {/* Show Search & Sort bar unless initial empty with no filters */}
            {!selectedReview && (reviews.length > 0 || searchTerm.trim() !== "" || sortOption !== "latest") && (
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
            )}

            {selectedReview ? (
              <ReviewDetails review={selectedReview} onBack={handleBackFromDetails} />
            ) : (
              <>
                {(bootLoading || loading) ? (
                  <div className="animate-pulse">
                    {/* Mobile card skeletons */}
                    <div className="md:hidden flex flex-col gap-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-md shadow border border-gray-200 dark:border-gray-700">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-3"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5 mb-3"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table skeleton */}
                    <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 shadow rounded-lg">
                      <div className="min-w-full">
                        {/* table header skeleton */}
                        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-t-lg">
                          <div className="h-4 bg-gray-300/70 dark:bg-gray-600 rounded col-span-1"></div>
                          <div className="h-4 bg-gray-300/70 dark:bg-gray-600 rounded col-span-2"></div>
                          <div className="h-4 bg-gray-300/70 dark:bg-gray-600 rounded col-span-3"></div>
                          <div className="h-4 bg-gray-300/70 dark:bg-gray-600 rounded col-span-2"></div>
                          <div className="h-4 bg-gray-300/70 dark:bg-gray-600 rounded col-span-2"></div>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="grid grid-cols-12 gap-4 px-4 py-3">
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-1"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-2"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-3"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-2"></div>
                              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded col-span-2"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : reviews.length === 0 ? (
                  // Empty states: show filter-aware message when filters applied, else generic
                  (searchTerm.trim() !== "" || sortOption !== "latest") ? (
                    <div className="text-center text-gray-600 dark:text-gray-300 space-y-3">
                      <p>No results found with the current search/sort criteria.</p>
                      <button
                        onClick={() => { setSearchTerm(""); setSortOption("latest"); dispatch(fetchReviewsByPro({ proId: user!.id, page: 1, sortBy: "latest", search: "" })); }}
                        className="flex items-center justify-center mx-auto text-blue-600 hover:underline"
                        aria-label="Clear search and sort filters"
                      >
                        <RotateCcw className="mr-2 h-5 w-5 text-blue-600" />
                        Clear filter
                      </button>
                    </div>
                  ) : (
                    <p className="text-center text-gray-600 dark:text-gray-300">No ratings/reviews yet.</p>
                  )
                ) : (
                  <>
                    {/* Responsive Table/Card Layout */}
                    <div>
                      {/* Mobile Cards */}
                      <div className="md:hidden flex flex-col gap-4">
                        {reviews.map((review, idx) => (
                          <div key={review.id} className="bg-white dark:bg-gray-800 p-4 rounded-md shadow border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>S.No:</strong> {(page - 1) * pageSize + idx + 1}</p>
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
                                onClick={() => { if (user && user.id) { dispatch(fetchReviewsByPro({ proId: user.id, page: page - 1, sortBy: sortOption, search: searchTerm })); } }}
                                disabled={page === 1 || !user || !user.id}
                                className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 dark:disabled:opacity-50"
                              >
                                <ChevronLeft className="h-5 w-5" />
                              </button>
                              <span className="text-sm text-black dark:text-white">Page {page} of {totalPages}</span>
                              <button
                                onClick={() => { if (user && user.id) { dispatch(fetchReviewsByPro({ proId: user.id, page: page + 1, sortBy: sortOption, search: searchTerm })); } }}
                                disabled={page >= totalPages || !user || !user.id}
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
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-4/12">Issue</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-3/12">Rating</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-1/12">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {reviews.map((review, idx) => (
                              <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 border-b">{(page - 1) * pageSize + idx + 1}</td>
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
                                onClick={() => { if (user && user.id) { dispatch(fetchReviewsByPro({ proId: user.id, page: page - 1, sortBy: sortOption, search: searchTerm })); } }}
                                disabled={page === 1 || !user || !user.id}
                                className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 dark:disabled:opacity-50"
                              >
                                <ChevronLeft className="h-5 w-5" />
                              </button>
                              <span className="text-sm text-black dark:text-white">Page {page} of {totalPages}</span>
                              <button
                                onClick={() => { if (user && user.id) { dispatch(fetchReviewsByPro({ proId: user.id, page: page + 1, sortBy: sortOption, search: searchTerm })); } }}
                                disabled={page >= totalPages || !user || !user.id}
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
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProRatingReview;
