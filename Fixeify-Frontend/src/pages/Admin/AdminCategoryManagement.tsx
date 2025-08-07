import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { Menu, Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { fetchCategories } from "../../api/adminApi";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { AddCategory } from "../../components/Admin/AddCategory";
import { ICategory } from "../../interfaces/adminInterface";

const AdminCategoryManagement: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const limit = 5;

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
    } else {
      const getCategories = async () => {
        try {
          const { categories, total } = await fetchCategories(currentPage, limit);
          setCategories(categories);
          setTotalPages(Math.ceil(total / limit));
        } catch (error) {
          console.error("Failed to fetch categories:", error);
        }
      };
      getCategories();
    }
  }, [user, navigate, currentPage]);

  const handleAddSuccess = (newCategory: ICategory) => {
    setCategories((prev) => [newCategory, ...prev]);
    setShowAddForm(false);
  };

  if (!user || user.role !== "admin") return null;

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navbar */}
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

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AdminNavbar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Content */}
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${
            sidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          <div className="max-w-7xl mx-auto">
            {showAddForm ? (
              <AddCategory onClose={() => setShowAddForm(false)} onSuccess={handleAddSuccess} />
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800">Category Management</h2>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-900 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-800 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search categories by name"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Categories Table */}
                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
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
                        {filteredCategories.map((category, index) => (
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

                  {/* Pagination */}
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
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminCategoryManagement;