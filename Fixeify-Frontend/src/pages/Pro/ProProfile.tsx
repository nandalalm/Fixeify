import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Home, Edit, Lock, UserPen } from "lucide-react";
import { getProProfile } from "../../api/proApi";
import { ProProfile } from "../../interfaces/proInterface";
import { logoutUserSync } from "../../store/authSlice";
import { UserRole } from "../../store/authSlice";
import { ProNavbar } from "../../components/Pro/ProNavbar";
import ProTopNavbar from "../../components/Pro/ProTopNavbar";
import EditProProfile from "../../components/Pro/EditProProfile";
import ProChangePassword from "../../components/Pro/ProChangedPassword";

const ProProfilePage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [proProfile, setProProfile] = useState<ProProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  useEffect(() => {
    const fetchProProfile = async () => {
      if (!user || !accessToken || user.role !== UserRole.PRO) return;

      setLoading(true);
      try {
        const proData = await getProProfile(user.id);
        setProProfile(proData);
        if (proData.isBanned) {
          dispatch(logoutUserSync());
          navigate("/login");
        }
      } catch (err: any) {
        console.error("Fetch pro profile error:", err.response?.data);
        setError(err.response?.data?.message || "Failed to load profile");
        if (err.response?.status === 401) {
          dispatch(logoutUserSync());
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProProfile();
  }, [user, accessToken, dispatch, navigate]);

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


  const handleEditProfile = () => {
    setIsEditing(true);
    setIsChangingPassword(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleChangePassword = () => {
    setIsChangingPassword(true);
    setIsEditing(false);
  };

  const handleCancelChangePassword = () => {
    setIsChangingPassword(false);
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  if (user.role !== UserRole.PRO) {
    navigate("/pro-dashboard");
    return null;
  }


  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ProTopNavbar 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-visible">
        <ProNavbar isOpen={sidebarOpen} />
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300`}
        >
          {isEditing ? (
            <EditProProfile onCancel={handleCancelEdit} />
          ) : isChangingPassword ? (
            <ProChangePassword onCancel={handleCancelChangePassword} />
          ) : (
            <div className="max-w-7xl mx-auto mb-[50px]">
              {/* Heading */}
              {loading ? (
                <div className="animate-pulse mb-8 flex justify-center">
                  <div className="h-8 w-48 bg-gray-200 rounded" />
                </div>
              ) : (
                <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Pro Profile</h1>
              )}

              {/* Error scoped to content */}
              {error && (
                <div className="mb-6 mx-auto max-w-2xl rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col items-center">
                {/* Avatar */}
                {loading ? (
                  <div className="w-32 h-32 rounded-full bg-gray-200 animate-pulse mb-8" />
                ) : (
                  <div className="w-32 h-32 rounded-full overflow-hidden mb-8">
                    <img
                      src={
                        proProfile?.profilePhoto ||
                        user.photo ||
                        "/placeholder.svg?height=128&width=128"
                      }
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="w-full max-w-md lg:max-w-2xl">
                  <div className="lg:flex lg:gap-6">
                    <div className="space-y-6 lg:w-1/2">
                      {loading ? (
                        <div className="space-y-6">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={`skl-${i}`} className="flex items-start animate-pulse">
                              <div className="bg-gray-200 rounded-md mr-4 h-11 w-11" />
                              <div className="flex-1">
                                <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
                                <div className="h-5 w-48 bg-gray-200 rounded" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start">
                            <div className="bg-gray-100 p-3 rounded-md mr-4">
                              <User className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                              <p className="text-gray-900">
                                {proProfile
                                  ? `${proProfile.firstName} ${proProfile.lastName}`
                                  : user.name || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <div className="bg-gray-100 p-3 rounded-md mr-4">
                              <Mail className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Email</h3>
                              <p className="text-gray-900">
                                {proProfile?.email || user.email || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <div className="bg-gray-100 p-3 rounded-md mr-4">
                              <Phone className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Phone Number</h3>
                              <p className="text-gray-900">
                                {proProfile?.phoneNumber || user.phoneNo || "N/A"}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="space-y-6 lg:w-1/2 mt-6 lg:mt-0">
                      {loading ? (
                        <div className="space-y-6">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <div key={`skr-${i}`} className="flex items-start animate-pulse">
                              <div className="bg-gray-200 rounded-md mr-4 h-11 w-11" />
                              <div className="flex-1">
                                <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
                                <div className="h-5 w-64 bg-gray-200 rounded" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start">
                            <div className="bg-gray-100 p-3 rounded-md mr-4">
                              <Home className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">Location</h3>
                              <p className="text-gray-900">
                                {proProfile?.location?.address
                                  ? `${proProfile.location.address}, ${proProfile.location.city}, ${proProfile.location.state}`
                                  : user.address?.address
                                  ? `${user.address.address}, ${user.address.city}, ${user.address.state}`
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <div className="bg-gray-100 p-3 rounded-md mr-4">
                              <UserPen className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">About</h3>
                              <p className="text-gray-900">
                                {proProfile?.about || "Update your about."}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    {loading ? (
                      <>
                        <div className="flex-1 h-12 bg-gray-200 rounded animate-pulse" />
                        <div className="flex-1 h-12 bg-gray-200 rounded animate-pulse" />
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleEditProfile}
                          className="flex-1 bg-[#032B44] text-white py-3 px-6 rounded-md hover:bg-[#054869] transition-colors flex items-center justify-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Profile
                        </button>
                        <button
                          onClick={handleChangePassword}
                          className="flex-1 bg-white border border-[#032B44] text-[#032B44] hover:bg-[#032B44] hover:text-white hover:border-white py-3 px-6 rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                          <Lock className="w-4 h-4" />
                          Change Password
                        </button>
                      </>
                    )}
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

export default ProProfilePage;