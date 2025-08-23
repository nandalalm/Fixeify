import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { ChevronLeft, ChevronRight, Plus, RotateCcw } from "lucide-react";
import { fetchCategories } from "../../api/adminApi";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { AddCategory } from "../../components/Admin/AddCategory";
import { ICategory } from "../../interfaces/adminInterface";
import { AdminTopNavbar } from "../../components/Admin/AdminTopNavbar";

const AdminCategoryManagement: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const limit = 5;

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
    } else {
      const getCategories = async () => {
        try {
          setIsLoading(true);
          const { categories, total } = await fetchCategories(currentPage, limit);
          setCategories(categories);
          setTotalPages(Math.ceil(total / limit));
        } catch (error) {
          console.error("Failed to fetch categories:", error);
        } finally {
          setIsLoading(false);
        }
      };
      getCategories();
    }
  }, [user, navigate, currentPage]);

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

  const handleAddSuccess = (newCategory: ICategory) => {
    setCategories((prev) => [newCategory, ...prev]);
    setShowAddForm(false);
  };

  if (!user || user.role !== "admin") return null;

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clearFilters = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navbar */}
      <AdminTopNavbar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        userName={user.name}
        isLargeScreen={isLargeScreen}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-visible">
        {/* Sidebar */}
        <AdminNavbar isOpen={sidebarOpen} />

        {/* Content */}
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300`}
        >
          <div className="max-w-7xl mx-auto">
            {showAddForm ? (
              <AddCategory onClose={() => setShowAddForm(false)} onSuccess={handleAddSuccess} />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800">Category Management</h2>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-3 sm:mt-0 bg-[#032B44] text-white px-4 py-2 rounded-md text-sm hover:bg-[#054869] flex items-center w-full sm:w-auto justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </button>
                </div>

                {/* Search */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="relative w-full">
                    <input
                      type="text"
                      placeholder="Search by category name"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Empty state or Results */}
                {(!isLoading && filteredCategories.length === 0) ? (
                  <div className="text-center text-gray-600 space-y-2">
                    <p>No results were found with the search criteria.</p>
                    <button onClick={clearFilters} className="text-blue-600 inline-flex items-center justify-center" aria-label="Clear search filters">
                      Clear filter
                      <RotateCcw className="ml-2 h-5 w-5 text-blue-600" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Categories - Mobile Cards */}
                    <div className="sm:hidden space-y-3 mb-4">
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-md shadow border border-gray-200 animate-pulse">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 bg-gray-200 rounded-full" />
                              <div className="flex-1 min-w-0">
                                <div className="h-4 w-12 bg-gray-200 rounded mb-2" />
                                <div className="h-4 w-40 bg-gray-200 rounded" />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        filteredCategories.map((category, index) => (
                          <div key={category.id} className="bg-white p-4 rounded-md shadow border border-gray-200">
                            <div className="flex items-center gap-4">
                              <img src={category.image} alt={category.name} className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600 mb-1"><strong>S.No:</strong> {(currentPage - 1) * limit + index + 1}</p>
                                <p className="text-sm font-medium text-gray-900 truncate">{category.name}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      {/* Mobile Pagination */}
                      {!isLoading && (
                        <div className="bg-white px-4 py-3 mt-1 flex items-center justify-center border border-gray-200 rounded-md">
                          <nav className="flex items-center space-x-2" aria-label="Pagination">
                            <button
                              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span>{`Page ${currentPage} of ${totalPages}`}</span>
                            <button
                              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          </nav>
                        </div>
                      )}
                    </div>

                    {/* Categories Table (>= sm) */}
                    <div className="hidden sm:block bg-white shadow-lg rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Serial No.</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-7/12 ">Image</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-3/12 ">Name</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading
                              ? Array.from({ length: 5 }).map((_, idx) => (
                                  <tr key={idx} className="animate-pulse">
                                    <td className="px-6 py-4">
                                      <div className="h-4 w-10 bg-gray-200 rounded" />
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="h-12 w-12 bg-gray-200 rounded-full" />
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="h-4 w-32 bg-gray-200 rounded" />
                                    </td>
                                  </tr>
                                ))
                              : filteredCategories.map((category, index) => (
                                  <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {(currentPage - 1) * limit + index + 1}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <img src={category.image} alt={category.name} className="h-12 w-12 rounded-full object-cover" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{category.name}</td>
                                  </tr>
                                ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Pagination (>= sm) */}
                      {!isLoading && (
                        <div className="bg-white px-4 py-3 flex items-center justify-center border-t border-gray-200 sm:px-6">
                          <nav className="flex items-center space-x-2" aria-label="Pagination">
                            <button
                              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span>{`Page ${currentPage} of ${totalPages}`}</span>
                            <button
                              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          </nav>
                        </div>
                      )}
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

export default AdminCategoryManagement;