import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import { fetchProBookings } from "../../api/proApi";
import { BookingResponse } from "../../interfaces/bookingInterface";
import { logoutUserSync } from "../../store/authSlice";
import { UserRole } from "../../store/authSlice";
import { ProNavbar } from "../../components/Pro/ProNavbar";

const JobManagementPage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user || !accessToken || user.role !== UserRole.PRO) return;

      setLoading(true);
      try {
        const bookingData = await fetchProBookings(user.id);
        setBookings(bookingData);
      } catch (err: any) {
        console.error("Fetch pro bookings error:", err.response?.data);
        setError(err.response?.data?.message || "Failed to load bookings");
        if (err.response?.status === 401) {
          dispatch(logoutUserSync());
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user, accessToken, dispatch, navigate]);

  const toggleSidebar = () => {
    setSidebarOpen((prev: boolean) => !prev);
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  if (user.role !== UserRole.PRO) {
    navigate("/pro-dashboard");
    return null;
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between z-30">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800 ml-4">Fixeify Pro</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="relative p-1 text-gray-700 rounded-md hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-red-500 rounded-full">
              1
            </span>
          </button>
          <div className="flex items-center">
            <span className="text-lg font-medium text-gray-700 mr-2 hidden sm:inline">
              {user.name}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ProNavbar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${
            sidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          <div className="max-w-7xl mx-auto mb-[50px]">
            <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Job Management</h1>
            {bookings.length === 0 ? (
              <p className="text-center text-gray-600">No jobs found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">User</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Category</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Issue</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Location</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Phone</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Date</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Time</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900 border-b">{booking.user.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 border-b">{booking.category.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 border-b">{booking.issueDescription}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 border-b">
                          {booking.location.address}, {booking.location.city}, {booking.location.state}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 border-b">{booking.phoneNumber}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 border-b">
                          {new Date(booking.preferredDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 border-b">{booking.preferredTime}</td>
                        <td className="py-3 px-4 text-sm border-b">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                              booking.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : booking.status === "accepted"
                                ? "bg-green-100 text-green-800"
                                : booking.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : booking.status === "completed"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default JobManagementPage;