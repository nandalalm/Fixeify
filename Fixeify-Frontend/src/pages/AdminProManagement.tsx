import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../components/AdminNavbar";
import { Menu, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useNavigate } from "react-router-dom";
import { fetchPendingPros, PendingPro } from "../api/adminApi";

const AdminProManagement: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pros, setPros] = useState<PendingPro[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending"); // Default to pending
  const limit = 10;

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
      return;
    }

    const fetchPros = async () => {
      try {
        const { pros, total } = await fetchPendingPros(currentPage, limit); // Only fetch pending for now
        console.log("Fetched pending pros:", { pros, total });
        setPros(pros);
        setTotalPages(Math.ceil(total / limit));
        console.log("State updated - pros:", pros, "totalPages:", Math.ceil(total / limit));
      } catch (error) {
        console.error("Failed to fetch pending pros:", error);
      }
    };
    fetchPros();
  }, [user?.id, navigate, currentPage, activeTab]); // activeTab included to re-fetch when switched

  if (!user || user.role !== "admin") return null;

  const filteredPros = pros.filter(
    (pro) =>
      pro.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pro.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pro.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewProfile = (proId: string) => {
    console.log("Navigating to profile for ID:", proId); // Debug log
    navigate(`/pro-profile/${proId}`);
  };

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
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">{user.name}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <AdminNavbar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${
            sidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Fixeify Pro Management</h2>

            {/* Search Bar */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by first name, last name, or email"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Tab Navigation */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab("pending")}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeTab === "pending"
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Approval Pending Users
                  </button>
                  <button
                    onClick={() => setActiveTab("approved")}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeTab === "approved"
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    disabled // Disable until implemented
                  >
                    Approved Pros
                  </button>
                </nav>
              </div>
            </div>

            {/* Pros List */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Serial No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Full Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPros.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          No pending pros found.
                        </td>
                      </tr>
                    ) : (
                      filteredPros.map((pro, index) => (
                        <tr key={pro._id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {(currentPage - 1) * limit + index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <img
                              src={pro.profilePhoto || "/placeholder.svg"}
                              alt={`${pro.firstName} ${pro.lastName}`}
                              className="h-10 w-10 rounded-full"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {`${pro.firstName} ${pro.lastName}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pro.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleViewProfile(pro._id)} // Add onClick handler
                              className="bg-blue-100 text-blue-800 px-4 py-1 rounded-md text-sm hover:bg-blue-200 transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminProManagement;