import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { Menu, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchUsers, toggleBanUser } from "../../api/adminApi";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { ConfirmationModal } from "../../components/Reuseable/ConfirmationModal";
import { UserDetailsModal } from "../../components/Admin/UserDetailsModal";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

            {/* Users Table */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
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
                            className="bg-blue-900 text-white px-4 py-1 rounded-md text-sm hover:bg-blue-800 transition-colors"
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