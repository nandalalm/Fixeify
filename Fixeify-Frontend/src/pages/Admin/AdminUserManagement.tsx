import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
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
}

const UserManagement: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [userToView, setUserToView] = useState<User | null>(null);
  const limit = 5;

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
    } else {
      const getUsers = async () => {
        try {
          const { users, total } = await fetchUsers(currentPage, limit);
          setUsers(users);
          setTotalPages(Math.ceil(total / limit));
        } catch (error) {
          console.error("Failed to fetch users:", error);
        }
      };
      getUsers();
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

  if (!user || user.role !== "admin") return null;

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

            {/* Search Bar */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users by name or email"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Users List - Mobile Cards */}
            <div className="sm:hidden space-y-4 mb-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="bg-white shadow-sm rounded-lg p-4 flex items-start gap-4">
                  <img
                    src={user.photo || "/placeholder.svg"}
                    alt={user.name}
                    className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
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
                    {filteredUsers.map((user, index) => (
                      <tr key={user.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {(currentPage - 1) * limit + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <img src={user.photo || "/placeholder.svg"} alt={user.name} className="h-10 w-10 rounded-full" />
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