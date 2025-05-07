import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState, AppDispatch } from "../../store/store";
import { logoutUserSync } from "../../store/authSlice";
import { getProAvailability } from "../../api/proApi";
import { TimeSlot, Availability } from "../../interfaces/proInterface";
import {UserRole} from "../../store/authSlice"
import EditProSlot from "../../components/Pro/EditProSlot";
import {ProNavbar} from "../../components/Pro/ProNavbar";
import { Menu, Bell, Edit } from "lucide-react";

const ProSlotManagement = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [availability, setAvailability] = useState<Availability | null>(null);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!user || !accessToken || user.role !== UserRole.PRO) return;

      setLoading(true);
      try {
        const { availability, isUnavailable } = await getProAvailability(user.id);
        setAvailability(availability);
        setIsUnavailable(isUnavailable);
      } catch (err: any) {
        console.error("Fetch availability error:", err.response?.data);
        setError(err.response?.data?.message || "Failed to load availability");
        if (err.response?.status === 401) {
          dispatch(logoutUserSync());
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [user, accessToken, dispatch, navigate]);

  const toggleSidebar = () => {
    setSidebarOpen((prev: boolean) => !prev);
  };

  const handleEditSlots = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = (updatedAvailability: Availability, updatedIsUnavailable: boolean) => {
    setAvailability(updatedAvailability);
    setIsUnavailable(updatedIsUnavailable);
    setIsEditing(false);
  };

  const convertTo12Hour = (time: string): { time: string; period: "AM" | "PM" } => {
    const [hour, minute] = time.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    const adjustedHour = hour % 12 || 12;
    return { time: `${adjustedHour}:${minute.toString().padStart(2, "0")}`, period };
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
          {isEditing ? (
            <EditProSlot 
              onCancel={handleCancelEdit} 
              onSave={handleSaveEdit}
              initialAvailability={availability || {}} 
              initialIsUnavailable={isUnavailable} 
            />
          ) : (
            <div className="max-w-7xl mx-auto mb-[50px]">
              <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Slot Management</h1>
              {isUnavailable && (
                <p className="text-red-500 text-center mb-4">Status: Currently Inactive</p>
              )}
              <div className="flex flex-col items-center">
                <div className="w-full">
                  {availability && Object.keys(availability).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                        const slots = availability[day as keyof Availability];
                        if (!slots || slots.length === 0) return null;
                        return (
                          <div key={day} className={`p-4 rounded-lg shadow-md ${isUnavailable ? 'bg-gray-200 opacity-50' : 'bg-white'}`}>
                            <h3 className={`text-lg font-medium capitalize mb-4 ${isUnavailable ? 'text-gray-500' : 'text-gray-800'}`}>
                              {day}
                            </h3>
                            <div className="space-y-2">
                              {slots.map((slot: TimeSlot, index: number) => {
                                const start = convertTo12Hour(slot.startTime);
                                const end = convertTo12Hour(slot.endTime);
                                return (
                                  <div
                                    key={index}
                                    className={`flex flex-col p-2 rounded-md ${isUnavailable ? 'bg-gray-300 text-gray-500' : 'bg-gray-100 text-gray-700'}`}
                                  >
                                    <span>
                                      {start.time} {start.period} - {end.time} {end.period}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center">
                      {isUnavailable ? "No availability set (Currently Inactive)" : "No availability set."}
                    </p>
                  )}
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={handleEditSlots}
                      className="bg-[#032B44] text-white py-3 px-6 rounded-md hover:bg-[#054869] transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Slots
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProSlotManagement;