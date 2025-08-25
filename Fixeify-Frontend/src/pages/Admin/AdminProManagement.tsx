import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { fetchPendingPros, fetchApprovedPros } from "../../api/adminApi";
import { IApprovedPro, PendingPro } from "../../interfaces/adminInterface";
import { AdminTopNavbar } from "../../components/Admin/AdminTopNavbar";

const AdminProManagement: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [pros, setPros] = useState<(PendingPro | IApprovedPro)[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "active" | "banned">("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");
  const limit = 5;

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
    } else {
      const fetchProsData = async () => {
        try {
          setLoading(true);
          let data: { pros: PendingPro[] | IApprovedPro[]; total: number } | undefined;
          const sortByParam = (sortOption === "latest" || sortOption === "oldest") ? sortOption : undefined;
          if (activeTab === "pending") {
            data = await fetchPendingPros(currentPage, limit, sortByParam);
          } else if (activeTab === "approved") {
            data = await fetchApprovedPros(currentPage, limit, sortByParam);
          }

          if (data) {
            setPros(data.pros);
            setTotalPages(Math.ceil(data.total / limit));
          } else {
            setPros([]);
            setTotalPages(0);
          }
        } catch (error) {
          console.error(`Failed to fetch ${activeTab} pros:`, error);
          setPros([]);
          setTotalPages(0);
        } finally {
          setLoading(false);
        }
      };
      fetchProsData();
    }
  }, [user?.id, navigate, currentPage, activeTab, sortOption]);

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

  if (!user || user.role !== "admin") return null;

  const filteredPros = pros.filter((pro) => {
    return (
      pro.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pro.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pro.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Apply client-side Active/Banned filtering only for approved tab
  const displayedPros = (() => {
    let list = [...filteredPros];
    if (activeTab === "approved") {
      if (sortOption === "active") list = list.filter((p): p is IApprovedPro => (p as IApprovedPro).isBanned === false);
      if (sortOption === "banned") list = list.filter((p): p is IApprovedPro => (p as IApprovedPro).isBanned === true);
    }
    return list;
  })();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOption]);

  const clearFilters = () => {
    setSearchQuery("");
    setSortOption("latest");
    setCurrentPage(1);
  };

  const handleViewProfile = (proId: string) => {
    if (!proId) {
      console.error("Invalid proId:", proId);
      return;
    }
    navigate(`/pro-profile/${proId}`, { state: { fromPending: activeTab === "pending" } });
  };

  const handleTabChange = (tab: "approved" | "pending") => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (activeTab === "pending" && (sortOption === "active" || sortOption === "banned")) {
      setSortOption("latest");
    }
  }, [activeTab]);

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
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Professional Management</h2>

            {/* Filters: Search + Sort */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative w-full sm:w-5/6">
                <input
                  type="text"
                  placeholder="Search by first name, last name, or email"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                  {activeTab === "approved" && (
                    <>
                      <option value="active">Sort by Active</option>
                      <option value="banned">Sort by Banned</option>
                    </>
                  )}
                </select>
              </div>
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
                    Approved Professionals
                  </button>
                  <button
                    onClick={() => handleTabChange("pending")}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeTab === "pending"
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Approval Pending Professionals
                  </button>
                </nav>
              </div>
            </div>

            {/* Empty state outside of table */}
            {(!loading && displayedPros.length === 0) ? (
              <div className="text-center text-gray-600 space-y-2">
                <p>No results found for your search or sort criteria.</p>
                <button onClick={clearFilters} className="text-blue-600 inline-flex items-center justify-center" aria-label="Clear search and sort filters">
                  Clear filter
                  <RotateCcw className="ml-2 h-5 w-5 text-blue-600" />
                </button>
              </div>
            ) : (
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                {/* Desktop/Table view */}
                <div className="overflow-x-auto hidden sm:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Serial No.
                        </th>
                        <th className="w-[15%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Image
                        </th>
                        <th className={`${activeTab === "approved" ? "w-[25%]" : "w-[30%]"} px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                          Full Name
                        </th>
                        <th className={`${activeTab === "approved" ? "w-[25%]" : "w-[30%]"} px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                          Email
                        </th>
                        {activeTab === "approved" && (
                          <th className="w-[15%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        )}
                        <th className="w-[15%] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        Array.from({ length: limit }).map((_, idx) => (
                          <tr key={`skeleton-${idx}`} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="w-[10%] px-6 py-4">
                              <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
                            </td>
                            <td className="w-[15%] px-6 py-4">
                              <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                            </td>
                            <td className={`${activeTab === "approved" ? "w-[25%]" : "w-[30%]"} px-6 py-4`}>
                              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                            </td>
                            <td className={`${activeTab === "approved" ? "w-[25%]" : "w-[30%]"} px-6 py-4`}>
                              <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
                            </td>
                            {activeTab === "approved" && (
                              <td className="w-[15%] px-6 py-4">
                                <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                              </td>
                            )}
                            <td className="w-[15%] px-6 py-4 text-center">
                              <div className="h-8 w-16 bg-gray-200 rounded-md inline-block animate-pulse" />
                            </td>
                          </tr>
                        ))
                      ) : (
                        displayedPros.map((pro, index) => (
                          <tr key={pro._id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="w-[10%] px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {(currentPage - 1) * limit + index + 1}
                            </td>
                            <td className="w-[15%] px-6 py-4 whitespace-nowrap">
                              <img
                                src={pro.profilePhoto || "/placeholder.svg"}
                                alt={`${pro.firstName} ${pro.lastName}`}
                                className="h-10 w-10 rounded-full"
                              />
                            </td>
                            <td className={`${activeTab === "approved" ? "w-[25%]" : "w-[30%]"} px-6 py-4 whitespace-nowrap text-sm text-gray-500`}>
                              {`${pro.firstName} ${pro.lastName}`}
                            </td>
                            <td className={`${activeTab === "approved" ? "w-[25%]" : "w-[30%]"} px-6 py-4 whitespace-nowrap text-sm text-gray-500`}>
                              {pro.email}
                            </td>
                            {activeTab === "approved" && (
                              <td className="w-[15%] px-6 py-4 whitespace-nowrap text-sm">
                                {"isBanned" in pro && (
                                  <span
                                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      (pro as IApprovedPro).isBanned
                                        ? "bg-red-100 text-red-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {(pro as IApprovedPro).isBanned ? "Banned" : "Active"}
                                  </span>
                                )}
                              </td>
                            )}
                            <td className="w-[15%] px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                              <button
                                onClick={() => handleViewProfile(pro._id)}
                                className="bg-[#032B44] text-white px-4 py-1 rounded-md text-sm hover:opacity-90 transition-colors"
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

                {/* Mobile/Card view */}
                <div className="block sm:hidden">
                  <ul className="divide-y divide-gray-200">
                    {displayedPros.map((pro, index) => (
                      <li key={pro._id} className="p-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={pro.profilePhoto || "/placeholder.svg"}
                            alt={`${pro.firstName} ${pro.lastName}`}
                            className="h-12 w-12 rounded-full flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500">S.No: {(currentPage - 1) * limit + index + 1}</p>
                            <p className="text-base font-medium text-gray-900 truncate">{`${pro.firstName} ${pro.lastName}`}</p>
                            <p className="text-sm text-gray-600 truncate">{pro.email}</p>
                            {activeTab === "approved" && "isBanned" in pro && (
                              <p className="mt-1">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${(pro as IApprovedPro).isBanned ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                                  {(pro as IApprovedPro).isBanned ? "Banned" : "Active"}
                                </span>
                              </p>
                            )}
                          </div>
                          <div>
                            <button
                              onClick={() => handleViewProfile(pro._id)}
                              className="bg-[#032B44] text-white px-3 py-2 rounded-md text-sm hover:opacity-90"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
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
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminProManagement;