import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState, AppDispatch } from "../../store/store";
import { logoutUserSync } from "../../store/authSlice";
import { UserRole, User } from "../../store/authSlice";
import { ProNavbar } from "../../components/Pro/ProNavbar";
import ProTopNavbar from "../../components/Pro/ProTopNavbar";
import { Edit } from "lucide-react";
import { getProAvailability, updateProAvailability } from "../../api/proApi";
import { Availability, TimeSlot } from "../../interfaces/proInterface";
import EditProSlot from "../../components/Pro/EditProSlot";

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const ProSlotManagement = () => {
  const user = useSelector((state: RootState) => state.auth.user) as User | null;
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [availability, setAvailability] = useState<Availability>({});
  const [isUnavailable, setIsUnavailable] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  const handleSaveEdit = async (updatedAvailability: Availability, updatedIsUnavailable: boolean) => {
    if (!user || !accessToken) return;

    setLoading(true);
    try {
      const updatedData = await updateProAvailability(user.id, {
        availability: updatedAvailability,
        isUnavailable: updatedIsUnavailable,
      });
      setAvailability(updatedData.availability);
      setIsUnavailable(updatedData.isUnavailable);
      setSuccessMessage("Slots updated successfully");
      setTimeout(() => setSuccessMessage(null), 2000);
      setIsEditing(false);
    } catch (err: any) {
      console.error("Update slots error:", err);
      setError(err.response?.data?.message || "Failed to update slots");
    } finally {
      setLoading(false);
    }
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
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner border-t-4 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
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
     <ProTopNavbar toggleSidebar={toggleSidebar} />

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
              initialAvailability={availability}
              initialIsUnavailable={isUnavailable}
            />
          ) : (
            <div className="max-w-7xl mx-auto mb-[50px]">
              <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Slot Management</h1>
              {successMessage && (
                <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md text-center">
                  {successMessage}
                </div>
              )}
              {isUnavailable && (
                <p className="text-red-500 text-center mb-4">Status: Currently Inactive</p>
              )}
              <div className="flex flex-col items-center">
                <div className="w-full">
                  {Object.keys(availability).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {daysOfWeek.map((day) => {
                        const slots = availability[day as keyof Availability];
                        if (!slots || slots.length === 0) return null;
                        return (
                          <div
                            key={day}
                            className={`p-4 rounded-lg shadow-md ${
                              isUnavailable ? "bg-gray-200 opacity-50" : "bg-white"
                            }`}
                          >
                            <h3
                              className={`text-lg font-medium capitalize mb-4 ${
                                isUnavailable ? "text-gray-500" : "text-gray-800"
                              }`}
                            >
                              {day}
                            </h3>
                            <div className="space-y-2">
                              {slots.map((slot: TimeSlot, index: number) => {
                                const start = convertTo12Hour(slot.startTime);
                                const end = convertTo12Hour(slot.endTime);
                                return (
                                  <div
                                    key={index}
                                    className={`flex justify-between items-center p-2 rounded-md ${
                                      slot.booked
                                        ? "bg-blue-100 text-blue-700"
                                        : isUnavailable
                                        ? "bg-gray-300 text-gray-500"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    <span>
                                      {start.time} {start.period} - {end.time} {end.period}
                                      {slot.booked && " (Booked)"}
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
