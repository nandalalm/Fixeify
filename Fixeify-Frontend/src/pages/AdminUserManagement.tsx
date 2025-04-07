"use client";

import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../components/AdminNavbar";
import { Menu, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchUsers, toggleBanUser } from "../api/authApi";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useNavigate } from "react-router-dom";

interface User {
  _id: string; 
  name: string;
  email: string;
  phoneNo?: string | null;
  address?: string | null;
  isBanned: boolean;
  photo?: string | null;
  createdAt?: string; 
  updatedAt?: string;
  __v?: number;
}

const UserManagement: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 5;

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
    } else {
      const getUsers = async () => {
        try {
          const fetchedUsers = await fetchUsers();
          setUsers(fetchedUsers);
        } catch (error) {
          console.error("Failed to fetch users:", error);
        }
      };
      getUsers();
    }
  }, [user, navigate]);

  const handleToggleBan = async (userId: string, isBanned: boolean) => {
    try {
      console.log(`Toggling ban for user ${userId} to ${!isBanned}`);
      const updatedUser = await toggleBanUser(userId, !isBanned);
      console.log("Updated user:", updatedUser);
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userId ? { ...user, isBanned: updatedUser.isBanned } : user
        )
      );
    } catch (error) {
      console.error("Failed to toggle ban status:", error);
    }
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.address || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <div
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-0 z-20 transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto lg:z-auto`}
      >
        <AdminNavbar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden ml-0 lg:ml-64 md:ml-56 sm:ml-16">
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800 lg:ml-0 ml-4">User Management</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">{user.name}</span>
            <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden">
              <img src="/placeholder.svg?height=32&width=32" alt="Admin" className="h-full w-full object-cover" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users by name, email, or address"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user, index) => (
                      <tr key={user._id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <img src={user.photo || "/placeholder.svg"} alt={user.name} className="h-10 w-10 rounded-full" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phoneNo || "N/A"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.address || "N/A"}</td>
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
                            onClick={() => handleToggleBan(user._id, user.isBanned)} // Change to user._id
                            className="bg-blue-900 text-white px-4 py-1 rounded-md text-sm hover:bg-blue-800 transition-colors"
                          >
                            {user.isBanned ? "Unban" : "Ban"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white px-4 py-3 flex items-center justify-center border-t border-gray-200 sm:px-6">
                <nav className="flex items-center space-x-2" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>

                  {[1, 2, 3, 4, 5].map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === page ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
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

export default UserManagement;