import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { ChevronLeft, ChevronRight, RotateCcw, User as UserIcon } from "lucide-react";
import { fetchUsers, toggleBanUser } from "../../api/adminApi";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { ConfirmationModal } from "../../components/Reuseable/ConfirmationModal";
import { UserDetailsModal } from "../../components/Admin/UserDetailsModal";
import { AdminTopNavbar } from "../../components/Admin/AdminTopNavbar";

export interface ILocation {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number]; 
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNo?: string | null;
  address?: ILocation | null;
  isBanned: boolean;
  photo?: string | null;
  createdAt?: string | Date;
}

const UserManagement: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "active" | "banned">("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [userToView, setUserToView] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const limit = 5;

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
    } else {
      const getUsers = async () => {
        try {
          setIsLoading(true);
          const sortBy = (sortOption === "latest" || sortOption === "oldest") ? sortOption : "latest";
          const { users, total } = await fetchUsers(currentPage, limit, sortBy);
          setUsers(users);
          setTotalPages(Math.ceil(total / limit));
        } catch (error) {
          console.error("Failed to fetch users:", error);
        } finally {
          setIsLoading(false);
        }
      };
      getUsers();
    }
  }, [user, navigate, currentPage, sortOption]);

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

  const handleToggleBan = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const updatedUser = await toggleBanUser(selectedUser.id, !selectedUser.isBanned);
      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === selectedUser.id ? { ...user, isBanned: updatedUser.isBanned } : user))
      );
      setIsModalOpen(false);
      setIsDetailsModalOpen(false); 
    } catch (error) {
      console.error("Failed to toggle ban status:", error);
    } finally {
      setIsProcessing(false);
      setSelectedUser(null);
    }
  };

  const openModal = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const openDetailsModal = (user: User) => {
    setUserToView(user);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setUserToView(null);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSortOption("latest");
    setCurrentPage(1);
  };

  // Local Avatar component: preload actual image; show themed icon placeholder if missing
  const Avatar: React.FC<{ src?: string | null; alt: string; className?: string }> = ({ src, alt, className }) => {
    const placeholder = "/placeholder-user.jpg";
    const [displayedSrc, setDisplayedSrc] = useState<string>(placeholder);

    useEffect(() => {
      const url = (src || "").trim();
      if (!url) {
        setDisplayedSrc(placeholder);
        return;
      }
      let cancelled = false;
      const img = new Image();
      img.onload = () => { if (!cancelled) setDisplayedSrc(url); };
      img.onerror = () => { if (!cancelled) setDisplayedSrc(placeholder); };
      img.src = url;
      return () => { cancelled = true; };
    }, [src]);

    if (displayedSrc === placeholder) {
      return (
        <div
          aria-label={alt}
          className={(className || "h-10 w-10 rounded-full") + " bg-gray-200 dark:bg-gray-700 border flex items-center justify-center text-gray-500 dark:text-gray-300"}
        >
          <UserIcon className="w-5 h-5" />
        </div>
      );
    }
    return <img src={displayedSrc} alt={alt} className={className || "h-10 w-10 rounded-full object-cover"} />;
  };

  if (!user || user.role !== "admin") return null;

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply client-side filter for current page results (server handles latest/oldest)
  const displayedUsers = (() => {
    let list = [...filteredUsers];
    if (sortOption === "active") list = list.filter((u) => !u.isBanned);
    if (sortOption === "banned") list = list.filter((u) => u.isBanned);
    return list;
  })();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOption]);

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
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">User Management</h2>

            {/* Filters: Search + Sort (match Booking UI) */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative w-full sm:w-5/6">
                <input
                  type="text"
                  placeholder="Search users by name or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                  <option value="active">Sort by Active</option>
                  <option value="banned">Sort by Banned</option>
                </select>
              </div>
            </div>

            {(!isLoading && displayedUsers.length === 0) ? (
              <div className="text-center text-gray-600 space-y-2">
                <p>No results found for your search or sort criteria.</p>
                <button
                  onClick={clearFilters}
                  className="text-blue-600 flex items-center justify-center mx-auto"
                  aria-label="Clear search and sort filters"
                >
                  Clear filter
                  <RotateCcw className="ml-2 h-5 w-5 text-blue-600" />
                </button>
              </div>
            ) : (
              <>
                {/* Users List - Mobile Cards */}
                <div className="sm:hidden space-y-4 mb-4">
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="bg-white shadow-sm rounded-lg p-4 flex items-start gap-4 animate-pulse">
                          <div className="h-12 w-12 rounded-full bg-gray-200 flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="h-4 w-32 bg-gray-200 rounded" />
                              <div className="h-5 w-16 bg-gray-200 rounded-full" />
                            </div>
                            <div className="h-3 w-40 bg-gray-200 rounded" />
                            <div className="h-7 w-16 bg-gray-200 rounded" />
                          </div>
                        </div>
                      ))
                    : displayedUsers.map((user, index) => (
                        <div key={user.id} className="bg-white shadow-sm rounded-lg p-4 flex items-start gap-4">
                          <Avatar src={user.photo} alt={user.name} className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 mb-1">
                              <strong>S.No:</strong> {index + 1 + (currentPage - 1) * limit}
                            </p>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                              <span
                                className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                  user.isBanned ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                                }`}
                              >
                                {user.isBanned ? "Banned" : "Active"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 truncate">{user.email}</p>
                            <div className="mt-3">
                              <button
                                onClick={() => openDetailsModal(user)}
                                className="bg-[#032B44] text-white px-3 py-1.5 rounded-md text-xs hover:bg-[#054869] transition-colors"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                </div>

                {/* Users Table - Desktop */}
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial No.</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading
                          ? Array.from({ length: 5 }).map((_, idx) => (
                              <tr key={idx} className="animate-pulse">
                                <td className="px-6 py-4"><div className="h-4 w-10 bg-gray-200 rounded" /></td>
                                <td className="px-6 py-4"><div className="h-10 w-10 bg-gray-200 rounded-full" /></td>
                                <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
                                <td className="px-6 py-4"><div className="h-4 w-48 bg-gray-200 rounded" /></td>
                                <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-200 rounded-full" /></td>
                                <td className="px-6 py-4"><div className="h-8 w-16 bg-gray-200 rounded" /></td>
                              </tr>
                            ))
                          : displayedUsers.map((user, index) => (
                              <tr key={user.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {(currentPage - 1) * limit + index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Avatar src={user.photo} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      user.isBanned ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {user.isBanned ? "Banned" : "Active"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => openDetailsModal(user)}
                                    className="bg-[#032B44] text-white px-4 py-1 rounded-md text-sm hover:bg-[#054869] transition-colors"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
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
          </div>
        </main>
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={closeDetailsModal}
        user={userToView}
        onToggleBan={openModal}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isModalOpen}
        onConfirm={handleToggleBan}
        onCancel={closeModal}
        action={selectedUser?.isBanned ? "unban" : "ban"}
        entityType="user"
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default UserManagement;