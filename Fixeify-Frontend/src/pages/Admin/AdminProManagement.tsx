import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { Menu, Search, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchPendingPros, PendingPro, fetchApprovedPros, IApprovedPro } from "../../api/adminApi";

const AdminProManagement: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pros, setPros] = useState<(PendingPro | IApprovedPro)[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");
  const limit = 10;

  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
      return;
    }

    const tabFromState = location.state?.tab as "approved" | "pending" | undefined;
    if (tabFromState && location.state?.fromNavigation) {
      console.log("Setting tab from navigation state:", tabFromState);
      setActiveTab(tabFromState);
      setCurrentPage(1);
      navigate(location.pathname, { replace: true, state: {} });
    }

    const fetchPros = async () => {
      try {
        console.log("Fetching pros for tab:", activeTab, "page:", currentPage);
        let data: { pros: PendingPro[] | IApprovedPro[]; total: number } | undefined;
        if (activeTab === "pending") {
          data = await fetchPendingPros(currentPage, limit);
          console.log("Fetched pending pros:", { pros: data.pros, total: data.total });
        } else if (activeTab === "approved") {
          data = await fetchApprovedPros(currentPage, limit);
          console.log("Fetched approved pros:", { pros: data.pros, total: data.total });
        }

        if (data) {
          setPros(data.pros);
          setTotalPages(Math.ceil(data.total / limit));
          console.log("State updated - pros:", data.pros);
        } else {
          setPros([]);
          setTotalPages(0);
          console.warn("No data received, resetting to empty state.");
        }
      } catch (error) {
        console.error(`Failed to fetch ${activeTab} pros:`, error);
        setPros([]);
        setTotalPages(0);
      }
    };
    fetchPros();
  }, [user?.id, navigate, currentPage, activeTab]);

  if (!user || user.role !== "admin") return null;

  const filteredPros = pros.filter((pro) => {
    if ("createdAt" in pro) {
      return (
        pro.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pro.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pro.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else {
      return (
        pro.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pro.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pro.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  });

  const handleViewProfile = (proId: string) => {
    console.log("Navigating to profile with ID:", proId);
    if (!proId) {
      console.error("Invalid proId:", proId);
      return;
    }
    navigate(`/pro-profile/${proId}`, { state: { fromPending: activeTab === "pending" } });
  };

  const handleTabChange = (tab: "approved" | "pending") => {
    console.log("Switching to tab:", tab);
    setActiveTab(tab);
    setCurrentPage(1);
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
        <div className="flex items-center space-x-4">
          <button className="relative p-1 text-gray-700 rounded-md hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-red-500 rounded-full">
              1
            </span>
          </button>
          <div className="flex items-center">
            <span className="text-lg font-medium text-gray-700 mr-2 hidden sm:inline">{user.name}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <AdminNavbar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}
        >
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Fixeify Pro Management</h2>

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

            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => handleTabChange("approved")}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeTab === "approved"
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Approved Pros
                  </button>
                  <button
                    onClick={() => handleTabChange("pending")}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeTab === "pending"
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Approval Pending Pros
                  </button>
                </nav>
              </div>
            </div>

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
                          No {activeTab === "pending" ? "pending" : "approved"} pros found.
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
                              onClick={() => handleViewProfile(pro._id)}
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