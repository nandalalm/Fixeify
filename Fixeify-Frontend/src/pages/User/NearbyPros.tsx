import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { getNearbyPros } from "../../api/userApi";
import { IApprovedPro, ILocation } from "../../interfaces/adminInterface";
import { ArrowLeft, Star, Filter } from "lucide-react";
import Navbar from "../../components/User/Navbar";
import Footer from "../../components/User/Footer";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

const ProCard = ({ pro }: { pro: IApprovedPro }) => {

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-300 dark:text-gray-600"
        }`}
      />
    ));
  };

  return (
    <div className="flex flex-col">
      <div className="rounded-lg overflow-hidden mb-1">
        <img
          src={pro.profilePhoto || "/placeholder.svg"}
          alt={`${pro.firstName} ${pro.lastName}`}
          className="w-full h-48 object-cover"
        />
      </div>
      <h3 className="font-medium text-lg text-gray-900 dark:text-white">
        {pro.firstName} {pro.lastName}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm">{pro.category.name}</p>
      
      {/* Rating Display */}
      {pro.averageRating && pro.averageRating > 0 ? (
        <div className="flex items-center gap-1 mb-1">
          <div className="flex">{renderStars(pro.averageRating)}</div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {pro.averageRating.toFixed(1)} ({pro.totalRatings || 0})
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1 mb-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">No ratings yet</span>
        </div>
      )}
      <div className="flex gap-2 mt-auto">
        <Link
          to={`/pro-details/${pro._id}`}
          state={{ pro, categoryId: pro.category.id, location: pro.location }}
          className="flex-1 bg-[#032B44] text-white py-2 px-6 rounded-md hover:bg-[#054869] transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white flex items-center justify-center gap-2 text-sm"
        >
          View
        </Link>
        <Link
          to={`/chat/${pro._id}`}
          state={{ pro, categoryId: pro.category.id, location: pro.location }}
          className="flex-1 bg-white dark:bg-gray-800 border border-[#032B44] text-[#032B44] hover:bg-[#032B44] hover:text-white hover:border-white dark:text-gray-200 dark:border-gray-600 py-2 px-6 rounded-md dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          Chat
        </Link>
      </div>
    </div>
  );
};

const NearbyPros = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const categoryId = queryParams.get("categoryId") || "";
  const stateLocation = location.state?.location as ILocation | undefined;
  const savedLocation = useSelector((state: RootState) => state.auth.user?.address || undefined) as ILocation | undefined;
  const selectedLocation: ILocation | undefined = stateLocation || savedLocation;
  const [pros, setPros] = useState<IApprovedPro[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>("Professional");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('nearest');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [hasEverLoadedPros, setHasEverLoadedPros] = useState(false);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchNearbyPros = async (page: number = 1, isLoadMore: boolean = false) => {
    if (!selectedLocation || !selectedLocation.coordinates?.coordinates) {
      setError("Invalid location data. Please select a location again.");
      setLoading(false);
      navigate(`/location?categoryId=${categoryId}`);
      return;
    }
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const response = await getNearbyPros(
        categoryId,
        selectedLocation.coordinates.coordinates[0], 
        selectedLocation.coordinates.coordinates[1],
        page,
        5,
        sortBy,
        availabilityFilter || undefined
      );
      
      if (isLoadMore) {
        setPros(prev => [...prev, ...response.pros]);
      } else {
        setPros(response.pros);
      }
      
      setTotal(response.total);
      setHasMore(response.hasMore);
      
      if (response.pros.length > 0) {
        setCategoryName(response.pros[0].category.name || "Professional");
      }
      
      // Track if we've ever successfully loaded pros (to distinguish no pros vs no filtered results)
      if (!hasEverLoadedPros && response.total > 0) {
        setHasEverLoadedPros(true);
      }
      
      setError(null);
    } catch (err: any) {
      const errorMessage = err.response
        ? `Failed to load professionals: ${err.response.status} - ${JSON.stringify(err.response.data)}`
        : `Failed to load professionals: ${err.message}`;
      setError(errorMessage);
      console.error("Error fetching nearby pros:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMorePros = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchNearbyPros(nextPage, true);
  };

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    setCurrentPage(1);
    setPros([]);
  };

  const handleFilterChange = (newFilter: string) => {
    setAvailabilityFilter(newFilter);
    setCurrentPage(1);
    setPros([]);
  };

  const handleDayToggle = (day: string) => {
    const updatedDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    
    setSelectedDays(updatedDays);
    setSelectAll(updatedDays.length === daysOfWeek.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDays([]);
      setSelectAll(false);
    } else {
      setSelectedDays([...daysOfWeek]);
      setSelectAll(true);
    }
  };

  const applyAvailabilityFilter = () => {
    const filterValue = selectedDays.length > 0 ? JSON.stringify(selectedDays) : '';
    setIsFilterApplied(selectedDays.length > 0);
    handleFilterChange(filterValue);
  };

  const clearAllFilters = () => {
    setSelectedDays([]);
    setSelectAll(false);
    setSortBy('nearest');
    setIsFilterApplied(false);
    handleFilterChange('');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (isFilterApplied) count++;
    if (sortBy !== 'nearest') count++;
    return count;
  };

  useEffect(() => {
    if (selectedLocation) {
      fetchNearbyPros(1, false);
    } else {
      setError("No location provided. Please select a location.");
      setLoading(false);
      navigate(`/location?categoryId=${categoryId}`);
    }
  }, [categoryId, stateLocation, savedLocation, navigate, sortBy, availabilityFilter]);

  return (
    <div className="flex flex-col min-h-screen dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 mb-[120px]">
        <section className="container mx-auto px-2 py-8 max-w-6xl">
          <button
            onClick={() => navigate(-1)}
            className="inline-block mb-3 p-1 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {!loading && !error && (
            <>
              <h1 className="text-3xl font-bold text-center mb-2 dark:text-white">
                Book Your {categoryName} Professional
              </h1>
              <p className="text-center text-gray-400 mb-4">
                Find Experienced {categoryName} Professionals for your Home needs.
              </p>
              
              {/* Active Filters Display */}
              {(getActiveFiltersCount() > 0 || selectedDays.length > 0) && (
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {sortBy !== 'nearest' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm dark:bg-blue-900 dark:text-blue-200">
                      Sort: Applied
                    </span>
                  )}
                  {isFilterApplied && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm dark:bg-green-900 dark:text-green-200">
                      Filter: Applied
                    </span>
                  )}
                  {getActiveFiltersCount() > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              )}
              
              {/* Sort and Filter Controls */}
              <div className="flex flex-wrap gap-4 justify-center mb-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#032B44] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="nearest">Nearest</option>
                    <option value="highest_rated">Highest Rated</option>
                    <option value="lowest_rated">Lowest Rated</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm transition-colors ${
                      showFilters || selectedDays.length > 0
                        ? 'bg-[#032B44] text-white border-[#032B44] dark:bg-gray-300 dark:text-gray-800'
                        : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters {selectedDays.length > 0 && `(${selectedDays.length})`}
                  </button>
                </div>
              </div>
              
              {/* Enhanced Filter Panel */}
              {showFilters && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Filter by Availability</h3>
                      
                      {/* Select All Checkbox */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="select-all"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-[#032B44] border-gray-300 rounded focus:ring-[#032B44] focus:ring-2 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <label htmlFor="select-all" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                            Select All Days
                          </label>
                        </div>
                      </div>
                      
                      {/* Individual Day Checkboxes */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
                        {daysOfWeek.map((day) => (
                          <div key={day} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`day-${day}`}
                              checked={selectedDays.includes(day)}
                              onChange={() => handleDayToggle(day)}
                              className="w-4 h-4 text-[#032B44] border-gray-300 rounded focus:ring-[#032B44] focus:ring-2 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <label htmlFor={`day-${day}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              {day.slice(0, 3)}
                            </label>
                          </div>
                        ))}
                      </div>
                      
                      {/* Filter Actions */}
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={applyAvailabilityFilter}
                          disabled={selectedDays.length === 0}
                          className="px-4 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
                        >
                          Apply Filter ({selectedDays.length} days)
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDays([]);
                            setSelectAll(false);
                          
                            if (availabilityFilter) {
                              setIsFilterApplied(false);
                              handleFilterChange('');
                            }
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Results Summary */}
              <div className="text-center mb-6">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {getActiveFiltersCount() > 0 ? (
                    <>
                      Found <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span> professionals matching your criteria
                      <br />
                      <span className="text-xs">Showing {pros.length} of {total}</span>
                    </>
                  ) : (
                    <>Showing {pros.length} of {total} professionals</>
                  )}
                </p>
              </div>
            </>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex flex-col">
                  <div className="rounded-lg h-48 mb-2 bg-gray-200 animate-pulse" />
                  <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse mt-1" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-red-500 dark:text-red-400 text-center">{error}</p>
          ) : pros.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {pros.map((pro) => (
                  <div key={pro._id} className="w-full max-w-[250px] mx-auto sm:max-w-none sm:mx-0">
                    <ProCard pro={pro} />
                  </div>
                ))}
              </div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={loadMorePros}
                    disabled={loadingMore}
                    className="px-6 py-3 bg-[#032B44] text-white rounded-md hover:bg-[#054869] transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
                  >
                    {loadingMore ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    ) : (
                      "Load More Pros"
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            // Show different messages based on whether filters are applied or no pros exist in area
            (getActiveFiltersCount() > 0) && hasEverLoadedPros ? (
              // Filtered results but no matches
              <div className="flex mb-[50px] flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-lg text-gray-500 dark:text-gray-400 text-center mb-2">
                  No results found matching your criteria
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
                  Try adjusting your sort or filter options to see more professionals.
                </p>
              </div>
            ) : (
              // No pros in the area at all
              <div className="flex mb-[50px] flex-col items-center justify-center py-12">
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-500 dark:text-gray-400 mb-4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 10a1 1 0 0 0-1 1 1 1 0 0 0 1 1" />
                  <path d="M16 10a1 1 0 0 0-1 1 1 1 0 0 0 1 1" />
                  <path d="M8 15c2-2 4 0 8 0" />
                </svg>
                <p className="text-lg text-gray-500 dark:text-gray-400 text-center">
                  Sorry, we couldn't find any Fixeify Pros in this area. Please try another location.
                </p>
              </div>
            )
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default NearbyPros;